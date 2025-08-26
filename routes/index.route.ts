import { Router } from "express";
import userRoute from "./user.route";
import authRoutes from "./auth.route";
import companyRoute from "./company.route";
import cityRoute from "./city.route";
import uploadRoute from "./upload.route";
const router = Router();

router.use("/user", userRoute);
router.use("/company", companyRoute);
router.use('/auth', authRoutes);
router.use('/city', cityRoute);
router.use('/upload', uploadRoute);
export default router;