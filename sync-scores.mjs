/**
 * @deprecated This script is DEPRECATED as of A2 migration.
 * 
 * Attempts have been eliminated — quiz completion is now tracked directly
 * in ScoreDetail (program-store.js). No sync needed.
 * 
 * For migration of existing attempts data into ScoreDetail, use:
 *   POST /api/admin/migrate?step=merge-attempts
 * 
 * Original purpose: Sync Score Details — Reconcile missing data from 
 * attempts to scoredetails.
 * 
 * Run with: node sync-scores.mjs (NO LONGER RECOMMENDED)
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
        console.error('❌ Error: Redis credentials not found in .env');
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
        // Step 2: Read master:program-siswa for login list + enrichment
        // ============================================================
        console.log('\n📥 Step 2: Reading master:program-siswa...');
        const programSiswa = await redis.get('master:program-siswa') || [];
        console.log(`   Found ${programSiswa.length} program siswa records`);

        // Build lookup map: LOGIN -> { namaProgram, batch }
        const programMap = {};
        const allLogins = [];
        programSiswa.forEach(p => {
            const login = p.login?.toUpperCase();
            if (login) {
                programMap[login] = {
                    namaProgram: p.namaProgram || 'UNKNOWN',
                    batch: p.batch || '',
                };
                allLogins.push(login);
            }
        });

        console.log(`   Unique logins to check: ${allLogins.length}`);

        // ============================================================
        // Step 3: Read attempts for each login (batched)
        // ============================================================
        console.log('\n🔍 Step 3: Reading attempts for each login...');

        let addedCount = 0;
        let alreadyExistsCount = 0;
        let noAttemptsCount = 0;
        let errorCount = 0;
        const addedDetails = [];
        const newScores = [...existingScores]; // Clone

        // Process in batches to avoid overwhelming Upstash
        const BATCH_SIZE = 10;
        for (let i = 0; i < allLogins.length; i += BATCH_SIZE) {
            const batch = allLogins.slice(i, i + BATCH_SIZE);

            // Read all attempts in parallel within batch
            const results = await Promise.allSettled(
                batch.map(login => redis.get(`attempts:${login}`))
            );

            for (let j = 0; j < batch.length; j++) {
                const login = batch[j];
                const result = results[j];

                if (result.status === 'rejected') {
                    console.error(`   ⚠️ Error reading attempts:${login}:`, result.reason?.message);
                    errorCount++;
                    continue;
                }

                const attempts = result.value;
                if (!attempts || typeof attempts !== 'object' || Object.keys(attempts).length === 0) {
                    noAttemptsCount++;
                    continue;
                }

                // Each attempt: { lessonName: { score, grade, gradeDesc, correct, total, completedAt } }
                for (const [lesson, attemptData] of Object.entries(attempts)) {
                    const lookupKey = `${login}|${lesson}`;

                    if (existingKeys.has(lookupKey)) {
                        alreadyExistsCount++;
                        continue;
                    }

                    // Missing! Create score detail entry
                    const program = programMap[login] || { namaProgram: 'UNKNOWN', batch: '' };

                    // Extract date from completedAt
                    let dateStr = '';
                    let timeStr = '';
                    if (attemptData.completedAt) {
                        const completedDate = new Date(attemptData.completedAt);
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
                        Score: (attemptData.score ?? '').toString(),
                        Grade: attemptData.grade || attemptData.rangeScore || '',
                        Date: dateStr,
                        SubmitTime: timeStr,
                        Description: attemptData.gradeDesc || '',
                        Company: '',
                        isASM: false,
                        _syncedFromAttempt: true,
                        _syncedAt: new Date().toISOString(),
                    };

                    newScores.push(scoreDetail);
                    existingKeys.add(lookupKey);
                    addedCount++;

                    addedDetails.push({
                        login,
                        lesson,
                        score: scoreDetail.Score,
                        grade: scoreDetail.Grade,
                        desc: scoreDetail.Description,
                    });
                }
            }

            // Progress indicator
            const progress = Math.min(i + BATCH_SIZE, allLogins.length);
            process.stdout.write(`\r   Processing: ${progress}/${allLogins.length} logins...`);
        }
        console.log(''); // Newline after progress

        // ============================================================
        // Step 4: Report
        // ============================================================
        console.log('\n' + '='.repeat(60));
        console.log('📊 SYNC REPORT');
        console.log('='.repeat(60));
        console.log(`   Existing score details:    ${existingScores.length}`);
        console.log(`   Logins checked:            ${allLogins.length}`);
        console.log(`   Logins with no attempts:   ${noAttemptsCount}`);
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
                    (d.lesson.length > 28 ? d.lesson.slice(0, 28) + '..' : d.lesson).padEnd(30) +
                    d.score.padEnd(8) +
                    d.grade.padEnd(6) +
                    d.desc
                );
            });

            // ============================================================
            // Step 5: Save merged data back to Redis
            // ============================================================
            console.log('\n💾 Step 5: Saving merged data to scoredetails:all...');
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
