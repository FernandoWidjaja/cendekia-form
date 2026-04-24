/**
 * sync-scores.mjs
 *
 * Utility script to inspect and report ScoreDetail data from Redis.
 * Updated to use the current key namespace: HCD:HCQ:Cendekia:*
 *
 * Previously read from legacy 'scoredetails:all' and 'attempts:*' keys.
 * Those keys are now DEPRECATED — all data lives in:
 *   - HCD:HCQ:Cendekia:ScoreDetail  (score records)
 *   - HCD:HCQ:Cendekia:ProgramSiswa (student program list)
 *
 * Run with: node sync-scores.mjs
 */

import { config } from 'dotenv';
import { Redis } from '@upstash/redis';

// Load .env
config({ path: '.env' });

// ── Key constants (must match key-builder.js) ──────────────────────────────
const PREFIX = 'HCD:HCQ:Cendekia';
const KEYS = {
    SCORE_DETAIL:  `${PREFIX}:ScoreDetail`,
    PROGRAM_SISWA: `${PREFIX}:ProgramSiswa`,
};

async function syncScoreDetails() {
    console.log('='.repeat(60));
    console.log('🔄 SCORE DETAIL SYNC REPORT');
    console.log(`   Key: ${KEYS.SCORE_DETAIL}`);
    console.log('='.repeat(60));

    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        console.error('❌ Error: Redis credentials not found in .env');
        process.exit(1);
    }

    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });

    try {
        // ── Step 1: Read ScoreDetail ──────────────────────────────────────
        console.log('\n📥 Step 1: Reading ScoreDetail...');
        const existingScores = await redis.get(KEYS.SCORE_DETAIL) || [];
        console.log(`   Found ${existingScores.length} score detail records`);

        // ── Step 2: Read ProgramSiswa ─────────────────────────────────────
        console.log('\n📥 Step 2: Reading ProgramSiswa...');
        const programSiswa = await redis.get(KEYS.PROGRAM_SISWA) || [];
        console.log(`   Found ${programSiswa.length} program siswa records`);

        // Build lookup: LOGIN → { namaProgram, batch }
        const programMap = {};
        programSiswa.forEach(p => {
            const login = p.login?.toUpperCase();
            if (login) {
                programMap[login] = {
                    namaProgram: p.namaProgram || 'UNKNOWN',
                    batch: p.batch || '',
                };
            }
        });

        const registeredLogins = new Set(Object.keys(programMap));
        console.log(`   Registered logins in ProgramSiswa: ${registeredLogins.size}`);

        // ── Step 3: Analyse ScoreDetail ───────────────────────────────────
        console.log('\n🔍 Step 3: Analysing ScoreDetail records...');

        // Build lookup: LOGIN|LESSON|DATE → entry
        const existingKeys = new Set(
            existingScores.map(s => `${s.Login?.toUpperCase()}|${s.Lesson}|${s.Date || ''}`)
        );

        // Count per login
        const perLoginCount = {};
        const orphanedLogins = new Set(); // in scores but NOT in ProgramSiswa
        existingScores.forEach(s => {
            const login = s.Login?.toUpperCase();
            if (!login) return;
            perLoginCount[login] = (perLoginCount[login] || 0) + 1;
            if (!registeredLogins.has(login)) orphanedLogins.add(login);
        });

        // ── Step 4: Scan for legacy attempts:* keys ───────────────────────
        console.log('\n🕵️  Step 4: Scanning for legacy attempts:* keys...');
        let legacyCursor = 0;
        let legacyKeys = [];
        let scanIterations = 0;
        const MAX_SCAN_ITERATIONS = 500; // safety guard
        do {
            const result = await redis.scan(legacyCursor, { match: 'attempts:*', count: 100 });
            legacyCursor = result[0];  // Upstash may return string "0" — use == not ===
            legacyKeys = legacyKeys.concat(result[1]);
            scanIterations++;
            if (scanIterations >= MAX_SCAN_ITERATIONS) {
                console.warn(`   ⚠️  Reached max scan iterations (${MAX_SCAN_ITERATIONS}), stopping early.`);
                break;
            }
        } while (legacyCursor != 0);  // loose equality: handles both string "0" and number 0
        console.log(`   Legacy attempts:* keys found: ${legacyKeys.length}`);

        let newFromAttempts = 0;
        const addedDetails = [];
        const newScores = [...existingScores];

        if (legacyKeys.length > 0) {
            console.log('   Merging legacy attempts into ScoreDetail...');
            for (const attemptKey of legacyKeys) {
                const login = attemptKey.replace('attempts:', '').toUpperCase();
                const attempts = await redis.get(attemptKey);
                if (!attempts || typeof attempts !== 'object') continue;

                const program = programMap[login] || { namaProgram: 'UNKNOWN', batch: '' };

                for (const [lesson, attemptData] of Object.entries(attempts)) {
                    let dateStr = '';
                    let timeStr = '';
                    if (attemptData.completedAt) {
                        const d = new Date(attemptData.completedAt);
                        dateStr = d.toISOString().split('T')[0].replace(/-/g, '');
                        timeStr = d.toTimeString().split(' ')[0];
                    }

                    const lookupKey = `${login}|${lesson}|${dateStr}`;
                    if (existingKeys.has(lookupKey)) continue;

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
                    newFromAttempts++;
                    addedDetails.push({ login, lesson, score: scoreDetail.Score, grade: scoreDetail.Grade });
                }
            }
        }

        // ── Step 5: Report ────────────────────────────────────────────────
        console.log('\n' + '='.repeat(60));
        console.log('📊 REPORT');
        console.log('='.repeat(60));
        console.log(`   ScoreDetail records:       ${existingScores.length}`);
        console.log(`   ProgramSiswa records:      ${programSiswa.length}`);
        console.log(`   Logins with scores:        ${Object.keys(perLoginCount).length}`);
        console.log(`   Legacy attempts:* keys:    ${legacyKeys.length}`);
        console.log(`   ✨ New from legacy:         ${newFromAttempts}`);
        console.log(`   ⚠️  Orphaned logins:         ${orphanedLogins.size}`);

        if (orphanedLogins.size > 0) {
            console.log('\n⚠️  Logins in ScoreDetail but NOT in ProgramSiswa:');
            [...orphanedLogins].forEach(l => console.log(`   - ${l}`));
        }

        // Top 20 logins by record count
        console.log('\n👥 Top 20 Logins by ScoreDetail Count:');
        console.log('-'.repeat(55));
        Object.entries(perLoginCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .forEach(([login, count]) => {
                const tag = registeredLogins.has(login) ? '✅' : '❌ (not in ProgramSiswa)';
                console.log(`   ${login.padEnd(38)} ${count}  ${tag}`);
            });

        // ── Step 6: Save if legacy records were merged ────────────────────
        if (newFromAttempts > 0) {
            console.log(`\n💾 Saving ${newScores.length} records to ${KEYS.SCORE_DETAIL}...`);
            await redis.set(KEYS.SCORE_DETAIL, newScores);
            console.log('   ✅ Saved successfully!');

            console.log('\n📋 New records merged from legacy:');
            console.log('-'.repeat(70));
            console.log('LOGIN'.padEnd(35) + 'LESSON'.padEnd(30) + 'SCORE');
            console.log('-'.repeat(70));
            addedDetails.forEach(d => {
                console.log(
                    d.login.padEnd(35) +
                    (d.lesson.length > 28 ? d.lesson.slice(0, 28) + '..' : d.lesson).padEnd(30) +
                    d.score
                );
            });
        } else {
            console.log('\n✅ ScoreDetail is up-to-date. No new records from legacy keys.');
        }

        console.log('\n' + '='.repeat(60));
        console.log('🏁 Done!');
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ Fatal error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

syncScoreDetails();
