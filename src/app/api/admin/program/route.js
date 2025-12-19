import { NextResponse } from "next/server";
import { getAllPrograms, addProgram, deleteProgram } from "@/lib/program-store";
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
 * GET /api/admin/program - Get all program names
 */
export async function GET(request) {
    const ip = getIP(request);
    const rl = await checkRateLimit(adminLimiter, ip);
    if (!rl.success) return NextResponse.json({ error: "Rate limited" }, { status: 429 });

    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const programs = await getAllPrograms();
    return NextResponse.json({ success: true, data: programs });
}

/**
 * POST /api/admin/program - Add program
 */
export async function POST(request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { namaProgram } = body;

    if (!namaProgram) {
        return NextResponse.json({ error: "namaProgram wajib diisi" }, { status: 400 });
    }

    const result = await addProgram(namaProgram);
    if (result.success) {
        return NextResponse.json({ success: true, data: result.data });
    }
    return NextResponse.json({ error: result.error }, { status: 400 });
}

/**
 * DELETE /api/admin/program - Delete program
 */
export async function DELETE(request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
        return NextResponse.json({ error: "id wajib diisi" }, { status: 400 });
    }

    const result = await deleteProgram(id);
    return NextResponse.json(result);
}
