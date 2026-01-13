"use strict";

import { Redis } from "@upstash/redis";

/**
 * Mitra Store - CRUD for Mitra Kerja data
 * OPTIMIZED: Uses single key storage to reduce commands
 */

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/**
 * Save Mitra data to Redis - OPTIMIZED: updates array
 * @param {object} mitraData - { login, nama, cabang, divisi, departemen, namaAtasan }
 */
export async function saveMitra(mitraData) {
    try {
        const allMitra = await redis.get("mitrakerja:all") || [];

        const data = {
            Login: mitraData.login.toUpperCase(),
            Nama: mitraData.nama || "",
            Cabang: mitraData.cabang || "",
            Divisi: mitraData.divisi || "",
            Departemen: mitraData.departemen || "",
            NamaAtasan: mitraData.namaAtasan || "",
            Company: "MITRA",
        };

        const index = allMitra.findIndex(m => m.Login === data.Login);
        if (index >= 0) {
            allMitra[index] = data;
        } else {
            allMitra.push(data);
        }

        await redis.set("mitrakerja:all", allMitra);
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
        const allMitra = await redis.get("mitrakerja:all") || [];
        return allMitra.find(m => m.Login === login.toUpperCase()) || null;
    } catch (error) {
        console.error("getMitra error:", error);
        return null;
    }
}

/**
 * Get all Mitra data - OPTIMIZED: 1 command instead of 1+N
 */
export async function getAllMitra() {
    try {
        const allMitra = await redis.get("mitrakerja:all") || [];
        return allMitra;
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
        const allMitra = await redis.get("mitrakerja:all") || [];
        const filtered = allMitra.filter(m => m.Login !== login.toUpperCase());
        await redis.set("mitrakerja:all", filtered);
        return { success: true };
    } catch (error) {
        console.error("deleteMitra error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Bulk save Mitra from Excel - OPTIMIZED: single save at end
 */
export async function bulkSaveMitra(mitraList) {
    try {
        const allMitra = await redis.get("mitrakerja:all") || [];
        let saved = 0;

        for (const mitra of mitraList) {
            if (mitra.login) {
                const data = {
                    Login: mitra.login.toUpperCase(),
                    Nama: mitra.nama || "",
                    Cabang: mitra.cabang || "",
                    Divisi: mitra.divisi || "",
                    Departemen: mitra.departemen || "",
                    NamaAtasan: mitra.namaAtasan || "",
                    Company: "MITRA",
                };

                const index = allMitra.findIndex(m => m.Login === data.Login);
                if (index >= 0) {
                    allMitra[index] = data;
                } else {
                    allMitra.push(data);
                }
                saved++;
            }
        }

        // Single save at the end - much more efficient!
        await redis.set("mitrakerja:all", allMitra);
        return { success: true, saved };
    } catch (error) {
        console.error("bulkSaveMitra error:", error);
        return { success: false, error: error.message };
    }
}
