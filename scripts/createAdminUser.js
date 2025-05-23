import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: join(__dirname, '..', '.env') });

// Define admin model schema
const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' }
});

// Create the admin model
const Admin = mongoose.models.admin || mongoose.model('admin', adminSchema);

// Admin user details - you can change these
const adminUser = {
  name: 'Admin',
  email: 'admin@gmail.com',
  password: 'admin123' // This will be hashed before saving
};

// Function to create admin user
async function createAdminUser() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error('MongoDB URI not found in environment variables');
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await Admin.findOne({ email: adminUser.email });
    if (existingAdmin) {
      console.log(`Admin user with email ${adminUser.email} already exists. Deleting and recreating...`);
      await Admin.deleteOne({ email: adminUser.email });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminUser.password, salt);

    // Create new admin user
    const newAdmin = new Admin({
      name: adminUser.name,
      email: adminUser.email,
      password: hashedPassword
    });

    await newAdmin.save();
    console.log(`Admin user created successfully with email: ${adminUser.email}`);

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

// Run the function
createAdminUser();
