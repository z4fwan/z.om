import User from "../models/user.model.js";
import mongoose from "mongoose";

// ─── Send Friend Request ───────────────────────────────────
export const sendFriendRequest = async (req, res) => {
	const { receiverId } = req.params;
	const senderId = req.user._id;

	// Use a session for a transaction
	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		// 1. Check if receiver exists
		const receiver = await User.findById(receiverId).session(session);
		if (!receiver) {
			await session.abortTransaction();
			return res.status(404).json({ message: "User not found." });
		}

		// 2. Check if sender exists (should be guaranteed by protectRoute, but good practice)
		const sender = await User.findById(senderId).session(session);
		if (!sender) {
			await session.abortTransaction();
			return res.status(404).json({ message: "Sender not found." });
		}

		// 3. Check for various error conditions
		if (receiverId === senderId.toString()) {
			await session.abortTransaction();
			return res.status(400).json({ message: "You cannot send a friend request to yourself." });
		}
		if (sender.friends.includes(receiverId)) {
			await session.abortTransaction();
			return res.status(400).json({ message: "You are already friends with this user." });
		}
		if (sender.friendRequestsSent.includes(receiverId)) {
			await session.abortTransaction();
			return res.status(400).json({ message: "Friend request already sent." });
		}
		if (sender.friendRequestsReceived.includes(receiverId)) {
			// This means the other user already sent *us* a request.
			// Let's just accept their request instead.
			await session.abortTransaction();
			// We can't call acceptFriendRequest directly here easily,
			// so we'll just tell the user what to do.
			return res.status(400).json({
				message: "This user has already sent you a friend request. Please accept their request.",
			});
		}

		// 4. Update both users
		sender.friendRequestsSent.push(receiverId);
		receiver.friendRequestsReceived.push(senderId);

		await sender.save({ session });
		await receiver.save({ session });

		// 5. Commit the transaction
		await session.commitTransaction();
		session.endSession();

		// We will add socket.io logic here later to notify the receiver
		res.status(200).json({ message: "Friend request sent successfully." });
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		console.error("Send friend request error:", error);
		res.status(500).json({ message: "Server error while sending friend request." });
	}
};

// ─── Accept Friend Request ───────────────────────────────────
export const acceptFriendRequest = async (req, res) => {
	const { senderId } = req.params;
	const receiverId = req.user._id; // The logged-in user

	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const sender = await User.findById(senderId).session(session);
		const receiver = await User.findById(receiverId).session(session);

		if (!sender || !receiver) {
			await session.abortTransaction();
			return res.status(404).json({ message: "User not found." });
		}

		// 1. Check if the request actually exists
		if (!receiver.friendRequestsReceived.includes(senderId)) {
			await session.abortTransaction();
			return res.status(400).json({ message: "No friend request found from this user." });
		}

		// 2. Update both users' arrays atomically
		// Add to friends lists
		receiver.friends.push(senderId);
		sender.friends.push(receiverId);

		// Remove from request lists
		receiver.friendRequestsReceived = receiver.friendRequestsReceived.filter(
			(id) => id.toString() !== senderId
		);
		sender.friendRequestsSent = sender.friendRequestsSent.filter(
			(id) => id.toString() !== receiverId.toString()
		);

		await receiver.save({ session });
		await sender.save({ session });

		// 3. Commit transaction
		await session.commitTransaction();
		session.endSession();

		// We will add socket.io logic here to notify the sender
		res.status(200).json({ message: "Friend request accepted." });
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		console.error("Accept friend request error:", error);
		res.status(500).json({ message: "Server error while accepting friend request." });
	}
};

