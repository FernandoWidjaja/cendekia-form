import { NextResponse } from "next/server";
import redis from "@/lib/redis-client";
import { buildKey, ENTITIES, LEGACY_KEYS } from "@/lib/key-builder";
import { runAllMigrations, migrateKey, migrateAttemptsToScoreDetail } from "@/lib/migrate-redis";

/**
 * Migration API — Key re-mapping + A2 (attempts → ScoreDetail)
 * Runs migration in small batches to avoid Vercel timeout
 */

// Admin credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "WIDJ47@GMAIL.COM";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "@ASMHCD2025";

function verifyAdmin(request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return false;
    try {
        const base64 = authHeader.replace("Basic ", "");
        const decoded = Buffer.from(base64, "base64").toString("utf-8");
        const colonIndex = decoded.indexOf(":");
        const email = decoded.substring(0, colonIndex);
        const password = decoded.substring(colonIndex + 1);
        return email.toUpperCase() === ADMIN_EMAIL.toUpperCase() && password === ADMIN_PASSWORD;
    } catch {
        return false;
    }
}

/**
 * POST /api/admin/migrate
 * Runs migration steps
 * Query params: 
 *   ?step=remap-keys    — Re-map all legacy keys to new format
 *   ?step=merge-attempts — Merge attempts data into ScoreDetail (A2)
 *   ?step=all           — Run all migrations
 */
export async function POST(request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const step = searchParams.get("step") || "all";

    try {
        let result;

        switch (step) {
            case "remap-keys": {
                // Re-map each legacy key individually
                const results = {};
                for (const [oldKey, entity] of Object.entries(LEGACY_KEYS)) {
                    results[oldKey] = await migrateKey(oldKey, entity);
                }
                result = results;
                break;
            }
            case "merge-attempts":
                result = await migrateAttemptsToScoreDetail();
                break;
            case "all":
                result = await runAllMigrations();
                break;
            default:
                return NextResponse.json(
                    { error: "Invalid step. Use: remap-keys, merge-attempts, all" },
                    { status: 400 }
                );
        }

        return NextResponse.json({
            success: true,
            step,
            result,
        });
    } catch (error) {
        console.error(`Migration error (${step}):`, error);
        return NextResponse.json({ error: error.message, step }, { status: 500 });
    }
}

/**
 * GET /api/admin/migrate - Check current data status
 * Shows counts for both legacy and new key formats
 */
export async function GET(request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check new format keys
    const newKeys = {};
    for (const [, entity] of Object.entries(ENTITIES)) {
        if (entity === "RateLimit") continue; // Skip rate limit
        const key = buildKey(entity);
        const data = await redis.get(key);
        newKeys[entity] = {
            key,
            count: Array.isArray(data) ? data.length : (data ? 1 : 0),
        };
    }

    // Check legacy keys
    const legacyKeys = {};
    for (const oldKey of Object.keys(LEGACY_KEYS)) {
        const data = await redis.get(oldKey);
        legacyKeys[oldKey] = {
            count: Array.isArray(data) ? data.length : (data ? 1 : 0),
        };
    }

    return NextResponse.json({
        success: true,
        newFormat: newKeys,
        legacyFormat: legacyKeys,
        instructions: "POST with ?step=remap-keys, then ?step=merge-attempts, or ?step=all for everything",
    });
}
