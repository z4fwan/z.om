import User from "../models/user.model.js";
import Report from "../models/report.model.js"; // ✅ 1. Import the Report model

// ✅ Safe Socket Emit Utility (no changes)
const emitToUser = (io, userId, event, data) => {
	// Your existing emitToUser function...
	if (!io || !userId || !global.userSocketMap) return;
	const socketId = global.userSocketMap[userId];
	if (socketId) io.to(socketId).emit(event, data);
};

// --- User Management Functions (no changes) ---
export const getAllUsers = async (req, res) => {
	// Your existing getAllUsers function...
	try {
		const users = await User.find().select("-password");
		res.status(200).json(users);
	} catch (err) {
		console.error("getAllUsers error:", err);
		res.status(500).json({ error: "Failed to fetch users" });
	}
};
export const suspendUser = async (req, res) => {
	// Your existing suspendUser function...
	const { userId } = req.params;
	const { until, reason } = req.body;
	if (!until || !reason) return res.status(400).json({ error: "Reason and duration required" });
	try {
		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ error: "User not found" });
		const suspendUntilDate = new Date(until);
		if (isNaN(suspendUntilDate.getTime())) return res.status(400).json({ error: "Invalid date" });
		user.isSuspended = true; user.suspendedUntil = suspendUntilDate; user.suspensionReason = reason;
		await user.save();
		const io = req.app.get("io");
		emitToUser(io, userId, "user-action", { type: "suspended", reason, until: suspendUntilDate });
		res.status(200).json({ message: "User suspended", user });
	} catch (err) { console.error("suspendUser error:", err); res.status(500).json({ error: "Failed" }); }
};
export const unsuspendUser = async (req, res) => {
	// Your existing unsuspendUser function...
	const { userId } = req.params;
	try {
		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ error: "User not found" });
		user.isSuspended = false; user.suspendedUntil = null; user.suspensionReason = null;
		await user.save();
		const io = req.app.get("io");
		emitToUser(io, userId, "user-action", { type: "unsuspended" });
		res.status(200).json({ message: "User unsuspended", user });
	} catch (err) { console.error("unsuspendUser error:", err); res.status(500).json({ error: "Failed" }); }
};
export const blockUser = async (req, res) => {
	// Your existing blockUser function...
	const { userId } = req.params;
	try {
		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ error: "User not found" });
		user.isBlocked = true; await user.save();
		const io = req.app.get("io");
		emitToUser(io, userId, "user-action", { type: "blocked" });
		res.status(200).json({ message: "User blocked", user });
	} catch (err) { console.error("blockUser error:", err); res.status(500).json({ error: "Failed" }); }
};
export const unblockUser = async (req, res) => {
	// Your existing unblockUser function...
	const { userId } = req.params;
	try {
		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ error: "User not found" });
		user.isBlocked = false; await user.save();
		const io = req.app.get("io");
		emitToUser(io, userId, "user-action", { type: "unblocked" });
		res.status(200).json({ message: "User unblocked", user });
	} catch (err) { console.error("unblockUser error:", err); res.status(500).json({ error: "Failed" }); }
};
export const deleteUser = async (req, res) => {
	// Your existing deleteUser function...
	const { userId } = req.params;
	try {
		const user = await User.findByIdAndDelete(userId);
		if (!user) return res.status(404).json({ error: "User not found" });
		const io = req.app.get("io");
		emitToUser(io, userId, "user-action", { type: "deleted" });
		res.status(200).json({ message: "User deleted" });
	} catch (err) { console.error("deleteUser error:", err); res.status(500).json({ error: "Failed" }); }
};
export const toggleVerification = async (req, res) => {
	// Your existing toggleVerification function...
	const { userId } = req.params;
	try {
		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ error: "User not found" });
		user.isVerified = !user.isVerified; await user.save();
		res.status(200).json({ message: `Verify ${user.isVerified ? "enabled" : "disabled"}`, user });
	} catch (err) { console.error("toggleVerify error:", err); res.status(500).json({ error: "Failed" }); }
};
// --- End User Management ---


// ✅ --- NEW: Get Reports ---
export const getReports = async (req, res) => {
	try {
		const reports = await Report.find()
			.sort({ createdAt: -1 }) // Sort by newest first
			.populate("reporter", "username nickname profilePic") // Get reporter details
			.populate("reportedUser", "username nickname profilePic"); // Get reported user details

		res.status(200).json(reports);
	} catch (err) {
		console.error("getReports error:", err);
		res.status(500).json({ error: "Failed to fetch reports" });
	}
};
// ✅ --- END NEW FUNCTION ---