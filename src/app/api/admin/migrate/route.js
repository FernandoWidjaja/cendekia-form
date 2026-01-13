import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

/**
 * Incremental Migration API
 * Runs migration in small batches to avoid Vercel timeout
 */

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

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
 * Runs ONE migration step at a time
 * Query params: ?step=quizzes|attempts|scoredetails|mitra
 */
export async function POST(request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const step = searchParams.get("step") || "quizzes";

    try {
        let result;

        switch (step) {
            case "quizzes":
                result = await migrateQuizzes();
                break;
            case "attempts":
                result = await migrateAttempts();
                break;
            case "scoredetails":
                result = await migrateScoreDetails();
                break;
            case "mitra":
                result = await migrateMitra();
                break;
            default:
                return NextResponse.json({ error: "Invalid step. Use: quizzes, attempts, scoredetails, mitra" }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            step,
            result,
            nextStep: getNextStep(step),
        });
    } catch (error) {
        console.error(`Migration error (${step}):`, error);
        return NextResponse.json({ error: error.message, step }, { status: 500 });
    }
}

function getNextStep(current) {
    const steps = ["quizzes", "attempts", "scoredetails", "mitra"];
    const idx = steps.indexOf(current);
    return idx < steps.length - 1 ? steps[idx + 1] : null;
}

/**
 * GET /api/admin/migrate - Check status
 */
export async function GET(request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check what's already migrated
    const quizzes = await redis.get("quizzes:all");
    const scoredetails = await redis.get("scoredetails:all");
    const mitra = await redis.get("mitrakerja:all");

    return NextResponse.json({
        success: true,
        status: {
            quizzes: quizzes ? quizzes.length : 0,
            scoredetails: scoredetails ? scoredetails.length : 0,
            mitra: mitra ? mitra.length : 0,
        },
        instructions: "POST with ?step=quizzes, then ?step=attempts, then ?step=scoredetails, then ?step=mitra",
    });
}

// ============== MIGRATION FUNCTIONS ==============

async function scanKeys(pattern, limit = 50) {
    const allKeys = [];
    let cursor = 0;

    do {
        const result = await redis.scan(cursor, { match: pattern, count: 50 });
        cursor = result[0];
        const keys = result[1];
        allKeys.push(...keys);

        // Limit to avoid timeout
        if (allKeys.length >= limit) break;
    } while (cursor !== 0);

    return allKeys.slice(0, limit);
}

async function migrateQuizzes() {
    // Check if already migrated
    const existing = await redis.get("quizzes:all");
    if (existing && existing.length > 0) {
        return { skipped: true, count: existing.length };
    }

    // Scan for quiz keys (limit 50 at a time)
    const keys = await scanKeys("quiz:*", 100);

    if (keys.length === 0) {
        await redis.set("quizzes:all", []);
        return { success: true, count: 0 };
    }

    const quizzes = [];
    for (const key of keys) {
        const quiz = await redis.get(key);
        if (quiz) {
            quizzes.push({
                ...quiz,
                key,
                lessonName: quiz.lessonName || key.replace("quiz:", ""),
            });
        }
    }

    await redis.set("quizzes:all", quizzes);
    return { success: true, count: quizzes.length };
}

async function migrateAttempts() {
    // Scan for attempt keys (limit to avoid timeout)
    const keys = await scanKeys("attempt:*", 200);

    if (keys.length === 0) {
        return { success: true, count: 0, users: 0 };
    }

    // Group by login
    const attemptsByLogin = {};
    for (const key of keys) {
        const parts = key.split(":");
        if (parts.length >= 3) {
            const login = parts[1];
            const lessonName = parts.slice(2).join(":");

            const attempt = await redis.get(key);
            if (attempt) {
                if (!attemptsByLogin[login]) {
                    attemptsByLogin[login] = {};
                }
                attemptsByLogin[login][lessonName] = attempt;
            }
        }
    }

    // Save per-user
    let userCount = 0;
    for (const [login, attempts] of Object.entries(attemptsByLogin)) {
        const newKey = `attempts:${login}`;
        const existing = await redis.get(newKey) || {};
        const merged = { ...existing, ...attempts };
        await redis.set(newKey, merged);
        userCount++;
    }

    return { success: true, count: keys.length, users: userCount };
}

async function migrateScoreDetails() {
    // Check if already migrated
    const existing = await redis.get("scoredetails:all");
    if (existing && existing.length > 0) {
        return { skipped: true, count: existing.length };
    }

    // Get from index first (this is likely already populated)
    let indexKeys = await redis.get("scoredetail:keys") || [];

    // If no index, try scan
    if (indexKeys.length === 0) {
        indexKeys = await scanKeys("scoredetail:*", 500);
        indexKeys = indexKeys.filter(k => k !== "scoredetail:keys");
    }

    if (indexKeys.length === 0) {
        await redis.set("scoredetails:all", []);
        return { success: true, count: 0 };
    }

    // Fetch all scores using mget for efficiency (batch of 50)
    const scores = [];
    const batchSize = 50;

    for (let i = 0; i < indexKeys.length; i += batchSize) {
        const batch = indexKeys.slice(i, i + batchSize);
        const results = await redis.mget(...batch);

        results.forEach((score, idx) => {
            if (score) {
                const key = batch[idx];
                const isASM = key.includes(":asm:");
                scores.push({ ...score, isASM });
            }
        });
    }

    await redis.set("scoredetails:all", scores);
    return { success: true, count: scores.length };
}

async function migrateMitra() {
    // Check if already migrated
    const existing = await redis.get("mitrakerja:all");
    if (existing && existing.length > 0) {
        return { skipped: true, count: existing.length };
    }

    // Get from index first
    let indexKeys = await redis.get("mitrakerja:keys") || [];

    // If no index, try scan
    if (indexKeys.length === 0) {
        indexKeys = await scanKeys("mitrakerja:*", 200);
        indexKeys = indexKeys.filter(k => k !== "mitrakerja:keys");
    }

    if (indexKeys.length === 0) {
        await redis.set("mitrakerja:all", []);
        return { success: true, count: 0 };
    }

    const mitraList = [];
    for (const key of indexKeys) {
        const mitra = await redis.get(key);
        if (mitra) {
            mitraList.push(mitra);
        }
    }

    await redis.set("mitrakerja:all", mitraList);
    return { success: true, count: mitraList.length };
}
