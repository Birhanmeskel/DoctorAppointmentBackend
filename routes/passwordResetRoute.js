import express from 'express';
import { requestPasswordReset, resetPassword, verifyResetToken } from '../controllers/passwordResetController.js';

const passwordResetRouter = express.Router();

// Request password reset
passwordResetRouter.post("/request", requestPasswordReset);

// Reset password
passwordResetRouter.post("/reset", resetPassword);

// Verify reset token
passwordResetRouter.get("/verify", verifyResetToken);

export default passwordResetRouter;
