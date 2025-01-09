import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";
import { ApiErrors } from "../utils/ApiErrors.js";

export const verifyJWT = asyncHandler(async(req, _, next) => {
  // let stringToken
  console.log("Inside verifyJWT")
  // console.log(req.header("Authorization").replace("Bearer ", "").trim())
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "").trim()
        // console.log("Trying from cookies: ", req.cookies?.accessToken)
        // const token = req.header("Authorization").replace("Bearer ", "").trim()
        
        //  console.log("Token from request:", token);
        //  console.log(typeof token)

        // if (!token || typeof token !== "string" || !token.trim()) {
        //     console.log("Token type: ", typeof token);
        //     console.log("Converting token into string");
        //     stringToken = JSON.stringify(token);
        //     console.log("Converted token: ", stringToken);
        //     console.log("Type: ", typeof stringToken);
        // }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        // console.log("Decoded token: ", decodedToken)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
    
        if (!user) {
            throw new ApiErrors(401, "Invalid Access Token")
        }
    
        req.user = user;
        next()
    } catch (error) {
      console.error("JWT Verification Error:", error.message);
        throw new ApiErrors(401, error?.message || "Invalid access token")
    }
    
})