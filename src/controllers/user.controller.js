import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { user } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/clodinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler( async (req, res) => {
        //get user details from frontend
        //validation-- (not empty)
        //check if user already exist(email,name)
        //check for images, check for avatar
        //uploade them on cloudinary, avatar
        // create user object -create entry in db
        //remove password and referesh token field from response
        //check for user creation
        //return response


        const {fullname, email, username, password}= req.body
        console.log("email", email);
        // if (fullname === "" ){
        //     throw new ApiErrors(400, "fullname is required ")
        // }
         
        if (
            [fullname, email, username, password ].some( (fields) =>  fields?.trim() === "")
        ){
            throw new ApiErrors(400, "All fields are required")
        }

        const existedUser = User.findOne({
            $or: [{ username },{ email }]
        })
        
        if(existedUser){
            throw new ApiErrors(409, "User with email or username")
        }

        const avatarLocalPath = req.files?.avatar[0]?.path;
        const coverImagePath = req.files?.coverImage[0?.path];

        if(!avatarLocalPath){
            throw new ApiErrors(400, "Avatar file is required")
        }

       const avatar = await uploadOnCloudinary(avatarLocalPath)
       const coverImage = await uploadOnCloudinary (coverImagePath)

       if(!avatar){
        throw new ApiErrors(400, "Avatar file is required")
    }

   const user = await User.create({
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._Id).select(
        "-password -refreshToken"
    )

    if (!createdUsrer){
        throw new ApiErrors(500, "Something went wrong, while registering the user.")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User register successful")
    )
})

export {
    registerUser,
}