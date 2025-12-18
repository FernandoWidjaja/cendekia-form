import { NextResponse } from "next/server";
import { getAllQuizzes } from "@/lib/quiz-store";

/**
 * GET /api/quiz/active
 * Returns only lessons that have active quizzes (within date range)
 */
export async function GET() {
    try {
        const quizzes = await getAllQuizzes();
        const now = new Date();

        // Filter only active quizzes (within date range)
        const activeQuizzes = quizzes.filter((quiz) => {
            if (!quiz.isActive || !quiz.startDate || !quiz.endDate) return false;

            const start = new Date(quiz.startDate);
            const end = new Date(quiz.endDate);
            end.setHours(23, 59, 59);

            return now >= start && now <= end;
        });

        // Return just the lesson names for dropdown
        const activeLessons = activeQuizzes.map((quiz) => ({
            nama: quiz.lessonName,
            timerMinutes: quiz.timerMinutes,
            questionCount: quiz.questions?.length || 0,
        }));

        return NextResponse.json({
            success: true,
            data: activeLessons,
        });
    } catch (error) {
        console.error("Get active quizzes error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
