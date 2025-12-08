import { Redis } from "@upstash/redis";

// Upstash REST client - works better on serverless/Render
export const redisClient = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL || "",
    token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export const connectRedis = async () => {
    try {
        // Test connection with a simple ping
        await redisClient.ping();
        console.log("Redis Connected!");
    } catch (error) {
        console.log("Redis Connection Failed:", error);
    }
};
