import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { refereshAccessToken } from "../controllers/user.controller.js";




const router = Router()

router.route("/register").post(
    upload.fields([
        {
           name: "avatar",
           maxCount: 1 
        },
        {
            name :"coverImage",
            maxCount:1
        }
    ]),
    // (req, res, next) => {
    //     console.log("Request Body:", req.body);
    //     console.log("Uploaded Files:", req.files);
    //     next();
    //   },
    registerUser
)

router.route("/login").post(loginUser)
//secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route ("/referesh-token").post(refereshAccessToken )
export default router