import { NextResponse } from "next/server";
import { getAllScoreDetails, deleteScoreDetail, updateScoreDetail, saveScoreDetail } from "@/lib/program-store";
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

/**
 * PUT /api/admin/scoredetail - Update ScoreDetail fields
 */
export async function PUT(request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { login, lesson, updates } = body;

    if (!login || !lesson || !updates) {
        return NextResponse.json({ error: "login, lesson, dan updates wajib diisi" }, { status: 400 });
    }

    const result = await updateScoreDetail(login, lesson, updates);
    return NextResponse.json(result);
}

/**
 * POST /api/admin/scoredetail - Bulk import ScoreDetails
 * Body: { bulk: [{Login, Batch, NamaProgram, Section, Lesson, Score, Date, SubmitTime, Description, isASM}, ...] }
 */
export async function POST(request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.bulk || !Array.isArray(body.bulk)) {
        return NextResponse.json({ error: "Format: { bulk: [...] }" }, { status: 400 });
    }

    const errors = [];
    let imported = 0;

    for (let i = 0; i < body.bulk.length; i++) {
        const row = body.bulk[i];
        const rowNum = i + 2; // Excel row number (header = row 1)

        if (!row.Login || !row.Lesson) {
            errors.push({ row: rowNum, error: "Login atau Lesson kosong" });
            continue;
        }

        const scoreData = {
            Login: row.Login.toUpperCase(),
            Batch: row.Batch || "",
            EvaluationYearSequence: row.EvaluationYearSequence || "",
            NamaProgram: row.NamaProgram || "",
            Section: row.Section || "KURIKULUM INDEPENDEN",
            Lesson: row.Lesson,
            Score: String(row.Score || "0"),
            Date: row.Date || "",
            SubmitTime: row.SubmitTime || "",
            Description: row.Description || "",
        };

        const isASM = row.isASM === true || row.isASM === "true" || row.isASM === "TRUE";
        const result = await saveScoreDetail(scoreData, isASM);

        if (result.success) {
            imported++;
        } else {
            errors.push({ row: rowNum, error: result.error });
        }
    }

    return NextResponse.json({
        success: errors.length === 0,
        imported,
        total: body.bulk.length,
        errors,
    });
}
