import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { useEffect, useCallback } from "react";
import { Loader } from "lucide-react";
import { Toaster, toast } from "react-hot-toast";

import Navbar from "./components/Navbar";
import DeveloperLogo from "./components/DeveloperSign";

// Pages
import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SetupProfilePage from "./pages/SetupProfilePage";
import SettingsPage from "./pages/SettingsPage";
import MyProfilePage from "./pages/ProfilePage";
import PublicProfilePage from "./pages/PublicProfilePage";
import StrangerChatPage from "./pages/StrangerChatPage"; 
import AdminDashboard from "./pages/AdminDashboard";
import SuspendedPage from "./pages/SuspendedPage";
import GoodbyePage from "./pages/GoodbyePage";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import { useAuthStore } from "./store/useAuthStore";
import { useThemeStore } from "./store/useThemeStore";
import { useFriendStore } from "./store/useFriendStore"; // ✅ 1. Import Friend Store

// Toast UI (no changes)
const showMessageToast = ({ senderName, senderAvatar, messageText, theme }) => {
	toast.custom(
		(t) => (
			<div
				className={`flex items-center gap-3 p-3 rounded-xl shadow-lg transition-all duration-300
         ${theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-900"}
         ${t.visible ? "opacity-100" : "opacity-0"}
        `}
			>
				<img
					src={senderAvatar}
					alt={senderName}
					className="w-10 h-10 rounded-full object-cover border border-gray-300"
				/>
				<div className="flex flex-col max-w-[200px]">
					<span className="font-semibold truncate">{senderName}</span>
					<span className="text-sm opacity-80 truncate">{messageText}</span>
				</div>
			</div>
		),
		{
			id: `msg-${Date.now()}`,
			duration: 4000,
		}
	);
};

