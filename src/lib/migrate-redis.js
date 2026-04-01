import redis from "./redis-client";
import { buildKey, ENTITIES, LEGACY_KEYS } from "./key-builder";

/**
 * Migration Script: Re-map old Redis keys to new namespace format
 * 
 * Old keys: scoredetails:all, master:programs, etc.
 * New keys: HCD:HCQ:Cendekia:ScoreDetail, HCD:HCQ:Cendekia:MasterProgram, etc.
 * 
 * Also handles A2 migration: merges attempts data into ScoreDetail
 * 
 * This script is SAFE to run multiple times (idempotent).
 */

/**
 * Migrate a single key from old format to new format
 * @param {string} oldKey - Legacy key name
 * @param {string} entity - Entity constant from ENTITIES
 * @returns {object} Migration result
 */
async function migrateKey(oldKey, entity) {
    const newKey = buildKey(entity);
    console.log(`\n--- Migrating: "${oldKey}" → "${newKey}" ---`);

    try {
        // Check if new key already has data
        const existing = await redis.get(newKey);
        if (existing && (Array.isArray(existing) ? existing.length > 0 : Object.keys(existing).length > 0)) {
            console.log(`  ✅ New key already has data (${Array.isArray(existing) ? existing.length : 'object'} items). Skipping.`);
            return { skipped: true, key: newKey, count: Array.isArray(existing) ? existing.length : 1 };
        }

        // Read from old key
        const oldData = await redis.get(oldKey);
        if (!oldData || (Array.isArray(oldData) && oldData.length === 0)) {
            console.log(`  ⚠️ Old key is empty or doesn't exist. Creating empty.`);
            await redis.set(newKey, []);
            return { success: true, key: newKey, count: 0 };
        }

        // Write to new key
        await redis.set(newKey, oldData);
        const count = Array.isArray(oldData) ? oldData.length : 1;
        console.log(`  ✅ Migrated ${count} items to new key.`);

        return { success: true, key: newKey, count };
    } catch (error) {
        console.error(`  ❌ Error migrating ${oldKey}:`, error.message);
        return { success: false, key: newKey, error: error.message };
    }
}

/**
 * Migrate attempts data into ScoreDetail (A2)
 * Finds records in attempts:* that don't exist in ScoreDetail and merges them
 */
async function migrateAttemptsToScoreDetail() {
    console.log("\n=== Migrating Attempts → ScoreDetail (A2) ===");

    try {
        const scoreKey = buildKey(ENTITIES.SCORE_DETAIL);
        const allScores = await redis.get(scoreKey) || [];

        // Build lookup set for fast checking
        const existingKeys = new Set(
            allScores.map(s => `${s.Login?.toUpperCase()}|${s.Lesson}`)
        );

        // Get program siswa for enrichment
        const programSiswaKey = buildKey(ENTITIES.PROGRAM_SISWA);
        const programSiswa = await redis.get(programSiswaKey) || [];
        const programMap = {};
        programSiswa.forEach(p => {
            const login = p.login?.toUpperCase();
            if (login) {
                programMap[login] = {
                    namaProgram: p.namaProgram || "UNKNOWN",
                    batch: p.batch || "",
                };
            }
        });

        // Scan for old attempts:* keys
        let addedCount = 0;
        let cursor = 0;

        do {
            const result = await redis.scan(cursor, { match: "attempts:*", count: 100 });
            cursor = result[0];
            const keys = result[1];

            for (const attemptKey of keys) {
                const login = attemptKey.replace("attempts:", "").toUpperCase();
                const attempts = await redis.get(attemptKey);

                if (!attempts || typeof attempts !== "object") continue;

                for (const [lesson, attemptData] of Object.entries(attempts)) {
                    const lookupKey = `${login}|${lesson}`;
                    if (existingKeys.has(lookupKey)) continue;

                    // Create ScoreDetail from attempt data
                    const program = programMap[login] || { namaProgram: "UNKNOWN", batch: "" };

                    let dateStr = "";
                    let timeStr = "";
                    if (attemptData.completedAt) {
                        const completedDate = new Date(attemptData.completedAt);
                        dateStr = completedDate.toISOString().split("T")[0].replace(/-/g, "");
                        timeStr = completedDate.toTimeString().split(" ")[0];
                    }

                    const scoreDetail = {
                        Login: login,
                        Batch: program.batch,
                        EvaluationYearSequence: "1",
                        NamaProgram: program.namaProgram,
                        Section: "KURIKULUM INDEPENDEN",
                        Lesson: lesson,
                        Score: (attemptData.score ?? "").toString(),
                        Grade: attemptData.grade || attemptData.rangeScore || "",
                        Date: dateStr,
                        SubmitTime: timeStr,
                        Description: attemptData.gradeDesc || "",
                        Company: "",
                        isASM: false,
                        _migratedFromAttempt: true,
                        _migratedAt: new Date().toISOString(),
                    };

                    allScores.push(scoreDetail);
                    existingKeys.add(lookupKey);
                    addedCount++;
                }
            }
        } while (cursor !== 0);

        if (addedCount > 0) {
            await redis.set(scoreKey, allScores);
            console.log(`  ✅ Merged ${addedCount} attempt records into ScoreDetail.`);
        } else {
            console.log(`  ✅ No new attempt records to merge. All in sync.`);
        }

        return { success: true, merged: addedCount, totalScores: allScores.length };
    } catch (error) {
        console.error("  ❌ Attempts migration error:", error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Run all migrations (key re-mapping + A2 attempts merge)
 */
export async function runAllMigrations() {
    console.log("========================================");
    console.log("🔄 Redis Key Re-Mapping Migration");
    console.log("========================================\n");

    const results = {};

    // Step 1: Migrate all standard keys
    console.log("=== Step 1: Key Re-Mapping ===");
    for (const [oldKey, entity] of Object.entries(LEGACY_KEYS)) {
        results[oldKey] = await migrateKey(oldKey, entity);
    }

    // Step 2: Merge attempts into ScoreDetail (A2)
    console.log("\n=== Step 2: Attempts → ScoreDetail (A2) ===");
    results.attemptsToScoreDetail = await migrateAttemptsToScoreDetail();

    console.log("\n========================================");
    console.log("🏁 Migration Complete!");
    console.log("========================================");
    console.log("Results:", JSON.stringify(results, null, 2));

    return results;
}

// Export individual functions for selective migration
export {
    migrateKey,
    migrateAttemptsToScoreDetail,
};
