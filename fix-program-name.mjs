/**
 * Fix "HCD&LEG" -> "HCD & LEG" in both master:program-siswa and scoredetails:all
 */
import dotenv from "dotenv";
import { Redis } from "@upstash/redis";

dotenv.config({ path: ".env" });

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const WRONG = "HCD&LEG";
const CORRECT = "HCD & LEG";

async function fix() {
    console.log(`\n=== Fixing "${WRONG}" → "${CORRECT}" ===\n`);

    // 1. Fix master:program-siswa
    console.log("--- master:program-siswa ---");
    const programSiswa = await redis.get("master:program-siswa") || [];
    let siswaFixed = 0;
    for (const entry of programSiswa) {
        if (entry.namaProgram === WRONG) {
            entry.namaProgram = CORRECT;
            siswaFixed++;
        }
    }
    if (siswaFixed > 0) {
        await redis.set("master:program-siswa", programSiswa);
        console.log(`✅ Fixed ${siswaFixed} entries in master:program-siswa`);
    } else {
        console.log("ℹ️  No entries found with wrong name");
    }

    // 2. Fix scoredetails:all
    console.log("\n--- scoredetails:all ---");
    const scores = await redis.get("scoredetails:all") || [];
    let scoresFixed = 0;
    for (const entry of scores) {
        if (entry.NamaProgram === WRONG) {
            entry.NamaProgram = CORRECT;
            scoresFixed++;
        }
    }
    if (scoresFixed > 0) {
        await redis.set("scoredetails:all", scores);
        console.log(`✅ Fixed ${scoresFixed} entries in scoredetails:all`);
    } else {
        console.log("ℹ️  No entries found with wrong name");
    }

    console.log(`\n=== Done! Total fixed: ${siswaFixed + scoresFixed} entries ===`);
}

fix().catch(console.error);
