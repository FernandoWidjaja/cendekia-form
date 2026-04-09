import { NextResponse } from "next/server";
import { getCurriculumMonitoringData } from "@/lib/curriculum-store";
import * as XLSX from "xlsx";

/**
 * GET /api/admin/curriculum-export
 * Export curriculum monitoring as Excel with 3 sheets
 * Query params: year, search, asmLeader
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
        const { data, summary } = result;

        // ── SHEET 1: RINGKASAN ──────────────────────────────────────────────
        const sheet1Rows = data.map((row, idx) => ({
            No: idx + 1,
            Nama: row.nama,
            Login: row.login,
            "Program": row.programSiswa,
            Batch: row.batch,
            "ASM Leader": row.asmLeaderName,
            "Tanggal Masuk": row.tanggalMasuk,
            "Masa Pelatihan": row.tenure.label,
            "Total Lesson KI": row.totalQuizzes,
            "Diikuti": row.quizzesTaken,
            "Lulus (≥70)": row.quizzesPassed,
            "Tidak Lulus (<70)": row.quizzesFailed,
            "Belum Ikut": row.quizzesNotTaken,
            "% Lulus": row.pctLulus,
            "% Tidak Lulus/TI": row.pctTidakLulus,
            "Avg Score": row.avgScore,
        }));

        const ws1 = XLSX.utils.json_to_sheet(sheet1Rows);
        ws1["!cols"] = [
            { wch: 5 },  { wch: 30 }, { wch: 35 }, { wch: 20 }, { wch: 15 },
            { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 },
            { wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 12 },
        ];

        // ── SHEET 2: DETAIL PER LESSON ──────────────────────────────────────
        // One row per student × lesson that was taken (only participated ones)
        // Also include not-taken rows so export is complete
        const sheet2Rows = [];
        let no2 = 1;
        for (const row of data) {
            for (const qd of row.quizDetails) {
                sheet2Rows.push({
                    No: no2++,
                    Nama: row.nama,
                    Login: row.login,
                    Program: row.programSiswa,
                    Batch: row.batch,
                    "ASM Leader": row.asmLeaderName,
                    "Masa Pelatihan": row.tenure.label,
                    Lesson: qd.lesson,
                    "Tanggal Ujian": qd.date || "-",
                    Skor: qd.score !== null ? qd.score : "-",
                    Status: qd.status,
                    "Diambil Pada": qd.takenYear,
                });
            }
        }

        const ws2 = XLSX.utils.json_to_sheet(sheet2Rows);
        ws2["!cols"] = [
            { wch: 5 },  { wch: 30 }, { wch: 35 }, { wch: 20 }, { wch: 15 },
            { wch: 25 }, { wch: 15 }, { wch: 40 }, { wch: 14 }, { wch: 8 }, { wch: 15 }, { wch: 15 },
        ];

        // ── SHEET 3: STATISTIK PER TAHUN ────────────────────────────────────
        const sheet3Rows = (summary.yearBreakdown || []).map((g, idx) => ({
            No: idx + 1,
            "Kelompok Tahun": g.label,
            "Total Siswa": g.totalSiswa,
            "Sudah Ikut KI": g.sudahIkut,
            "% Partisipasi": g.pctPartisipasi,
            "Rata-rata % Lulus": g.avgPctLulus,
            "Rata-rata Score": g.avgScore,
        }));

        const ws3 = XLSX.utils.json_to_sheet(
            sheet3Rows.length > 0 ? sheet3Rows : [{ Keterangan: "Tidak ada data" }]
        );
        ws3["!cols"] = [
            { wch: 5 }, { wch: 20 }, { wch: 15 }, { wch: 18 },
            { wch: 16 }, { wch: 22 }, { wch: 18 },
        ];

        // ── BUILD WORKBOOK ───────────────────────────────────────────────────
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws1, "Ringkasan");
        XLSX.utils.book_append_sheet(wb, ws2, "Detail Per Lesson");
        XLSX.utils.book_append_sheet(wb, ws3, "Statistik Per Tahun");

        const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        const filename = `curriculum_monitoring${year ? `_tahun${year}` : ""}${asmLeader ? `_${asmLeader.replace(/\s+/g, "_")}` : ""}_${new Date().toISOString().split("T")[0]}.xlsx`;

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
