import redis from "./redis-client";
import { buildKey, ENTITIES } from "./key-builder";

/**
 * Quiz KV Store Utility Functions
 * OPTIMIZED: Uses single key storage to reduce commands
 * UPDATED: Uses centralized key-builder for namespace isolation
 * A2: Attempts ELIMINATED — quiz completion tracked via ScoreDetail in program-store.js
 */

// ==================== QUIZ STORAGE (OPTIMIZED) ====================

/**
 * Get all quizzes - OPTIMIZED: 1 command instead of 1+N
 */
export async function getAllQuizzes() {
    try {
        const quizzes = await redis.get(buildKey(ENTITIES.QUIZZES));
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

        await redis.set(buildKey(ENTITIES.QUIZZES), quizzes);
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
        await redis.set(buildKey(ENTITIES.QUIZZES), filtered);
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

// ==================== QUIZ ATTEMPTS — ELIMINATED (A2) ====================
// Quiz completion is now tracked via ScoreDetail in program-store.js
// Use getCompletedQuiz(login, lessonName) to check if quiz is done
// Use getUserCompletedQuizzes(login) to get all completed quizzes for a user
