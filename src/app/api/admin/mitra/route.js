import { NextResponse } from "next/server";
import { getAllMitra, saveMitra, deleteMitra, bulkSaveMitra } from "@/lib/mitra-store";

/**
 * GET /api/admin/mitra
 * Get all mitra data
 */
export async function GET(request) {
    try {
        const auth = request.headers.get("authorization");
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const data = await getAllMitra();
        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Get mitra error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

/**
 * POST /api/admin/mitra
 * Add single mitra or bulk from Excel
 * Body: { login, nama, cabang, divisi, departemen, namaAtasan } OR { bulk: [...] }
 */
export async function POST(request) {
    try {
        const auth = request.headers.get("authorization");
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();

        // Bulk upload from Excel
        if (body.bulk && Array.isArray(body.bulk)) {
            const result = await bulkSaveMitra(body.bulk);
            return NextResponse.json(result);
        }

        // Single add
        if (!body.login) {
            return NextResponse.json({ error: "Login wajib diisi" }, { status: 400 });
        }

        const result = await saveMitra(body);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Add mitra error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/mitra
 * Delete mitra by login
 * Body: { login }
 */
export async function DELETE(request) {
    try {
        const auth = request.headers.get("authorization");
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { login } = await request.json();
        if (!login) {
            return NextResponse.json({ error: "Login wajib diisi" }, { status: 400 });
        }

        const result = await deleteMitra(login);
        return NextResponse.json(result);
    } catch (error) {
        console.error("Delete mitra error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
