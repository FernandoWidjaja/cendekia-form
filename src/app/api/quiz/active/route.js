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

        console.log("=== Quiz Active Check ===");
        console.log("Current time:", now.toISOString());
        console.log("Total quizzes:", quizzes.length);

        // Filter only active quizzes (within date range)
        const activeQuizzes = quizzes.filter((quiz) => {
            console.log(`\nQuiz: ${quiz.lessonName}`);
            console.log(`  isActive: ${quiz.isActive}`);
            console.log(`  startDate: ${quiz.startDate}`);
            console.log(`  endDate: ${quiz.endDate}`);

            if (!quiz.isActive) {
                console.log("  SKIP: not active");
                return false;
            }
            if (!quiz.startDate || !quiz.endDate) {
                console.log("  SKIP: no dates");
                return false;
            }

            const start = new Date(quiz.startDate);
            const end = new Date(quiz.endDate);

            console.log(`  Start parsed: ${start.toISOString()}`);
            console.log(`  End parsed: ${end.toISOString()}`);

            const isWithin = now >= start && now <= end;
            console.log(`  now >= start: ${now >= start}, now <= end: ${now <= end}`);
            console.log(`  RESULT: ${isWithin ? "ACTIVE" : "NOT ACTIVE"}`);

            return isWithin;
        });

        console.log("\nActive quizzes count:", activeQuizzes.length);

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
