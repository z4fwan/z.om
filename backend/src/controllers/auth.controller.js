import bcrypt from "bcryptjs";
import crypto from "crypto";
import cloudinary from "../lib/cloudinary.js";
import User from "../models/user.model.js";
import { generateToken } from "../lib/utils.js";
import sendEmail from "../utils/sendEmail.js";

// ─── Signup ─────────────────────────────────────────────
export const signup = async (req, res) => {
	const { fullName, email, password, username, bio, profilePic } = req.body;
	console.log("Signup request body:", req.body);

	try {
		if (!fullName || !email || !password || !username) {
			return res.status(400).json({ message: "Full name, email, username, and password are required." });
		}

		if (password.length < 6) {
			return res.status(400).json({ message: "Password must be at least 6 characters long." });
		}

		const existingUserByEmail = await User.findOne({ email });
		if (existingUserByEmail) {
			return res.status(409).json({ message: "Email is already registered." });
		}

		const existingUserByUsername = await User.findOne({ username: username.toLowerCase() });
		if (existingUserByUsername) {
			return res.status(409).json({ message: "Username is already taken." });
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		let uploadedProfilePic = "";
		if (profilePic) {
			try {
				const uploadResult = await cloudinary.uploader.upload(profilePic);
				uploadedProfilePic = uploadResult.secure_url;
			} catch (uploadError) {
				console.error("Cloudinary upload error:", uploadError);
				return res.status(500).json({ message: "Failed to upload profile picture." });
			}
		}

		const newUser = new User({
			fullName,
			email,
			username: username.toLowerCase(),
			nickname: fullName, // Default nickname
			bio: bio || "",
			password: hashedPassword,
			profilePic: uploadedProfilePic,
			// hasCompletedProfile will default to false, which is correct
		});

		await newUser.save();
		generateToken(newUser._id, res);

		res.status(201).json({
			_id: newUser._id,
			fullName: newUser.fullName,
			email: newUser.email,
			username: newUser.username,
			nickname: newUser.nickname,
			bio: newUser.bio,
			profilePic: newUser.profilePic,
			hasCompletedProfile: newUser.hasCompletedProfile,
			isAdmin: newUser.email === process.env.ADMIN_EMAIL,
			isBlocked: newUser.isBlocked,
			isSuspended: newUser.isSuspended,
			isVerified: newUser.isVerified,
			isOnline: newUser.isOnline,
			createdAt: newUser.createdAt,
		});
	} catch (error) {
		console.error("Signup Error:", error);
		if (error.name === "ValidationError") {
			return res.status(400).json({ message: error.message });
		}
		res.status(500).json({ message: "Signup failed. Please try again later." });
	}
};

// ─── Login ─────────────────────────────────────────────
export const login = async (req, res) => {
	const { emailOrUsername, password } = req.body;

	try {
		if (!emailOrUsername || !password) {
			return res.status(400).json({ message: "Email/Username and password are required." });
		}

		const user = await User.findOne({
			$or: [{ email: emailOrUsername }, { username: emailOrUsername.toLowerCase() }],
		});

		if (!user) return res.status(401).json({ message: "Invalid credentials." });

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) return res.status(401).json({ message: "Invalid credentials." });

		if (user.isBlocked) return res.status(403).json({ message: "Your account is blocked." });
		if (user.isSuspended) return res.status(403).json({ message: "Your account is suspended." });

		generateToken(user._id, res);

		res.status(200).json({
			_id: user._id,
			fullName: user.fullName,
			email: user.email,
			username: user.username,
			nickname: user.nickname,
			bio: user.bio,
			profilePic: user.profilePic,
			hasCompletedProfile: user.hasCompletedProfile,
			isAdmin: user.email === process.env.ADMIN_EMAIL,
			isBlocked: user.isBlocked,
			isSuspended: user.isSuspended,
			isVerified: user.isVerified,
			isOnline: user.isOnline,
			createdAt: user.createdAt,
		});
	} catch (error) {
		console.error("Login Error:", error);
		res.status(500).json({ message: "Login failed. Please try again later." });
	}
};

// ─── Logout ─────────────────────────────────────────────
// --- *** THIS FUNCTION IS NOW FIXED *** ---
export const logout = (req, res) => {
	try {
        // You MUST include the same secure and sameSite options
        // that you used when *setting* the cookie.
		res.cookie("jwt", "", {
            httpOnly: true,
            expires: new Date(0), // Set expiry to a past date
            secure: process.env.NODE_ENV !== "development", // Must be true for cross-domain (HTTPS)
            sameSite: "none", // Must be 'none' for cross-domain
        });
		res.status(200).json({ message: "Logged out successfully." });
	} catch (error) {
		console.error("Logout Error:", error);
		res.status(500).json({ message: "Logout failed. Please try again." });
	}
};
// --- *** END OF FIXED FUNCTION *** ---

