/**
 * Key Builder - Centralized Redis key naming for Cendekia
 * 
 * Phase 1: Single key per entity (no company split)
 *   buildKey("ScoreDetail") → "HCD:HCQ:Cendekia:ScoreDetail"
 * 
 * Phase 2 (future): Per-tenant keys
 *   buildKey("ScoreDetail", "SISWA") → "(SISWA):HCD:HCQ:Cendekia:ScoreDetail"
 */

const PREFIX = "HCD:HCQ:Cendekia";

/**
 * Build a Redis key with optional company/tenant prefix
 * @param {string} entity - Entity name (e.g., "ScoreDetail", "Quizzes")
 * @param {string|null} company - Optional company prefix for Phase 2 tenant isolation
 * @returns {string} Redis key
 */
export function buildKey(entity, company = null) {
    if (company) {
        return `(${company}):${PREFIX}:${entity}`;
    }
    return `${PREFIX}:${entity}`;
}

/**
 * Entity name constants — single source of truth for all Redis entities
 */
export const ENTITIES = {
    SCORE_DETAIL: "ScoreDetail",
    MASTER_PROGRAM: "MasterProgram",
    PROGRAM_SISWA: "ProgramSiswa",
    QUIZZES: "Quizzes",
    MITRA_KERJA: "MitraKerja",
    RATE_LIMIT: "RateLimit",
    PEGA_CURRICULUM: "PegaCurriculum",
};

/**
 * Legacy key mapping — used by migration script to rename old keys
 */
export const LEGACY_KEYS = {
    "scoredetails:all": ENTITIES.SCORE_DETAIL,
    "master:programs": ENTITIES.MASTER_PROGRAM,
    "master:program-siswa": ENTITIES.PROGRAM_SISWA,
    "quizzes:all": ENTITIES.QUIZZES,
    "mitrakerja:all": ENTITIES.MITRA_KERJA,
};
