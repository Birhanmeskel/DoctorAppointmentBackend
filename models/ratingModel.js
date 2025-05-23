import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema({
  appointmentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'appointments',
    required: true 
  },
  userId: { 
    type: String, 
    required: true 
  },
  doctorId: { 
    type: String, 
    required: true 
  },
  rating: { 
    type: Number, 
    required: true,
    min: 1,
    max: 5
  },
  review: { 
    type: String,
    default: ""
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Ensure a user can only rate an appointment once
ratingSchema.index({ appointmentId: 1, userId: 1 }, { unique: true });

const ratingModel = mongoose.model("ratings", ratingSchema);

export default ratingModel;