// --- NEW FUNCTION FOR ONBOARDING ---
export const completeProfileSetup = async (req, res) => {
	try {
		const { nickname, bio, profilePic } = req.body;
		const userId = req.user._id;

		if (!nickname) {
			return res.status(400).json({ message: "Nickname is required." });
		}

		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ message: "User not found." });
		}

		// Upload profile picture to Cloudinary if provided
		let uploadedProfilePic = user.profilePic; // Keep old one if new one isn't sent
		if (profilePic) {
			try {
				const uploadResult = await cloudinary.uploader.upload(profilePic);
				uploadedProfilePic = uploadResult.secure_url;
			} catch (uploadError) {
				console.error("Cloudinary upload error:", uploadError);
				return res.status(500).json({ message: "Failed to upload profile picture." });
			}
		}

		// Update user
		user.nickname = nickname;
		user.bio = bio || ""; // Default to empty string
		user.profilePic = uploadedProfilePic;
		user.hasCompletedProfile = true; // Mark profile as complete

		const updatedUser = await user.save();

		// Return the full, updated user object (excluding password)
		const userObject = updatedUser.toObject();
		delete userObject.password;

		res.status(200).json(userObject);
	} catch (error) {
		console.error("Complete Profile Setup Error:", error);
		res.status(500).json({ message: "Failed to update profile." });
	}
};

// ─── Update Profile ─────────────────────────────────────
export const updateProfile = async (req, res) => {
	try {
		const { profilePic } = req.body; // You can expand this later
		const userId = req.user._id;

		if (!profilePic) {
			return res.status(400).json({ message: "Profile picture is required." });
		}

		const uploadResponse = await cloudinary.uploader.upload(profilePic);
		const updatedUser = await User.findByIdAndUpdate(
			userId,
			{ profilePic: uploadResponse.secure_url },
			{ new: true }
		).select("-password");

		res.status(200).json(updatedUser);
	} catch (error) {
		console.error("Update Profile Error:", error);
		res.status(500).json({ message: "Failed to update profile picture." });
	}
};

// ─── Check Auth ─────────────────────────────────────────
export const checkAuth = async (req, res) => {
	try {
		const user = await User.findById(req.user._id).select("-password");
		if (!user) return res.status(404).json({ message: "User not found." });

		res.status(200).json({
			_id: user._id,
			fullName: user.fullName,
			email: user.email,
			username: user.username,
			nickname: user.nickname,
			bio: user.bio,
			profilePic: user.profilePic,
			hasCompletedProfile: user.hasCompletedProfile,
			isAdmin: user.email === process.env.ADMIN_EMAIL,
			isBlocked: user.isBlocked,
			isSuspended: user.isSuspended,
			isVerified: user.isVerified,
			isOnline: user.isOnline,
			createdAt: user.createdAt,
		});
	} catch (error) {
		console.error("Check Auth Error:", error);
		res.status(500).json({ message: "Failed to verify authentication." });
	}
};

// ... (your forgotPassword and resetPassword functions remain unchanged) ...
// ─── Forgot Password ─────────────────────────────────────
export const forgotPassword = async (req, res) => {
	const { email } = req.body;

	try {
		if (!email) {
			return res.status(400).json({ message: "Email is required" });
		}

		const user = await User.findOne({ email });
		if (!user) {
			return res.status(404).json({ message: "No account with that email" });
		}

		const resetToken = crypto.randomBytes(32).toString("hex");
		const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

		user.resetPasswordToken = hashedToken;
		user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min
		await user.save({ validateBeforeSave: false });

		const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
		const message = `
      <h1>Password Reset Request</h1>
      <p>Click the link below to reset your password. This link will expire in 15 minutes.</p>
      <a href="${resetUrl}" target="_blank">${resetUrl}</a>
    `;

		try {
			await sendEmail(user.email, "Password Reset Request", message);
			res.status(200).json({ message: "Reset link sent to your email" });
		} catch (emailError) {
			console.error("Email send error:", emailError);
			user.resetPasswordToken = undefined;
			user.resetPasswordExpire = undefined;
			await user.save({ validateBeforeSave: false });
			res.status(500).json({ message: "Email could not be sent" });
		}
	} catch (error) {
		console.error("Forgot password error:", error);
		res.status(500).json({ message: "Server error" });
	}
};

// ─── Reset Password ─────────────────────────────────────
export const resetPassword = async (req, res) => {
	const { token } = req.params;
	const { password } = req.body;

	try {
		if (!password || password.length < 6) {
			return res.status(400).json({ message: "Password must be at least 6 characters long" });
		}

		const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

		const user = await User.findOne({
			resetPasswordToken: hashedToken,
			resetPasswordExpire: { $gt: Date.now() },
		});

		if (!user) {
			return res.status(400).json({ message: "Invalid or expired token" });
		}

		const salt = await bcrypt.genSalt(10);
		user.password = await bcrypt.hash(password, salt);
		user.resetPasswordToken = undefined;
		user.resetPasswordExpire = undefined;

		await user.save();

		res.status(200).json({ message: "Password reset successful" });
	} catch (error) {
		console.error("Reset password error:", error);
		res.status(500).json({ message: "Server error" });
	}
};
