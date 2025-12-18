import { NextResponse } from "next/server";
import { getAllQuizzes, getQuiz, saveQuiz, deleteQuiz } from "@/lib/quiz-store";
import { adminLimiter, getIP, checkRateLimit } from "@/lib/rate-limiter";

// Admin credentials (from env or hardcoded for security)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "WIDJ47@GMAIL.COM";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "@ASMHCD2025";

/**
 * Check rate limit for admin API
 */
async function checkAdminRateLimit(request) {
    const ip = getIP(request);
    const result = await checkRateLimit(adminLimiter, ip);
    if (!result.success) {
        return NextResponse.json(
            { error: "Terlalu banyak request. Coba lagi dalam 1 menit." },
            { status: 429 }
        );
    }
    return null;
}

/**
 * Verify admin auth from request headers
 */
function verifyAdmin(request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return false;

    try {
        const base64 = authHeader.replace("Basic ", "");
        const decoded = Buffer.from(base64, "base64").toString("utf-8");
        const colonIndex = decoded.indexOf(":");
        const email = decoded.substring(0, colonIndex);
        const password = decoded.substring(colonIndex + 1);

        return email.toUpperCase() === ADMIN_EMAIL.toUpperCase() && password === ADMIN_PASSWORD;
    } catch (e) {
        console.error("Auth error:", e);
        return false;
    }
}

/**
 * GET /api/admin/quiz - List all quizzes
 */
export async function GET(request) {
    const rateLimitError = await checkAdminRateLimit(request);
    if (rateLimitError) return rateLimitError;

    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quizzes = await getAllQuizzes();
    return NextResponse.json({ success: true, data: quizzes });
}

/**
 * POST /api/admin/quiz - Create/Update quiz
 */
export async function POST(request) {
    const rateLimitError = await checkAdminRateLimit(request);
    if (rateLimitError) return rateLimitError;

    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { lessonName, lessonData, timerMinutes, startDate, endDate, isActive, questions } = body;

        if (!lessonName || !questions?.length) {
            return NextResponse.json(
                { error: "lessonName dan questions wajib diisi" },
                { status: 400 }
            );
        }

        const quizData = {
            lessonName,
            lessonData: lessonData || {},
            timerMinutes: timerMinutes || 30,
            startDate: startDate || null,
            endDate: endDate || null,
            isActive: isActive ?? true,
            questions,
            updatedAt: new Date().toISOString(),
        };

        const success = await saveQuiz(lessonName, quizData);

        if (success) {
            return NextResponse.json({ success: true, message: "Quiz saved" });
        } else {
            return NextResponse.json(
                { error: "Failed to save quiz" },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("POST quiz error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/quiz - Delete quiz
 */
export async function DELETE(request) {
    const rateLimitError = await checkAdminRateLimit(request);
    if (rateLimitError) return rateLimitError;

    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { lessonName } = body;

        if (!lessonName) {
            return NextResponse.json(
                { error: "lessonName wajib diisi" },
                { status: 400 }
            );
        }

        const success = await deleteQuiz(lessonName);

        if (success) {
            return NextResponse.json({ success: true, message: "Quiz deleted" });
        } else {
            return NextResponse.json(
                { error: "Failed to delete quiz" },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error("DELETE quiz error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
