import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";
import validator from "validator";
import adminModel from "../models/adminModel.js";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import userModel from "../models/userModel.js";

// API for admin login
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Admin login attempt for email:", email);

    // First try to find admin in the database
    const admin = await adminModel.findOne({ email });

    if (admin) {
      console.log("Admin found in database with ID:", admin._id);
      // If admin exists in database, verify password
      const isMatch = await bcrypt.compare(password, admin.password);

      if (isMatch) {
        const token = jwt.sign({
          id: admin._id,
          role: admin.role
        }, process.env.JWT_SECRET);

        console.log("Admin login successful with database credentials");
        return res.json({
          success: true,
          token,
          role: admin.role
        });
      } else {
        // If this is the admin email from environment variables, but password doesn't match database
        // Do NOT fall back to environment variables - this means the admin has been migrated to the database
        if (email === process.env.ADMIN_EMAIL) {
          console.log("Admin with env email exists in database but password is incorrect");
          return res.json({ success: false, message: "Invalid credentials" });
        } else {
          console.log("Admin password incorrect for database user");
        }
      }
    } else {
      console.log("Admin not found in database, checking environment variables");
    }

    // Only use environment variables if the admin doesn't exist in the database yet
    if (
      email === process.env.ADMIN_EMAIL &&
      password === process.env.ADMIN_PASSWORD
    ) {
      console.log("Admin login successful with environment variables");

      // Check if we should create a database entry for this admin
      try {
        // Check if an admin with this email already exists (double-check)
        let existingAdmin = await adminModel.findOne({ email });

        if (!existingAdmin) {
          // Create a new admin entry in the database
          console.log("Creating new admin entry for env admin during login");
          const salt = await bcrypt.genSalt(10);
          const hashedPassword = await bcrypt.hash(password, salt);

          const newAdmin = new adminModel({
            name: "Admin",
            email: email,
            password: hashedPassword,
            role: "admin"
          });

          await newAdmin.save();
          console.log("New admin created with ID:", newAdmin._id);

          // Create token with the new admin ID
          const token = jwt.sign({
            id: newAdmin._id,
            role: newAdmin.role
          }, process.env.JWT_SECRET);

          return res.json({
            success: true,
            token,
            role: newAdmin.role
          });
        }
      } catch (dbError) {
        console.log("Error creating admin during login:", dbError);
        // Continue with legacy login if database creation fails
      }

      // Create a token with a special flag to indicate it's a legacy admin
      const token = jwt.sign({
        isLegacyAdmin: true,
        email: email,
        role: "admin"
      }, process.env.JWT_SECRET);

      return res.json({ success: true, token, role: "admin" });
    } else {
      console.log("Admin login failed");
      return res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log("Admin login error:", error);
    return res.json({ success: false, message: error.message });
  }
};

