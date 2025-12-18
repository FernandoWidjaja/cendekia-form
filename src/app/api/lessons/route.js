import { NextResponse } from "next/server";
import { getMasterLessons } from "@/lib/ehc-service";

/**
 * GET /api/lessons
 * Fetch list of lessons from Master SISWA API
 */
export async function GET() {
    try {
        const lessons = await getMasterLessons();

        return NextResponse.json({
            success: true,
            data: lessons,
        });
    } catch (error) {
        console.error("Lessons API Error:", error);
        return NextResponse.json(
            { success: false, message: "Gagal mengambil daftar pelajaran" },
            { status: 500 }
        );
    }
}
