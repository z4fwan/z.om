import express from "express";
import {
	getAllUsers,
	suspendUser,
	unsuspendUser,
	blockUser,
	unblockUser,
	deleteUser,
	toggleVerification,
	getReports, // ✅ 1. Imported new controller function
} from "../controllers/admin.controller.js";

// Make sure these middleware paths are correct
import { protectRoute } from "../middleware/protectRoute.js";
import { isAdmin } from "../middleware/isAdmin.js";

const router = express.Router();

// 🛡️ Protect all routes and require admin
router.use(protectRoute, isAdmin);

// --- User Management ---
router.get("/users", getAllUsers);
router.put("/suspend/:userId", suspendUser);
router.put("/unsuspend/:userId", unsuspendUser);
router.put("/block/:userId", blockUser);
router.put("/unblock/:userId", unblockUser);
router.delete("/delete/:userId", deleteUser);
router.put("/verify/:userId", toggleVerification);

// --- Moderation ---
// ✅ 2. Added new route to fetch reports
router.get("/reports", getReports);

export default router;