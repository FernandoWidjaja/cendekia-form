import { getAllScoreDetails } from "@/lib/program-store";
import * as XLSX from "xlsx";

/**
 * GET /api/admin/export-scores
 * Export all ScoreDetails to Excel (download)
 */
export async function GET() {
    try {
        console.log("📥 Fetching ScoreDetails for export...");
        const scores = await getAllScoreDetails();

        if (!scores || scores.length === 0) {
            return Response.json(
                { success: false, error: "No data found in Redis" },
                { status: 404 }
            );
        }

        console.log(`✅ Found ${scores.length} ScoreDetail records`);

        // Create worksheet from JSON data
        const worksheet = XLSX.utils.json_to_sheet(scores);

        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "ScoreDetails");

        // Generate Excel buffer
        const excelBuffer = XLSX.write(workbook, {
            type: "buffer",
            bookType: "xlsx",
        });

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const filename = `score_details_export_${timestamp}.xlsx`;

        // Return file as download
        return new Response(excelBuffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Export error:", error);
        return Response.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
