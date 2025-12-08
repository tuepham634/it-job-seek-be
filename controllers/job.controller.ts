import { Request, Response } from "express";
import Job from "../models/job.model";
import CV from "../models/cv.model";
import AccountCompany from "../models/account-company.model";

import { redisClient } from "../helpers/redis";

export const detail = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const redisKey = `jobs:detail:${id}`;

    const cachedData = await redisClient.get<string>(redisKey);
    if (cachedData) {
       res.json(cachedData);
       return;
    }

    const record = await Job.findOne({
      _id: id
    })

    if(!record) {
      res.json({
        code: "error",
        message: "Id không hợp lệ!"
      })
      return;
    }

    const jobDetail: any = {
      id: record.id,
      title: record.title,
      companyName: "",
      salaryMin: record.salaryMin,
      salaryMax: record.salaryMax,
      images: record.images,
      position: record.position,
      workingForm: record.workingForm,
      companyAddress: "",
      technologies: record.technologies,
      description: record.description,
      companyLogo: "",
      companyId: record.companyId,
      companyModel: "",
      companyEmployees: "",
      companyWorkingTime: "",
      companyWorkOvertime: ""
    };

    const companyInfo = await AccountCompany.findOne({
      _id: record.companyId
    });

    if(companyInfo) {
      jobDetail.companyName = `${companyInfo.companyName}`;
      jobDetail.companyAddress = `${companyInfo.address}`;
      jobDetail.companyLogo = `${companyInfo.logo}`;
      jobDetail.companyModel = `${companyInfo.companyModel}`;
      jobDetail.companyEmployees = `${companyInfo.companyEmployees}`;
      jobDetail.companyWorkingTime = `${companyInfo.workingTime}`;
      jobDetail.companyWorkOvertime = `${companyInfo.workOvertime}`;
    }
    
    // Cache for 10 minutes
    const responseData = {
      code: "success",
      message: "Thành công!",
      jobDetail: jobDetail
    };

    await redisClient.set(redisKey, JSON.stringify(responseData), {
      ex: 600
    });

    // console.log("Data công ty: ", jobDetail);
    res.json(responseData);
  } catch (error) {
    console.log(error);
    res.json({
      code: "error",
      message: "Id không hợp lệ!"
    })
  }
}

export const applyPost = async (req: Request, res: Response) => {
 req.body.fileCV = req.file ? req.file.path : "";
  // console.log("Body: ", req.body);
  const newRecord = new CV(req.body);
  await newRecord.save();

  res.json({
    code: "success",
    message: "Đã gửi CV thành công!"
  })

}
