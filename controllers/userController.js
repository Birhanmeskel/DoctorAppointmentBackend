import bcrypt from "bcrypt";
import { v2 as cloudinary } from "cloudinary";
import jwt from "jsonwebtoken";
import stripe from "stripe";
import validator from "validator";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import pendingUserModel from "../models/pendingUserModel.js";
import userModel from "../models/userModel.js";

// Gateway Initialize
const stripeInstance = new stripe(process.env.STRIPE_SECRET_KEY);

// API to register user
const registerUser = async (req, res) => {
  try {
      const { name, email, password, phone, fin, role = 'user' } = req.body;
    const files = req.files;

    // checking for all data to register user
    if (!name || !email || !password || !phone || !fin) {
      return res.json({ success: false, message: "Missing Detail" });
    }

 if (!files || !files.frontImage || !files.backImage) {
      return res.json({ success: false, message: "ID images are required" });
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

    // Check if role is valid
    if (!['user', 'doctor', 'manager'].includes(role)) {
      return res.json({
        success: false,
        message: "Invalid role specified",
      });
    }
      // Upload images to cloudinary
    const frontImageUpload = await cloudinary.uploader.upload(files.frontImage[0].path, {
      resource_type: "image",
    });
    const backImageUpload = await cloudinary.uploader.upload(files.backImage[0].path, {
      resource_type: "image",
    });

    // Check if email already exists in users or pending users
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.json({
        success: false,
        message: "Email already registered",
      });
    }

    const existingPendingUser = await pendingUserModel.findOne({ email });
    if (existingPendingUser) {
      return res.json({
        success: false,
        message: "Registration already pending approval",
        pendingStatus: true,
        fin: existingPendingUser.fin
      });
    }

    // Check if FIN number already exists in users or pending users
    const existingUserByFin = await userModel.findOne({ fin });
    if (existingUserByFin) {
      return res.json({
        success: false,
        message: "This National ID (FIN) is already registered. Please use the status checker to verify your account status.",
        finExists: true,
        fin: fin
      });
    }

    const existingPendingUserByFin = await pendingUserModel.findOne({ fin });
    if (existingPendingUserByFin) {
      return res.json({
        success: false,
        message: "A registration with this National ID (FIN) is already pending approval. Please use the status checker to verify your account status.",
        pendingStatus: true,
        fin: existingPendingUserByFin.fin
      });
    }

    // hashing user password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // For regular users, create a pending user that requires admin approval
    if (role === 'user') {
      const pendingUserData = {
        name,
        email,
        password: hashedPassword,
         phone,
        fin,
        frontImage: frontImageUpload.secure_url,
        backImage: backImageUpload.secure_url
      };

      const newPendingUser = new pendingUserModel(pendingUserData);
      await newPendingUser.save();

      res.json({
        success: true,
        message: "Registration submitted for approval. You will be notified when your account is approved."
      });
    } else {
      // For other roles (doctor, manager), create directly (this should be protected elsewhere)
      const userData = {
        name,
        email,
        password: hashedPassword,
        role,
        phone,
        fin,
        frontImage: frontImageUpload.secure_url,
        backImage: backImageUpload.secure_url
      };

      const newUser = new userModel(userData);
      const user = await newUser.save();
      const token = jwt.sign({
        id: user._id,
        role: user.role
      }, process.env.JWT_SECRET);

      res.json({ success: true, token, role: user.role });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to login user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOne({ email });

    if (!user) {
      // Check if user is in pending approval
      const pendingUser = await pendingUserModel.findOne({ email });
      if (pendingUser) {
        return res.json({
          success: false,
          message: "Your account is pending approval",
          pendingStatus: true,
          fin: pendingUser.fin
        });
      }

      return res.json({ success: false, message: "User does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const token = jwt.sign({
        id: user._id,
        role: user.role
      }, process.env.JWT_SECRET);

      res.json({
        success: true,
        token,
        role: user.role
      });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get user profile data
const getProfile = async (req, res) => {
  try {
    const { userId } = req.body;
    const userData = await userModel.findById(userId).select("-password");

    res.json({ success: true, userData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to update user profile
const updateProfile = async (req, res) => {
  try {
    const { userId, name, phone, address, dob, gender } = req.body;
    const imageFile = req.file;

    if (!name || !phone || !dob || !gender) {
      return res.json({ success: false, message: "Data Missing" });
    }

    await userModel.findByIdAndUpdate(userId, {
      name,
      phone,
      address: JSON.parse(address),
      dob,
      gender,
    });

    if (imageFile) {
      // upload image to cloudinary
      const imageUpload = await cloudinary.uploader.upload(imageFile.path, {
        resource_type: "image",
      });
      const imageURL = imageUpload.secure_url;

      await userModel.findByIdAndUpdate(userId, { image: imageURL });
    }

    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to book appointment
const bookAppointment = async (req, res) => {
  try {
    const { userId, docId, slotDate, slotTime } = req.body;
    const docData = await doctorModel.findById(docId).select("-password");

    if (!docData.available) {
      return res.json({ success: false, message: "Doctor Not Available" });
    }

    let slots_booked = docData.slots_booked;

    // checking for slot availablity
    if (slots_booked[slotDate]) {
      if (slots_booked[slotDate].includes(slotTime)) {
        return res.json({ success: false, message: "Slot Not Available" });
      } else {
        slots_booked[slotDate].push(slotTime);
      }
    } else {
      slots_booked[slotDate] = [];
      slots_booked[slotDate].push(slotTime);
    }

    const userData = await userModel.findById(userId).select("-password");

    delete docData.slots_booked;

    const appointmentData = {
      userId,
      docId,
      userData,
      docData,
      amount: docData.fees,
      slotTime,
      slotDate,
      date: Date.now(),
    };

    const newAppointment = new appointmentModel(appointmentData);
    await newAppointment.save();

    // save new slots data in docData
    await doctorModel.findByIdAndUpdate(docId, { slots_booked });

    res.json({ success: true, message: "Appointment Booked" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to cancel appointment
const cancelAppointment = async (req, res) => {
  try {
    const { userId, appointmentId, reasonToCancel } = req.body;
    const appointmentData = await appointmentModel.findById(appointmentId);

    // verify appointment user
    if (appointmentData.userId !== userId) {
      return res.json({ success: false, message: "Unauthorized action" });
    }

    await appointmentModel.findByIdAndUpdate(appointmentId, {
      cancelled: true,
      reasonToCancel: reasonToCancel || "No reason provided",
      cancelledBy: "patient",
    });

    // releasing doctor slot
    const { docId, slotDate, slotTime } = appointmentData;

    const doctorData = await doctorModel.findById(docId);

    let slots_booked = doctorData.slots_booked;

    slots_booked[slotDate] = slots_booked[slotDate].filter(
      (e) => e !== slotTime
    );

    await doctorModel.findByIdAndUpdate(docId, { slots_booked });

    res.json({ success: true, message: "Appointment Cancelled" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get user appointments for frontend my-appointments page
const listAppointment = async (req, res) => {
  try {
    const { userId } = req.body;
    const appointments = await appointmentModel.find({ userId });

    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to make payment of appointment using Stripe
const paymentStripe = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const { origin } = req.headers;

    const appointmentData = await appointmentModel.findById(appointmentId);

    if (!appointmentData || appointmentData.cancelled) {
      return res.json({
        success: false,
        message: "Appointment Cancelled or not found",
      });
    }

    const currency = process.env.CURRENCY.toLocaleLowerCase();

    const line_items = [
      {
        price_data: {
          currency,
          product_data: {
            name: "Appointment Fees",
          },
          unit_amount: appointmentData.amount * 100,
        },
        quantity: 1,
      },
    ];

    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/verify?success=true&appointmentId=${appointmentData._id}`,
      cancel_url: `${origin}/verify?success=false&appointmentId=${appointmentData._id}`,
      line_items: line_items,
      mode: "payment",
      payment_method_types: ['card'], // Explicitly specify only the payment methods you want to use
    });

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

const verifyStripe = async (req, res) => {
  try {
    const { appointmentId, success, docId, slotDate, slotTime } = req.body;

    if (success === "true") {
      // If we have appointmentId, it's the old flow - just mark payment as true
      if (appointmentId) {
        await appointmentModel.findByIdAndUpdate(appointmentId, {
          payment: true,
        });
        return res.json({ success: true, message: "Payment Successful" });
      }
      // New flow - create appointment after successful payment
      else if (docId && slotDate && slotTime) {
        const { userId } = req.body;

        // Get doctor data
        const docData = await doctorModel.findById(docId).select("-password");

        if (!docData) {
          return res.json({ success: false, message: "Doctor not found" });
        }

        // Update doctor's booked slots
        let slots_booked = docData.slots_booked;

        // Check if slot is still available
        if (slots_booked[slotDate] && slots_booked[slotDate].includes(slotTime)) {
          return res.json({ success: false, message: "Slot was booked by someone else" });
        }

        // Add slot to booked slots
        if (slots_booked[slotDate]) {
          slots_booked[slotDate].push(slotTime);
        } else {
          slots_booked[slotDate] = [slotTime];
        }

        // Get user data
        const userData = await userModel.findById(userId).select("-password");

        // Create appointment data
        const appointmentData = {
          userId,
          docId,
          userData,
          docData: {
            _id: docData._id,
            name: docData.name,
            email: docData.email,
            image: docData.image,
            speciality: docData.speciality,
            degree: docData.degree,
            experience: docData.experience,
            about: docData.about,
            fees: docData.fees,
            address: docData.address
          },
          amount: docData.fees,
          slotTime,
          slotDate,
          date: Date.now(),
          payment: true // Mark as paid immediately
        };

        // Create appointment
        const newAppointment = new appointmentModel(appointmentData);
        await newAppointment.save();

        // Update doctor's slots
        await doctorModel.findByIdAndUpdate(docId, { slots_booked });

        return res.json({ success: true, message: "Appointment booked and payment successful" });
      }
    }

    res.json({ success: false, message: "Payment Failed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to initiate payment before booking an appointment
const initiateAppointmentPayment = async (req, res) => {
  try {
    const { userId, docId, slotDate, slotTime } = req.body;
    const { origin } = req.headers;

    // Get doctor data
    const docData = await doctorModel.findById(docId).select("-password");

    if (!docData) {
      return res.json({ success: false, message: "Doctor not found" });
    }

    if (!docData.available) {
      return res.json({ success: false, message: "Doctor Not Available" });
    }

    // Check slot availability
    let slots_booked = docData.slots_booked;
    if (slots_booked[slotDate] && slots_booked[slotDate].includes(slotTime)) {
      return res.json({ success: false, message: "Slot Not Available" });
    }

    // Get user data
    const userData = await userModel.findById(userId).select("-password");

    // Create a temporary appointment data object for the payment session
    const appointmentData = {
      userId,
      docId,
      slotDate,
      slotTime,
      amount: docData.fees,
      doctorName: docData.name,
      doctorSpeciality: docData.speciality
    };

    // Store this data in the session metadata
    const currency = process.env.CURRENCY.toLowerCase();

    const line_items = [
      {
        price_data: {
          currency,
          product_data: {
            name: `Appointment with Dr. ${docData.name}`,
            description: `${slotDate.replace(/_/g, "/")} at ${slotTime}`
          },
          unit_amount: docData.fees * 100,
        },
        quantity: 1,
      },
    ];

    // Create a Stripe checkout session
    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/verify?success=true&docId=${docId}&slotDate=${slotDate}&slotTime=${slotTime}`,
      cancel_url: `${origin}/verify?success=false&docId=${docId}&slotDate=${slotDate}&slotTime=${slotTime}`,
      line_items: line_items,
      mode: "payment",
      payment_method_types: ['card'], // Explicitly specify only the payment methods you want to use
      metadata: {
        userId,
        docId,
        slotDate,
        slotTime
      }
    });

    res.json({ success: true, session_url: session.url });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to change user password
const changePassword = async (req, res) => {
  try {
    const { userId, currentPassword, newPassword } = req.body;

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

    // Find the user
    const user = await userModel.findById(userId);
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await userModel.findByIdAndUpdate(userId, { password: hashedPassword });

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to check account status by FIN number
const checkAccountStatus = async (req, res) => {
  try {

    const { fin } = req.body;

    if (!fin) {
      console.log("FIN number is missing in request");
      return res.json({ success: false, message: "FIN number is required" });
    }

    // First check if the user is already approved (in userModel)
    const approvedUser = await userModel.findOne({ fin });
    // console.log("Search for approved user with FIN:", fin, "Result:", approvedUser ? "Found" : "Not found");

    if (approvedUser) {
      // console.log("Approved user found:", approvedUser.email);
      return res.json({
        success: true,
        status: "approved",
        message: "Your account has been approved. You can login with your email and password."
      });
    }

    // Check if the user is in pending status
    const pendingUser = await pendingUserModel.findOne({ fin });
    console.log("Search for pending user with FIN:", fin, "Result:", pendingUser ? `Found (status: ${pendingUser.status})` : "Not found");

    if (pendingUser) {
      console.log("Pending user found:", pendingUser.email, "Status:", pendingUser.status);
      return res.json({
        success: true,
        status: pendingUser.status,
        message: pendingUser.status === "pending"
          ? "Your account is pending approval. You will be notified when your account is approved."
          : pendingUser.status === "rejected"
            ? "Your account registration was rejected. Please contact support for more information."
            : "Your account status is being processed."
      });
    }

    // If not found in either model
    console.log("No user found with FIN:", fin);
    return res.json({
      success: false,
      message: "No account found with this FIN number. Please register first."
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export {
  bookAppointment,
  cancelAppointment,
  changePassword,
  checkAccountStatus,
  getProfile,
  initiateAppointmentPayment,
  listAppointment,
  loginUser,
  paymentStripe,
  registerUser,
  updateProfile,
  verifyStripe
};

