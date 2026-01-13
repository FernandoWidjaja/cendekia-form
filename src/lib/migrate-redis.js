import { Redis } from "@upstash/redis";

/**
 * Migration Script: Convert old multi-key storage to single-key storage
 * UPDATED: Uses SCAN instead of KEYS to handle large datasets
 */

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

/**
 * Scan all keys matching a pattern using SCAN (handles large datasets)
 */
async function scanKeys(pattern) {
    const allKeys = [];
    let cursor = 0;

    do {
        const result = await redis.scan(cursor, { match: pattern, count: 100 });
        cursor = result[0];
        const keys = result[1];
        allKeys.push(...keys);
    } while (cursor !== 0);

    return allKeys;
}

/**
 * Migrate quizzes from quiz:* keys to quizzes:all
 */
async function migrateQuizzes() {
    console.log("=== Migrating Quizzes ===");

    try {
        // Check if already migrated
        const existing = await redis.get("quizzes:all");
        if (existing && existing.length > 0) {
            console.log("Quizzes already migrated, skipping...");
            return { skipped: true, count: existing.length };
        }

        // Get all old quiz keys using SCAN
        const keys = await scanKeys("quiz:*");
        console.log(`Found ${keys.length} quiz keys`);

        if (keys.length === 0) {
            console.log("No quizzes to migrate");
            return { success: true, count: 0 };
        }

        // Fetch all quizzes
        const quizzes = [];
        for (const key of keys) {
            const quiz = await redis.get(key);
            if (quiz) {
                quizzes.push({
                    ...quiz,
                    key,
                    lessonName: quiz.lessonName || key.replace("quiz:", ""),
                });
            }
        }

        // Save to new format
        await redis.set("quizzes:all", quizzes);
        console.log(`Migrated ${quizzes.length} quizzes to quizzes:all`);

        return { success: true, count: quizzes.length };
    } catch (error) {
        console.error("Quiz migration error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Migrate attempts from attempt:* keys to attempts:LOGIN
 */
async function migrateAttempts() {
    console.log("\n=== Migrating Attempts ===");

    try {
        // Get all old attempt keys using SCAN
        const keys = await scanKeys("attempt:*");
        console.log(`Found ${keys.length} attempt keys`);

        if (keys.length === 0) {
            console.log("No attempts to migrate");
            return { success: true, count: 0 };
        }

        // Group by login
        const attemptsByLogin = {};
        for (const key of keys) {
            const parts = key.split(":");
            if (parts.length >= 3) {
                const login = parts[1];
                const lessonName = parts.slice(2).join(":");

                const attempt = await redis.get(key);
                if (attempt) {
                    if (!attemptsByLogin[login]) {
                        attemptsByLogin[login] = {};
                    }
                    attemptsByLogin[login][lessonName] = attempt;
                }
            }
        }

        // Save per-user attempts
        let userCount = 0;
        for (const [login, attempts] of Object.entries(attemptsByLogin)) {
            const newKey = `attempts:${login}`;

            // Merge with existing if any
            const existing = await redis.get(newKey) || {};
            const merged = { ...existing, ...attempts };

            await redis.set(newKey, merged);
            userCount++;
        }

        console.log(`Migrated attempts for ${userCount} users`);

        return { success: true, count: keys.length, users: userCount };
    } catch (error) {
        console.error("Attempts migration error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Migrate score details from scoredetail:* keys to scoredetails:all
 */
async function migrateScoreDetails() {
    console.log("\n=== Migrating Score Details ===");

    try {
        // Check if already migrated
        const existing = await redis.get("scoredetails:all");
        if (existing && existing.length > 0) {
            console.log("Score details already migrated, skipping...");
            return { skipped: true, count: existing.length };
        }

        // Get keys from index first (old method)
        let indexKeys = await redis.get("scoredetail:keys") || [];

        // If no index, try scanning
        if (indexKeys.length === 0) {
            indexKeys = await scanKeys("scoredetail:*");
            // Filter out the keys index itself
            indexKeys = indexKeys.filter(k => k !== "scoredetail:keys");
        }

        console.log(`Found ${indexKeys.length} score detail keys`);

        if (indexKeys.length === 0) {
            console.log("No score details to migrate");
            return { success: true, count: 0 };
        }

        // Fetch all score details
        const scores = [];
        for (const key of indexKeys) {
            const score = await redis.get(key);
            if (score) {
                // Mark ASM users based on old key format
                const isASM = key.includes(":asm:");
                scores.push({
                    ...score,
                    isASM,
                });
            }
        }

        // Save to new format
        await redis.set("scoredetails:all", scores);
        console.log(`Migrated ${scores.length} score details to scoredetails:all`);

        return { success: true, count: scores.length };
    } catch (error) {
        console.error("Score details migration error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Migrate mitra from mitrakerja:* keys to mitrakerja:all
 */
async function migrateMitra() {
    console.log("\n=== Migrating Mitra ===");

    try {
        // Check if already migrated
        const existing = await redis.get("mitrakerja:all");
        if (existing && existing.length > 0) {
            console.log("Mitra already migrated, skipping...");
            return { skipped: true, count: existing.length };
        }

        // Get keys from index first (old method)
        let indexKeys = await redis.get("mitrakerja:keys") || [];

        // If no index, try scanning
        if (indexKeys.length === 0) {
            indexKeys = await scanKeys("mitrakerja:*");
            // Filter out the keys index itself
            indexKeys = indexKeys.filter(k => k !== "mitrakerja:keys");
        }

        console.log(`Found ${indexKeys.length} mitra keys`);

        if (indexKeys.length === 0) {
            console.log("No mitra to migrate");
            return { success: true, count: 0 };
        }

        // Fetch all mitra
        const mitraList = [];
        for (const key of indexKeys) {
            const mitra = await redis.get(key);
            if (mitra) {
                mitraList.push(mitra);
            }
        }

        // Save to new format
        await redis.set("mitrakerja:all", mitraList);
        console.log(`Migrated ${mitraList.length} mitra to mitrakerja:all`);

        return { success: true, count: mitraList.length };
    } catch (error) {
        console.error("Mitra migration error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Run all migrations
 */
export async function runAllMigrations() {
    console.log("========================================");
    console.log("Starting Redis Data Migration");
    console.log("========================================\n");

    const results = {
        quizzes: await migrateQuizzes(),
        attempts: await migrateAttempts(),
        scoreDetails: await migrateScoreDetails(),
        mitra: await migrateMitra(),
    };

    console.log("\n========================================");
    console.log("Migration Complete!");
    console.log("========================================");
    console.log("Results:", JSON.stringify(results, null, 2));

    return results;
}

// Export individual functions for selective migration
export {
    migrateQuizzes,
    migrateAttempts,
    migrateScoreDetails,
    migrateMitra,
};
