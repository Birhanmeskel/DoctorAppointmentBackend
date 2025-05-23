import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import adminModel from "../models/adminModel.js";
import doctorModel from "../models/doctorModel.js";
import managerModel from "../models/managerModel.js";
import userModel from "../models/userModel.js";

// Unified login endpoint for all user types
const unifiedLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("Login attempt:", { email, password });
    console.log("Admin credentials from env:", {
      adminEmail: process.env.ADMIN_EMAIL,
      adminPassword: process.env.ADMIN_PASSWORD ? "Set (not shown)" : "Not set"
    });

    // First check if it's a regular user
    let user = await userModel.findOne({ email });
    let role = "user";
    let id;

    // If not a regular user, check if it's a doctor
    if (!user) {
      user = await doctorModel.findOne({ email });
      role = "doctor";
    }

    // If not a regular user or doctor, check if it's a manager
    if (!user) {
      const manager = await managerModel.findOne({ email });
      if (manager) {
        user = manager;
        role = "manager";
        console.log("Manager found:", manager.email);
      }
    }

    // If not a user, doctor, or manager, check if it's an admin in the database
    if (!user) {
      const admin = await adminModel.findOne({ email });
      if (admin) {
        user = admin;
        role = "admin";
        console.log("Admin found in database:", admin.email);
      }
    }

    // If user found (including admin in database), verify password
    if (user) {
      const isMatch = await bcrypt.compare(password, user.password);
      console.log("Password match:", isMatch);

      if (isMatch) {
        console.log(`Login successful as ${role}`);
        console.log("User ID:", user._id);

        // Create token with user ID and role
        console.log("Creating token with payload:", { id: user._id, role });
        console.log("JWT Secret:", process.env.JWT_SECRET ? "Available (length: " + process.env.JWT_SECRET.length + ")" : "Not available");

        const token = jwt.sign({
          id: user._id,
          role: role
        }, process.env.JWT_SECRET);

        console.log("Generated token:", token);
        console.log("Generated token with role:", role);

        // Verify the token can be decoded
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          console.log("Token verification successful:", decoded);
        } catch (verifyError) {
          console.error("Token verification failed:", verifyError);
        }

        return res.json({
          success: true,
          token,
          role
        });
      } else {
        console.log("Invalid credentials");
        return res.json({ success: false, message: "Invalid credentials" });
      }
    }

    // If no user found in database, check if it's an admin using environment variables
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      console.log("Admin login successful with environment variables");
      // Admin login
      const token = jwt.sign({
        role: "admin",
        email,
        isLegacyAdmin: true
      }, process.env.JWT_SECRET);

      console.log("Admin token created:", token);
      console.log("JWT Secret used:", process.env.JWT_SECRET ? "Yes (length: " + process.env.JWT_SECRET.length + ")" : "No");

      return res.json({
        success: true,
        token,
        role: "admin"
      });
    }

    // If no user found with this email
    console.log("No user found with email:", email);
    return res.json({ success: false, message: "User does not exist" });
  } catch (error) {
    console.log("Login error:", error);
    res.json({ success: false, message: error.message });
  }
};

export { unifiedLogin };

