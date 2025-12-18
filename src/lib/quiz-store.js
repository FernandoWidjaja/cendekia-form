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
 * Calculate score from answers
 * @param {Array} questions - Quiz questions
 * @param {Array} answers - User answers (indexes)
 * @returns {Object} - { score, grade, gradeDesc }
 */
export function calculateScore(questions, answers) {
    let correct = 0;

    questions.forEach((q, i) => {
        if (answers[i] === q.correctAnswer) {
            correct++;
        }
    });

    const score = Math.round((correct / questions.length) * 100);

    // Grade based on KURIKULUM INDEPENDEN
    let grade, gradeDesc;
    if (score >= 90) {
        grade = "A+";
        gradeDesc = "LULUS DENGAN MEMUASKAN";
    } else if (score >= 80) {
        grade = "A";
        gradeDesc = "LULUS DENGAN BAIK";
    } else if (score >= 70) {
        grade = "B";
        gradeDesc = "LULUS CUKUP BAIK";
    } else if (score >= 60) {
        grade = "C";
        gradeDesc = "LULUS";
    } else if (score >= 40) {
        grade = "D";
        gradeDesc = "TIDAK LULUS";
    } else {
        grade = "E";
        gradeDesc = "GAGAL";
    }

    return { score, grade, gradeDesc, correct, total: questions.length };
}
