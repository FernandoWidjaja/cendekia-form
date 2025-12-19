import { NextResponse } from "next/server";
import { getUserAttempts } from "@/lib/quiz-store";

/**
 * GET /api/quiz/attempts?login=XXX
 * Get all quiz attempts for a user
 */
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const login = searchParams.get("login");

    if (!login) {
        return NextResponse.json({ success: false, data: {} });
    }

    const attempts = await getUserAttempts(login);

    return NextResponse.json({
        success: true,
        data: attempts,
    });
}
