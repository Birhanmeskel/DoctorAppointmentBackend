import express from 'express';
import { unifiedLogin } from '../controllers/authController.js';
import { loginDoctor } from '../controllers/doctorController.js';
import { loginManager } from '../controllers/managerController.js';
import { loginUser, registerUser } from '../controllers/userController.js';
import authUser, { authDoctor, authManager } from '../middleware/authUser.js';

const roleRouter = express.Router();

// Registration routes
roleRouter.post("/register", registerUser);

// Unified login route
roleRouter.post("/unified-login", unifiedLogin);

// Legacy login routes (can be deprecated later)
roleRouter.post("/login", loginUser);
roleRouter.post("/doctor/login", loginDoctor);
roleRouter.post("/manager/login", loginManager);

// Role-specific routes
roleRouter.get("/check-auth", authUser, (req, res) => {
  res.json({ success: true, role: req.body.userRole });
});

roleRouter.get("/manager-only", authManager, (_, res) => {
  res.json({ success: true, message: "Manager access granted" });
});

roleRouter.get("/doctor-only", authDoctor, (_, res) => {
  res.json({ success: true, message: "Doctor access granted" });
});

export default roleRouter;