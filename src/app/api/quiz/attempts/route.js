import { NextResponse } from "next/server";
import { getUserCompletedQuizzes } from "@/lib/program-store";

/**
 * GET /api/quiz/attempts?login=XXX
 * Get all completed quizzes for a user
 * 
 * A2: Now reads from ScoreDetail instead of separate attempts keys
 * Returns same format as before for backward compatibility with frontend
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const login = searchParams.get("login");

    if (!login) {
        return NextResponse.json({ success: false, data: {} });
    }

    // A2: Uses ScoreDetail instead of attempts key
    const completedQuizzes = await getUserCompletedQuizzes(login);

    return NextResponse.json({
        success: true,
        data: completedQuizzes,
    });
}
