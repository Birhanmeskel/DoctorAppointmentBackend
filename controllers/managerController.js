import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";
import validator from "validator";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import managerModel from "../models/managerModel.js";
import userModel from "../models/userModel.js";

// API for manager login
const loginManager = async (req, res) => {
  try {
    const { email, password } = req.body;

    // First check if manager exists in database
    const manager = await managerModel.findOne({ email });

    if (manager) {
      // Manager exists in database, verify password
      const isMatch = await bcrypt.compare(password, manager.password);

      if (isMatch) {
        // Create token with manager ID and role
        const token = jwt.sign({
          id: manager._id,
          role: 'manager'
        }, process.env.JWT_SECRET);

        console.log("Manager login successful from database");
        return res.json({ success: true, token });
      }
    }

    // Legacy manager login using environment variables
    if (
      email === process.env.MANAGER_EMAIL &&
      password === process.env.MANAGER_PASSWORD
    ) {
      // Create token with role property for legacy manager
      const token = jwt.sign({
        role: 'manager',
        email,
        isLegacyManager: true
      }, process.env.JWT_SECRET);

      console.log("Manager login successful using environment variables");
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all appointments list
const appointmentsManager = async (req, res) => {
  try {
    const appointments = await appointmentModel.find({});
    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API for appointment cancellation
const appointmentCancel = async (req, res) => {
  try {
    const { appointmentId, reasonToCancel } = req.body;
    await appointmentModel.findByIdAndUpdate(appointmentId, {
      cancelled: true,
      reasonToCancel: reasonToCancel || "No reason provided",
      cancelledBy: "manager",
    });

    res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API for adding Doctor
const addDoctor = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      speciality,
      degree,
      experience,
      about,
      fees,
      address,
    } = req.body;
    const imageFile = req.file;

    // checking for all data to add doctor
    if (
      !name ||
      !email ||
      !password ||
      !speciality ||
      !degree ||
      !experience ||
      !about ||
      !fees ||
      !address
    ) {
      return res.json({ success: false, message: "Missing Details" });
    }

    // validating email format
    if (!validator.isEmail(email)) {
      return res.json({
        success: false,
        message: "Please enter a valid email",
      });
    }

    // validating strong password
    if (password.length < 8) {
      return res.json({
        success: false,
        message: "Please enter a strong password",
      });
    }

    // hashing user password
    const salt = await bcrypt.genSalt(10); // the more no. round the more time it will take
    const hashedPassword = await bcrypt.hash(password, salt);

    // upload image to cloudinary
    const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
      resource_type: "image",
    });
    const imageUrl = imageUpload.secure_url;

    const doctorData = {
      name,
      email,
      image: imageUrl,
      password: hashedPassword,
      speciality,
      degree,
      experience,
      about,
      fees,
      address: JSON.parse(address),
      date: Date.now(),
    };

    const newDoctor = new doctorModel(doctorData);
    await newDoctor.save();
    res.json({ success: true, message: "Doctor Added" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all doctors list for manager panel
const allDoctors = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select("-password");
    res.json({ success: true, doctors });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get dashboard data for manager panel
const managerDashboard = async (req, res) => {
  try {
    const doctors = await doctorModel.find({});
    const users = await userModel.find({});
    const appointments = await appointmentModel.find({});

    const dashData = {
      doctors: doctors.length,
      appointments: appointments.length,
      patients: users.length,
      latestAppointments: appointments.reverse(),
    };

    res.json({ success: true, dashData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to change manager password
const changeManagerPassword = async (req, res) => {
  try {
    const { managerId, currentPassword, newPassword } = req.body;

    console.log("Change Manager Password - Request body:", {
      managerId: managerId ? "exists" : "missing",
      currentPassword: currentPassword ? "exists" : "missing",
      newPassword: newPassword ? "exists" : "missing"
    });

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.json({ success: false, message: "Missing current or new password" });
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      return res.json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
    }

    // Check if we're using legacy manager login
    if (!managerId) {
      // For legacy manager login, check against environment variables
      if (currentPassword === process.env.MANAGER_PASSWORD) {
        // Update the environment variable (this is temporary, as env vars can't be updated at runtime)
        // In a real scenario, you would update a config file or database
        console.log("Legacy manager password change attempted - this would require server restart");
        return res.json({
          success: false,
          message: "Legacy manager accounts cannot change passwords through this interface. Please contact system administrator."
        });
      } else {
        return res.json({ success: false, message: "Current password is incorrect" });
      }
    }

    // Find the manager
    const manager = await managerModel.findById(managerId);
    if (!manager) {
      console.log("Change Manager Password - Manager not found with ID:", managerId);
      return res.json({ success: false, message: "Manager not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, manager.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await managerModel.findByIdAndUpdate(managerId, { password: hashedPassword });
    console.log("Change Manager Password - Password updated successfully for manager:", managerId);

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.log("Change Manager Password - Error:", error);
    res.json({ success: false, message: error.message });
  }
};

// API to toggle doctor active status
const toggleDoctorActiveStatus = async (req, res) => {
  try {
    console.log("toggleDoctorActiveStatus called with body:", req.body);
    const { docId } = req.body;

    if (!docId) {
      console.log("No docId provided in request body");
      return res.json({ success: false, message: "Doctor ID is required" });
    }

    console.log("Looking for doctor with ID:", docId);
    const docData = await doctorModel.findById(docId);
    if (!docData) {
      console.log("Doctor not found with ID:", docId);
      return res.json({ success: false, message: "Doctor not found" });
    }

    console.log("Current doctor active status:", docData.isActive);
    const newActiveStatus = !docData.isActive;

    await doctorModel.findByIdAndUpdate(docId, {
      isActive: newActiveStatus,
    });
    console.log("Updated doctor active status to:", newActiveStatus);

    const statusMessage = docData.isActive ? "Doctor account deactivated" : "Doctor account activated";
    console.log("Sending response:", { success: true, message: statusMessage });
    res.json({ success: true, message: statusMessage });
  } catch (error) {
    console.log("Error in toggleDoctorActiveStatus:", error);
    res.json({ success: false, message: error.message });
  }
};

export {
  addDoctor,
  allDoctors, appointmentCancel, appointmentsManager, changeManagerPassword, loginManager, managerDashboard,
  toggleDoctorActiveStatus
};

