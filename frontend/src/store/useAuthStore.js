import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js"; // Used for API calls
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { useFriendStore } from "./useFriendStore.js";

// ✅ --- CORRECTED BASE_URL ---
// Get the base URL from the environment variable set during the build process
// Remove the '/api' part for the socket connection if your server listens at the root
const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5001";

// Optional check (already in axios.js, but good to be aware)
if (!SOCKET_URL && import.meta.env.PROD) {
  console.error("VITE_API_BASE_URL is not defined in the environment!");
}
// ✅ --- END CORRECTION ---


export const useAuthStore = create((set, get) => ({
	authUser: null,
	isSigningUp: false,
	isLoggingIn: false,
	isUpdatingProfile: false,
	isCheckingAuth: true,
	onlineUsers: [],
	socket: null,

	setAuthUser: (user) => {
		set({ authUser: user });
	},

	checkAuth: async () => {
		set({ isCheckingAuth: true });
		try {
			// axiosInstance now uses the correct baseURL from axios.js
			const res = await axiosInstance.get("/auth/check"); // Removed withCredentials here, should be default in instance
			const user = res.data;

			if (!user || typeof user !== 'object') { // Add check for valid user object
                 throw new Error("Invalid user data received");
            }

			if (user.isBlocked) { toast.error("Account is blocked"); return get().logout(); }
			if (user.suspension && new Date(user.suspension.endTime) > new Date()) { toast.error("Account is suspended"); return get().logout(); }

			set({ authUser: user });
			localStorage.setItem("authUser", JSON.stringify(user));
			get().connectSocket(); // Connect socket after setting authUser
			useFriendStore.getState().fetchFriendData();
		} catch (error) {
			console.error("Auth check failed:", error.response?.data?.message || error.message);
			// Clear state on any auth check failure
			set({ authUser: null });
			localStorage.removeItem("authUser");
			get().disconnectSocket(); // Ensure socket is disconnected
			useFriendStore.getState().clearFriendData();
		} finally {
			set({ isCheckingAuth: false });
		}
	},

	signup: async (data) => {
		set({ isSigningUp: true });
		try {
			const res = await axiosInstance.post("/auth/signup", data); // Removed withCredentials
			const user = res.data;
			set({ authUser: user });
			localStorage.setItem("authUser", JSON.stringify(user));
			toast.success("Account created successfully");
			get().connectSocket(); // Connect socket after setting authUser
			useFriendStore.getState().fetchFriendData();
            return true; // Indicate success for navigation
		} catch (error) {
			toast.error(error.response?.data?.message || "Signup failed");
            return false; // Indicate failure
		} finally {
			set({ isSigningUp: false });
		}
	},

	login: async (data) => {
		set({ isLoggingIn: true });
		try {
			const res = await axiosInstance.post("/auth/login", data); // Removed withCredentials
			const user = res.data;

            if (!user || typeof user !== 'object') {
                 throw new Error("Invalid login response");
            }
			if (user.isBlocked) { toast.error("Account is blocked"); return; }
			if (user.suspension && new Date(user.suspension.endTime) > new Date()) { toast.error("Account is suspended"); return; }

			set({ authUser: user });
			localStorage.setItem("authUser", JSON.stringify(user));
			toast.success("Logged in successfully");
			get().connectSocket(); // Connect socket after setting authUser
			useFriendStore.getState().fetchFriendData();
             return true; // Indicate success for navigation
		} catch (error) {
			toast.error(error.response?.data?.message || "Login failed");
             return false; // Indicate failure
		} finally {
			set({ isLoggingIn: false });
		}
	},

	logout: async () => {
        const socket = get().socket; // Get socket before clearing state
        if (socket) get().disconnectSocket(); // Disconnect socket first

		try {
            // Still attempt API logout even if socket failsafe triggers
			await axiosInstance.post("/auth/logout", {});
		} catch (error) {
			console.error("Logout API call error:", error.response?.data?.message || error.message);
            // Don't necessarily stop the logout process here
		} finally {
			localStorage.removeItem("authUser");
			set({ authUser: null, onlineUsers: [], socket: null }); // Clear socket in state too
			useFriendStore.getState().clearFriendData();
			toast.success("Logged out successfully");
            // Optionally navigate here or let App.jsx handle redirect via authUser change
		}
	},

	updateProfile: async (data) => {
		set({ isUpdatingProfile: true });
		try {
            // Assuming this is for minor updates like profile pic later
			const res = await axiosInstance.put("/auth/update-profile", data);
			const user = res.data;
			set({ authUser: user });
			localStorage.setItem("authUser", JSON.stringify(user));
			toast.success("Profile updated successfully");
		} catch (error) {
			toast.error(error.response?.data?.message || "Profile update failed");
		} finally {
			set({ isUpdatingProfile: false });
		}
	},

	connectSocket: () => {
		const { authUser, socket } = get();
		// Prevent multiple connections or connecting without user
		if (!authUser || socket) {
            console.log(`connectSocket: Skipped. authUser: ${!!authUser}, socket: ${!!socket}`);
            return;
        }

        console.log(`Connecting socket to ${SOCKET_URL} for user ${authUser._id}`);
		// ✅ --- USE CORRECT SOCKET_URL ---
		const newSocket = io(SOCKET_URL, {
			query: { userId: authUser._id },
            // Optional: force new connection if needed, depends on server behavior
            // forceNew: true,
			transports: ["websocket"], // Explicitly use websockets
			// `withCredentials: true` is NOT needed for socket.io client usually,
            // auth happens via query or initial handshake/token
		});
		// ✅ --- END CORRECTION ---

		set({ socket: newSocket });

		newSocket.on("connect", () => console.log("✅ Socket connected:", newSocket.id));
        newSocket.on("connect_error", (err) => {
            console.error("Socket connection error:", err.message);
            toast.error("Real-time connection failed.");
            get().disconnectSocket(); // Clean up on connection error
        });
		newSocket.on("getOnlineUsers", (userIds) => set({ onlineUsers: userIds }));

		const forceLogout = (msg) => {
			toast.error(msg);
            // Call the main logout action to ensure consistent cleanup
            get().logout();
		};

		// Admin action listeners remain the same
		newSocket.on("user-suspended", ({ reason }) => { forceLogout(`Suspended: ${reason || "N/A"}`); });
		newSocket.on("user-blocked", () => forceLogout("Account blocked"));
		newSocket.on("user-deleted", () => forceLogout("Account deleted"));

		newSocket.on("disconnect", (reason) => {
             console.log("⚠️ Socket disconnected:", reason);
             // Attempt to reconnect manually or show message? For now, just log.
             // If reason is 'io server disconnect', it was likely intentional (e.g., logout)
             if (reason !== 'io server disconnect') {
                // Could try to reconnect or notify user connection lost
             }
             // Clear socket ref in state if disconnected unexpectedly? Risky if it auto-reconnects.
             // set({ socket: null }); // Consider implications
        });

		// Reconnect logic might be handled automatically by socket.io, but explicit checkAuth can be good
		newSocket.io.on("reconnect", async (attempt) => {
			console.log(`🔄 Socket reconnected after ${attempt} attempts`);
			// Re-register user and fetch data upon successful reconnect
            if (get().authUser) { // Check if user is still logged in client-side
                newSocket.emit("register-user", get().authUser._id); // Re-register
                await get().checkAuth(); // Re-check auth and fetch friend data
            }
		});
        newSocket.io.on("reconnect_attempt", (attempt) => {
             console.log(`Attempting to reconnect socket... (${attempt})`);
        });
        newSocket.io.on("reconnect_error", (error) => {
            console.error("Socket reconnection error:", error.message);
        });
        newSocket.io.on("reconnect_failed", () => {
             console.error("Socket reconnection failed after multiple attempts.");
             toast.error("Disconnected from server.");
             // Maybe force logout or show persistent error here
        });
	},

	disconnectSocket: () => {
		const socket = get().socket;
		if (socket) {
            console.log("Disconnecting socket...", socket.id);
			socket.disconnect();
			set({ socket: null, onlineUsers: [] }); // Clear socket and online users
		}
	},
}));
