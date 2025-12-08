import e, { Request, Response } from "express";
import AccountCompany from "../models/account-company.model";
import City from "../models/city.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AccountRequest } from "../interfaces/request.interface";
import Job from "../models/job.model";
import CV from "../models/cv.model";
import { redisClient } from "../helpers/redis";

export const registerPost = async (req: Request, res: Response) => {
  const { companyName, email, password } = req.body;

  const existCompany = await AccountCompany.findOne({
    email: email
  })

  if (existCompany) {
    res.json({
      code: "error",
      message: "Email đã được sử dụng!"
    })

    return
  }
  // Mã hóa mật khẩu
  const salt = await bcrypt.genSalt(10); // Tạo salt với độ dài 10
  const hashedPassword = await bcrypt.hash(password, salt); // Mã hóa mật khẩu với salt

  const newCompany = new AccountCompany({
    companyName: companyName,
    email: email,
    password: hashedPassword
  })

  await newCompany.save();


  res.json({
    code: "success",
    message: "Đăng ký thành công!"
  })

}

export const loginPost = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const existAccount = await AccountCompany.findOne({
    email: email
  });

  if (!existAccount) {
    res.json({
      code: "error",
      message: "Email không tồn tại trong hệ thống!"
    });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, `${existAccount.password}`);
  if (!isPasswordValid) {
    res.json({
      code: "error",
      message: "Mật khẩu không đúng!"
    });
    return;
  }

  // Tạo JWT
  const token = jwt.sign(
    {
      id: existAccount.id,
      email: existAccount.email
    },
    `${process.env.JWT_SECRET}`,
    {
      expiresIn: '1d' // Token có thời hạn 1 ngày
    }
  )

  // Lưu token vào cookie
  res.cookie("token", token, {
    maxAge: 24 * 60 * 60 * 1000, // Token có hiệu lực trong 1 ngày
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false, // false: http, true: https
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Cho phép gửi cookie giữa các domain
     path: "/",
  })

  res.json({
    code: "success",
    message: "Đăng nhập thành công!",
    token: token
  });
}


export const profilePatch = async (req: AccountRequest, res: Response) => {
  if (req.file) {
    req.body.logo = req.file.path;
  } else {
    delete req.body.logo;
  }

  await AccountCompany.updateOne({
    _id: req.account._id
  }, req.body)
  console.log(req.body);
  console.log(req.file);
  res.json({
    code: "success",
    message: "Cập nhật thông tin thành công!"
  })
}

export const jobCreatePost = async (req: AccountRequest, res: Response) => {
  req.body.companyId = req.account._id;
  req.body.salaryMin = parseInt(req.body.salaryMin) || 0;
  req.body.salaryMax = parseInt(req.body.salaryMax) || 0;
  req.body.technologies = req.body.technologies ? req.body.technologies.split(", ") : [];
  req.body.images = [];

  //xử lý mảng hình ảnh
  if (req.files) {
    for (const file of req.files as any[]) {
      req.body.images.push(file.path);
    }
  }
  const newJob = new Job(req.body);
  await newJob.save();
  res.json({
    code: "success",
    message: "Tạo mới công việc thành công!"

  })
}



export const jobList = async (req: AccountRequest, res: Response) => {
  const find: any = {
    companyId: req.account._id
  }
  if (req.query.position && req.query.position !== "") {
    find.position = req.query.position;
  }

  if (req.query.workingForm && req.query.workingForm !== "") {
    find.workingForm = req.query.workingForm;
  }
  //Phân trang
  const LimitItems = 6;
  let page = 1
  if (req.query.page) {
    const currentPage = parseInt(`${req.query.page}`);
    if (currentPage > 0) {
      page = currentPage;
    }
  }
  const totalItems = await Job.countDocuments(find);
  const totalPage = Math.ceil(totalItems / LimitItems);
  if (page > totalPage && totalPage != 0) {
    page = totalPage;
  }

  const skip = (page - 1) * LimitItems;

  const jobs = await Job.find(find)
    .sort({
      createdAt: "desc"
    })
    .skip(skip)
    .limit(LimitItems);

  const dataFinal = [];
  const city = await City.findOne({
    _id: req.account.city
  });

  for (const item of jobs) {
    dataFinal.push({
      id: item.id,
      companyLogo: req.account.logo,
      title: item.title,
      companyName: req.account.companyName,
      salaryMin: item.salaryMin,
      salaryMax: item.salaryMax,
      position: item.position,
      workingForm: item.workingForm,
      companyCity: city?.name,
      technologies: item.technologies,

    })

  }
  res.json({
    code: "success",
    jobs: dataFinal,
    totalPage: totalPage
  });
}

