import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const isUpstash = redisUrl.includes("upstash.io");

export const redisClient = createClient({
    url: redisUrl,
    socket: isUpstash ? {
        tls: true,
        rejectUnauthorized: false
    } : undefined
});

redisClient.on("error", (err) => console.log("Redis Client Error", err));
redisClient.on("connect", () => console.log("Redis Connected!"));

export const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.log("Redis Connection Failed:", error);
    }
};
