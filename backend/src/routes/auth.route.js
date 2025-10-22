import express from "express";
import {
	signup,
	login,
	logout,
	updateProfile,
	checkAuth,
	forgotPassword,
	resetPassword,
	completeProfileSetup, // ✅ 1. Imported the new function
} from "../controllers/auth.controller.js";
// Assuming 'auth.middleware.js' is correct. If it's 'protectRoute.js', let me know.
import { protectRoute } from "../middleware/auth.middleware.js"; 

const router = express.Router();

// 🔓 Public Routes
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

// 🔒 Protected Routes
router.get("/check", protectRoute, checkAuth);
router.put("/update-profile", protectRoute, updateProfile); // For *later* profile updates

// ✅ 2. Added new route for the initial profile setup
router.post("/setup-profile", protectRoute, completeProfileSetup);

export default router;