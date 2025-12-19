import { Redis } from "@upstash/redis";

/**
 * Program Store - CRUD for Master Program, Program Siswa, and ScoreDetail
 */

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// ==================== MASTER NAMA PROGRAM ====================

export async function getAllPrograms() {
    try {
        const programs = await redis.get("master:programs");
        return programs || [];
    } catch (error) {
        console.error("getAllPrograms error:", error);
        return [];
    }
}

export async function addProgram(namaProgram) {
    try {
        const programs = await getAllPrograms();
        const id = Date.now().toString();
        const newProgram = { id, namaProgram: namaProgram.toUpperCase() };

        if (programs.some(p => p.namaProgram === newProgram.namaProgram)) {
            return { success: false, error: "Program sudah ada" };
        }

        programs.push(newProgram);
        await redis.set("master:programs", programs);
        return { success: true, data: newProgram };
    } catch (error) {
        console.error("addProgram error:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteProgram(id) {
    try {
        const programs = await getAllPrograms();
        const filtered = programs.filter(p => p.id !== id);
        await redis.set("master:programs", filtered);
        return { success: true };
    } catch (error) {
        console.error("deleteProgram error:", error);
        return { success: false, error: error.message };
    }
}

// ==================== MASTER PROGRAM PER SISWA ====================

export async function getAllProgramSiswa() {
    try {
        const data = await redis.get("master:program-siswa");
        return data || [];
    } catch (error) {
        console.error("getAllProgramSiswa error:", error);
        return [];
    }
}

export async function getProgramSiswaByLogin(login) {
    try {
        const all = await getAllProgramSiswa();
        return all.find(p => p.login === login.toUpperCase()) || null;
    } catch (error) {
        console.error("getProgramSiswaByLogin error:", error);
        return null;
    }
}

/**
 * Add or update program siswa with batch
 */
export async function saveProgramSiswa(login, namaProgram, batch = "") {
    try {
        const all = await getAllProgramSiswa();
        const loginUpper = login.toUpperCase();

        const index = all.findIndex(p => p.login === loginUpper);
        if (index >= 0) {
            all[index].namaProgram = namaProgram;
            all[index].batch = batch;
        } else {
            all.push({ login: loginUpper, namaProgram, batch });
        }

        await redis.set("master:program-siswa", all);
        return { success: true };
    } catch (error) {
        console.error("saveProgramSiswa error:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteProgramSiswa(login) {
    try {
        const all = await getAllProgramSiswa();
        const filtered = all.filter(p => p.login !== login.toUpperCase());
        await redis.set("master:program-siswa", filtered);
        return { success: true };
    } catch (error) {
        console.error("deleteProgramSiswa error:", error);
        return { success: false, error: error.message };
    }
}

export async function bulkImportProgramSiswa(dataArray) {
    const errors = [];
    const imported = [];

    for (let i = 0; i < dataArray.length; i++) {
        const { login, namaProgram, batch } = dataArray[i];
        const rowNum = i + 2;

        if (!login || !namaProgram) {
            errors.push({ row: rowNum, error: "Login atau NamaProgram kosong" });
            continue;
        }

        const result = await saveProgramSiswa(login, namaProgram, batch || "");
        if (result.success) {
            imported.push({ login, namaProgram, batch });
        } else {
            errors.push({ row: rowNum, error: result.error });
        }
    }

    return {
        success: errors.length === 0,
        imported: imported.length,
        errors,
    };
}

// ==================== SCORE DETAIL STORAGE ====================

/**
 * Save ScoreDetail to Upstash
 */
export async function saveScoreDetail(scoreData) {
    try {
        const key = `scoredetail:${scoreData.Login}:${scoreData.Lesson}`;
        await redis.set(key, scoreData);

        // Also add to list for easy retrieval
        const allKeys = await redis.get("scoredetail:keys") || [];
        if (!allKeys.includes(key)) {
            allKeys.push(key);
            await redis.set("scoredetail:keys", allKeys);
        }

        return { success: true };
    } catch (error) {
        console.error("saveScoreDetail error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all ScoreDetails - optimized with parallel fetching
 */
export async function getAllScoreDetails() {
    try {
        const keys = await redis.get("scoredetail:keys") || [];

        if (keys.length === 0) return [];

        // Fetch all data in parallel for better performance
        const results = await Promise.all(
            keys.map(key => redis.get(key))
        );

        // Filter out null values (deleted keys)
        return results.filter(data => data !== null);
    } catch (error) {
        console.error("getAllScoreDetails error:", error);
        return [];
    }
}

/**
 * Get ScoreDetails by Login
 */
export async function getScoreDetailsByLogin(login) {
    try {
        const all = await getAllScoreDetails();
        return all.filter(d => d.Login === login.toUpperCase());
    } catch (error) {
        console.error("getScoreDetailsByLogin error:", error);
        return [];
    }
}

/**
 * Delete ScoreDetail by Login and Lesson
 */
export async function deleteScoreDetail(login, lesson) {
    try {
        const key = `scoredetail:${login.toUpperCase()}:${lesson}`;
        await redis.del(key);

        // Remove from keys list
        const allKeys = await redis.get("scoredetail:keys") || [];
        const updatedKeys = allKeys.filter(k => k !== key);
        await redis.set("scoredetail:keys", updatedKeys);

        return { success: true };
    } catch (error) {
        console.error("deleteScoreDetail error:", error);
        return { success: false, error: error.message };
    }
}
