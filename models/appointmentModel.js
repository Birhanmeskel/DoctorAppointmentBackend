import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  docId: { type: String, required: true },
  slotDate: { type: String, required: true },
  slotTime: { type: String, required: true },
  userData: { type: Object, required: true },
  docData: { type: Object, required: true },
  amount: { type: Number, required: true },
  date: { type: Number, required: true },
  cancelled: { type: Boolean, default: false },
  reasonToCancel: { type: String, default: "" },
  payment: { type: Boolean, default: false },
  isCompleted: { type: Boolean, default: false },
  isRated: { type: Boolean, default: false },
  cancelledBy: {
    type: String, // "doctor" | "admin" | "patient"
    enum: ["doctor", "admin", "patient"],
    default: null,
  },
});

const appointmentModel =
  mongoose.models.appointment ||
  mongoose.model("appointment", appointmentSchema);
export default appointmentModel;
