import { NextResponse } from "next/server";
import { getAllScoreDetails, deleteScoreDetail } from "@/lib/program-store";
import { adminLimiter, getIP, checkRateLimit } from "@/lib/rate-limiter";

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
 * GET /api/admin/scoredetail - Get all ScoreDetails
 */
export async function GET(request) {
    const ip = getIP(request);
    const rl = await checkRateLimit(adminLimiter, ip);
    if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getAllScoreDetails();
    return NextResponse.json({ success: true, data });
}

/**
 * DELETE /api/admin/scoredetail - Delete ScoreDetail by login and lesson
 */
export async function DELETE(request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { login, lesson } = body;

    if (!login || !lesson) {
        return NextResponse.json({ error: "login dan lesson wajib diisi" }, { status: 400 });
    }

    const result = await deleteScoreDetail(login, lesson);
    return NextResponse.json(result);
}
