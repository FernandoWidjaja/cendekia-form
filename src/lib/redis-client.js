/**
 * Redis Client - Centralized Redis connection for Cendekia
 * 
 * Currently uses @upstash/redis (REST API).
 * When migrating to ASM server, only this file needs to change.
 * 
 * Supports dual env vars for gradual migration:
 *   - REDIS_REST_URL / REDIS_REST_TOKEN (new, priority)
 *   - UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (legacy fallback)
 */

import { Redis } from "@upstash/redis";

const redis = new Redis({
    url: process.env.REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export default redis;
