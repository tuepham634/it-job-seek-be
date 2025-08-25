import express from "express";
import cors from "cors";
import { connectDB } from "./config/database";
import dotenv from "dotenv";
import routers from "./routes/index.route";
import cookieParser = require("cookie-parser");

//load biến môi trường
dotenv.config();
const app = express();
const port = 4000;

//kết nối db
connectDB();
//Cấu hình CORS
app.use(cors({
  origin: "http://localhost:3000", // URL của frontend
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE","OPTIONS"], // Các phương thức HTTP được phép
  allowedHeaders: ["Content-Type", "Authorization"], // Các header được phép
  credentials: true // Cho phép gửi cookie qua lại giưa be và fe
}));

// cho phé gửi dữ liệu dạng JSON
app.use(express.json());

// Cấu hình cookie-parser
app.use(cookieParser());

app.use("/", routers);


app.listen(port, () => {
  console.log(`Website đang chạy trên cổng : ${port}`);
});