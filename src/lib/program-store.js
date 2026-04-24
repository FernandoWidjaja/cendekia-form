import redis from "./redis-client";
import { buildKey, ENTITIES } from "./key-builder";

/**
 * Program Store - CRUD for Master Program, Program Siswa, and ScoreDetail
 * OPTIMIZED: Uses single key storage to reduce commands
 * UPDATED: Uses centralized key-builder for namespace isolation
 */

// ==================== MASTER NAMA PROGRAM ====================

export async function getAllPrograms() {
    try {
        const programs = await redis.get(buildKey(ENTITIES.MASTER_PROGRAM));
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
        await redis.set(buildKey(ENTITIES.MASTER_PROGRAM), programs);
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
        await redis.set(buildKey(ENTITIES.MASTER_PROGRAM), filtered);
        return { success: true };
    } catch (error) {
        console.error("deleteProgram error:", error);
        return { success: false, error: error.message };
    }
}

// ==================== MASTER PROGRAM PER SISWA ====================

export async function getAllProgramSiswa() {
    try {
        const data = await redis.get(buildKey(ENTITIES.PROGRAM_SISWA));
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
export async function saveProgramSiswa(login, namaProgram, batch = "", tglMulaiPDA = "", tglSelesaiPDA = "") {
    try {
        const all = await getAllProgramSiswa();
        const loginUpper = login.toUpperCase();

        const index = all.findIndex(p => p.login === loginUpper);
        if (index >= 0) {
            all[index].namaProgram = namaProgram;
            all[index].batch = batch;
            all[index].tglMulaiPDA = tglMulaiPDA;
            all[index].tglSelesaiPDA = tglSelesaiPDA;
        } else {
            all.push({ login: loginUpper, namaProgram, batch, tglMulaiPDA, tglSelesaiPDA });
        }

        await redis.set(buildKey(ENTITIES.PROGRAM_SISWA), all);
        return { success: true };
    } catch (error) {
        console.error("saveProgramSiswa error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Update extra properties for program siswa (e.g. from EHC sync)
 */
export async function saveProgramSiswaExt(login, extraFields) {
    try {
        const all = await getAllProgramSiswa();
        const loginUpper = login.toUpperCase();

        const index = all.findIndex(p => p.login?.toUpperCase() === loginUpper);
        if (index >= 0) {
            // Merge extra fields
            all[index] = { ...all[index], ...extraFields };
            await redis.set(buildKey(ENTITIES.PROGRAM_SISWA), all);
            return { success: true };
        }
        return { success: false, error: "Student not found" };
    } catch (error) {
        console.error("saveProgramSiswaExt error:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteProgramSiswa(login) {
    try {
        const all = await getAllProgramSiswa();
        const filtered = all.filter(p => p.login !== login.toUpperCase());
        await redis.set(buildKey(ENTITIES.PROGRAM_SISWA), filtered);
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
        if (updates.tglMulaiPDA !== undefined) all[index].tglMulaiPDA = updates.tglMulaiPDA;
        if (updates.tglSelesaiPDA !== undefined) all[index].tglSelesaiPDA = updates.tglSelesaiPDA;

        await redis.set(buildKey(ENTITIES.PROGRAM_SISWA), all);
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
        const { login, namaProgram, batch, tglMulaiPDA, tglSelesaiPDA } = dataArray[i];
        const rowNum = i + 2;

        if (!login || !namaProgram) {
            errors.push({ row: rowNum, error: "Login atau NamaProgram kosong" });
            continue;
        }

        const result = await saveProgramSiswa(login, namaProgram, batch || "", tglMulaiPDA || "", tglSelesaiPDA || "");
        if (result.success) {
            imported.push({ login, namaProgram, batch, tglMulaiPDA, tglSelesaiPDA });
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
 * Save ScoreDetail - OPTIMIZED: uses single key array
 * @param {object} scoreData - Score data to save
 * @param {boolean} isASM - If true, marks as ASM user
 */
export async function saveScoreDetail(scoreData, isASM = false) {
    try {
        const key = buildKey(ENTITIES.SCORE_DETAIL);
        const allScores = await redis.get(key) || [];

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

        await redis.set(key, allScores);
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
        const scores = await redis.get(buildKey(ENTITIES.SCORE_DETAIL)) || [];
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
 * Check if a user has completed a specific quiz (A2: replaces getAttempt)
 * @param {string} login - User login
 * @param {string} lessonName - Lesson name
 * @returns {object|null} Score detail if completed, null otherwise
 */
export async function getCompletedQuiz(login, lessonName) {
    try {
        const all = await getAllScoreDetails();
        return all.find(
            s => s.Login === login.toUpperCase() && s.Lesson === lessonName
        ) || null;
    } catch (error) {
        console.error("getCompletedQuiz error:", error);
        return null;
    }
}

/**
 * Get all completed quizzes for a user (A2: replaces getUserAttempts)
 * Returns object keyed by lesson name for backward compatibility with frontend
 * @param {string} login - User login
 * @returns {object} { lessonName: { score, grade, ... }, ... }
 */
export async function getUserCompletedQuizzes(login) {
    try {
        const scores = await getScoreDetailsByLogin(login);
        const result = {};
        for (const s of scores) {
            result[s.Lesson] = {
                score: s.Score,
                grade: s.Grade,
                gradeDesc: s.Description,
                completedAt: s.Date,
            };
        }
        return result;
    } catch (error) {
        console.error("getUserCompletedQuizzes error:", error);
        return {};
    }
}

/**
 * Delete ScoreDetail by Login and Lesson
 */
export async function deleteScoreDetail(login, lesson) {
    try {
        const key = buildKey(ENTITIES.SCORE_DETAIL);
        const allScores = await redis.get(key) || [];
        const filtered = allScores.filter(
            s => !(s.Login === login.toUpperCase() && s.Lesson === lesson)
        );
        await redis.set(key, filtered);
        return { success: true };
    } catch (error) {
        console.error("deleteScoreDetail error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Bulk save ScoreDetails - OPTIMIZED: 1 read + 1 write instead of N reads + N writes
 * @param {Array} dataArray - Array of { scoreData, isASM }
 * @returns {object} { success, imported, errors[] }
 */
export async function bulkSaveScoreDetails(dataArray) {
    try {
        const key = buildKey(ENTITIES.SCORE_DETAIL);
        const allScores = await redis.get(key) || [];
        const errors = [];
        let imported = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const { scoreData, isASM } = dataArray[i];
            const rowNum = i + 2;

            if (!scoreData.Login || !scoreData.Lesson) {
                errors.push({ row: rowNum, error: "Login atau Lesson kosong" });
                continue;
            }

            const login = scoreData.Login.toUpperCase();
            const lesson = scoreData.Lesson;
            const dataToSave = { ...scoreData, Login: login, isASM: isASM || false };

            const index = allScores.findIndex(s => s.Login === login && s.Lesson === lesson);
            if (index >= 0) {
                allScores[index] = dataToSave;
            } else {
                allScores.push(dataToSave);
            }
            imported++;
        }

        await redis.set(key, allScores);
        return { success: errors.length === 0, imported, errors };
    } catch (error) {
        console.error("bulkSaveScoreDetails error:", error);
        return { success: false, imported: 0, errors: [{ row: 0, error: error.message }] };
    }
}

/**
 * Bulk delete ScoreDetails - OPTIMIZED: 1 read + 1 write instead of N reads + N writes
 * @param {Array} items - Array of { login, lesson }
 * @returns {object} { success, deleted }
 */
export async function bulkDeleteScoreDetails(items) {
    try {
        const key = buildKey(ENTITIES.SCORE_DETAIL);
        const allScores = await redis.get(key) || [];

        const deleteSet = new Set(
            items.map(i => `${i.login.toUpperCase()}|||${i.lesson}`)
        );

        const filtered = allScores.filter(
            s => !deleteSet.has(`${s.Login}|||${s.Lesson}`)
        );

        await redis.set(key, filtered);
        return { success: true, deleted: allScores.length - filtered.length };
    } catch (error) {
        console.error("bulkDeleteScoreDetails error:", error);
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
        const key = buildKey(ENTITIES.SCORE_DETAIL);
        const allScores = await redis.get(key) || [];
        const loginUpper = login.toUpperCase();
        const index = allScores.findIndex(
            s => s.Login === loginUpper && s.Lesson === lesson
        );

        if (index < 0) {
            return { success: false, error: "Score not found" };
        }

        // Merge updates into existing score
        allScores[index] = { ...allScores[index], ...updates };
        await redis.set(key, allScores);
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
        const key = buildKey(ENTITIES.SCORE_DETAIL);
        const allScores = await redis.get(key) || [];
        const loginUpper = login.toUpperCase();

        const index = allScores.findIndex(
            s => s.Login === loginUpper && s.Lesson === lesson
        );

        if (index >= 0) {
            allScores[index].pegaSyncStatus = status;
            allScores[index].pegaSyncError = errorMsg;
            allScores[index].pegaSyncDate = new Date().toISOString();
            await redis.set(key, allScores);
            return { success: true };
        }

        return { success: false, error: "Score not found" };
    } catch (error) {
        console.error("updateScoreSyncStatus error:", error);
        return { success: false, error: error.message };
    }
}
