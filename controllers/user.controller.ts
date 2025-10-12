import { Request, Response } from "express";
import AccountUser from "../models/account-user.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AccountRequest } from "../interfaces/request.interface";
import Job from "../models/job.model";
import AccountCompany from "../models/account-company.model";
import CV from "../models/cv.model";

export const registerPost = async (req: Request, res: Response) => {
  console.log(req.body);
  const { fullName, email, password } = req.body;
  
  const existUser = await AccountUser.findOne({email})
  if(existUser){
    res.json({
      code: "error",
      message: "Email đã tồn tại!"
    })
    return;
  }

  // Mã hóa mật khẩu
  const salt = await bcrypt.genSalt(10); // Tạo salt với độ dài 10
  const hashedPassword = await bcrypt.hash(password, salt); // Mã hóa mật khẩu với salt

  const newUser = new AccountUser({
    fullName: fullName,
    email: email,
    password: hashedPassword
  });
  await newUser.save();

  res.json({
    code: "success",
    message: "Đăng ký thành công!"
  })
};

//login

export const loginPost = async (req: Request, res: Response) => {
  console.log(req.body);

  const { email, password } = req.body;

  const user = await AccountUser.findOne({
    email: email
  })
  if(!user) {
    res.json({
      code: "error",
      message: "Email không tồn tại!"
    });
    return;
  }
  // So sánh mật khẩu
  const isPasswordValid  = await bcrypt.compare(password, `${user.password}`);
  if(!isPasswordValid) {
     res.json({
      code: "error",
      message: "Mật khẩu không đúng!"
    });
    return;
  }
  //tạo JWT
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email
    },
    `${process.env.JWT_SECRET}`,
    { 
      expiresIn: "1d"  // Token sẽ hết hạn sau 1 ngày
    }
  );
  // lưu token vào  cookie
  res.cookie("token", token, {
    httpOnly: true, 
    secure: process.env.NODE_ENV === "production" ? true : false, // false: http, true: https
    maxAge: 24 * 60 * 60 * 1000, // 1 ngày
    sameSite:"none" // Cho phép gửi cookie giữa các domain
  });

  res.json({
    code: "success",
    message: "Đăng nhập thành công!"
  });
}

export const profilePatch = async(req: AccountRequest, res: Response) => {
  if(req.file){
    req.body.avatar = req.file.path;
  }else {
    delete req.body.avatar;
  }

  await AccountUser.updateOne({
    _id: req.account._id
  }, req.body)
  console.log(req.body);
  console.log(req.file);
  res.json({
    code: "success",
    message: "Cập nhật thông tin thành công!"
  })
}

export const listCV = async (req: AccountRequest, res: Response) => {
  const userEmail = req.account.email;
  //Phân trang
  const LimitItems = 3;
  let page = 1
  if (req.query.page) {
    const currentPage = parseInt(`${req.query.page}`);
    if (currentPage > 0) {
      page = currentPage;
    }
  }
  const totalItems = await CV.countDocuments({ email: userEmail });
  const totalPage = Math.ceil(totalItems / LimitItems);
  if (page > totalPage && totalPage != 0) {
    page = totalPage;
  }
  

  const skip = (page - 1) * LimitItems;
  const listCV = await CV
    .find({
      email: userEmail
    })
    .sort({
      createdAt: "desc"
    })
    .skip(skip)
    .limit(LimitItems);

  const dataFinal = [];

  for (const item of listCV) {
    const dataItemFinal = {
      id: item.id,
      jobId: item.jobId,
      fullName: item.fullName,
      email: item.email,
      phone: item.phone,
      fileUrl: item.fileCV,
      jobTitle: "",
      companyName: "",
      jobSalaryMin: 0,
      jobSalaryMax: 0,
      jobPosition: "",
      jobWorkingForm: "",
      jobTech: "",
      status: item.status,
    };

    const infoJob = await Job.findOne({
      _id: item.jobId
    })

    if(infoJob) {
      dataItemFinal.jobTitle = `${infoJob.title}`;
      dataItemFinal.jobSalaryMin = parseInt(`${infoJob.salaryMin}`);
      dataItemFinal.jobSalaryMax = parseInt(`${infoJob.salaryMax}`);
      dataItemFinal.jobPosition = `${infoJob.position}`;
      dataItemFinal.jobWorkingForm = `${infoJob.workingForm}`;
      dataItemFinal.jobTech = `${infoJob.technologies.join(", ")}`;

      const infoCompany = await AccountCompany.findOne({
        _id: infoJob.companyId
      })

      if(infoCompany) {
        dataItemFinal.companyName = `${infoCompany.companyName}`;
        dataFinal.push(dataItemFinal);
      }
    }
  }

  res.json({
    code: "success",
    message: "Lấy danh sách CV thành công!",
    listCV: dataFinal,
    totalPage: totalPage
  })
}
export const deleteCVDel = async (req: AccountRequest, res: Response) => {
  try {
    const userEmail = req.account.email;
    const cvId = req.params.id;

    const infoCV = await CV.findOne({ _id: cvId, email: userEmail });

    if (!infoCV) {
      return res.json({
        code: "error",
        message: "CV không tồn tại hoặc không thuộc quyền của bạn!",
      });
    }

    await CV.deleteOne({ _id: cvId });

    res.json({
      code: "success",
      message: "Đã xóa!",
    });
  } catch (error) {
    console.log(error);
    res.json({
      code: "error",
      message: "Có lỗi xảy ra khi xóa CV!",
    });
  }
};
