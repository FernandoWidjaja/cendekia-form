import { NextResponse } from "next/server";
import { getAllScoreDetails, deleteScoreDetail, updateScoreDetail, bulkSaveScoreDetails, bulkDeleteScoreDetails } from "@/lib/program-store";
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
    const { login, lesson, bulk } = body;

    // Bulk delete mode
    if (bulk && Array.isArray(bulk)) {
        const result = await bulkDeleteScoreDetails(bulk);
        return NextResponse.json(result);
    }

    // Single delete mode
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

    // Transform rows into the format expected by bulkSaveScoreDetails
    const dataArray = body.bulk.map(row => ({
        scoreData: {
            Login: (row.Login || "").toUpperCase(),
            Batch: row.Batch || "",
            EvaluationYearSequence: row.EvaluationYearSequence || "",
            NamaProgram: row.NamaProgram || "",
            Section: row.Section || "KURIKULUM INDEPENDEN",
            Lesson: row.Lesson || "",
            Score: String(row.Score || "0"),
            Date: row.Date || "",
            SubmitTime: row.SubmitTime || "",
            Description: row.Description || "",
        },
        isASM: row.isASM === true || row.isASM === "true" || row.isASM === "TRUE",
    }));

    const result = await bulkSaveScoreDetails(dataArray);

    return NextResponse.json({
        success: result.success,
        imported: result.imported,
        total: body.bulk.length,
        errors: result.errors,
    });
}
