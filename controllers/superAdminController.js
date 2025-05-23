import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import adminModel from "../models/adminModel.js";
import managerModel from "../models/managerModel.js";
import pendingUserModel from "../models/pendingUserModel.js";
import userModel from "../models/userModel.js";

// API for admin login
const loginSuperAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check against environment variables
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      const token = jwt.sign({
        role: 'admin',
        email
      }, process.env.JWT_SECRET);

      res.json({
        success: true,
        token,
        role: 'admin'
      });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to create a new admin (only for initial setup)
const createSuperAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if admin already exists
    const existingAdmin = await adminModel.findOne({ email });
    if (existingAdmin) {
      return res.json({ success: false, message: "Admin already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin
    const newAdmin = new adminModel({
      name,
      email,
      password: hashedPassword
    });

    await newAdmin.save();
    res.json({ success: true, message: "Admin created successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to create a new manager
const createManager = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    // Check if manager already exists
    const existingManager = await managerModel.findOne({ email });
    if (existingManager) {
      return res.json({ success: false, message: "Email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new manager
    const newManager = new managerModel({
      name,
      email,
      password: hashedPassword,
      phone: phone || '000000000',
      address: address || { line1: '', line2: '' }
    });

    await newManager.save();
    console.log(`Manager created successfully: ${name} (${email})`);
    res.json({ success: true, message: "Manager created successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all pending user registrations
const getPendingUsers = async (req, res) => {
  try {
    const pendingUsers = await pendingUserModel.find({ status: 'pending' });
    res.json({ success: true, pendingUsers });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to approve a pending user
const approveUser = async (req, res) => {
  try {
    const { userId } = req.body;

    // Find the pending user
    const pendingUser = await pendingUserModel.findById(userId);
    if (!pendingUser) {
      return res.json({ success: false, message: "Pending user not found" });
    }

    // Create a new user from the pending user data
    const newUser = new userModel({
      name: pendingUser.name,
      email: pendingUser.email,
      password: pendingUser.password,
      image: pendingUser.image,
      phone: pendingUser.phone,
      fin: pendingUser.fin,
      frontImage: pendingUser.frontImage,
      backImage: pendingUser.backImage,
      address: pendingUser.address,
      gender: pendingUser.gender,
      dob: pendingUser.dob,
      role: 'user'
    });

    await newUser.save();

    // Update pending user status
    pendingUser.status = 'approved';
    await pendingUser.save();

    res.json({ success: true, message: "User approved successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to reject a pending user
const rejectUser = async (req, res) => {
  try {
    const { userId } = req.body;

    // Find the pending user
    const pendingUser = await pendingUserModel.findById(userId);
    if (!pendingUser) {
      return res.json({ success: false, message: "Pending user not found" });
    }

    // Update pending user status
    pendingUser.status = 'rejected';
    await pendingUser.save();

    res.json({ success: true, message: "User rejected successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all managers
const getAllManagers = async (req, res) => {
  try {
    const managers = await managerModel.find().select('-password');
    res.json({ success: true, managers });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to delete a manager
const deleteManager = async (req, res) => {
  try {
    const { managerId } = req.body;

    await managerModel.findByIdAndDelete(managerId);

    res.json({ success: true, message: "Manager deleted successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get approved users
const getApprovedUsers = async (req, res) => {
  try {
    console.log("getApprovedUsers called");
    const approvedUsers = await userModel.find({ role: 'user' });
    console.log(`Found ${approvedUsers.length} approved users`);
    res.json({ success: true, approvedUsers });
  } catch (error) {
    console.error("Error in getApprovedUsers:", error);
    res.json({ success: false, message: error.message });
  }
};

// API to get rejected users
const getRejectedUsers = async (req, res) => {
  try {
    console.log("getRejectedUsers called");
    const rejectedUsers = await pendingUserModel.find({ status: 'rejected' });
    console.log(`Found ${rejectedUsers.length} rejected users`);
    res.json({ success: true, rejectedUsers });
  } catch (error) {
    console.error("Error in getRejectedUsers:", error);
    res.json({ success: false, message: error.message });
  }
};

// API to get admin dashboard data
const superAdminDashboard = async (req, res) => {
  try {
    const managers = await managerModel.find();
    const pendingUsers = await pendingUserModel.find({ status: 'pending' });
    const approvedUsers = await userModel.find({ role: 'user' });
    const rejectedUsers = await pendingUserModel.find({ status: 'rejected' });

    const dashData = {
      managers: managers.length,
      pendingUsers: pendingUsers.length,
      approvedUsers: approvedUsers.length,
      rejectedUsers: rejectedUsers.length,
      recentPendingUsers: pendingUsers.slice(0, 5)
    };

    res.json({ success: true, dashData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export {
    approveUser, createManager, createSuperAdmin, deleteManager, getAllManagers, getApprovedUsers, getPendingUsers, getRejectedUsers, loginSuperAdmin, rejectUser, superAdminDashboard
};

