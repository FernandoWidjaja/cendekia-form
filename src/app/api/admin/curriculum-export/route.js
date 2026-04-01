import { NextResponse } from "next/server";
import { getCurriculumMonitoringData } from "@/lib/curriculum-store";
import * as XLSX from "xlsx";

/**
 * GET /api/admin/curriculum-export
 * Export curriculum monitoring data as Excel
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

        const result = await getCurriculumMonitoringData({ year, search });
        const { data, quizNames, summary } = result;

        // Sheet 1: Ringkasan (Summary table)
        const summaryRows = data.map((row, idx) => ({
            No: idx + 1,
            Nama: row.nama,
            Login: row.login,
            "Program Siswa": row.programSiswa,
            Batch: row.batch,
            "ASM Leader": row.asmLeaderName,
            "Tanggal Masuk": row.tanggalMasuk,
            "Masa Pelatihan": row.tenure.label,
            "Lulus KI": row.quizzesPassed,
            "Tidak Lulus KI": row.quizzesFailed,
            "Persentase Keikutsertaan (%)": row.completionPct,
            "Avg Score": row.avgScore,
        }));

        const ws1 = XLSX.utils.json_to_sheet(summaryRows);

        // Set column widths
        ws1["!cols"] = [
            { wch: 5 },  // No
            { wch: 25 }, // Nama
            { wch: 30 }, // Login
            { wch: 20 }, // Program
            { wch: 15 }, // Batch
            { wch: 25 }, // ASM Leader
            { wch: 15 }, // Tanggal Masuk
            { wch: 15 }, // Masa Pelatihan
            { wch: 15 }, // Lulus KI
            { wch: 15 }, // Tidak Lulus KI
            { wch: 25 }, // Persentase
            { wch: 12 }, // Avg Score
        ];

        // Build workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws1, "Ringkasan KI");

        // Generate buffer
        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        // Return as downloadable file
        const filename = `curriculum_monitoring${year ? `_year${year}` : ""}_${new Date().toISOString().split("T")[0]}.xlsx`;

        return new Response(buf, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error("Curriculum export error:", error);
        return NextResponse.json({ error: "Server error: " + error.message }, { status: 500 });
    }
}
