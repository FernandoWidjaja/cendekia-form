import { getAllProgramSiswa } from "./program-store";
import { getAllScoreDetails } from "./program-store";
import { getAllQuizzes } from "./quiz-store";

/**
 * Curriculum Monitoring Store
 * Combines ProgramSiswa, ScoreDetail, and Master Quiz data
 * to produce a curriculum monitoring view per student.
 *
 * Columns requested:
 *   Nama, Program Siswa, Batch, Masa Pelatihan (from EffectiveDate), Avg Score
 *   + per-quiz breakdown (taken / not taken, score 0 = not taken)
 */

/**
 * Calculate tenure year from EffectiveDate (YYYYMMDD or DD/MM/YYYY)
 * @param {string} dateStr - EffectiveDate in YYYYMMDD or DD/MM/YYYY format
 * @returns {{ year: number, label: string, days: number }}
 */
function calculateTenure(dateStr) {
    if (!dateStr) return { year: 0, label: "N/A", days: 0 };

    let date;
    if (dateStr.includes("/")) {
        // DD/MM/YYYY
        const [dd, mm, yyyy] = dateStr.split("/");
        date = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    } else if (dateStr.length === 8) {
        // YYYYMMDD
        const yyyy = dateStr.slice(0, 4);
        const mm = dateStr.slice(4, 6);
        const dd = dateStr.slice(6, 8);
        date = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    } else {
        return { year: 0, label: "N/A", days: 0 };
    }

    if (isNaN(date.getTime())) return { year: 0, label: "N/A", days: 0 };

    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 365) return { year: 1, label: "Tahun 1", days: diffDays };
    if (diffDays <= 730) return { year: 2, label: "Tahun 2", days: diffDays };
    if (diffDays <= 1095) return { year: 3, label: "Tahun 3", days: diffDays };
    return { year: 4, label: `${Math.ceil(diffDays / 365)} Tahun`, days: diffDays };
}

/**
 * Build curriculum monitoring data
 * @param {object} filters - { year?: number, search?: string }
 * @returns {Promise<object>} - { data: [...], quizNames: [...], summary: {...} }
 */
export async function getCurriculumMonitoringData(filters = {}) {
    // 1. Fetch all data sources in parallel
    const [programSiswa, allScores, allQuizzes] = await Promise.all([
        getAllProgramSiswa(),
        getAllScoreDetails(),
        getAllQuizzes(),
    ]);

    // 2. Build master quiz name list (only KURIKULUM INDEPENDEN quizzes)
    const quizNames = allQuizzes.map(q => q.lessonName).sort();

    // 3. Build lookup maps
    const scoreLookup = {};
    for (const score of allScores) {
        const login = score.Login?.toUpperCase();
        if (!login) continue;
        if (!scoreLookup[login]) scoreLookup[login] = {};
        scoreLookup[login][score.Lesson] = score;
    }

    // 4. Build student rows
    const rows = [];
    for (const siswa of programSiswa) {
        const login = siswa.login?.toUpperCase();
        if (!login) continue;

        const studentScores = scoreLookup[login] || {};

        // Calculate per-quiz status
        const quizResults = {};
        let totalScore = 0;
        let quizzesTaken = 0;
        let quizzesPassed = 0;
        let quizzesFailed = 0;

        for (const quizName of quizNames) {
            const scoreEntry = studentScores[quizName];
            const score = scoreEntry ? parseFloat(scoreEntry.Score) || 0 : 0;
            const taken = scoreEntry && score > 0;

            if (taken) {
                totalScore += score;
                quizzesTaken++;
                if (score >= 60) {
                    quizzesPassed++;
                } else {
                    quizzesFailed++;
                }
            }
        }

        const avgScore = quizzesTaken > 0 ? Math.round((totalScore / quizzesTaken) * 10) / 10 : 0;

        // Calculate tenure from EffectiveDate (stored in scoreDetail or from programSiswa)
        const anyScore = Object.values(studentScores)[0];
        // Prefer ProgramSiswa effectiveDate (populated by Sync EHC)
        let effectiveDate = siswa.effectiveDate;
        if (!effectiveDate || effectiveDate === "NOT_FOUND") {
             effectiveDate = anyScore?.EffectiveDate || "";
        }
        const tenure = calculateTenure(effectiveDate);

        // Format Tanggal Masuk (YYYYMMDD to YYYY-MM-DD)
        let formattedTanggalMasuk = "-";
        if (effectiveDate && effectiveDate.length === 8 && !effectiveDate.includes("/")) {
            formattedTanggalMasuk = `${effectiveDate.substring(0, 4)}-${effectiveDate.substring(4, 6)}-${effectiveDate.substring(6, 8)}`;
        } else if (effectiveDate) {
            formattedTanggalMasuk = effectiveDate;
        }

        const row = {
            login,
            nama: siswa.namaSiswa || siswa.nama || login.split("@")[0] + " (Belum Sync EHC)",
            programSiswa: siswa.namaProgram || "-",
            batch: siswa.batch || "-",
            asmLeaderName: siswa.asmLeaderName || "-",
            effectiveDate,
            tanggalMasuk: formattedTanggalMasuk,
            tenure,
            avgScore,
            quizzesTaken,
            quizzesPassed,
            quizzesFailed,
            totalQuizzes: quizNames.length,
            completionPct: quizNames.length > 0 ? Math.round((quizzesTaken / quizNames.length) * 100) : 0,
        };

        rows.push(row);
    }

    // 5. Apply filters
    let filtered = rows;

    if (filters.year && filters.year > 0) {
        filtered = filtered.filter(r => r.tenure.year === filters.year);
    }

    if (filters.search) {
        const q = filters.search.toLowerCase();
        filtered = filtered.filter(r =>
            r.nama.toLowerCase().includes(q) ||
            r.login.toLowerCase().includes(q) ||
            r.programSiswa.toLowerCase().includes(q) ||
            r.batch.toLowerCase().includes(q) ||
            (r.asmLeaderName && r.asmLeaderName.toLowerCase().includes(q))
        );
    }

    // Sort by nama
    filtered.sort((a, b) => a.nama.localeCompare(b.nama));

    // 6. Summary stats
    const summary = {
        totalStudents: filtered.length,
        avgCompletion: filtered.length > 0
            ? Math.round(filtered.reduce((sum, r) => sum + r.completionPct, 0) / filtered.length)
            : 0,
        avgScore: filtered.length > 0
            ? Math.round((filtered.reduce((sum, r) => sum + r.avgScore, 0) / filtered.length) * 10) / 10
            : 0,
    };

    return {
        data: filtered,
        quizNames,
        summary,
    };
}
