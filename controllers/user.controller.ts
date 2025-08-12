import { Request, Response } from "express";
import AccountUser from "../models/account-user.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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
    sameSite:"lax" // Cho phép gửi cookie giữa các domain
  });

  res.json({
    code: "success",
    message: "Đăng nhập thành công!"
  });
}