// ─── Reject Friend Request ───────────────────────────────────
// This function can also be used by the SENDER to CANCEL a sent request
export const rejectFriendRequest = async (req, res) => {
	const { userId } = req.params; // This can be either the sender or receiver
	const loggedInUserId = req.user._id;

	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const userToReject = await User.findById(userId).session(session);
		const loggedInUser = await User.findById(loggedInUserId).session(session);

		if (!userToReject || !loggedInUser) {
			await session.abortTransaction();
			return res.status(404).json({ message: "User not found." });
		}

		let updateMade = false;

		// Case 1: Logged-in user is REJECTING a received request
		if (loggedInUser.friendRequestsReceived.includes(userId)) {
			loggedInUser.friendRequestsReceived = loggedInUser.friendRequestsReceived.filter(
				(id) => id.toString() !== userId
			);
			userToReject.friendRequestsSent = userToReject.friendRequestsSent.filter(
				(id) => id.toString() !== loggedInUserId.toString()
			);
			updateMade = true;
		}
		// Case 2: Logged-in user is CANCELING a sent request
		else if (loggedInUser.friendRequestsSent.includes(userId)) {
			loggedInUser.friendRequestsSent = loggedInUser.friendRequestsSent.filter(
				(id) => id.toString() !== userId
			);
			userToReject.friendRequestsReceived = userToReject.friendRequestsReceived.filter(
				(id) => id.toString() !== loggedInUserId.toString()
			);
			updateMade = true;
		}

		if (!updateMade) {
			await session.abortTransaction();
			return res.status(400).json({ message: "No friend request to reject or cancel." });
		}

		await loggedInUser.save({ session });
		await userToReject.save({ session });

		await session.commitTransaction();
		session.endSession();

		res.status(200).json({ message: "Friend request rejected." });
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		console.error("Reject friend request error:", error);
		res.status(500).json({ message: "Server error while rejecting friend request." });
	}
};

// ─── Unfriend User ──────────────────────────────────────────
export const unfriendUser = async (req, res) => {
	const { friendId } = req.params;
	const loggedInUserId = req.user._id;

	const session = await mongoose.startSession();
	session.startTransaction();

	try {
		const friend = await User.findById(friendId).session(session);
		const loggedInUser = await User.findById(loggedInUserId).session(session);

		if (!friend || !loggedInUser) {
			await session.abortTransaction();
			return res.status(404).json({ message: "User not found." });
		}

		// 1. Check if they are actually friends
		if (!loggedInUser.friends.includes(friendId)) {
			await session.abortTransaction();
			return res.status(400).json({ message: "You are not friends with this user." });
		}

		// 2. Remove from both users' friends lists
		loggedInUser.friends = loggedInUser.friends.filter((id) => id.toString() !== friendId);
		friend.friends = friend.friends.filter((id) => id.toString() !== loggedInUserId.toString());

		await loggedInUser.save({ session });
		await friend.save({ session });

		await session.commitTransaction();
		session.endSession();

		res.status(200).json({ message: "User unfriended successfully." });
	} catch (error) {
		await session.abortTransaction();
		session.endSession();
		console.error("Unfriend user error:", error);
		res.status(500).json({ message: "Server error while unfriending user." });
	}
};

// ─── Get All Friends ────────────────────────────────────────
export const getFriends = async (req, res) => {
	try {
		const user = await User.findById(req.user._id)
			.populate("friends", "username nickname profilePic isOnline") // Select fields
			.select("friends"); // Only get the friends field

		if (!user) return res.status(404).json({ message: "User not found." });

		res.status(200).json(user.friends);
	} catch (error) {
		console.error("Get friends error:", error);
		res.status(500).json({ message: "Server error while fetching friends." });
	}
};

// ─── Get Pending Requests (Sent & Received) ──────────────────
export const getPendingRequests = async (req, res) => {
	try {
		const user = await User.findById(req.user._id)
			.populate("friendRequestsSent", "username nickname profilePic")
			.populate("friendRequestsReceived", "username nickname profilePic")
			.select("friendRequestsSent friendRequestsReceived");

		if (!user) return res.status(404).json({ message: "User not found." });

		res.status(200).json({
			sent: user.friendRequestsSent,
			received: user.friendRequestsReceived,
		});
	} catch (error) {
		console.error("Get pending requests error:", error);
		res.status(500).json({ message: "Server error while fetching pending requests." });
	}
};