import express from "express";
import {
	getAllUsers,
	getUserById,
	getUserProfile,
	updateUserProfile,
	deleteMyAccount,
	deleteUser,
	searchUsers,
	getUserByUsername, // ✅ --- Added this new controller
} from "../controllers/user.controller.js";

import { protectRoute, isAdmin } from "../middleware/protectRoute.js";

const router = express.Router();

// 🔒 All routes below require authentication
router.use(protectRoute);

// ✅ Search users by username (for search overlay)
router.get("/search", searchUsers);

// ✅ Admin only - fetch all users
router.get("/", isAdmin, getAllUsers);

// ✅ Get your own profile
router.get("/me", getUserProfile);

// ✅ Update your own profile
router.put("/me", updateUserProfile);

// ✅ Delete your own account
router.delete("/me", deleteMyAccount);

// ✅ --- NEW: Get a user's public profile by their USERNAME
// This MUST be before the '/:id' route
router.get("/profile/:username", getUserByUsername);

// ✅ Admin only - delete any user by ID
router.delete("/:userId", isAdmin, deleteUser);

// ✅ Get user by ID (for admin or public profile view)
router.get("/:id", getUserById);

export default router;