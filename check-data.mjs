import redis from "./src/lib/redis-client.js";
import { buildKey, ENTITIES } from "./src/lib/key-builder.js";

async function checkData() {
    const scoreKey = buildKey(ENTITIES.SCORE_DETAIL);
    const scores = await redis.get(scoreKey);
    console.log("=== Sample ScoreDetail ===");
    console.log(JSON.stringify(scores.slice(0, 2), null, 2));

    const programKey = buildKey(ENTITIES.PROGRAM_SISWA);
    const programs = await redis.get(programKey);
    console.log("\n=== Sample ProgramSiswa ===");
    console.log(JSON.stringify(programs.slice(0, 2), null, 2));

    process.exit(0);
}

checkData().catch(console.error);
