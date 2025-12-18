import { NextResponse } from "next/server";
import { getQuiz, calculateScore } from "@/lib/quiz-store";

// Master SISWA URL for submitting scores
const MASTER_SISWA_URL = process.env.MASTER_SISWA_URL || "http://pegadev2.sinarmas.co.id/prweb/api/EHC/v01/MasterSISWA";
const MASTER_SISWA_USERNAME = process.env.MASTER_SISWA_USERNAME || "";
const MASTER_SISWA_PASSWORD = process.env.MASTER_SISWA_PASSWORD || "";

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

        // Get quiz with correct answers
        const quiz = await getQuiz(lessonName);
        if (!quiz) {
            return NextResponse.json({ error: "Quiz tidak ditemukan" }, { status: 404 });
        }

        // Calculate score
        const result = calculateScore(quiz.questions, answers);

        // Prepare score data for API
        const scoreData = {
            Type: "ScoreDetail",
            pyCompany: "SISWA",
            Login: login.toUpperCase(),
            Lesson: lessonName,
            Score: result.score.toString(),
            Program: userData?.NamaProgramPelatihan || quiz.lessonData?.program || "ODP",
            Section: quiz.lessonData?.section || "KURIKULUM INDEPENDEN",
            SKS: quiz.lessonData?.sks || "1",
            RangeScore: result.grade,
            RangeKKM: result.grade,
            Batch: "1",
            Description: result.gradeDesc,
        };

        // Submit to external API
        let apiSuccess = false;
        let apiError = null;

        try {
            const credentials = Buffer.from(`${MASTER_SISWA_USERNAME}:${MASTER_SISWA_PASSWORD}`).toString("base64");

            const apiRes = await fetch(MASTER_SISWA_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Basic ${credentials}`,
                },
                body: JSON.stringify(scoreData),
            });

            if (apiRes.ok) {
                apiSuccess = true;
            } else {
                apiError = `HTTP ${apiRes.status}`;
            }
        } catch (e) {
            apiError = e.message;
            console.error("Submit to API error:", e);
        }

        return NextResponse.json({
            success: true,
            result: {
                score: result.score,
                grade: result.grade,
                gradeDesc: result.gradeDesc,
                correct: result.correct,
                total: result.total,
            },
            apiSubmission: {
                success: apiSuccess,
                error: apiError,
            },
        });
    } catch (error) {
        console.error("Quiz submit error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
