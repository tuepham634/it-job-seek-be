import { Request, Response } from "express";
import Job from "../models/job.model";
import AccountCompany from "../models/account-company.model";
import City from "../models/city.model";
import { redisClient } from "../helpers/redis";

export const search = async (req: Request, res: Response) => {
  try {
    // Create cache key from query parameters
    const queryParams = new URLSearchParams(req.query as any).toString();
    const redisKey = `search:${queryParams}`;

    // Check cache
    const cachedData = await redisClient.get<string>(redisKey);
    if (cachedData) {
      res.json(JSON.parse(cachedData));
      return;
    }

    const dataFinal: any[] = [];
    let totalPage = 0;
    let totalRecord = 0;

    // Nếu không có query thì trả danh sách rỗng
    if (Object.keys(req.query).length === 0) {
      return res.json({
        code: "success",
        message: "Không có điều kiện tìm kiếm",
        jobs: [],
        totalPage: 0,
        totalRecord: 0
      });
    }

    // Điều kiện tìm kiếm
    const find: any = {};

    // 1️ Lọc theo ngôn ngữ
    if (req.query.language) {
      find.technologies = req.query.language;
    }

    // 2️ Lọc theo thành phố
    if (req.query.city) {
      const city = await City.findOne({ name: req.query.city });
      if (city) {
        const companiesInCity = await AccountCompany.find({ city: city._id });
        const companyIds = companiesInCity.map(item => item.id);
        find.companyId = { $in: companyIds };
      }
    }

    // 3️ Lọc theo tên công ty
    if (req.query.company) {
      const company = await AccountCompany.findOne({
        companyName: req.query.company
      });
      if (company) {
        find.companyId = company.id;
      }
    }

    // 4️ Lọc theo từ khóa
    if (req.query.keyword) {
      const keywordRegex = new RegExp(`${req.query.keyword}`, "i");
      find["$or"] = [
        { title: keywordRegex },
        { technologies: keywordRegex }
      ];
    }

    // 5️ Lọc theo vị trí
    if (req.query.position) {
      find.position = req.query.position;
    }

    // 6️ Lọc theo hình thức làm việc
    if (req.query.workingForm) {
      find.workingForm = req.query.workingForm;
    }

    //  Phân trang
    const limitItems = 6;
    let page = 1;

    if (req.query.page) {
      const currentPage = parseInt(`${req.query.page}`);
      if (currentPage > 0) page = currentPage;
    }

    totalRecord = await Job.countDocuments(find);
    totalPage = Math.ceil(totalRecord / limitItems);

    // Nếu không có job nào thì trả luôn
    if (totalRecord === 0) {
      return res.json({
        code: "success",
        message: "Không tìm thấy công việc nào",
        jobs: [],
        totalPage: 0,
        totalRecord: 0
      });
    }

    if (page > totalPage) page = totalPage;
    const skip = (page - 1) * limitItems;

    //  Lấy dữ liệu công việc
    const jobs = await Job.find(find)
      .sort({ createdAt: "desc" })
      .limit(limitItems)
      .skip(skip);

    for (const item of jobs) {
      const companyInfo = await AccountCompany.findOne({ _id: item.companyId });

      let companyCity = "";
      if (companyInfo) {
        const city = await City.findOne({ _id: companyInfo.city });
        companyCity = city?.name || "";
      }

      dataFinal.push({
        id: item.id,
        companyLogo: companyInfo?.logo || "",
        title: item.title,
        companyName: companyInfo?.companyName || "",
        salaryMin: item.salaryMin,
        salaryMax: item.salaryMax,
        position: item.position,
        workingForm: item.workingForm,
        companyCity: companyCity,
        technologies: item.technologies,
      });
    }

    //  Trả kết quả về frontend
    const responseData = {
      code: "success",
      message: "Thành công!",
      jobs: dataFinal,
      totalPage: totalPage,
      totalRecord: totalRecord,
      currentPage: page,
      limitItems: limitItems
    };

    // Cache for 3 minutes (search results change more frequently)
    await redisClient.set(redisKey, JSON.stringify(responseData), {
      ex: 180
    });

    res.json(responseData);

  } catch (error: any) {
    console.error("Lỗi search job:", error);
    res.status(500).json({
      code: "error",
      message: "Lỗi server khi tìm kiếm",
      error: error.message
    });
  }
};
