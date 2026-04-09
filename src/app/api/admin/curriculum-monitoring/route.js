import { NextResponse } from "next/server";
import { getCurriculumMonitoringData } from "@/lib/curriculum-store";

/**
 * GET /api/admin/curriculum-monitoring
 * Get curriculum monitoring data with optional filters
 * Query params: year (1|2|3), search (string)
 */
export async function GET(request) {
    try {
        const auth = request.headers.get("authorization");
        if (!auth) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const year = parseInt(searchParams.get("year")) || 0;
        const search = searchParams.get("search") || "";
        const asmLeader = searchParams.get("asmLeader") || "";

        const result = await getCurriculumMonitoringData({ year, search, asmLeader });

        return NextResponse.json({
            success: true,
            ...result,
        });
    } catch (error) {
        console.error("Curriculum monitoring error:", error);
        return NextResponse.json({ error: "Server error: " + error.message }, { status: 500 });
    }
}
