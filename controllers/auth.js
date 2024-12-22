const bcrypt = require('bcrypt');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const {cloudinary} = require('../cloudConfig');
const { transporter } = require('../lib/nodemailer');

// cookies option
const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 24 * 60 * 60 * 1000,
};

const signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ msg: 'e-mail already exists' });
        }

        // checking for strong password
        if (password.length < 6) {
            return res.status(400).json({ msg: 'Password must be at least 6 characters long' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create a new user
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
        });

        // Generate a JWT token
        const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET);
        // store in cookies
        res.cookie('token', token, cookieOptions);

        // Save the user to the database
        await newUser.save();

        res.status(200).json({ msg: `Welcome ${newUser.username}` , newUser});
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Checking email
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'User not found' });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid password' });
        }

        // Generate a JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
        // store in cookies
        res.cookie('token', token, cookieOptions);

        res.status(200).json({ msg: 'Login successful', user});
    } catch (error) {
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
}

const logout = async (req,res) => {
    res.clearCookie('token' , {
        httpOnly: true,
        secure: true,
        sameSite: "None",
    });
    res.status(200).json({msg: 'logout successfull'})
}

const checkAuth = (req, res) => {
    try {
      res.status(200).json(req.user);
    } catch (error) {
      console.log("Error in checkAuth controller", error.message);
      res.status(500).json({ message: "Internal Server Error" });
    }
}

const updateProfile = async (req, res) => {
    try {
        const result = await cloudinary.uploader.upload(req.file.path);
        const userId = req.user._id;

        const updatedUser = await User.findByIdAndUpdate( userId, { image: result.secure_url}, { new: true } );
  
        res.status(200).json({msg:'Profile Updated' , user:updatedUser});
    } catch (error) {
        console.log("error in update profile:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const updatePassword = async (req, res) => {
    try {
        const { current:currPassword, new:newPassword } = req.body;

        if (!currPassword || !newPassword) {
            return res.status(400).json({ message: "Current and new passwords are required." });
        }

        const user = await User.findById(req.user.id);

        const isMatch = await bcrypt.compare(currPassword, user.password);
        if(!isMatch) {
            return res.status(401).json({ message: "Wrong Password" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ message: "Password updated successfully." });
    } catch (error) {
        console.error("Error in update password:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

const sendOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000);
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

        user.otp = otp;
        user.otpExpiresAt = expiresAt;
        await user.save();

        await transporter.sendMail({
            from: 'chatify_@gmail.com',
            to: email,
            subject: "OTP to reset Chatify Password",
            html: `<h1>Your OTP Code</h1><p>Use the following OTP to verify: <strong>${otp}</strong></p>`
        });

        res.status(200).send({ message: 'OTP sent' });
    } catch (error) {
        res.status(500).send({ message: 'Failed to send OTP', error });
    }
};

const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const currentTime = Date.now();
        
        // Check if OTP is valid and within 5-minute window
        if (user.otp === otp && currentTime <= user.otpExpiresAt) {
            // Clear OTP after successful verification
            user.otp = undefined; 
            user.otpExpiresAt = undefined; 
            await user.save();

            return res.status(200).send({ message: 'OTP verified successfully' });
        } else {
            return res.status(400).send({ message: 'Invalid or expired OTP' });
        }
    } catch (error) {
        res.status(500).send({ message: 'Failed to verify OTP', error });
    }
};

const resetPassword = async (req, res) => {
    const { email, newPassword, confirmNewPassword } = req.body;

    // Validate input
    if(!email || !newPassword || !confirmNewPassword) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    if(newPassword !== confirmNewPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
    }

    try {
        // Find user by email
        const user = await User.findOne({ email });
        if(!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user's password
        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Server error' });
    }
};

module.exports = { signup, login, logout, checkAuth, updateProfile, updatePassword, sendOTP, verifyOTP,resetPassword };