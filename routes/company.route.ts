import { Router } from "express";
import * as companyController from "../controllers/company.controller";
import * as companyValidate from "../validates/company.validate";
import { storage } from "../helpers/cloudinary.helper";
import multer from "multer";
import * as authMiddleware from "../middlewares/auth.middleware";

const upload = multer({ storage: storage });
const router = Router();

router.post(
    "/register", 
    companyValidate.registerPost, 
    companyController.registerPost,
);
router.post(
    "/login",
    companyValidate.loginPost,
    companyController.loginPost
)
router.patch(
    "/profile",
    authMiddleware.verifyTokenCompany,
    upload.single("logo"),
    companyController.profilePatch
);
export default router;