const App = () => {
	const { authUser, checkAuth, isCheckingAuth, socket, setAuthUser } = useAuthStore();
	const { theme } = useThemeStore();
	// ✅ 2. Get the action to update the pending received requests
	const addPendingReceived = useFriendStore((state) => state.addPendingReceived); 
	const navigate = useNavigate();

	const forceLogout = useCallback(
		(message, redirect = "/login") => {
			setAuthUser(null);
			toast.error(message);
			navigate(redirect);
		},
		[navigate, setAuthUser]
	);

	useEffect(() => {
		checkAuth();
	}, [checkAuth]);
	
	useEffect(() => {
		if (authUser?.isSuspended && window.location.pathname !== "/suspended") {
			navigate("/suspended");
		}
	}, [authUser, navigate]);
	
	// --- MAIN SOCKET LISTENER EFFECT ---
	useEffect(() => {
		if (!socket || !authUser?._id) return;

		// Initial registration
		socket.emit("register-user", authUser._id);

		// 1. User/Admin actions listener
		socket.on("user-action", ({ type, reason, until }) => {
			switch (type) {
				case "suspended":
					forceLogout(
						`⛔ Suspended until ${new Date(until).toLocaleString()}. Reason: ${reason}`,
						"/suspended"
					);
					break;
				case "unsuspended":
					toast.success("✅ Suspension lifted. Please log in again.");
					navigate("/login");
					break;
				case "blocked":
					forceLogout("🚫 You have been blocked by admin.", "/blocked");
					break;
				case "unblocked":
					toast.success("✅ You’ve been unblocked. Please log in again.");
					navigate("/login");
					break;
				case "deleted":
					forceLogout("❌ Your account has been deleted.", "/goodbye");
					break;
				default:
					break;
			}
		});

		// 2. Message listener
		socket.on("message-received", ({ sender, text }) => {
			if (sender?._id !== authUser?._id) {
				showMessageToast({
					senderName: sender?.name || "Unknown",
					senderAvatar: sender?.profilePic || "/default-avatar.png",
					messageText: text || "",
					theme,
				});
			}
		});

		// ✅ 3. FRIEND REQUEST LISTENER (The fix for your issue)
		// The server must emit 'friendRequest:received' to the recipient's socket
		socket.on("friendRequest:received", (senderProfileData) => {
			// senderProfileData should contain the full user object of the sender
			addPendingReceived(senderProfileData); 
		});

		// 4. Cleanup
		return () => {
			socket.off("user-action");
			socket.off("message-received");
			socket.off("friendRequest:received"); // ✅ Cleanup the new listener
		};
	// Added addPendingReceived to dependencies
	}, [socket, authUser, navigate, forceLogout, theme, addPendingReceived]); 

	// Show loader while checking auth
	if (isCheckingAuth) {
		return (
			<div className="flex items-center justify-center h-screen">
				<Loader className="size-10 animate-spin" />
			</div>
		);
	}

	const hasCompletedProfile = authUser?.hasCompletedProfile;

	return (
		<div data-theme={theme}>
			{/* Show Navbar conditionally based on route and profile status */}
			{hasCompletedProfile && window.location.pathname !== "/stranger" && <Navbar />}

			<Routes>
				{/* --- Auth Routes --- */}
				<Route
					path="/signup"
					element={!authUser ? <SignUpPage /> : <Navigate to="/" />}
				/>
				<Route
					path="/login"
					element={!authUser ? <LoginPage /> : <Navigate to="/" />}
				/>
				<Route
					path="/forgot-password"
					element={!authUser ? <ForgotPassword /> : <Navigate to="/" />}
				/>
				<Route
					path="/reset-password/:token"
					element={!authUser ? <ResetPassword /> : <Navigate to="/" />}
				/>

				{/* --- Onboarding Route --- */}
				<Route
					path="/setup-profile"
					element={
						!authUser ? (
							<Navigate to="/login" />
						) : hasCompletedProfile ? (
							<Navigate to="/" />
						) : (
							<SetupProfilePage />
						)
					}
				/>

				{/* --- Protected Routes (unchanged) --- */}
				<Route
					path="/"
					element={
						!authUser ? (
							<Navigate to="/login" />
						) : !hasCompletedProfile ? (
							<Navigate to="/setup-profile" />
						) : (
							<HomePage />
						)
					}
				/>
				<Route
					path="/settings"
					element={
						!authUser ? (
							<Navigate to="/login" />
						) : !hasCompletedProfile ? (
							<Navigate to="/setup-profile" />
						) : (
							<SettingsPage />
						)
					}
				/>
				<Route
					path="/profile/:username"
					element={
						!authUser ? (
							<Navigate to="/login" />
						) : !hasCompletedProfile ? (
							<Navigate to="/setup-profile" />
						) : (
							<PublicProfilePage />
						)
					}
				/>
				<Route
					path="/profile"
					element={
						!authUser ? (
							<Navigate to="/login" />
						) : !hasCompletedProfile ? (
							<Navigate to="/setup-profile" />
						) : (
							<MyProfilePage />
						)
					}
				/>
				<Route
					path="/admin"
					element={
						!authUser ? (
							<Navigate to="/login" />
						) : !hasCompletedProfile ? (
							<Navigate to="/setup-profile" />
						) : authUser.isAdmin ? (
							<AdminDashboard />
						) : (
							<Navigate to="/" />
						)
					}
				/>
				
				{/* Stranger Chat route (unchanged) */}
				<Route
					path="/stranger"
					element={
						!authUser ? (
							<Navigate to="/login" />
						) : !hasCompletedProfile ? (
							<Navigate to="/setup-profile" />
						) : (
							<StrangerChatPage />
						)
					}
				/>

				{/* --- Special Pages (unchanged) --- */}
				<Route path="/suspended" element={<SuspendedPage />} />
				<Route path="/goodbye" element={<GoodbyePage />} />
				<Route path="/blocked" element={<GoodbyePage />} />
			</Routes>

			<Toaster position="top-center" />
			<DeveloperLogo />
		</div>
	);
};

export default App;
