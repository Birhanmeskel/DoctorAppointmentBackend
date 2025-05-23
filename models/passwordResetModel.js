import mongoose from "mongoose";

const passwordResetSchema = new mongoose.Schema({
    email: { 
        type: String, 
        required: true 
    },
    userType: { 
        type: String, 
        required: true,
        enum: ['user', 'doctor', 'manager', 'admin']
    },
    token: { 
        type: String, 
        required: true 
    },
    createdAt: { 
        type: Date, 
        default: Date.now,
        expires: 3600 // Token expires after 1 hour (3600 seconds)
    }
});

const passwordResetModel = mongoose.models.passwordReset || mongoose.model("passwordReset", passwordResetSchema);
export default passwordResetModel;
