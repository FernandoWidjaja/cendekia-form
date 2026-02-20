import { NextResponse } from "next/server";
import {
    getAllProgramSiswa,
    saveProgramSiswa,
    deleteProgramSiswa,
    bulkImportProgramSiswa,
    updateProgramSiswa
} from "@/lib/program-store";
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
 * GET /api/admin/program-siswa - Get all program siswa
 */
export async function GET(request) {
    const ip = getIP(request);
    const rl = await checkRateLimit(adminLimiter, ip);
    if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getAllProgramSiswa();
    return NextResponse.json({ success: true, data });
}

/**
 * POST /api/admin/program-siswa - Add/update or bulk import
 * Body: { login, namaProgram } for single
 * Body: { bulk: [...] } for bulk import
 */
export async function POST(request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Bulk import
    if (body.bulk && Array.isArray(body.bulk)) {
        const result = await bulkImportProgramSiswa(body.bulk);
        return NextResponse.json(result);
    }

    // Single add
    const { login, namaProgram, batch } = body;
    if (!login || !namaProgram) {
        return NextResponse.json({ error: "login dan namaProgram wajib diisi" }, { status: 400 });
    }

    const result = await saveProgramSiswa(login, namaProgram, batch || "");
    return NextResponse.json(result);
}

/**
 * DELETE /api/admin/program-siswa - Delete by login
 */
export async function DELETE(request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { login } = body;

    if (!login) {
        return NextResponse.json({ error: "login wajib diisi" }, { status: 400 });
    }

    const result = await deleteProgramSiswa(login);
    return NextResponse.json(result);
}

/**
 * PUT /api/admin/program-siswa - Update program siswa fields
 */
export async function PUT(request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { originalLogin, updates } = body;

    if (!originalLogin || !updates) {
        return NextResponse.json({ error: "originalLogin dan updates wajib diisi" }, { status: 400 });
    }

    const result = await updateProgramSiswa(originalLogin, updates);
    return NextResponse.json(result);
}
