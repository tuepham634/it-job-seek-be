import e, { Request, Response } from "express";
import AccountCompany from "../models/account-company.model";
import City from "../models/city.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AccountRequest } from "../interfaces/request.interface";
import Job from "../models/job.model";
import { create } from "domain";

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
    sameSite: "lax" // Cho phép gửi cookie giữa các domain
  })

  res.json({
    code: "success",
    message: "Đăng nhập thành công!",
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
  const find = {
    companyId: req.account._id
  }
  //Phân trang
  const LimitItems = 2;
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
  let limitItems = 12;
  if (req.query.limitItems) {
    limitItems = parseInt(`${req.query.limitItems}`);
  }
  const companyList = await AccountCompany
  .find({})
  .limit(limitItems)
  .sort({ createdAt: "desc" })
  const companyListFinal = [];

  for (const item of companyList) {
     const dataItemFinal = {
        id: item.id,
        logo: item.logo,
        companyName: item.companyName,
        cityName: "",
        totalJob: 0
      };
      const city = await City.findOne({
        _id: item.city
      })
      dataItemFinal.cityName = `${city?.name}`;
      const totalJob = await Job.countDocuments({
        companyId: item._id
      });
      dataItemFinal.totalJob = totalJob;
      companyListFinal.push(dataItemFinal);

  }
  console.log(companyListFinal);
  res.json({
    code: "success",
    message: "Thành công!",
    companyList: companyListFinal
  });
}