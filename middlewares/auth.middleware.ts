import { Response, NextFunction } from "express";
import { AccountRequest } from "../interfaces/request.interface";
import AccountUser from "../models/account-user.model";
import jwt from "jsonwebtoken";
export const verifyTokenUser = async (req: AccountRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies.token;
        if(!token) {
            res.json({
                code: "error",
                message: "Không tìm thấy token!"
            });
            return;
        }
        const decoded = jwt.verify(token,`${process.env.JWT_SECRET}`) as jwt.JwtPayload;
        const { id, email } = decoded;
        const existAccountUser = await AccountUser.findOne({
            _id: id,
            email: email
        })

        if(!existAccountUser) {
            res.json({
                code: "error",
                message: "Người dùng không tồn tại!"
            });
            return;
        }
        req.account = existAccountUser;

        next();
    } catch (error) {
        res.clearCookie("token");
        res.json({
            code: "error",
            message: "Token không hợp lệ!"
        });
    }
    
};
