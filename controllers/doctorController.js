import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";

// API for doctor Login
const loginDoctor = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await doctorModel.findOne({ email });

    if (!user) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (isMatch) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
      res.json({ success: true, token });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get doctor appointments for doctor panel
const appointmentsDoctor = async (req, res) => {
  try {
    const { docId } = req.body;
    const appointments = await appointmentModel.find({ docId });

    res.json({ success: true, appointments });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to cancel appointment for doctor panel
const appointmentCancel = async (req, res) => {
  try {
    const { docId, appointmentId, reasonToCancel } = req.body;

    const appointmentData = await appointmentModel.findById(appointmentId);
    //! converted to string to compare with docId
    if (appointmentData && appointmentData.docId === docId) {
      await appointmentModel.findByIdAndUpdate(appointmentId, {
        cancelled: true,
        reasonToCancel: reasonToCancel || "No reason provided",
        cancelledBy: "doctor",
      });
      return res.json({ success: true, message: "Appointment Cancelled" });
    }

    res.json({
      success: false,
      message: "Unauthorized to cancel this appointment",
    });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to mark appointment completed for doctor panel
const appointmentComplete = async (req, res) => {
  try {
    const { docId, appointmentId } = req.body;

    const appointmentData = await appointmentModel.findById(appointmentId);
    if (appointmentData && appointmentData.docId === docId) {
      await appointmentModel.findByIdAndUpdate(appointmentId, {
        isCompleted: true,
      });
      return res.json({ success: true, message: "Appointment Completed" });
    }

    res.json({ success: false, message: "Appointment Cancelled" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all doctors list for Frontend
const doctorList = async (req, res) => {
  try {
    // Only return active doctors for patient-facing views
    const doctors = await doctorModel.find({ isActive: true }).select(["-password", "-email"]);
    res.json({ success: true, doctors });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to change doctor availablity for Admin and Doctor Panel
const changeAvailablity = async (req, res) => {
  try {
    const { docId } = req.body;

    const docData = await doctorModel.findById(docId);
    await doctorModel.findByIdAndUpdate(docId, {
      available: !docData.available,
    });
    res.json({ success: true, message: "Availablity Changed" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get doctor profile for  Doctor Panel
const doctorProfile = async (req, res) => {
  try {
    const { docId } = req.body;
    const profileData = await doctorModel.findById(docId).select("-password");

    res.json({ success: true, profileData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to update doctor profile data from  Doctor Panel
const updateDoctorProfile = async (req, res) => {
  try {
    const { docId, address, available, about } = req.body;

    await doctorModel.findByIdAndUpdate(docId, { address, available, about });

    res.json({ success: true, message: "Profile Updated" });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get dashboard data for doctor panel
const doctorDashboard = async (req, res) => {
  try {
    const { docId } = req.body;

    const appointments = await appointmentModel.find({ docId });

    let earnings = 0;

    appointments.map((item) => {
      if (item.isCompleted || item.payment) {
        earnings += item.amount;
      }
    });

    let patients = [];

    appointments.map((item) => {
      if (!patients.includes(item.userId)) {
        patients.push(item.userId);
      }
    });

    const dashData = {
      earnings,
      appointments: appointments.length,
      patients: patients.length,
      latestAppointments: appointments.reverse(),
    };

    res.json({ success: true, dashData });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to change doctor password
const changeDoctorPassword = async (req, res) => {
  try {
    const { docId, currentPassword, newPassword } = req.body;

    console.log("Change Doctor Password - Request body:", {
      docId: docId ? "exists" : "missing",
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

    // Find the doctor
    const doctor = await doctorModel.findById(docId);
    if (!doctor) {
      console.log("Change Doctor Password - Doctor not found with ID:", docId);
      return res.json({ success: false, message: "Doctor not found" });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, doctor.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await doctorModel.findByIdAndUpdate(docId, { password: hashedPassword });
    console.log("Change Doctor Password - Password updated successfully for doctor:", docId);

    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.log("Change Doctor Password - Error:", error);
    res.json({ success: false, message: error.message });
  }
};

export {
  appointmentCancel, appointmentComplete, appointmentsDoctor, changeAvailablity, changeDoctorPassword, doctorDashboard, doctorList, doctorProfile, loginDoctor, updateDoctorProfile
};

