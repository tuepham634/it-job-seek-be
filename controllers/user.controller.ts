import { Request, Response } from "express";
import AccountUser from "../models/account-user.model";
import bcrypt from "bcryptjs";
export const registerPost = async (req: Request, res: Response) => {
  console.log(req.body);
  const { username, email, password } = req.body;
  
  const existUser = await AccountUser.findOne({
    email: email
  })
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
    username: username,
    email: email,
    password: hashedPassword
  });
  await newUser.save();

  res.json({
    code: "success",
    message: "Đăng ký thành công!"
  })
};
