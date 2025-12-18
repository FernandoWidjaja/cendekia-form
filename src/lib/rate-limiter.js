import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate Limiter using Upstash Redis
 * - Login: 10 attempts per minute per IP
 * - Admin: 20 requests per minute per IP
 * - General API: 100 requests per minute per IP
 */

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// Login rate limiter - strict (10 per minute)
export const loginLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    prefix: "ratelimit:login",
});

// Admin rate limiter - moderate (20 per minute)
export const adminLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    prefix: "ratelimit:admin",
});

// General API rate limiter (100 per minute)
export const apiLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"),
    prefix: "ratelimit:api",
});

/**
 * Get IP from request headers
 */
export function getIP(request) {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    return ip;
}

/**
 * Check rate limit and return result
 * @param {Ratelimit} limiter - Rate limiter instance
 * @param {string} identifier - Usually IP address
 * @returns {Promise<{success: boolean, remaining: number}>}
 */
export async function checkRateLimit(limiter, identifier) {
    try {
        const result = await limiter.limit(identifier);
        return {
            success: result.success,
            remaining: result.remaining,
            reset: result.reset,
        };
    } catch (error) {
        console.error("Rate limit error:", error);
        // Allow request if rate limiting fails
        return { success: true, remaining: -1 };
    }
}
