import { Request, Response } from "express";
import City from "../models/city.model";
import { redisClient } from "../helpers/redis";

export const list = async(req: Request, res: Response) => {
    const redisKey = "cities:list";
    
    // Check cache
    const cachedData = await redisClient.get<string>(redisKey);
    if (cachedData) {
      res.json(JSON.parse(cachedData));
      return;
    }

    const cityList = await City.find();
    
    const responseData = {
      code: "success",
      message: "Cập nhật thông tin thành công!",
      cityList: cityList
    };

    // Cache for 1 hour (cities rarely change)
    await redisClient.set(redisKey, JSON.stringify(responseData), {
      ex: 3600
    });

    res.json(responseData);
}
