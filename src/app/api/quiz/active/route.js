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
        const nowTimestamp = now.getTime();

        console.log("=== Quiz Active Check ===");
        console.log("Server time:", now.toISOString());
        console.log("Server timezone offset (minutes):", now.getTimezoneOffset());
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

            // Parse dates - the dates from admin are in format "YYYY-MM-DDTHH:mm" (local time)
            // Add timezone offset to treat them as local time
            let start = new Date(quiz.startDate);
            let end = new Date(quiz.endDate);

            // If stored as simple datetime without timezone, assume it's UTC+7 (WIB)
            // and adjust for server timezone differences
            const serverOffset = now.getTimezoneOffset(); // in minutes (negative for UTC+)
            const wibOffset = -420; // UTC+7 = -420 minutes

            // If there's a mismatch, adjust the parsed dates
            if (serverOffset !== wibOffset) {
                const diffMinutes = wibOffset - serverOffset;
                start = new Date(start.getTime() + diffMinutes * 60 * 1000);
                end = new Date(end.getTime() + diffMinutes * 60 * 1000);
                console.log(`  Adjusted for timezone (diff ${diffMinutes} min)`);
            }

            console.log(`  Start (adjusted): ${start.toISOString()}`);
            console.log(`  End (adjusted): ${end.toISOString()}`);

            const isWithin = nowTimestamp >= start.getTime() && nowTimestamp <= end.getTime();
            console.log(`  now >= start: ${nowTimestamp >= start.getTime()}, now <= end: ${nowTimestamp <= end.getTime()}`);
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
