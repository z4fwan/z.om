// This is the content for the NEW file:
// backend/routes/friend.routes.js

import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
	sendFriendRequest,
	acceptFriendRequest,
	rejectFriendRequest,
	unfriendUser,
	getFriends,
	getPendingRequests,
} from "../controllers/friend.controller.js";

const router = express.Router();

// 🔒 All routes below require authentication
router.use(protectRoute);

// Send a friend request to a user by their ID
router.post("/send/:receiverId", sendFriendRequest);

// Accept a friend request from a user by their ID
router.post("/accept/:senderId", acceptFriendRequest);

// Reject (or cancel) a friend request
router.post("/reject/:userId", rejectFriendRequest);

// Unfriend a user
router.delete("/unfriend/:friendId", unfriendUser);

// Get all of the logged-in user's friends
router.get("/all", getFriends);

// Get all pending friend requests (sent and received)
router.get("/requests", getPendingRequests);

export default router;