import { Redis } from "@upstash/redis";

/**
 * Quiz KV Store Utility Functions using Upstash Redis
 * Keys format: "quiz:{lessonName}"
 */

// Initialize Redis client
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

/**
 * Get all quizzes
 */
export async function getAllQuizzes() {
    try {
        const keys = await redis.keys("quiz:*");
        if (!keys.length) return [];

        const quizzes = await Promise.all(
            keys.map(async (key) => {
                const quiz = await redis.get(key);
                return { key, ...quiz };
            })
        );
        return quizzes;
    } catch (error) {
        console.error("Redis getAllQuizzes error:", error);
        return [];
    }
}

/**
 * Get quiz by lesson name
 */
export async function getQuiz(lessonName) {
    try {
        const key = `quiz:${lessonName}`;
        const quiz = await redis.get(key);
        return quiz;
    } catch (error) {
        console.error("Redis getQuiz error:", error);
        return null;
    }
}

/**
 * Create or update quiz
 */
export async function saveQuiz(lessonName, quizData) {
    try {
        const key = `quiz:${lessonName}`;
        await redis.set(key, quizData);
        return true;
    } catch (error) {
        console.error("Redis saveQuiz error:", error);
        return false;
    }
}

/**
 * Delete quiz
 */
export async function deleteQuiz(lessonName) {
    try {
        const key = `quiz:${lessonName}`;
        await redis.del(key);
        return true;
    } catch (error) {
        console.error("Redis deleteQuiz error:", error);
        return false;
    }
}

/**
 * Calculate score from answers with grade table (KURIKULUM INDEPENDEN)
 * @param {Array} questions - Quiz questions
 * @param {Array} answers - User answers (indexes)
 * @returns {Object} - { score, rangeScore, weight, gradeDesc }
 */
export function calculateScore(questions, answers) {
    let correct = 0;

    questions.forEach((q, i) => {
        if (answers[i] === q.correctAnswer) {
            correct++;
        }
    });

    const score = Math.round((correct / questions.length) * 100);

    // Grade table based on KURIKULUM INDEPENDEN
    let rangeScore, weight, gradeDesc;
    if (score >= 90) {
        rangeScore = "A+";
        weight = 5;
        gradeDesc = "LULUS DENGAN MEMUASKAN";
    } else if (score >= 80) {
        rangeScore = "A";
        weight = 4;
        gradeDesc = "LULUS DENGAN BAIK";
    } else if (score >= 70) {
        rangeScore = "B";
        weight = 3;
        gradeDesc = "LULUS CUKUP BAIK";
    } else if (score >= 60) {
        rangeScore = "C";
        weight = 2;
        gradeDesc = "LULUS";
    } else if (score >= 40) {
        rangeScore = "D";
        weight = 1;
        gradeDesc = "TIDAK LULUS";
    } else {
        rangeScore = "E";
        weight = 0;
        gradeDesc = "GAGAL";
    }

    return {
        score,
        rangeScore,
        weight,
        gradeDesc,
        correct,
        total: questions.length,
        grade: rangeScore // backward compatibility
    };
}

// ==================== QUIZ ATTEMPTS ====================

/**
 * Save quiz attempt for a user
 */
export async function saveAttempt(login, lessonName, result) {
    try {
        const key = `attempt:${login.toUpperCase()}:${lessonName}`;
        const data = {
            ...result,
            completedAt: new Date().toISOString(),
        };
        await redis.set(key, data);
        return { success: true };
    } catch (error) {
        console.error("saveAttempt error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Get quiz attempt for a user
 */
export async function getAttempt(login, lessonName) {
    try {
        const key = `attempt:${login.toUpperCase()}:${lessonName}`;
        const attempt = await redis.get(key);
        return attempt;
    } catch (error) {
        console.error("getAttempt error:", error);
        return null;
    }
}

/**
 * Get multiple attempts for a user (all lessons)
 */
export async function getUserAttempts(login) {
    try {
        const keys = await redis.keys(`attempt:${login.toUpperCase()}:*`);
        if (!keys.length) return {};

        const attempts = {};
        for (const key of keys) {
            const lessonName = key.split(":").slice(2).join(":");
            attempts[lessonName] = await redis.get(key);
        }
        return attempts;
    } catch (error) {
        console.error("getUserAttempts error:", error);
        return {};
    }
}
