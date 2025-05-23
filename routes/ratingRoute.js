import express from 'express';
import { getDoctorRatings, getPendingRatings, submitRating } from '../controllers/ratingController.js';
import authUser from '../middleware/authUser.js';

const ratingRouter = express.Router();

// Submit a rating for a doctor after an appointment
ratingRouter.post("/submit", authUser, submitRating);

// Get all ratings for a specific doctor
ratingRouter.get("/doctor/:doctorId", getDoctorRatings);

// Get user's pending ratings (completed appointments that haven't been rated)
ratingRouter.get("/pending", authUser, getPendingRatings);

export default ratingRouter;
