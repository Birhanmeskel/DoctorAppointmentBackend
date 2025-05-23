import express from 'express';
import { changeAvailablity } from '../controllers/doctorController.js';
import {
    addDoctor,
    allDoctors,
    appointmentCancel,
    appointmentsManager,
    changeManagerPassword,
    loginManager,
    managerDashboard,
    toggleDoctorActiveStatus
} from '../controllers/managerController.js';
import authManager from '../middleware/authManager.js';
import upload from '../middleware/multer.js';
const managerRouter = express.Router();

managerRouter.post("/login", loginManager)
managerRouter.post("/add-doctor", authManager, upload.single('image'), addDoctor)
managerRouter.get("/appointments", authManager, appointmentsManager)
managerRouter.post("/cancel-appointment", authManager, appointmentCancel)
managerRouter.get("/all-doctors", authManager, allDoctors)
managerRouter.post("/change-availability", authManager, changeAvailablity)
managerRouter.post("/toggle-doctor-status", authManager, toggleDoctorActiveStatus)
managerRouter.get("/dashboard", authManager, managerDashboard)
managerRouter.post("/change-password", authManager, changeManagerPassword)

export default managerRouter;
