import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import userModel from "../models/userModel.js";
import transporter from "../config/nodemailer.js";
import { emailTemplate } from "../utility/emailTemplate.js";
/***
 * Register User
 */
export const register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ success: false, message: "Please fill all fields" });
  }
  try {
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new userModel({
      name,
      email,
      password: hashedPassword,
    });
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    // Sending welcome email

    const mailOptions = {

        from : process.env.SENDER_EMAIL,
        to : email,
        subject : 'Welcome to our platform',
        html : emailTemplate
    }
    await transporter.sendMail(mailOptions);

    return res.status(201).json({ success: true, message: "User created" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/** 
 * 
 * Login User
 */

export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res
      .status(400)
      .json({ success: false, message: "Email and Password are required" });
  }
    try {
      const user = await userModel.findOne({ email });
      if (!user) {
        res
          .status(400)
          .json({ success: false, message: "Invalid credentials" });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res
          .status(400)
          .json({ success: false, message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return res.json({ success: true });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
};

/**
 * 
 * @param {*} req 
 * @param {*} res
 * 
 * Logout 
 */
export const logout = (req, res) => {
    try {
        res.clearCookie("token",{
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        });
        res.json({ success: true, message: "Logged out" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

/** 
 * Send Verification OTP to the User's Email
 */

export const sendVerifyOtp = async (req, res) => {
    try {
        const {userId} = req.params;
        const user = await userModel.findById(userId);
        if(user.isAccountVerified){
            return res.status(400).json({success:false,message:"Account is already verified"});
        }
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        user.verifyOtp = otp;
        user.verifyOtpExpireAt = Date.now() + 10 * 60 * 1000;
        await user.save();
        const mailOptions = {
            from : process.env.SENDER_EMAIL,
            to : user.email,
            subject : 'Account Verification OTP',
            text : `Your OTP is ${otp}. Verify your account using this OTP.`
        }
        await transporter.sendMail(mailOptions);
        res.json({ success: true, message: "Verification OTP Sent on Email" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
export const verifyEmail = async (req, res) => {
    const {userId,otp} = req.body;
    // need to get userId from middlware token
    // 1.43hrs will look 
    if(!userId || !otp){
        return res.status(400).json({success:false,message:"Missing Details"});
    }
    try {
        const user = await userModel.findById(userId);
        if(!user){
            return res.status(404).json({success:false,message:"User not found"});
        }

        if(user.verifyOtp === '' || user.verifyOtp !== otp){
            return res.status(400).json({success:false,message:"Invalid OTP"});
        }
        if(user.verifyOtpExpireAt < Date.now()){
            return res.status(400).json({success:false,message:"OTP expired"});
        }

        user.isAccountVerified = true;
        user.verifyOtp = '';
        user.verifyOtpExpireAt = 0;
        await user.save();
        return res.status(200).json({success:true,message:"Email verified successfully"});
    } catch (error) {
        return res.status(500).json({success:false,message:"Internal server error"});
    }
}