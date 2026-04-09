import { getAllProgramSiswa } from "./program-store";
import { getAllScoreDetails } from "./program-store";
import { getAllQuizzes } from "./quiz-store";

/**
 * Curriculum Monitoring Store
 * Combines ProgramSiswa, ScoreDetail, and Master Quiz data
 * Lessons sourced from KURIKULUM INDEPENDEN section in ScoreDetail (union with Redis quizzes)
 * Lesson uniqueness: LessonName + Date (same lesson on different dates = different quiz)
 * KKM = 70
 */

const KKM = 70;
const KI_SECTION = "KURIKULUM INDEPENDEN";

/**
 * Calculate tenure year from EffectiveDate (YYYYMMDD or DD/MM/YYYY)
 */
function calculateTenure(dateStr) {
    if (!dateStr) return { year: 0, label: "N/A", days: 0 };

    let date;
    if (dateStr.includes("/")) {
        const [dd, mm, yyyy] = dateStr.split("/");
        date = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    } else if (dateStr.length === 8) {
        const yyyy = dateStr.slice(0, 4);
        const mm = dateStr.slice(4, 6);
        const dd = dateStr.slice(6, 8);
        date = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    } else {
        return { year: 0, label: "N/A", days: 0 };
    }

    if (isNaN(date.getTime())) return { year: 0, label: "N/A", days: 0 };

    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays <= 365) return { year: 1, label: "Tahun 1", days: diffDays };
    if (diffDays <= 730) return { year: 2, label: "Tahun 2", days: diffDays };
    return { year: 3, label: "Tahun 3", days: diffDays };
}

/**
 * Build curriculum monitoring data
 * @param {object} filters - { year?: number, search?: string, asmLeader?: string }
 */
