import e from "express";
import mongoose from "mongoose";

const schema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
},
{
    timestamps: true, // Tự động thêm trường createdAt và updatedAt
}
)

const AccountUser = mongoose.model("AccountUser", schema,"accounts-user");
export default AccountUser;
