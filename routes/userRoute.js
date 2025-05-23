import express from 'express';
import {
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
} from '../controllers/userController.js';
import authUser from '../middleware/authUser.js';
import upload from '../middleware/multer.js';
const userRouter = express.Router();

userRouter.post("/register", upload.fields([
    { name: 'frontImage', maxCount: 1 },
    { name: 'backImage', maxCount: 1 }
]), registerUser)
userRouter.post("/login", loginUser)
userRouter.post("/check-status", checkAccountStatus)

userRouter.get("/get-profile", authUser, getProfile)
userRouter.post("/update-profile", upload.single('image'), authUser, updateProfile)
userRouter.post("/change-password", authUser, changePassword)
userRouter.post("/book-appointment", authUser, bookAppointment)
userRouter.get("/appointments", authUser, listAppointment)
userRouter.post("/cancel-appointment", authUser, cancelAppointment)
userRouter.post("/payment-stripe", authUser, paymentStripe)
userRouter.post("/verifyStripe", authUser, verifyStripe)
userRouter.post("/initiate-appointment-payment", authUser, initiateAppointmentPayment)

export default userRouter;
