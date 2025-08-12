import { Router } from "express";
import userRoute from "./user.route";
import authRoutes from "./auth.route";
const router = Router();

router.use("/user", userRoute);
router.use('/auth', authRoutes);
export default router;