import { NextResponse } from "next/server";
import { getQuiz, calculateScore, saveAttempt, getAttempt } from "@/lib/quiz-store";
import { getProgramSiswaByLogin, saveScoreDetail } from "@/lib/program-store";

/**
 * Calculate EvaluationYearSequence from EffectiveDate
 */
function calculateEvaluationYear(effectiveDateStr) {
    if (!effectiveDateStr) return "1";

    try {
        let effectiveDate;
        if (effectiveDateStr.length === 8) {
            const year = effectiveDateStr.slice(0, 4);
            const month = effectiveDateStr.slice(4, 6);
            const day = effectiveDateStr.slice(6, 8);
            effectiveDate = new Date(`${year}-${month}-${day}`);
        } else {
            effectiveDate = new Date(effectiveDateStr);
        }

        const now = new Date();
        const diffMs = now - effectiveDate;
        const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365);

        if (diffYears < 1) return "1";
        if (diffYears < 2) return "2";
        return "3";
    } catch {
        return "1";
    }
}

/**
 * POST /api/quiz/submit
 * Submit quiz answers and calculate score
 * Body: { lessonName, answers, login, userData }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { lessonName, answers, login, userData } = body;

        if (!lessonName || !answers || !login) {
            return NextResponse.json(
                { error: "lessonName, answers, dan login wajib diisi" },
                { status: 400 }
            );
        }

        // Check if already attempted
        const existingAttempt = await getAttempt(login, lessonName);
        if (existingAttempt) {
            return NextResponse.json({
                error: "Anda sudah mengerjakan quiz ini",
                existingResult: existingAttempt,
            }, { status: 403 });
        }

        // Get quiz with correct answers
        const quiz = await getQuiz(lessonName);
        if (!quiz) {
            return NextResponse.json({ error: "Quiz tidak ditemukan" }, { status: 404 });
        }

        // Calculate score
        const result = calculateScore(quiz.questions, answers);

        // Get program + batch from Master Program per Siswa
        const programSiswa = await getProgramSiswaByLogin(login);
        const namaProgram = programSiswa?.namaProgram || "UNKNOWN";
        const batch = programSiswa?.batch || "";

        // Calculate EvaluationYearSequence
        const evalYear = calculateEvaluationYear(userData?.EffectiveDate);

        // Format date as YYYYMMDD and time as HH:mm:ss
        const now = new Date();
        const dateStr = now.toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD
        const timeStr = now.toTimeString().split(" ")[0]; // HH:mm:ss

        // Prepare ScoreDetail data (format untuk API nanti)
        const scoreData = {
            Login: login.toUpperCase(),
            Batch: batch,
            EvaluationYearSequence: evalYear,
            NamaProgram: namaProgram,
            Section: quiz.lessonData?.section || "KURIKULUM INDEPENDEN",
            Lesson: lessonName,
            Score: result.score.toString(),
            Date: dateStr,
            SubmitTime: timeStr,
            Description: result.gradeDesc,
        };

        console.log("ScoreDetail payload:", scoreData);

        // Save to Upstash (API disabled, simpan ke database dulu)
        await saveScoreDetail(scoreData);
        console.log("ScoreDetail saved to Upstash");

        // Save attempt to database
        await saveAttempt(login, lessonName, {
            score: result.score,
            grade: result.grade,
            gradeDesc: result.gradeDesc,
            correct: result.correct,
            total: result.total,
        });

        return NextResponse.json({
            success: true,
            result: {
                score: result.score,
                grade: result.grade,
                gradeDesc: result.gradeDesc,
                correct: result.correct,
                total: result.total,
            },
            savedToDatabase: true,
        });
    } catch (error) {
        console.error("Quiz submit error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
