import { createClient } from "redis";

export const redisClient = createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379"
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
