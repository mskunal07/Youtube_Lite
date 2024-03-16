import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefereshToken = async (userId) => {

    try {

        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();

        user.refreshToken = refreshToken;
        user.save({ValidateBeforeSave: false});  // validateBeforeSave is to tell mongodb that just save the 
                                                // current user and don't ask for other properties/fields of user
                                                // like username,email,pass ....
                                                // because user.save() - method is used to save the current object 
                                                // in database so by default it will check for other properties of 
                                                // user aswell like username,pass.... so to avoid that user validateBeforeSave
        
        return {accessToken,refreshToken};

    } catch (error) {
        throw new ApiError(500,"Error while generating Access and Refresh Token")
    }
}

const registerUser = asyncHandler( async (req,res) => {

    // res.status(200).json({
    //     message: "ok",
    // })

    // Steps to register user : 

/*
    1.  Get user information / data from frontend 
    2.  valdate the information ( empty , correctness of email) 
    3.  check if user already exists (either by username or by email or any other unique entity )
    4.  check for images (for avatar as it is required in this db model)
    5.  upload images or other files on cloudinary 
    6.  create user object as to store in mongodb we required objects - create entry 
    7.  remove password and refreshtoken field from response as data needs to be sent to frontend as well for user to know its successfull registration
    8.  check for user creation
    9.  return response   

 */

    // getting info
    const {fullName,email,username,password} = req.body;
    console.log("email : ",  email);


    // validating data
    // checking individual field
    // if(fullName === "") {
    //     throw new ApiError(400,"Full Name is Required ");
    // }

    // checking all at once

    if(
        [fullName,email,username,password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400,"All fields are compulsory ! ");
    }

    const existedUser = await User.findOne(
       { 
        $or : [{username},{email}]
        }
    );

    if(existedUser) throw new ApiError(409,"User Already Exists ");

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath = "";
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath) {
        throw new ApiError(400,"Avatar is required ! ");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);


    if(!avatar) throw new ApiError(400,"avatar is required ! ");

    const user = await User.create({
        fullName,
        email,
        password,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        username: username.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if(!createdUser) throw new ApiError(500,"Something went wrong while registering the user ! ");

    return res.status(201).json(
        new ApiResponse(200,createdUser,"user registered")
    )
});

const loginUser = asyncHandler( async(req,res) => {

    // get user data from req.body
    // find user based on username or email
    // authenticate user based on password
    // generater access and refresh token
    // send cookie

    const {email,username,password} = req.body;

    if(!email && !username) {
        throw new ApiError(400,"email or username required ! ");
    }

    const user = await User.findOne({
        $or : [{username},{email}],
    });

    if(!user) throw new ApiError(404,"User Not Found ! ");

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid) {
        throw new ApiError(401,"Password incorrect ! ");
    }

    const {accessToken,refreshToken} = await generateAccessAndRefereshToken(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,accessToken,refreshToken
            },
            "User logged in Successfully !! "
        )
    );
});

const logoutUser = asyncHandler( async(req,res) => {

    // remove refresh token of the user 
    // remove cookies of the user 

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new:true
        }
    )

    // clear cookie and return res

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200, {}, "User Logout !! ")
    );

});

const refreshAccessToken = asyncHandler(async(req,res) => {

    const incommingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incommingRefreshToken) throw new ApiError(401,"Unauthourized Request ! ");

    try {
        const decodedToken = jwt.verify(incommingRefreshToken,process.env.REFRESH_TOKEN_SECRET);
    
        if(!decodedToken) throw new ApiError(401,"Invalid RefreshToken ! ");  // optional
    
        const user = await User.findById(decodedToken?._id);
    
        if(!user) throw new ApiError(401,"Invalid RefreshToken ! ");
    
        if(incommingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401,"Refresh Token expired or Used ! ");
        }
    
        const options = {
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newRefreshToken} = await generateAccessAndRefereshToken(user._id);
    
        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken:newRefreshToken
                },
                "Access Token Refreshed !! "
            )
        );
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid Refresh Token ! ");
    }

});

const changeCurrentPassword = asyncHandler(async(req,res) => {

    const {oldPassword,newPassword} = req.body;

    const user = await User.findById(req.user._id);

    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordValid) throw new ApiError(401,"Invalid Password ! ");

    user.password = newPassword;
    await user.save({ValidateBeforeSave:false});

    return res
    .status(200)
    .json(new ApiResponse(200,{},"Password Changed SuccessFully !! "));

});

const getCurrentUser = asyncHandler(async(req,res) => {

    return res.status(200)
    .json(new ApiResponse(200,req.user,"current User Fetched Successfully !! "));
});

const updateAccountDetails = asyncHandler(async(req,res) => {

    const {fullName,email} = req.body;

    if(!fullName || !email) throw new ApiError(400,"All Fields are required ! ");

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                fullName,   // both ways of writing is correct 
                email:email  // email : email, ---->  ultimately means email,
            }
        },
        {
            new:true
        }
    ).select("-password");

    return res.status(200)
    .json(
        new ApiResponse(200,user,"User Account Details Updated Successfully !! ")
    );
});

const updateUserAvatar = asyncHandler(async(req,res) => {

    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath) throw new ApiError(400,"Avatar file Missing ! ");

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url) throw new ApiError(400,"Error while Uploading avatar on Cloudinary ! ");

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{  
                avatar:avatar.url
            }
        },
        {
            new:true
        }
    ).select("-password");

    return res.status(200)
    .json(
        new ApiResponse(200,user,"Avatar Updated Successfully !! ")
    );

});

const updateUserCoverImage = asyncHandler(async(req,res) => {

    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath) throw new ApiError(400,"coverImage file Missing ! ");

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url) throw new ApiError(400,"Error while Uploading coverImage on Cloudinary ! ");

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{  
                coverImage:coverImage.url
            }
        },
        {
            new:true
        }
    ).select("-password");

    return res.status(200)
    .json(
        new ApiResponse(200,user,"Cover Image Updated Successfully !! ")
    );

});



export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
};