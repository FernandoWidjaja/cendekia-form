import redis from "./redis-client";
import { buildKey, ENTITIES } from "./key-builder";

/**
 * Pega Curriculum Upload Store
 * 
 * Stores curriculum progress data uploaded from Pega export files.
 * Key: HCD:HCQ:Cendekia:PegaCurriculum
 * Value: Array of student objects with their Pega progress
 */

export async function getAllPegaCurriculum() {
    try {
        const data = await redis.get(buildKey(ENTITIES.PEGA_CURRICULUM));
        return data || [];
    } catch (error) {
        console.error("getAllPegaCurriculum error:", error);
        return [];
    }
}

/**
 * Save data from Pega Excel/CSV upload.
 * Expected format: array of { login, courseName, status, score, completionDate }
 */
export async function savePegaCurriculumData(dataArray) {
    try {
        // Group by login for easier merging
        const grouped = {};
        for (const row of dataArray) {
            const login = row.login?.toUpperCase();
            if (!login) continue;
            
            if (!grouped[login]) {
                grouped[login] = { login, progress: [] };
            }
            
            grouped[login].progress.push({
                courseName: row.courseName || row.CourseName || "Unknown",
                status: row.status || row.Status || "",
                score: row.score || row.Score || 0,
                completionDate: row.completionDate || row.CompletionDate || ""
            });
        }
        
        const finalData = Object.values(grouped);
        
        // Overwrite standard (or merge if needed, but overwrite is cleaner for a fresh Pega export)
        await redis.set(buildKey(ENTITIES.PEGA_CURRICULUM), finalData);
        
        return { 
            success: true, 
            importedRows: dataArray.length,
            uniqueStudents: finalData.length
        };
    } catch (error) {
        console.error("savePegaCurriculumData error:", error);
        return { success: false, error: error.message };
    }
}
