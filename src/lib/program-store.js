import { Redis } from "@upstash/redis";

/**
 * Program Store - CRUD for Master Program, Program Siswa, and ScoreDetail
 * OPTIMIZED: Uses single key storage to reduce commands
 */

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// ==================== MASTER NAMA PROGRAM ====================
// Already using single key pattern - no changes needed

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
// Already using single key pattern - no changes needed

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

/**
 * Update program siswa fields by original login
 * @param {string} originalLogin - The current login (identifier)
 * @param {object} updates - { login?, namaProgram?, batch? }
 */
export async function updateProgramSiswa(originalLogin, updates) {
    try {
        const all = await getAllProgramSiswa();
        const loginUpper = originalLogin.toUpperCase();
        const index = all.findIndex(p => p.login === loginUpper);

        if (index < 0) {
            return { success: false, error: "Siswa not found" };
        }

        if (updates.login) all[index].login = updates.login.toUpperCase();
        if (updates.namaProgram !== undefined) all[index].namaProgram = updates.namaProgram;
        if (updates.batch !== undefined) all[index].batch = updates.batch;

        await redis.set("master:program-siswa", all);
        return { success: true };
    } catch (error) {
        console.error("updateProgramSiswa error:", error);
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

// ==================== SCORE DETAIL STORAGE (OPTIMIZED) ====================

/**
 * Save ScoreDetail to Upstash - OPTIMIZED: uses single key array
 * @param {object} scoreData - Score data to save
 * @param {boolean} isASM - If true, marks as ASM user
 */
export async function saveScoreDetail(scoreData, isASM = false) {
    try {
        const allScores = await redis.get("scoredetails:all") || [];

        // Create unique key for lookup
        const login = scoreData.Login.toUpperCase();
        const lesson = scoreData.Lesson;

        // Mark ASM users
        const dataToSave = {
            ...scoreData,
            Login: login,
            isASM: isASM,
        };

        // Check if already exists (update) or new (add)
        const index = allScores.findIndex(
            s => s.Login === login && s.Lesson === lesson
        );

        if (index >= 0) {
            allScores[index] = dataToSave;
        } else {
            allScores.push(dataToSave);
        }

        await redis.set("scoredetails:all", allScores);
        return { success: true };
    } catch (error) {
        console.error("saveScoreDetail error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all ScoreDetails - OPTIMIZED: 1 command instead of 1+N
 */
export async function getAllScoreDetails() {
    try {
        const scores = await redis.get("scoredetails:all") || [];
        return scores;
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
        const allScores = await redis.get("scoredetails:all") || [];
        const filtered = allScores.filter(
            s => !(s.Login === login.toUpperCase() && s.Lesson === lesson)
        );
        await redis.set("scoredetails:all", filtered);
        return { success: true };
    } catch (error) {
        console.error("deleteScoreDetail error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Update ScoreDetail fields by Login and Lesson
 * @param {string} login - User login
 * @param {string} lesson - Original lesson name (used as identifier)
 * @param {object} updates - Fields to update (Score, Grade, NamaProgram, Batch, etc.)
 */
export async function updateScoreDetail(login, lesson, updates) {
    try {
        const allScores = await redis.get("scoredetails:all") || [];
        const loginUpper = login.toUpperCase();
        const index = allScores.findIndex(
            s => s.Login === loginUpper && s.Lesson === lesson
        );

        if (index < 0) {
            return { success: false, error: "Score not found" };
        }

        // Merge updates into existing score
        allScores[index] = { ...allScores[index], ...updates };
        await redis.set("scoredetails:all", allScores);
        return { success: true };
    } catch (error) {
        console.error("updateScoreDetail error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Update Pega sync status for a score - OPTIMIZED: updates in array
 * @param {string} login - User login
 * @param {string} lesson - Lesson name
 * @param {string} status - "success" | "failed" | null
 * @param {string} errorMsg - Error message if failed
 */
export async function updateScoreSyncStatus(login, lesson, status, errorMsg = "") {
    try {
        const allScores = await redis.get("scoredetails:all") || [];
        const loginUpper = login.toUpperCase();

        const index = allScores.findIndex(
            s => s.Login === loginUpper && s.Lesson === lesson
        );

        if (index >= 0) {
            allScores[index].pegaSyncStatus = status;
            allScores[index].pegaSyncError = errorMsg;
            allScores[index].pegaSyncDate = new Date().toISOString();
            await redis.set("scoredetails:all", allScores);
            return { success: true };
        }

        return { success: false, error: "Score not found" };
    } catch (error) {
        console.error("updateScoreSyncStatus error:", error);
        return { success: false, error: error.message };
    }
}
