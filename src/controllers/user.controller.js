import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


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

export {registerUser};