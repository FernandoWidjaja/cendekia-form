"use strict";

import { Redis } from "@upstash/redis";

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Save Mitra data to Redis
 * @param {object} mitraData - { login, nama, cabang, divisi, departemen, namaAtasan }
 */
export async function saveMitra(mitraData) {
    try {
        const key = `mitrakerja:${mitraData.login.toUpperCase()}`;
        const data = {
            Login: mitraData.login.toUpperCase(),
            Nama: mitraData.nama || "",
            Cabang: mitraData.cabang || "",
            Divisi: mitraData.divisi || "",
            Departemen: mitraData.departemen || "",
            NamaAtasan: mitraData.namaAtasan || "",
            Company: "MITRA",
        };
        await redis.set(key, data);

        // Add to keys list
        const allKeys = await redis.get("mitrakerja:keys") || [];
        if (!allKeys.includes(key)) {
            allKeys.push(key);
            await redis.set("mitrakerja:keys", allKeys);
        }

        return { success: true };
    } catch (error) {
        console.error("saveMitra error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Get Mitra by login
 */
export async function getMitra(login) {
    try {
        const key = `mitrakerja:${login.toUpperCase()}`;
        const data = await redis.get(key);
        return data;
    } catch (error) {
        console.error("getMitra error:", error);
        return null;
    }
}

/**
 * Get all Mitra data
 */
export async function getAllMitra() {
    try {
        const keys = await redis.get("mitrakerja:keys") || [];
        if (keys.length === 0) return [];

        const promises = keys.map(key => redis.get(key));
        const results = await Promise.all(promises);
        return results.filter(r => r !== null);
    } catch (error) {
        console.error("getAllMitra error:", error);
        return [];
    }
}

/**
 * Delete Mitra by login
 */
export async function deleteMitra(login) {
    try {
        const key = `mitrakerja:${login.toUpperCase()}`;
        await redis.del(key);

        // Remove from keys list
        const allKeys = await redis.get("mitrakerja:keys") || [];
        const newKeys = allKeys.filter(k => k !== key);
        await redis.set("mitrakerja:keys", newKeys);

        return { success: true };
    } catch (error) {
        console.error("deleteMitra error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Bulk save Mitra from Excel
 */
export async function bulkSaveMitra(mitraList) {
    try {
        let saved = 0;
        for (const mitra of mitraList) {
            if (mitra.login) {
                await saveMitra(mitra);
                saved++;
            }
        }
        return { success: true, saved };
    } catch (error) {
        console.error("bulkSaveMitra error:", error);
        return { success: false, error: error.message };
    }
}