export const jobEdit = async (req: AccountRequest, res: Response) => {
  try {

    const { id } = req.params;
    const jobDetail = await Job.findOne({
      _id: id,
      companyId: req.account._id
    })
    if (!jobDetail) {
      res.json({
        code: "error",
        message: "Id không hợp lệ"
      })
      return;
    }
    res.json({
      code: "success",
      message: "Lấy thông tin công việc thành công!",
      jobDetail: jobDetail
    });
  } catch (error) {
    console.log(error);
    res.json({
      code: "error",
      message: "id không hợp lệ!"
    });
  }

}

export const jobEditPatch = async (req: AccountRequest, res: Response) => {
  try {
    const { id } = req.params;
    const jobDetail = await Job.findOne({
      _id: id,
      companyId: req.account._id
    })
    if (!jobDetail) {
      res.json({
        code: "error",
        message: "Id không hợp lệ"
      })
      return;
    }
    req.body.salaryMin = req.body.salaryMin ? parseInt(req.body.salaryMin) : 0;
    req.body.salaryMax = req.body.salaryMax ? parseInt(req.body.salaryMax) : 0;
    req.body.technologies = req.body.technologies ? req.body.technologies.split(", ") : [];
    req.body.images = [];

    // Xử lý mảng images
    if (req.files) {
      for (const file of req.files as any[]) {
        req.body.images.push(file.path);
      }
    }

    await Job.updateOne({
      _id: id,
      companyId: req.account.id
    }, req.body)

    res.json({
      code: "success",
      message: "Cập nhật thành công!"
    })

  } catch (error) {
    console.log(error);
    res.json({
      code: "error",
      message: "id không hợp lệ!"
    });
  }
}

export const deleteJobDel = async (req: AccountRequest, res: Response) => {
  try {
    const { id } = req.params;
    const jobDetail = await Job.findOne({
      _id: id,
      companyId: req.account._id
    })
    if (!jobDetail) {
      res.json({
        code: "error",
        message: "Id không hợp lệ"
      })
      return;
    }
    await Job.deleteOne({
      _id: id,
      companyId: req.account._id
    })
    res.json({
      code: "success",
      message: "Xóa công việc thành công!"
    });
  } catch (error) {
    console.log(error);
    res.json({
      code: "error",
      message: "id không hợp lệ!"
    });
  }
}

export const companyList = async (req: Request, res: Response) => {
  const limitItems = req.query.limitItems ? parseInt(`${req.query.limitItems}`) : 0;
  const page = req.query.page ? parseInt(`${req.query.page}`) : 1;
  
  const redisKey = `companies:list:${page}:${limitItems}`;
  
  // Check cache
  const cachedData = await redisClient.get(redisKey);
  if (cachedData) {
    res.json(JSON.parse(cachedData));
    return;
  }

  const totalRecord = await AccountCompany.countDocuments({});
  let actualLimitItems = limitItems || totalRecord;

  const totalPage = Math.ceil(totalRecord / actualLimitItems);
  let actualPage = page;
  if (actualPage > totalPage && totalPage != 0) {
    actualPage = totalPage;
  }
  const skip = (actualPage - 1) * actualLimitItems;

  // Lấy tất cả công ty (chưa phân trang) để tính totalJob
  const companyList = await AccountCompany.find({});

  const companyListFinal: any[] = [];

  for (const item of companyList) {
    const totalJob = await Job.countDocuments({
      companyId: item._id
    });

    const city = await City.findOne({
      _id: item.city
    });

    companyListFinal.push({
      id: item.id,
      logo: item.logo,
      companyName: item.companyName,
      cityName: city?.name || "",
      totalJob
    });
  }

  // Sort theo totalJob giảm dần
  companyListFinal.sort((a, b) => b.totalJob - a.totalJob);

  //Phân trang sau khi sort
  const paginatedList = companyListFinal.slice(skip, skip + actualLimitItems);
  
  const responseData = {
    code: "success",
    message: "Thành công!",
    companyList: paginatedList,
    companyListFinal: companyListFinal,
    totalPage: totalPage
  };

  // Cache for 5 minutes
  await redisClient.set(redisKey, JSON.stringify(responseData), {
    EX: 300
  });

  res.json(responseData);
};


