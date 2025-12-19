import { NextResponse } from "next/server";
import { getProgramSiswaByLogin } from "@/lib/program-store";

/**
 * GET /api/program-siswa?login=XXX
 * Get program siswa by login (public API for form)
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const login = searchParams.get("login");

    if (!login) {
        return NextResponse.json({ success: false, data: null });
    }

    const program = await getProgramSiswaByLogin(login);

    return NextResponse.json({
        success: !!program,
        data: program,
    });
}
