import { NextResponse } from "next/server";
import { getQuiz } from "@/lib/quiz-store";

/**
 * Check if quiz is currently active based on date range
 */
function isQuizActive(quiz) {
    if (!quiz || !quiz.isActive) return false;
    if (!quiz.startDate || !quiz.endDate) return false;

    const now = new Date();
    const start = new Date(quiz.startDate);
    const end = new Date(quiz.endDate);
    end.setHours(23, 59, 59); // Include the end date fully

    return now >= start && now <= end;
}

/**
 * GET /api/quiz?lesson=LESSONNAME
 * Get quiz by lesson name for students
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const lessonName = searchParams.get("lesson");

    if (!lessonName) {
        return NextResponse.json({ error: "lesson parameter required" }, { status: 400 });
    }

    const quiz = await getQuiz(lessonName);

    if (!quiz) {
        return NextResponse.json({ error: "Quiz tidak ditemukan" }, { status: 404 });
    }

    if (!isQuizActive(quiz)) {
        // Return info about when quiz will be available
        const now = new Date();
        const start = new Date(quiz.startDate);
        const end = new Date(quiz.endDate);

        let message;
        if (now < start) {
            message = `Quiz belum dimulai. Akan aktif pada ${start.toLocaleDateString("id-ID")}`;
        } else if (now > end) {
            message = "Periode quiz sudah berakhir";
        } else {
            message = "Quiz tidak aktif";
        }

        return NextResponse.json({
            error: message,
            quizInfo: {
                startDate: quiz.startDate,
                endDate: quiz.endDate,
            }
        }, { status: 403 });
    }

    // Return quiz without correct answers (for security)
    const safeQuestions = quiz.questions.map((q) => ({
        question: q.question,
        options: q.options,
    }));

    return NextResponse.json({
        success: true,
        data: {
            lessonName: quiz.lessonName,
            timerMinutes: quiz.timerMinutes,
            questionCount: safeQuestions.length,
            questions: safeQuestions,
        },
    });
}
