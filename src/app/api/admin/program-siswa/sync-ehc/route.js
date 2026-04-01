import { NextResponse } from "next/server";
import { getAllProgramSiswa, saveProgramSiswaExt } from "@/lib/program-store";
import { getEmployeeData } from "@/lib/ehc-service";

// Admin credentials
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "WIDJ47@GMAIL.COM";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "@ASMHCD2025";

function verifyAdmin(request) {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) return false;
    try {
        const base64 = authHeader.replace("Basic ", "");
        const decoded = Buffer.from(base64, "base64").toString("utf-8");
        const colonIndex = decoded.indexOf(":");
        const email = decoded.substring(0, colonIndex);
        const password = decoded.substring(colonIndex + 1);
        return email.toUpperCase() === ADMIN_EMAIL.toUpperCase() && password === ADMIN_PASSWORD;
    } catch {
        return false;
    }
}

/**
 * POST /api/admin/program-siswa/sync-ehc
 * Loops through ProgramSiswa records without effectiveDate,
 * fetches EHC data, and saves to Redis.
 * Runs in batches of 10 to avoid timeouts.
 */
export async function POST(request) {
    if (!verifyAdmin(request)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const allSiswa = await getAllProgramSiswa();
        
        // Find users missing effectiveDate (only if absolutely undefined, not if we already saved an empty string)
        const needsSync = allSiswa.filter(s => s.effectiveDate === undefined || s.asmLeaderName === undefined || s.namaSiswa === undefined);
        
        // Process max 20 at a time to prevent Vercel timeout
        const batch = needsSync.slice(0, 20);
        
        if (batch.length === 0) {
            return NextResponse.json({ success: true, message: "All students are already synced with EHC.", synced: 0, remaining: 0 });
        }

        let successCount = 0;
        let failCount = 0;

        // Fetch concurrently in small chunks of 5
        for (let i = 0; i < batch.length; i += 5) {
            const chunk = batch.slice(i, i + 5);
            await Promise.all(chunk.map(async (siswa) => {
                try {
                    const ehcData = await getEmployeeData(siswa.login);
                    if (ehcData) {
                        await saveProgramSiswaExt(siswa.login, {
                            effectiveDate: ehcData.EffectiveDate || "",
                            asmLeaderName: ehcData.ASMLeaderName || "",
                            jobTitle: ehcData.Jabatan || "",
                            namaSiswa: ehcData.Nama || ""
                        });
                        successCount++;
                    } else {
                        // Mark as failed/not found so we don't keep retrying
                        await saveProgramSiswaExt(siswa.login, {
                            effectiveDate: "NOT_FOUND",
                            asmLeaderName: "NOT_FOUND",
                            jobTitle: "NOT_FOUND" 
                        });
                        failCount++;
                    }
                } catch (e) {
                    console.error(`Sync error for ${siswa.login}:`, e);
                    failCount++;
                }
            }));
        }

        const remaining = needsSync.length - batch.length;

        return NextResponse.json({ 
            success: true, 
            synced: successCount, 
            failed: failCount,
            remaining,
            message: `Synced ${successCount} students. ${remaining} remaining.`
        });

    } catch (error) {
        console.error("EHC Sync Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