export async function getCurriculumMonitoringData(filters = {}) {
    // 1. Fetch all data sources in parallel
    const [programSiswa, allScores, allQuizzes] = await Promise.all([
        getAllProgramSiswa(),
        getAllScoreDetails(),
        getAllQuizzes(),
    ]);

    // 2. Filter ScoreDetail to only KURIKULUM INDEPENDEN section
    const kiScores = allScores.filter(s =>
        (s.Section || "").toUpperCase().includes("KURIKULUM INDEPENDEN")
    );

    // 3. Build master lesson list: unique (Lesson + Date) pairs from KI scores
    //    Key format: "LessonName|||Date"
    const kiLessonMap = new Map(); // key → { lesson, date }
    for (const s of kiScores) {
        if (!s.Lesson) continue;
        const date = s.Date || "";
        const key = `${s.Lesson}|||${date}`;
        if (!kiLessonMap.has(key)) {
            kiLessonMap.set(key, { lesson: s.Lesson, date });
        }
    }

    // Also add Redis quizzes that are tagged as KI (Section = KURIKULUM INDEPENDEN)
    for (const q of allQuizzes) {
        const section = (q.section || q.Section || "").toUpperCase();
        if (!section.includes("KURIKULUM INDEPENDEN")) continue;
        const key = `${q.lessonName}|||`;
        if (!kiLessonMap.has(key)) {
            kiLessonMap.set(key, { lesson: q.lessonName, date: "" });
        }
    }

    // Sort master lessons: by lesson name then date
    const masterLessons = Array.from(kiLessonMap.values()).sort((a, b) => {
        const nameCompare = a.lesson.localeCompare(b.lesson);
        if (nameCompare !== 0) return nameCompare;
        return a.date.localeCompare(b.date);
    });
    const totalKI = masterLessons.length;

    // 4. Build per-student KI score lookup: login → Map(LessonKey → scoreEntry)
    const kiScoreLookup = {};
    for (const s of kiScores) {
        const login = s.Login?.toUpperCase();
        if (!login || !s.Lesson) continue;
        if (!kiScoreLookup[login]) kiScoreLookup[login] = new Map();
        const key = `${s.Lesson}|||${s.Date || ""}`;
        kiScoreLookup[login].set(key, s);
    }

    // 5. Build student rows
    const rows = [];
    for (const siswa of programSiswa) {
        const login = siswa.login?.toUpperCase();
        if (!login) continue;

        const studentKiMap = kiScoreLookup[login] || new Map();

        // Build per-lesson detail for popup
        // Calculate tenure and student start date first
        let effectiveDate = siswa.effectiveDate;
        if (!effectiveDate || effectiveDate === "NOT_FOUND") {
            const anyScore = Object.values(Object.fromEntries(studentKiMap))[0];
            effectiveDate = anyScore?.EffectiveDate || "";
        }
        const tenure = calculateTenure(effectiveDate);

        let startDateObj = null;
        if (effectiveDate) {
            if (effectiveDate.includes("/")) {
                const [dd, mm, yyyy] = effectiveDate.split("/");
                startDateObj = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
            } else if (effectiveDate.length === 8) {
                const yyyy = effectiveDate.slice(0, 4);
                const mm = effectiveDate.slice(4, 6);
                const dd = effectiveDate.slice(6, 8);
                startDateObj = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
            }
        }

        let totalScore = 0;
        let quizzesTaken = 0;
        let quizzesPassed = 0;
        let quizzesFailed = 0;

        const quizDetails = masterLessons.map(({ lesson, date }) => {
            const key = `${lesson}|||${date}`;
            const entry = studentKiMap.get(key);
            if (entry) {
                const score = parseFloat(entry.Score) || 0;
                const lulus = score >= KKM;
                totalScore += score;
                quizzesTaken++;
                if (lulus) quizzesPassed++;
                else quizzesFailed++;

                const qDate = entry.Date || date;
                let takenYear = "-";
                let kiDateObj = null;
                if (qDate && qDate.length === 8) {
                    kiDateObj = new Date(parseInt(qDate.slice(0, 4)), parseInt(qDate.slice(4, 6)) - 1, parseInt(qDate.slice(6, 8)));
                } else if (qDate && qDate.includes("/")) {
                    const [dd, mm, yyyy] = qDate.split("/");
                    kiDateObj = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
                }

                if (startDateObj && kiDateObj && !isNaN(startDateObj.getTime()) && !isNaN(kiDateObj.getTime())) {
                    const diffDays = Math.floor((kiDateObj - startDateObj) / (1000 * 60 * 60 * 24));
                    if (diffDays <= 365) takenYear = "Tahun 1";
                    else if (diffDays <= 730) takenYear = "Tahun 2";
                    else takenYear = "Tahun 3";
                }

                return {
                    lesson,
                    date: qDate,
                    score,
                    status: lulus ? "LULUS" : "TIDAK LULUS",
                    takenYear
                };
            }
            return { lesson, date, score: null, status: "BELUM IKUT", takenYear: "Belum Ikut" };
        });

        const quizzesNotTaken = totalKI - quizzesTaken;
        const avgScore = quizzesTaken > 0 ? Math.round((totalScore / quizzesTaken) * 10) / 10 : 0;
        const pctLulus = totalKI > 0 ? Math.round((quizzesPassed / totalKI) * 100) : 0;
        const pctTidakLulus = totalKI > 0 ? Math.round(((quizzesFailed + quizzesNotTaken) / totalKI) * 100) : 0;
        const completionPct = totalKI > 0 ? Math.round((quizzesTaken / totalKI) * 100) : 0;

        // Format tanggal masuk
        let formattedTanggalMasuk = "-";
        if (effectiveDate && effectiveDate.length === 8 && !effectiveDate.includes("/")) {
            formattedTanggalMasuk = `${effectiveDate.substring(0, 4)}-${effectiveDate.substring(4, 6)}-${effectiveDate.substring(6, 8)}`;
        } else if (effectiveDate) {
            formattedTanggalMasuk = effectiveDate;
        }

        rows.push({
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
            quizzesNotTaken,
            totalQuizzes: totalKI,
            completionPct,
            pctLulus,
            pctTidakLulus,
            quizDetails, // full detail for popup
        });
    }

    // 6. Apply filters
    let filtered = rows;

    if (filters.year && filters.year > 0) {
        filtered = filtered.filter(r => r.tenure.year === filters.year);
    }

    if (filters.asmLeader) {
        filtered = filtered.filter(r =>
            r.asmLeaderName && r.asmLeaderName.toLowerCase().includes(filters.asmLeader.toLowerCase())
        );
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

    // 7. Year breakdown stats
    const yearGroups = { 1: [], 2: [], 3: [] };
    for (const r of filtered) {
        const yr = r.tenure.year;
        if (yearGroups[yr] !== undefined) yearGroups[yr].push(r);
        else yearGroups[3].push(r); // default to year 3 if missing/other
    }

    const yearBreakdown = [1, 2, 3].map(yr => {
        const group = yearGroups[yr] || [];
        const sudahIkut = group.filter(r => r.quizzesTaken > 0).length;
        const avgPctLulus = group.length > 0
            ? Math.round(group.reduce((sum, r) => sum + r.pctLulus, 0) / group.length)
            : 0;
        const avgScore = group.length > 0
            ? Math.round((group.reduce((sum, r) => sum + r.avgScore, 0) / group.length) * 10) / 10
            : 0;
        return {
            label: yr <= 3 ? `Tahun ${yr}` : `${yr}+ Tahun`,
            totalSiswa: group.length,
            sudahIkut,
            pctPartisipasi: group.length > 0 ? Math.round((sudahIkut / group.length) * 100) : 0,
            avgPctLulus,
            avgScore,
        };
    }).filter(g => g.totalSiswa > 0);

    // 8. Summary stats
    const summary = {
        totalStudents: filtered.length,
        avgCompletion: filtered.length > 0
            ? Math.round(filtered.reduce((sum, r) => sum + r.completionPct, 0) / filtered.length)
            : 0,
        avgScore: filtered.length > 0
            ? Math.round((filtered.reduce((sum, r) => sum + r.avgScore, 0) / filtered.length) * 10) / 10
            : 0,
        yearBreakdown,
    };

    // Collect unique ASM leaders for filter dropdown
    const asmLeaders = [...new Set(
        rows.map(r => r.asmLeaderName).filter(n => n && n !== "-")
    )].sort();

    return {
        data: filtered,
        masterLessons,    // array of {lesson, date} for popup reference
        summary,
        asmLeaders,       // for dropdown filter
    };
}
