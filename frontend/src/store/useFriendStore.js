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

    // --- NEW ACTION FOR REAL-TIME UPDATES ---
    /**
     * Used by the WebSocket hook to instantly add a new pending request
     * without requiring a full refetch.
     */
    addPendingReceived: (newRequestData) => {
        set((state) => {
            // Ensure the new request object is not already in the list
            if (!state.pendingReceived.some(r => r._id === newRequestData._id)) {
                toast.success(`New friend request from ${newRequestData.nickname || newRequestData.username}! 🤝`);
                return {
                    pendingReceived: [newRequestData, ...state.pendingReceived],
                };
            }
            return state;
        });
    },
    // --- END NEW ACTION ---

    // --- Standard Actions ---
    sendRequest: async (receiverId) => {
        try {
            await axiosInstance.post(`/friends/send/${receiverId}`);
            // Note: We should refetch immediately if the server responds with success
            get().fetchFriendData(); // Full refetch ensures we get the latest sent request data
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
            toast.success("Friend request accepted!");
            // Refetch is necessary to move the user from 'pending' to 'friends' list
            get().fetchFriendData();
            return true;
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to accept request.");
            return false;
        }
    },

    rejectRequest: async (userId) => {
        try {
            await axiosInstance.post(`/friends/reject/${userId}`);
            // Remove from both lists for safety
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
