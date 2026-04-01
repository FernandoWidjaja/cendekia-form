import { config } from "dotenv";
config();

async function checkRedis() {
    const redisModule = await import("./src/lib/redis-client.js");
    const redis = redisModule.default || redisModule.redis;
    
    // Check Program Siswa
    const ps = await redis.get("HCD:HCQ:Cendekia:ProgramSiswa");
    if(ps && ps.length) {
        console.log("Sample 0:", ps[0]);
        console.log("Sample 1:", ps[1]);
        const withName = ps.find(p => p.Name || p.name);
        if (withName) console.log("Found entry with 'Name':", withName);
        else console.log("NO ENTRY HAS 'Name' OR 'name' PROPERTY!");
    }

}

checkRedis();
