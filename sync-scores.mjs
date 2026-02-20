/**
 * Sync Score Details - Reconcile missing data from attempts to scoredetails
 * 
 * Problem: Some quiz attempts exist in `attempts:LOGIN` keys but are missing
 * from `scoredetails:all`. This script scans all attempts and fills the gaps.
 * 
 * Run with: node sync-scores.mjs
 */

import { config } from 'dotenv';
import { Redis } from '@upstash/redis';

// Load .env
config({ path: '.env' });

async function syncScoreDetails() {
    console.log('='.repeat(60));
    console.log('🔄 SYNC SCORE DETAILS - Reconcile Missing Data');
    console.log('='.repeat(60));

    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        console.error('❌ Error: Redis credentials not found in .env.local');
        process.exit(1);
    }

    try {
        // ============================================================
        // Step 1: Read existing scoredetails:all
        // ============================================================
        console.log('\n📥 Step 1: Reading existing scoredetails:all...');
        const existingScores = await redis.get('scoredetails:all') || [];
        console.log(`   Found ${existingScores.length} existing score detail records`);

        // Build lookup set for fast checking: "LOGIN|LESSON"
        const existingKeys = new Set(
            existingScores.map(s => `${s.Login?.toUpperCase()}|${s.Lesson}`)
        );

        // ============================================================
        // Step 2: Read master:program-siswa for enrichment
        // ============================================================
        console.log('\n📥 Step 2: Reading master:program-siswa...');
        const programSiswa = await redis.get('master:program-siswa') || [];
        console.log(`   Found ${programSiswa.length} program siswa records`);

        // Build lookup map: LOGIN -> { namaProgram, batch }
        const programMap = {};
        programSiswa.forEach(p => {
            programMap[p.login?.toUpperCase()] = {
                namaProgram: p.namaProgram || 'UNKNOWN',
                batch: p.batch || '',
            };
        });

        // ============================================================
        // Step 3: Scan all attempts:* keys using SCAN
        // ============================================================
        console.log('\n📥 Step 3: Scanning all attempts:* keys...');
        const attemptKeys = [];
        let cursor = 0;

        do {
            const [nextCursor, keys] = await redis.scan(cursor, {
                match: 'attempts:*',
                count: 100,
            });
            cursor = nextCursor;
            attemptKeys.push(...keys);
        } while (cursor !== 0);

        console.log(`   Found ${attemptKeys.length} attempt keys (users with quiz data)`);

        // ============================================================
        // Step 4: Read all attempts and cross-reference
        // ============================================================
        console.log('\n🔍 Step 4: Cross-referencing attempts with scoredetails...');

        let addedCount = 0;
        let alreadyExistsCount = 0;
        let errorCount = 0;
        const addedDetails = [];
        const newScores = [...existingScores]; // Clone to modify

        for (const key of attemptKeys) {
            // Extract login from key "attempts:LOGIN"
            const login = key.replace('attempts:', '').toUpperCase();

            try {
                const attempts = await redis.get(key);
                if (!attempts || typeof attempts !== 'object') continue;

                // Each attempt: { lessonName: { score, grade, gradeDesc, correct, total, completedAt } }
                for (const [lesson, result] of Object.entries(attempts)) {
                    const lookupKey = `${login}|${lesson}`;

                    if (existingKeys.has(lookupKey)) {
                        alreadyExistsCount++;
                        continue;
                    }

                    // Missing! Create score detail entry
                    const program = programMap[login] || { namaProgram: 'UNKNOWN', batch: '' };

                    // Extract date from completedAt or use fallback
                    let dateStr = '';
                    let timeStr = '';
                    if (result.completedAt) {
                        const completedDate = new Date(result.completedAt);
                        dateStr = completedDate.toISOString().split('T')[0].replace(/-/g, '');
                        timeStr = completedDate.toTimeString().split(' ')[0];
                    }

                    const scoreDetail = {
                        Login: login,
                        Batch: program.batch,
                        EvaluationYearSequence: '1',
                        NamaProgram: program.namaProgram,
                        Section: 'KURIKULUM INDEPENDEN',
                        Lesson: lesson,
                        Score: (result.score ?? '').toString(),
                        Grade: result.grade || result.rangeScore || '',
                        Date: dateStr,
                        SubmitTime: timeStr,
                        Description: result.gradeDesc || '',
                        Company: '',
                        isASM: false,
                        _syncedFromAttempt: true,           // Mark as synced (audit trail)
                        _syncedAt: new Date().toISOString(),
                    };

                    newScores.push(scoreDetail);
                    existingKeys.add(lookupKey); // Prevent duplicates within this run
                    addedCount++;

                    addedDetails.push({
                        login,
                        lesson,
                        score: scoreDetail.Score,
                        grade: scoreDetail.Grade,
                        desc: scoreDetail.Description,
                    });
                }
            } catch (err) {
                console.error(`   ⚠️ Error reading ${key}:`, err.message);
                errorCount++;
            }
        }

        // ============================================================
        // Step 5: Report before saving
        // ============================================================
        console.log('\n' + '='.repeat(60));
        console.log('📊 SYNC REPORT');
        console.log('='.repeat(60));
        console.log(`   Existing score details:    ${existingScores.length}`);
        console.log(`   Attempts already in sync:  ${alreadyExistsCount}`);
        console.log(`   ✨ NEW records to add:     ${addedCount}`);
        console.log(`   Errors:                    ${errorCount}`);
        console.log(`   Total after sync:          ${newScores.length}`);

        if (addedCount > 0) {
            console.log('\n📋 New records detail:');
            console.log('-'.repeat(80));
            console.log(
                'LOGIN'.padEnd(20) +
                'LESSON'.padEnd(30) +
                'SCORE'.padEnd(8) +
                'GRADE'.padEnd(6) +
                'DESCRIPTION'
            );
            console.log('-'.repeat(80));
            addedDetails.forEach(d => {
                console.log(
                    d.login.padEnd(20) +
                    d.lesson.padEnd(30) +
                    d.score.padEnd(8) +
                    d.grade.padEnd(6) +
                    d.desc
                );
            });

            // ============================================================
            // Step 6: Save merged data back to Redis
            // ============================================================
            console.log('\n💾 Step 6: Saving merged data to scoredetails:all...');
            await redis.set('scoredetails:all', newScores);
            console.log(`   ✅ Successfully saved ${newScores.length} records to Redis!`);

            // Summary by login
            console.log('\n👥 Added records per Login:');
            const loginSummary = {};
            addedDetails.forEach(d => {
                loginSummary[d.login] = (loginSummary[d.login] || 0) + 1;
            });
            Object.entries(loginSummary)
                .sort((a, b) => b[1] - a[1])
                .forEach(([login, count]) => {
                    console.log(`   ${login}: +${count} records`);
                });
        } else {
            console.log('\n✅ All attempts are already in sync! No new records needed.');
        }

        console.log('\n' + '='.repeat(60));
        console.log('🏁 Sync completed!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

syncScoreDetails();