// API to get all appointments list
const appointmentsAdmin = async (req, res) => {
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
      cancelledBy: "admin",
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

// API to get all doctors list for admin panel
const allDoctors = async (req, res) => {
  try {
    const doctors = await doctorModel.find({}).select("-password");
    res.json({ success: true, doctors });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get dashboard data for admin panel
const adminDashboard = async (req, res) => {
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

// API to change admin password
const changeAdminPassword = async (req, res) => {
  try {
    const { adminId, adminEmail, currentPassword, newPassword } = req.body;

    console.log("Change Admin Password - Request body:", {
      adminId: adminId ? "exists" : "missing",
      adminEmail: adminEmail ? adminEmail : "missing",
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

    // Handle legacy admin with email from token
    if (adminEmail) {
      console.log("Legacy admin password change detected with email:", adminEmail);

      try {
        // First check if an admin with this email already exists in the database
        let admin = await adminModel.findOne({ email: adminEmail });

        if (admin) {
          console.log("Admin found in database with email:", adminEmail);

          // Verify the current password against the database
          const isMatch = await bcrypt.compare(currentPassword, admin.password);

          if (isMatch) {
            // Current password matches database - update the password
            console.log("Current password matches database record");
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            await adminModel.findByIdAndUpdate(admin._id, { password: hashedPassword });

            return res.json({
              success: true,
              message: "Password updated successfully. Please log out and log back in to use your new password."
            });
          } else {
            // Check if this might be a legacy admin trying to use env password
            if (currentPassword === process.env.ADMIN_PASSWORD) {
              console.log("Admin exists in DB but using env password - updating password");
              const salt = await bcrypt.genSalt(10);
              const hashedPassword = await bcrypt.hash(newPassword, salt);

              await adminModel.findByIdAndUpdate(admin._id, { password: hashedPassword });

              return res.json({
                success: true,
                message: "Password updated successfully. Please log out and log back in to use your new password."
              });
            } else {
              return res.json({ success: false, message: "Current password is incorrect" });
            }
          }
        } else {
          // Admin doesn't exist in database yet - check against environment variables
          if (currentPassword === process.env.ADMIN_PASSWORD) {
            // Create a new admin entry in the database for the legacy admin
            console.log("Creating new admin entry for legacy admin with email:", adminEmail);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            admin = new adminModel({
              name: "Admin",
              email: adminEmail,
              password: hashedPassword,
              role: "admin"
            });

            await admin.save();
            console.log("New admin created with ID:", admin._id);

            return res.json({
              success: true,
              message: "Password updated successfully. Please log out and log back in to use your new password."
            });
          } else {
            return res.json({ success: false, message: "Current password is incorrect" });
          }
        }
      } catch (error) {
        console.log("Error creating/updating admin:", error);
        return res.json({
          success: false,
          message: "Error updating password. Please try again later."
        });
      }
    }
    // Handle legacy admin without email (old format)
    else if (!adminId) {
      console.log("Legacy admin password change detected (old format)");

      try {
        // First check if an admin with the environment variable email already exists
        let admin = await adminModel.findOne({ email: process.env.ADMIN_EMAIL });

        if (admin) {
          console.log("Admin found in database with env email:", process.env.ADMIN_EMAIL);

          // Verify the current password against the database
          const isMatch = await bcrypt.compare(currentPassword, admin.password);

          if (isMatch) {
            // Current password matches database - update the password
            console.log("Current password matches database record");
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            await adminModel.findByIdAndUpdate(admin._id, { password: hashedPassword });

            return res.json({
              success: true,
              message: "Password updated successfully. Please log out and log back in to use your new password."
            });
          } else {
            // Check if this might be a legacy admin trying to use env password
            if (currentPassword === process.env.ADMIN_PASSWORD) {
              console.log("Admin exists in DB but using env password - updating password");
              const salt = await bcrypt.genSalt(10);
              const hashedPassword = await bcrypt.hash(newPassword, salt);

              await adminModel.findByIdAndUpdate(admin._id, { password: hashedPassword });

              return res.json({
                success: true,
                message: "Password updated successfully. Please log out and log back in to use your new password."
              });
            } else {
              return res.json({ success: false, message: "Current password is incorrect" });
            }
          }
        } else {
          // Admin doesn't exist in database yet - check against environment variables
          if (currentPassword === process.env.ADMIN_PASSWORD) {
            // Create a new admin entry in the database for the legacy admin
            console.log("Creating new admin entry for legacy admin with env email:", process.env.ADMIN_EMAIL);
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            admin = new adminModel({
              name: "Admin",
              email: process.env.ADMIN_EMAIL,
              password: hashedPassword,
              role: "admin"
            });

            await admin.save();
            console.log("New admin created with ID:", admin._id);

            return res.json({
              success: true,
              message: "Password updated successfully. Please log out and log back in to use your new password."
            });
          } else {
            return res.json({ success: false, message: "Current password is incorrect" });
          }
        }
      } catch (error) {
        console.log("Error creating/updating admin:", error);
        return res.json({
          success: false,
          message: "Error updating password. Please try again later."
        });
      }
    }

    // Find the admin
    const admin = await adminModel.findById(adminId);
    if (!admin) {
      console.log("Change Admin Password - Admin not found with ID:", adminId);
      return res.json({ success: false, message: "Admin not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, admin.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await adminModel.findByIdAndUpdate(adminId, { password: hashedPassword });
    console.log("Change Admin Password - Password updated successfully for admin:", adminId);

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.log("Change Admin Password - Error:", error);
    res.json({ success: false, message: error.message });
  }
};

export {
    addDoctor, adminDashboard, allDoctors, appointmentCancel, appointmentsAdmin, changeAdminPassword, loginAdmin
};

