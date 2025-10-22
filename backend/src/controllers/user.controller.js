import User from "../models/user.model.js";

// ─── Get All Users (Admin Only) ──────────────────────────────
export const getAllUsers = async (req, res) => {
	try {
		const users = await User.find().select("-password");
		res.status(200).json(users);
	} catch (err) {
		console.error("Get all users error:", err);
		res.status(500).json({ error: "Failed to fetch users" });
	}
};

// ─── Get Specific User by ID (for Admin or general use) ────────
// ─── Get Specific User by ID (for Admin or general use) ────────
export const getUserById = async (req, res) => {
	try { // ✅ --- YOU WERE MISSING THIS 'try' ---
		const userId = req.params.id;
		const user = await User.findById(userId).select("-password");

		if (!user) return res.status(404).json({ error: "User not found" });

		res.status(200).json(user);
	} catch (err) { // ✅ --- This 'catch' is now correct ---
		console.error("Get user by ID error:", err);
		res.status(500).json({ error: "Failed to fetch user" });
	}
};
// ─── Get Logged-in User Profile ───────────────────────────────
export const getUserProfile = async (req, res) => {
	try {
		const user = await User.findById(req.user._id).select("-password");

		if (!user) return res.status(404).json({ error: "User not found" });

		res.status(200).json(user);
	} catch (err) {
		console.error("Get user profile error:", err);
		res.status(500).json({ error: "Failed to fetch profile" });
	}
};

// ✅ --- NEW: Get Public Profile by Username ───────────────────
export const getUserByUsername = async (req, res) => {
	try {
		const { username } = req.params;

		// Find the user by their username, case-insensitive
		const user = await User.findOne({ 
			username: { $regex: new RegExp(`^${username}$`, "i") } 
		}).select("-password -resetPasswordToken -resetPasswordExpire"); // Exclude sensitive info

		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		// We will add friend status logic here later
		res.status(200).json(user);

	} catch (err) {
		console.error("Get user by username error:", err);
		res.status(500).json({ error: "Failed to fetch user profile" });
	}
};
// ✅ --- END NEW FUNCTION ─────────────────────────────────────

// ─── Update Logged-in User Profile ────────────────────────────
export const updateUserProfile = async (req, res) => {
	try {
		const { nickname, bio, profilePic } = req.body;
		const userId = req.user._id;

		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ error: "User not found" });

		user.nickname = nickname ?? user.nickname;
		user.bio = bio ?? user.bio;
		user.profilePic = profilePic ?? user.profilePic;

		const updatedUser = await user.save();
		
		const userObject = updatedUser.toObject();
		delete userObject.password;

		res.status(200).json(userObject);
	} catch (err) {
		console.error("Update profile error:", err);
		res.status(500).json({ error: "Failed to update profile" });
	}
};

// ─── Delete My Account (User) ────────────────────────────────
export const deleteMyAccount = async (req, res) => {
	try {
		await User.findByIdAndDelete(req.user._id);
		res.clearCookie("jwt");
		res.status(200).json({ message: "Account deleted successfully" });
	} catch (err) {
		console.error("Delete account error:", err);
		res.status(500).json({ error: "Failed to delete account" });
	}
};

// ─── Delete User by ID (Admin Only) ───────────────────────────
export const deleteUser = async (req, res) => {
	try {
		const userId = req.params.userId;
		const deletedUser = await User.findByIdAndDelete(userId);

		if (!deletedUser) return res.status(404).json({ error: "User not found" });

		res.status(200).json({ message: "User deleted successfully" });
	} catch (err) {
		console.error("Delete user error:", err);
		res.status(500).json({ error: "Failed to delete user" });
	}
};

// ─── Search Users by Username ───────────────────────────────
export const searchUsers = async (req, res) => {
	try {
		const query = req.query.q || "";
		const loggedInUserId = req.user._id;

		if (!query.trim()) {
			return res.status(200).json([]);
		}

		const users = await User.find(
			{
				username: { $regex: query, $options: "i" },
				_id: { $ne: loggedInUserId },
			},
			"username profilePic nickname"
		).limit(10);

		res.status(200).json(users);
	} catch (err) {
		console.error("Search users error:", err);
		res.status(500).json({ error: "Failed to search users" });
	}
};