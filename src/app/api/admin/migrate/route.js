import { NextResponse } from "next/server";
import { runAllMigrations } from "@/lib/migrate-redis";

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
 * Run data migration from old multi-key to single-key format
 * ONLY call this ONCE after deploying the optimized code
 */
export async function POST(request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        console.log("Starting migration via API...");
        const results = await runAllMigrations();

        return NextResponse.json({
            success: true,
            message: "Migration completed",
            results,
        });
    } catch (error) {
        console.error("Migration error:", error);
        return NextResponse.json(
            { error: "Migration failed: " + error.message },
            { status: 500 }
        );
    }
}

/**
 * GET /api/admin/migrate
 * Check migration status
 */
export async function GET(request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({
        success: true,
        message: "Migration endpoint ready. Send POST request to run migration.",
        warning: "Only run migration ONCE after deploying the optimized code!",
    });
}
