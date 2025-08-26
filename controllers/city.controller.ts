import { Request, Response } from "express";
import City from "../models/city.model";

export const list = async(req: Request, res: Response) => {
    const cityList = await City.find();
  res.json({
    code: "success",
    message: "Cập nhật thông tin thành công!",
    cityList: cityList
  })
}