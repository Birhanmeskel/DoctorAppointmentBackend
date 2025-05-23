import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    image: { type: String, default: 'https://res.cloudinary.com/dcqwu3mo5/image/upload/v1747491936/hmdpysg7ya1uuj7welnw.png' },
    phone: { type: String, default: '000000000' },
    fin: { type: String, required: true },
    frontImage: { type: String },
    backImage: { type: String },
    address: { type: Object, default: { line1: '', line2: '' } },
    gender: { type: String, default: 'Not Selected' },
    dob: { type: String, default: null },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'doctor', 'manager'], default: 'user' }
})

const userModel = mongoose.models.user || mongoose.model("user", userSchema);
export default userModel;