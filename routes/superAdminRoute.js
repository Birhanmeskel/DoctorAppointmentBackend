import express from 'express';
import { changeAdminPassword } from '../controllers/adminController.js';
import {
    approveUser,
    createManager,
    createSuperAdmin,
    deleteManager,
    getAllManagers,
    getApprovedUsers,
    getPendingUsers,
    getRejectedUsers,
    loginSuperAdmin,
    rejectUser,
    superAdminDashboard
} from '../controllers/superAdminController.js';
import authSuperAdmin from '../middleware/authSuperAdmin.js';

const superAdminRouter = express.Router();

// Public routes
superAdminRouter.post("/login", loginSuperAdmin);
superAdminRouter.post("/create", createSuperAdmin); // This should be protected in production

// Protected routes
superAdminRouter.get("/dashboard", authSuperAdmin, superAdminDashboard);
superAdminRouter.post("/create-manager", authSuperAdmin, createManager);
superAdminRouter.get("/pending-users", authSuperAdmin, getPendingUsers);
superAdminRouter.get("/approved-users", authSuperAdmin, getApprovedUsers);
superAdminRouter.get("/rejected-users", authSuperAdmin, getRejectedUsers);
superAdminRouter.post("/approve-user", authSuperAdmin, approveUser);
superAdminRouter.post("/reject-user", authSuperAdmin, rejectUser);
superAdminRouter.get("/managers", authSuperAdmin, getAllManagers);
superAdminRouter.post("/delete-manager", authSuperAdmin, deleteManager);
superAdminRouter.post("/change-password", authSuperAdmin, changeAdminPassword);

export default superAdminRouter;