export const detail = async (req:Request, res:Response) => {
  try {
    const id = req.params.id; // slug = id
    const page = parseInt(`${req.query.page}`) || 1;
    const limit = parseInt(`${req.query.limit}`) || 6;
    const redisKey = `companies:detail:${id}:${page}:${limit}`;

    // Check cache
    const cachedData = await redisClient.get(redisKey);
    if (cachedData) {
      res.json(JSON.parse(cachedData));
      return;
    }

    const skip = (page - 1) * limit;

    const record = await AccountCompany.findOne({ _id: id });

    if (!record) {
      res.json({ code: "error", message: "Id không hợp lệ!" });
      return;
    }

    const companyDetail = {
      id: record.id,
      logo: record.logo,
      companyName: record.companyName,
      address: record.address,
      companyModel: record.companyModel,
      companyEmployees: record.companyEmployees,
      workingTime: record.workingTime,
      workOvertime: record.workOvertime,
      description: record.description,
    };

    const totalJobs = await Job.countDocuments({ companyId: record.id });

    const jobList = await Job.find({ companyId: record.id })
      .sort({ createdAt: "desc" })
      .skip(skip)
      .limit(limit);

    const city = await City.findOne({ _id: record.city });

    const dataFinal = jobList.map((item) => ({
      id: item.id,
      companyLogo: record.logo,
      title: item.title,
      companyName: record.companyName,
      salaryMin: item.salaryMin,
      salaryMax: item.salaryMax,
      position: item.position,
      workingForm: item.workingForm,
      companyCity: city?.name,
      technologies: item.technologies,
    }));

    const responseData = {
      code: "success",
      message: "Thành công!",
      companyDetail,
      jobList: dataFinal,
      pagination: {
        page,
        limit,
        total: totalJobs,
        totalPages: Math.ceil(totalJobs / limit),
      },
    };

    // Cache for 10 minutes
    await redisClient.set(redisKey, JSON.stringify(responseData), {
      EX: 600
    });

    res.json(responseData);
  } catch (error) {
    console.error(error);
    res.json({ code: "error", message: "Lỗi server!" });
  }
};

export const listCV = async (req: AccountRequest, res: Response) => {
  const companyId = req.account.id;

  // Phân trang
  const LimitItems = 6; // số CV trên 1 trang
  let page = 1;
  if (req.query.page) {
    const currentPage = parseInt(`${req.query.page}`);
    if (currentPage > 0) page = currentPage;
  }

  const redisKey = `company:${companyId}:cv:list:${page}`;

  // Check cache
  const cachedData = await redisClient.get(redisKey);
  if (cachedData) {
    res.json(JSON.parse(cachedData));
    return;
  }

  // Lấy tất cả job của công ty
  const listJob = await Job.find({ companyId });
  const listJobId = listJob.map(item => item.id);

  // Tổng số CV và tổng trang
  const totalItems = await CV.countDocuments({ jobId: { $in: listJobId } });
  const totalPage = Math.ceil(totalItems / LimitItems);

  if (page > totalPage && totalPage !== 0) page = totalPage;

  const skip = (page - 1) * LimitItems;

  // Lấy CV theo phân trang
  const listCV = await CV.find({ jobId: { $in: listJobId } })
    .sort({ createdAt: "desc" })
    .skip(skip)
    .limit(LimitItems);

  const dataFinal = [];

  for (const item of listCV) {
    const dataItemFinal: any = {
      id: item.id,
      jobTitle: "",
      fullName: item.fullName,
      email: item.email,
      phone: item.phone,
      jobSalaryMin: 0,
      jobSalaryMax: 0,
      jobPosition: "",
      jobWorkingForm: "",
      viewed: item.viewed,
      status: item.status,
    };

    const infoJob = await Job.findOne({ _id: item.jobId });
    if (infoJob) {
      dataItemFinal.jobTitle = infoJob.title;
      dataItemFinal.jobSalaryMin = parseInt(`${infoJob.salaryMin}`);
      dataItemFinal.jobSalaryMax = parseInt(`${infoJob.salaryMax}`);
      dataItemFinal.jobPosition = infoJob.position;
      dataItemFinal.jobWorkingForm = infoJob.workingForm;
    }

    dataFinal.push(dataItemFinal);
  }
  
  const responseData = {
    code: "success",
    message: "Lấy danh sách CV thành công!",
    listCV: dataFinal,
    totalPage,
    totalRecord: totalItems,
  };

  // Cache for 2 minutes (company data changes frequently)
  await redisClient.set(redisKey, JSON.stringify(responseData), {
    EX: 120
  });

  res.json(responseData);
};

