import appointmentModel from "../models/appointmentModel.js";
import doctorModel from "../models/doctorModel.js";
import ratingModel from "../models/ratingModel.js";

// API to submit a rating for a doctor after an appointment
const submitRating = async (req, res) => {
  try {
    const { userId, appointmentId, rating, review } = req.body;

    console.log("Rating submission request received:", {
      userId,
      appointmentId,
      rating,
      review: review ? "Review provided" : "No review"
    });

    if (!userId || !appointmentId || !rating) {
      console.log("Missing required fields:", { userId, appointmentId, rating });
      return res.json({ success: false, message: "Missing required fields" });
    }

    // Validate rating value
    if (rating < 1 || rating > 5) {
      console.log("Invalid rating value:", rating);
      return res.json({ success: false, message: "Rating must be between 1 and 5" });
    }

    // Check if the appointment exists and belongs to the user
    const appointment = await appointmentModel.findById(appointmentId);

    if (!appointment) {
      console.log("Appointment not found:", appointmentId);
      return res.json({ success: false, message: "Appointment not found" });
    }

    console.log("Appointment found:", {
      appointmentId: appointment._id,
      userId: appointment.userId,
      docId: appointment.docId,
      isCompleted: appointment.isCompleted,
      cancelled: appointment.cancelled,
      isRated: appointment.isRated
    });

    // Convert userId to string for comparison if needed
    const appointmentUserId = String(appointment.userId);
    const requestUserId = String(userId);

    if (appointmentUserId !== requestUserId) {
      console.log("User ID mismatch:", {
        appointmentUserId,
        requestUserId
      });
      return res.json({ success: false, message: "Unauthorized: This appointment doesn't belong to you" });
    }

    // Check if the appointment is completed and not cancelled
    if (!appointment.isCompleted || appointment.cancelled) {
      console.log("Appointment not eligible for rating:", {
        isCompleted: appointment.isCompleted,
        cancelled: appointment.cancelled
      });
      return res.json({ success: false, message: "You can only rate completed appointments" });
    }

    // Check if the appointment has already been rated
    if (appointment.isRated) {
      console.log("Appointment already rated:", appointmentId);
      return res.json({ success: false, message: "You have already rated this appointment" });
    }

    // Create the rating
    try {
      const newRating = new ratingModel({
        appointmentId,
        userId,
        doctorId: appointment.docId,
        rating,
        review: review || ""
      });

      console.log("Saving new rating:", {
        appointmentId,
        userId,
        doctorId: appointment.docId,
        rating
      });

      await newRating.save();
      console.log("Rating saved successfully");

      // Mark the appointment as rated
      await appointmentModel.findByIdAndUpdate(appointmentId, { isRated: true });
      console.log("Appointment marked as rated");

      // Update the doctor's average rating
      const doctor = await doctorModel.findById(appointment.docId);

      if (!doctor) {
        console.log("Doctor not found:", appointment.docId);
        return res.json({ success: false, message: "Doctor not found" });
      }

      console.log("Doctor found:", {
        doctorId: doctor._id,
        currentRating: doctor.averageRating,
        totalRatings: doctor.totalRatings
      });

      // Calculate new average rating
      const newTotalRatings = doctor.totalRatings + 1;
      const newAverageRating = ((doctor.averageRating * doctor.totalRatings) + rating) / newTotalRatings;

      console.log("New rating calculation:", {
        oldAverage: doctor.averageRating,
        oldTotal: doctor.totalRatings,
        newRating: rating,
        newAverage: newAverageRating,
        newTotal: newTotalRatings
      });

      // Update doctor with new rating data
      await doctorModel.findByIdAndUpdate(appointment.docId, {
        averageRating: newAverageRating,
        totalRatings: newTotalRatings
      });
      console.log("Doctor rating updated successfully");

      res.json({
        success: true,
        message: "Rating submitted successfully",
        newAverageRating,
        totalRatings: newTotalRatings
      });
    } catch (saveError) {
      console.log("Error during rating save or update:", saveError);
      res.json({ success: false, message: `Error saving rating: ${saveError.message}` });
    }
  } catch (error) {
    console.log("Unexpected error in submitRating:", error);
    res.json({ success: false, message: error.message });
  }
};

// API to get all ratings for a doctor
const getDoctorRatings = async (req, res) => {
  try {
    const { doctorId } = req.params;

    if (!doctorId) {
      return res.json({ success: false, message: "Doctor ID is required" });
    }

    // Get all ratings for the doctor
    const ratings = await ratingModel.find({ doctorId }).sort({ createdAt: -1 });

    res.json({ success: true, ratings });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// API to get user's pending ratings (completed appointments that haven't been rated)
const getPendingRatings = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.json({ success: false, message: "User ID is required" });
    }

    // Find completed appointments that haven't been rated
    const pendingRatings = await appointmentModel.find({
      userId,
      isCompleted: true,
      cancelled: false,
      isRated: false
    });

    res.json({ success: true, pendingRatings });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

export { getDoctorRatings, getPendingRatings, submitRating };

