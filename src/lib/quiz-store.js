import { Redis } from "@upstash/redis";

/**
 * Quiz KV Store Utility Functions using Upstash Redis
 * OPTIMIZED: Uses single key storage to reduce commands
 * Keys: "quizzes:all" for all quizzes, "attempts:LOGIN" for user attempts
 */

// Initialize Redis client
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// ==================== QUIZ STORAGE (OPTIMIZED) ====================

/**
 * Get all quizzes - OPTIMIZED: 1 command instead of 1+N
 */
export async function getAllQuizzes() {
    try {
        const quizzes = await redis.get("quizzes:all");
        return quizzes || [];
    } catch (error) {
        console.error("Redis getAllQuizzes error:", error);
        return [];
    }
}

/**
 * Get quiz by lesson name - OPTIMIZED: uses cached array
 */
export async function getQuiz(lessonName) {
    try {
        const quizzes = await getAllQuizzes();
        return quizzes.find(q => q.lessonName === lessonName) || null;
    } catch (error) {
        console.error("Redis getQuiz error:", error);
        return null;
    }
}

/**
 * Create or update quiz - OPTIMIZED: updates single array
 */
export async function saveQuiz(lessonName, quizData) {
    try {
        const quizzes = await getAllQuizzes();
        const index = quizzes.findIndex(q => q.lessonName === lessonName);
        
        const quizWithMeta = {
            ...quizData,
            lessonName,
            key: `quiz:${lessonName}`, // Keep for compatibility
        };
        
        if (index >= 0) {
            quizzes[index] = quizWithMeta;
        } else {
            quizzes.push(quizWithMeta);
        }
        
        await redis.set("quizzes:all", quizzes);
        return true;
    } catch (error) {
        console.error("Redis saveQuiz error:", error);
        return false;
    }
}

/**
 * Delete quiz - OPTIMIZED: removes from array
 */
export async function deleteQuiz(lessonName) {
    try {
        const quizzes = await getAllQuizzes();
        const filtered = quizzes.filter(q => q.lessonName !== lessonName);
        await redis.set("quizzes:all", filtered);
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

// ==================== QUIZ ATTEMPTS (OPTIMIZED) ====================

/**
 * Save quiz attempt for a user - OPTIMIZED: stores per-user object
 */
export async function saveAttempt(login, lessonName, result) {
    try {
        const userKey = `attempts:${login.toUpperCase()}`;
        const attempts = await redis.get(userKey) || {};
        
        attempts[lessonName] = {
            ...result,
            completedAt: new Date().toISOString(),
        };
        
        await redis.set(userKey, attempts);
        return { success: true };
    } catch (error) {
        console.error("saveAttempt error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Get quiz attempt for a user - OPTIMIZED: 1 GET for all attempts
 */
export async function getAttempt(login, lessonName) {
    try {
        const userKey = `attempts:${login.toUpperCase()}`;
        const attempts = await redis.get(userKey) || {};
        return attempts[lessonName] || null;
    } catch (error) {
        console.error("getAttempt error:", error);
        return null;
    }
}

/**
 * Get multiple attempts for a user - OPTIMIZED: 1 command instead of 1+N
 */
export async function getUserAttempts(login) {
    try {
        const userKey = `attempts:${login.toUpperCase()}`;
        const attempts = await redis.get(userKey) || {};
        return attempts;
    } catch (error) {
        console.error("getUserAttempts error:", error);
        return {};
    }
}