export const detailCV = async (req: AccountRequest, res: Response) => {
  try {
    const companyId = req.account.id;
    const cvId = req.params.id;

    const infoCV = await CV.findOne({
      _id: cvId
    })

    if(!infoCV) {
      res.json({
        code: "error",
        message: "Id không hợp lệ!"
      });
      return;
    }

    const infoJob = await Job.findOne({
      _id: infoCV.jobId,
      companyId: companyId
    })

    if(!infoJob) {
      res.json({
        code: "error",
        message: "Không có quyền truy cập!"
      });
      return;
    }

    const dataFinalCV = {
      fullName: infoCV.fullName,
      email: infoCV.email,
      phone: infoCV.phone,
      fileCV: infoCV.fileCV,
    };

    const dataFinalJob = {
      id: infoJob.id,
      title: infoJob.title,
      salaryMin: infoJob.salaryMin,
      salaryMax: infoJob.salaryMax,
      position: infoJob.position,
      workingForm: infoJob.workingForm,
      technologies: infoJob.technologies,
    };

    // Cập nhật trạng thái thành đã xem
    await CV.updateOne({
      _id: cvId
    }, {
      viewed: true
    })
    // console.log("CV: ", dataFinalCV);
    // console.log("Job: ",dataFinalJob);
    res.json({
      code: "success",
      message: "Thành công!",
      infoCV: dataFinalCV,
      infoJob: dataFinalJob
    });
  } catch (error) {
    console.log(error);
    res.json({
      code: "error",
      message: "Id không hợp lệ!"
    })
  }
}

export const changeStatusCVPatch = async (req: AccountRequest, res: Response) => {
  try {
    const companyId = req.account.id;
    const status = req.body.action;
    const cvId = req.body.id;

    const infoCV = await CV.findOne({
      _id: cvId
    })

    if(!infoCV) {
      res.json({
        code: "error",
        message: "Id không hợp lệ!"
      });
      return;
    }

    const infoJob = await Job.findOne({
      _id: infoCV.jobId,
      companyId: companyId
    })

    if(!infoJob) {
      res.json({
        code: "error",
        message: "Không có quyền truy cập!"
      });
      return;
    }

    await CV.updateOne({
      _id: cvId
    }, {
      status: status
    })

    res.json({
      code: "success",
      message: "Thành công!"
    })
  } catch (error) {
    console.log(error);
    res.json({
      code: "error",
      message: "Id không hợp lệ!"
    })
  }
}

export const deleteCVDel = async (req: AccountRequest, res: Response) => {
  try {
    const companyId = req.account.id;
    const cvId = req.params.id;

    const infoCV = await CV.findOne({
      _id: cvId
    })

    if(!infoCV) {
      res.json({
        code: "error",
        message: "Id không hợp lệ!"
      });
      return;
    }

    const infoJob = await Job.findOne({
      _id: infoCV.jobId,
      companyId: companyId
    })

    if(!infoJob) {
      res.json({
        code: "error",
        message: "Không có quyền truy cập!"
      });
      return;
    }

    await CV.deleteOne({
      _id: cvId
    })

    res.json({
      code: "success",
      message: "Đã xóa!"
    })
  } catch (error) {
    console.log(error);
    res.json({
      code: "error",
      message: "Id không hợp lệ!"
    })
  }
}
