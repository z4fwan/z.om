// This is the content for the NEW file:
// frontend/src/store/useFriendStore.js

import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

export const useFriendStore = create((set, get) => ({
	friends: [],
	pendingReceived: [],
	pendingSent: [],
	isLoading: false,

	// Fetch all friend data (friends and requests)
	fetchFriendData: async () => {
		set({ isLoading: true });
		try {
			// Fetch both in parallel
			const [friendsRes, requestsRes] = await Promise.all([
				axiosInstance.get("/friends/all"),
				axiosInstance.get("/friends/requests"),
			]);

			set({
				friends: friendsRes.data,
				pendingReceived: requestsRes.data.received,
				pendingSent: requestsRes.data.sent,
			});
		} catch (error) {
			console.error("Failed to fetch friend data:", error);
			toast.error("Could not load friend data.");
		} finally {
			set({ isLoading: false });
		}
	},

	// Get the friendship status with another user
	// This is a utility function for the profile page
	getFriendshipStatus: (userId) => {
		const { friends, pendingSent, pendingReceived } = get();
		if (friends.some((f) => f._id === userId)) {
			return "FRIENDS";
		}
		if (pendingSent.some((r) => r._id === userId)) {
			return "REQUEST_SENT";
		}
		if (pendingReceived.some((r) => r._id === userId)) {
			return "REQUEST_RECEIVED";
		}
		return "NOT_FRIENDS";
	},

	// --- Actions ---

	sendRequest: async (receiverId) => {
		try {
			await axiosInstance.post(`/friends/send/${receiverId}`);
			// Optimistically update state
			set((state) => ({
				// We add a placeholder here. A full refresh is better but slower.
				pendingSent: [...state.pendingSent, { _id: receiverId }],
			}));
			toast.success("Friend request sent!");
			return true;
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to send request.");
			return false;
		}
	},

	acceptRequest: async (senderId) => {
		try {
			await axiosInstance.post(`/friends/accept/${senderId}`);
			// Update state by removing from received and adding to friends
			set((state) => ({
				pendingReceived: state.pendingReceived.filter((r) => r._id !== senderId),
				// We don't know the new friend's full data, so we'll just refetch
			}));
			toast.success("Friend request accepted!");
			get().fetchFriendData(); // Refetch all data
			return true;
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to accept request.");
			return false;
		}
	},

	rejectRequest: async (userId) => {
		try {
			await axiosInstance.post(`/friends/reject/${userId}`);
			// Remove from either list
			set((state) => ({
				pendingReceived: state.pendingReceived.filter((r) => r._id !== userId),
				pendingSent: state.pendingSent.filter((r) => r._id !== userId),
			}));
			toast.success("Request rejected.");
			return true;
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to reject request.");
			return false;
		}
	},

	unfriend: async (friendId) => {
		try {
			await axiosInstance.delete(`/friends/unfriend/${friendId}`);
			set((state) => ({
				friends: state.friends.filter((f) => f._id !== friendId),
			}));
			toast.success("User unfriended.");
			return true;
		} catch (error) {
			toast.error(error.response?.data?.message || "Failed to unfriend.");
			return false;
		}
	},

	// Clear data on logout
	clearFriendData: () => {
		set({
			friends: [],
			pendingReceived: [],
			pendingSent: [],
		});
	},
}));