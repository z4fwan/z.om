import { create } from "zustand";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { useFriendStore } from "./useFriendStore.js";

const BASE_URL =
	import.meta.env.MODE === "development"
		? "http://localhost:5001"
		: "https://z-app-6w36.onrender.com";

export const useAuthStore = create((set, get) => ({
	authUser: null,
	isSigningUp: false,
	isLoggingIn: false,
	isUpdatingProfile: false,
	isCheckingAuth: true,
	onlineUsers: [],
	socket: null,

	// ✅ --- THIS IS THE NEW ACTION ---
	setAuthUser: (user) => {
		set({ authUser: user });
	},
	// ✅ --- END OF NEW ACTION ---

	checkAuth: async () => {
		set({ isCheckingAuth: true });
		try {
			const res = await axiosInstance.get("/auth/check", { withCredentials: true });
			const user = res.data;

			if (user.isBlocked) {
				toast.error("Account is blocked");
				return get().logout();
			}
			if (user.suspension && new Date(user.suspension.endTime) > new Date()) {
				toast.error("Account is suspended");
				return get().logout();
			}

			set({ authUser: user });
			localStorage.setItem("authUser", JSON.stringify(user));
			get().connectSocket();
			useFriendStore.getState().fetchFriendData();
		} catch (error) {
			console.error("Auth check failed:", error); // Added console log
			set({ authUser: null });
			localStorage.removeItem("authUser");
			useFriendStore.getState().clearFriendData();
		} finally {
			set({ isCheckingAuth: false });
		}
	},

	signup: async (data) => {
		set({ isSigningUp: true });
		try {
			const res = await axiosInstance.post("/auth/signup", data, { withCredentials: true });
			const user = res.data;
			set({ authUser: user });
			localStorage.setItem("authUser", JSON.stringify(user));
			toast.success("Account created successfully");
			get().connectSocket();
			useFriendStore.getState().fetchFriendData();
		} catch (error) {
			toast.error(error.response?.data?.message || "Signup failed");
		} finally {
			set({ isSigningUp: false });
		}
	},

	login: async (data) => {
		set({ isLoggingIn: true });
		try {
			const res = await axiosInstance.post("/auth/login", data, { withCredentials: true });
			const user = res.data;

			if (user.isBlocked) {
				toast.error("Account is blocked");
				return;
			}
			if (user.suspension && new Date(user.suspension.endTime) > new Date()) {
				toast.error("Account is suspended");
				return;
			}

			set({ authUser: user });
			localStorage.setItem("authUser", JSON.stringify(user));
			toast.success("Logged in successfully");
			get().connectSocket();
			useFriendStore.getState().fetchFriendData();
		} catch (error) {
			toast.error(error.response?.data?.message || "Login failed");
		} finally {
			set({ isLoggingIn: false });
		}
	},

	logout: async () => {
		try {
			await axiosInstance.post("/auth/logout", {}, { withCredentials: true });
		} catch (error) {
			console.error("Logout error:", error);
		} finally {
			localStorage.removeItem("authUser");
			set({ authUser: null });
			get().disconnectSocket();
			useFriendStore.getState().clearFriendData();
			toast.success("Logged out successfully");
		}
	},

	updateProfile: async (data) => {
		set({ isUpdatingProfile: true });
		try {
			const res = await axiosInstance.put("/auth/update-profile", data, { withCredentials: true });
			const user = res.data;
			set({ authUser: user }); // Update state
			localStorage.setItem("authUser", JSON.stringify(user)); // Update local storage
			toast.success("Profile updated successfully");
		} catch (error) {
			toast.error(error.response?.data?.message || "Profile update failed");
		} finally {
			set({ isUpdatingProfile: false });
		}
	},

	connectSocket: () => {
		const { authUser, socket } = get();
		if (!authUser || socket) return;

		const newSocket = io(BASE_URL, {
			query: { userId: authUser._id },
			transports: ["websocket"],
			withCredentials: true,
		});

		set({ socket: newSocket });

		newSocket.on("connect", () => console.log("✅ Socket connected"));
		newSocket.on("getOnlineUsers", (userIds) => set({ onlineUsers: userIds }));

		const forceLogout = (msg) => {
			toast.error(msg);
			set({ authUser: null });
			localStorage.removeItem("authUser");
			get().disconnectSocket();
			useFriendStore.getState().clearFriendData();
		};

		newSocket.on("user-suspended", ({ reason }) => {
			forceLogout(`You have been suspended. Reason: ${reason || "No reason provided"}`);
		});
		newSocket.on("user-blocked", () => forceLogout("Your account has been blocked by the admin."));
		newSocket.on("user-deleted", () => forceLogout("Your account has been deleted by the admin."));
		newSocket.on("disconnect", () => console.log("⚠️ Socket disconnected"));

		newSocket.io.on("reconnect", async () => {
			console.log("🔄 Socket reconnected");
			await get().checkAuth();
		});
	},

	disconnectSocket: () => {
		const socket = get().socket;
		if (socket) {
			socket.disconnect();
			set({ socket: null });
		}
	},
}));