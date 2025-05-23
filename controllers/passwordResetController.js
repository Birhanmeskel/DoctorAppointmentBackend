import bcrypt from 'bcrypt';
import crypto from 'crypto';
import createTransporter from '../config/emailConfig.js';
import adminModel from '../models/adminModel.js';
import doctorModel from '../models/doctorModel.js';
import managerModel from '../models/managerModel.js';
import passwordResetModel from '../models/passwordResetModel.js';
import userModel from '../models/userModel.js';
import { getPasswordResetEmailTemplate } from '../utils/emailTemplates.js';

// Helper function to get user model based on type
const getUserModel = (userType) => {
    switch (userType) {
        case 'user':
            return userModel;
        case 'doctor':
            return doctorModel;
        case 'manager':
            return managerModel;
        case 'admin':
            return adminModel;
        default:
            return null;
    }
};

// Helper function to find user across all models
const findUserByEmail = async (email) => {
    let user = await userModel.findOne({ email });
    if (user) return { user, userType: 'user' };

    user = await doctorModel.findOne({ email });
    if (user) return { user, userType: 'doctor' };

    user = await managerModel.findOne({ email });
    if (user) return { user, userType: 'manager' };

    user = await adminModel.findOne({ email });
    if (user) return { user, userType: 'admin' };

    return null;
};

// Request password reset
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.json({ success: false, message: "Email is required" });
        }

        // Find user across all collections
        const result = await findUserByEmail(email);

        if (!result) {
            // For security, don't reveal if email exists or not
            return res.json({
                success: true,
                message: "If an account with this email exists, you will receive a password reset link shortly."
            });
        }

        const { user, userType } = result;

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // Delete any existing reset tokens for this email
        await passwordResetModel.deleteMany({ email });

        // Save new reset token
        const passwordReset = new passwordResetModel({
            email,
            userType,
            token: resetToken
        });
        await passwordReset.save();

        // Create reset link
        const resetLink = `${process.env.FRONTEND_URL || 'https://amuth.netlify.app/'}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

        // Send email
        try {
            const transporter = createTransporter();
            const emailTemplate = getPasswordResetEmailTemplate(user.name, resetLink, userType);

         

            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: email,
                subject: emailTemplate.subject,
                html: emailTemplate.html,
                text: emailTemplate.text
            };


            await transporter.sendMail(mailOptions);

            // console.log(`Password reset email sent successfully to ${email} for ${userType}`);
        } catch (emailError) {
            console.error('Email sending failed - Full error:', emailError);
            console.error('Error message:', emailError.message);
            console.error('Error code:', emailError.code);

            // Delete the reset token if email fails
            await passwordResetModel.deleteOne({ email, token: resetToken });
            return res.json({
                success: false,
                message: `Failed to send reset email: ${emailError.message}. Please check your email configuration.`
            });
        }

        res.json({
            success: true,
            message: "If an account with this email exists, you will receive a password reset link shortly."
        });

    } catch (error) {
        console.error('Password reset request error:', error);
        res.json({ success: false, message: "Something went wrong. Please try again." });
    }
};

// Reset password
const resetPassword = async (req, res) => {
    try {
        const { token, email, newPassword } = req.body;

        if (!token || !email || !newPassword) {
            return res.json({ success: false, message: "All fields are required" });
        }

        // Validate password strength
        if (newPassword.length < 8) {
            return res.json({
                success: false,
                message: "Password must be at least 8 characters long"
            });
        }

        // Find reset token
        const resetRecord = await passwordResetModel.findOne({ email, token });

        if (!resetRecord) {
            return res.json({
                success: false,
                message: "Invalid or expired reset token"
            });
        }

        // Get the appropriate user model
        const UserModel = getUserModel(resetRecord.userType);
        if (!UserModel) {
            return res.json({ success: false, message: "Invalid user type" });
        }

        // Find the user
        const user = await UserModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user password
        await UserModel.findByIdAndUpdate(user._id, { password: hashedPassword });

        // Delete the reset token
        await passwordResetModel.deleteOne({ email, token });

        console.log(`Password reset successful for ${email} (${resetRecord.userType})`);

        res.json({
            success: true,
            message: "Password reset successful. You can now login with your new password."
        });

    } catch (error) {
        console.error('Password reset error:', error);
        res.json({ success: false, message: "Something went wrong. Please try again." });
    }
};

// Verify reset token (optional - for frontend validation)
const verifyResetToken = async (req, res) => {
    try {
        const { token, email } = req.query;

        if (!token || !email) {
            return res.json({ success: false, message: "Token and email are required" });
        }

        const resetRecord = await passwordResetModel.findOne({ email, token });

        if (!resetRecord) {
            return res.json({
                success: false,
                message: "Invalid or expired reset token"
            });
        }

        res.json({
            success: true,
            message: "Token is valid",
            userType: resetRecord.userType
        });

    } catch (error) {
        console.error('Token verification error:', error);
        res.json({ success: false, message: "Something went wrong. Please try again." });
    }
};

export { requestPasswordReset, resetPassword, verifyResetToken };
