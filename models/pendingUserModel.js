import mongoose from "mongoose";

const pendingUserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    image: { type: String, default: 'https://res.cloudinary.com/dcqwu3mo5/image/upload/v1747491936/hmdpysg7ya1uuj7welnw.png' },
    phone: { type: String, default: '000000000' },
    fin: { type: String, required: true }, // Add this field
    frontImage: { type: String, required: true }, // Add this field
    backImage: { type: String, required: true }, // Add this field
    address: { type: Object, default: { line1: '', line2: '' } },
    gender: { type: String, default: 'Not Selected' },
    dob: { type: String, default: null },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    createdAt: { type: Date, default: Date.now }
});
//  https://res.cloudinary.com/dcqwu3mo5/image/upload/v1747491936/hmdpysg7ya1uuj7welnw.png
const pendingUserModel = mongoose.models.pendingUser || mongoose.model("pendingUser", pendingUserSchema);
export default pendingUserModel;
