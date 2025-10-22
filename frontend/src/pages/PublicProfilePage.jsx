import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import { useChatStore } from "../store/useChatStore"; // ✅ 1. Import chat store
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";
import {
	Loader2,
	UserPlus,
	MessageSquare,
	UserCheck,
	UserX,
	Check,
} from "lucide-react";

// Skeleton component (no changes)
const ProfilePageSkeleton = () => (
	<div className="flex flex-col items-center gap-4 pt-28 max-w-sm mx-auto animate-pulse">
		<div className="avatar">
			<div className="w-32 h-32 rounded-full bg-base-300"></div>
		</div>
		<div className="w-40 h-8 bg-base-300 rounded-lg"></div>
		<div className="w-24 h-6 bg-base-300 rounded-lg"></div>
		<div className="w-full h-16 bg-base-300 rounded-lg"></div>
		<div className="flex items-center gap-4 w-full">
			<div className="w-1/2 h-12 bg-base-300 rounded-lg"></div>
			<div className="w-1/2 h-12 bg-base-300 rounded-lg"></div>
		</div>
	</div>
);

const PublicProfilePage = () => {
	const { username } = useParams();
	const { authUser } = useAuthStore();
	const navigate = useNavigate();

	const {
		getFriendshipStatus,
		sendRequest,
		acceptRequest,
		rejectRequest,
		unfriend,
	} = useFriendStore();

	// ✅ 2. Get setSelectedUser from chat store
	const { setSelectedUser } = useChatStore();

	const [user, setUser] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isButtonLoading, setIsButtonLoading] = useState(false);

	useEffect(() => {
		if (username.toLowerCase() === authUser?.username.toLowerCase()) {
			navigate("/profile");
			return;
		}

		const fetchUserProfile = async () => {
			setIsLoading(true);
			try {
				const res = await axiosInstance.get(`/users/profile/${username}`);
				setUser(res.data);
			} catch (error) {
				console.error("Failed to fetch user profile:", error);
				toast.error(error.response?.data?.error || "User not found");
				navigate("/");
			} finally {
				setIsLoading(false);
			}
		};

		fetchUserProfile();
	}, [username, authUser, navigate]);

	const handleFriendAction = async () => {
		if (!user) return;
		setIsButtonLoading(true);

		try {
			switch (friendshipStatus) {
				case "NOT_FRIENDS":
					await sendRequest(user._id);
					break;
				case "REQUEST_SENT":
					await rejectRequest(user._id);
					break;
				case "REQUEST_RECEIVED":
					await acceptRequest(user._id);
					break;
				case "FRIENDS":
					await unfriend(user._id);
					break;
				default:
					break;
			}
		} catch (error) {
			console.error("Friend action failed:", error);
		} finally {
			setIsButtonLoading(false);
		}
	};

	// ✅ 3. Update message handler
	const handleSendMessage = () => {
		if (friendshipStatus === "FRIENDS" && user) {
			// Set the selected user in the chat store
			setSelectedUser(user);
			// Navigate to the homepage to show the chat
			navigate("/");
		}
	};

	if (isLoading) {
		return <ProfilePageSkeleton />;
	}

	if (!user) {
		return null;
	}

	const friendshipStatus = getFriendshipStatus(user._id);
	const isMessageButtonDisabled = friendshipStatus !== "FRIENDS";

	const getFriendButtonProps = () => {
		switch (friendshipStatus) {
			case "NOT_FRIENDS":
				return { text: "Add Friend", icon: <UserPlus size={18} />, class: "btn-primary" };
			case "REQUEST_SENT":
				return { text: "Request Sent", icon: <UserX size={18} />, class: "btn-outline" };
			case "REQUEST_RECEIVED":
				return { text: "Accept Request", icon: <Check size={18} />, class: "btn-success" };
			case "FRIENDS":
				return { text: "Friends", icon: <UserCheck size={18} />, class: "btn-secondary" };
			default:
				return { text: "Loading", icon: <Loader2 size={18} />, class: "btn-disabled" };
		}
	};

	const friendButtonProps = getFriendButtonProps();

	return (
		<div className="pt-20 pb-10">
			<div className="max-w-md mx-auto bg-base-200 rounded-xl shadow-lg p-6">
				<div className="flex flex-col items-center gap-4">
					{/* Avatar */}
					<div className="avatar">
						<div className="w-32 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
							<img
								src={user.profilePic || "/default-avatar.png"}
								alt={`${user.nickname}'s profile`}
							/>
						</div>
					</div>

					{/* Names */}
					<div className="text-center">
						<h1 className="text-2xl font-bold">{user.nickname}</h1>
						<p className="text-base-content/70">@{user.username}</p>
					</div>

					{/* Bio */}
					{user.bio && (
						<p className="text-center text-base-content/80">{user.bio}</p>
					)}

					{/* Buttons */}
					<div className="flex items-center gap-4 w-full pt-4">
						<button
							className={`btn ${friendButtonProps.class} flex-1`}
							onClick={handleFriendAction}
							disabled={isButtonLoading}
						>
							{isButtonLoading ? (
								<Loader2 size={18} className="animate-spin" />
							) : (
								friendButtonProps.icon
							)}
							{friendButtonProps.text}
						</button>

						{/* Message Button */}
						<button
							className="btn btn-ghost flex-1"
							onClick={handleSendMessage}
							disabled={isMessageButtonDisabled}
						>
							<MessageSquare size={18} />
							Message
						</button>
					</div>

					{/* Reject Button */}
					{friendshipStatus === "REQUEST_RECEIVED" && (
						<button
							className="btn btn-outline btn-error btn-sm w-full mt-2"
							onClick={async () => {
								setIsButtonLoading(true);
								await rejectRequest(user._id);
								setIsButtonLoading(false);
							}}
							disabled={isButtonLoading}
						>
							Reject Request
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

export default PublicProfilePage;