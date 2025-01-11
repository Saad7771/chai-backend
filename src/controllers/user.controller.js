import {asyncHandler} from "../utils/asyncHandler.js";
import { ApiErrors } from "../utils/ApiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"; 

const generateAccessTokenAndRefereshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refereshToken = user.generateRefereshToken()
        
        user.refereshToken = refereshToken
        await  user.save({validateBeforeSave: false})

        return {accessToken, refereshToken}

    } catch (error) {
        throw new ApiErrors(500, "Something went wrong while generating referesh and access tokens")
    }
}
const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {fullName, email, username, password } = req.body
    console.log("Validation ", req.body);

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiErrors(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiErrors(409, "User with email or username already exists")
    }
    //console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    

    if (!avatarLocalPath) {
        throw new ApiErrors(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiErrors(400, "Avatar file is required")
    }
   

    const user = await User.create({
        fullname: fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiErrors(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
} )

const loginUser = asyncHandler(async (req,res) =>{
    //req body-> data
    //username or email
    //find the user 
    //password check
    //access and referesh token
    //send cookie

    const{username, email, password} = req.body
    if(!username && !email){
        throw new ApiErrors(400, "username or password is required")
    }
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiErrors(404,"User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect (password)
    if(!isPasswordValid){
        throw new ApiErrors (401, "Invalid user credential")
    }

    const {accessToken, refereshToken} = await generateAccessTokenAndRefereshToken(user._id)

    const loggedInUser = await User.findById(user._id).
    select("-password -refereshToken")

    // console.log("Access Token: ", accessToken)

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refereshToken", refereshToken, options)
    .json( 
        new ApiErrors(
            200,
            {
                user: loggedInUser, accessToken, refereshToken
            },
            "User Logged In SuccessFully"
        )
    )

})

const logoutUser = asyncHandler(async (req,res) => {
    // console.log("Inside logOut handler");
    
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refereshToken: 1
            }
        },
        {
            new: true
        }

    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refereshToken", options)
    .json(new ApiResponse (200, {}, "User logged out"))

})

const refereshAccessToken = asyncHandler (async(req,res) => {
    const incomingRefereshToken = req.cookies.refereshToken || req.body.refereshToken
    
    if(!incomingRefereshToken){
        throw new ApiErrors (401, "Unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefereshToken,
            process.env.REFERESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiErrors(401,"Invalid Referesh Token")
        }
    
        if (incomingRefereshToken !== user?.refereshToken) {
            throw new ApiErrors (401, "Referesh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefereshToken} = await generateAccessTokenAndRefereshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refereshToken", newRefereshToken, options)
        .json(
            new ApiResponse(
                200,
                {accessToken, refereshToken: newRefereshToken}, 
                "Access token referesh"
            )
        )
    
    } catch (error) {
        throw new ApiErrors(401, error?.message || "Invalid refesh token")
    }
})

const changeCurrentPassword = asyncHandler (async (req, res) => {

    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiErrors(401,"Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Change Successfully"))

})

const getCurrentUser = asyncHandler (async (req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched suucessfully"))
})

const updateAccountDetail = asyncHandler (async (req, res) => {

    const { fullname, email } = req.body

    if (!fullname || !email) {
        throw new ApiErrors (401, "All fields are required") 
    }

    const user = User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullname: fullname,
                email: email
            }
        },
        { new: true } //update hone ke baad jo info rahti hai wo return hoti hai
    ).select("-password")

    return res
    .status(200)
    .json (new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar = asyncHandler (async (req, res) => {
    const avatarLpcalPath = req.file?.path

    if (!avatarLpcalPath) {
        throw new ApiErrors (401, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLpcalPath)

    if (!avatar.url) {
        throw  new ApiErrors (401,"Error while uploading on avatar")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse (200, user, "Avatar updated successfully")
    )



})

const updateUserCoverImage = asyncHandler (async (req, res) => {
    
    const coverImageLpcalPath = req.file?.path

    if (!coverImageLpcalPath) {
        throw new ApiErrors (401, "Cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLpcalPath)

    if (!coverImage.url) {
        throw  new ApiErrors (401,"Error while uploading on cover image")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse (200, user, "Cover image updated successfully")
    )


})

export {
    registerUser,
    loginUser,
    logoutUser,
    refereshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetail,
    updateUserAvatar,
    updateUserCoverImage
}