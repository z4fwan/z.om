import { ArrowLeft, Phone, Video } from "lucide-react"; // ✅ 1. Import new icons
import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import toast from "react-hot-toast"; // ✅ 2. Import toast

const ChatHeader = () => {
	const { selectedUser, setSelectedUser } = useChatStore();
	const { onlineUsers } = useAuthStore();

	if (!selectedUser) return null;

	const isOnline = onlineUsers.includes(selectedUser._id);

	// ✅ 3. Placeholder function for starting calls
	const handleStartCall = (callType) => {
		toast(`Starting ${callType} call with ${selectedUser.nickname || selectedUser.username}... (Not implemented yet)`, { icon: "📞" });
		// Later: We will use this to set call state and emit socket events
	};

	return (
		<div className="p-3 border-b flex items-center justify-between bg-base-300 text-base-content border-base-100">
			<div className="flex items-center gap-3">
				{/* Back button on mobile */}
				<button
					className="md:hidden btn btn-ghost btn-circle btn-sm" // Added button styling
					onClick={() => setSelectedUser(null)}
					aria-label="Back"
				>
					<ArrowLeft size={20} /> {/* Adjusted icon size */}
				</button>

				<div className="avatar">
					<div className="w-10 h-10 rounded-full overflow-hidden border border-base-200">
						<img
							src={selectedUser.profilePic || "/default-avatar.png"} // ✅ Use default avatar
							alt={selectedUser.nickname || selectedUser.username} // ✅ Use nickname/username
						/>
					</div>
				</div>

				<div className="min-w-0">
					<div className="font-semibold truncate">
						{/* ✅ Use nickname/username */}
						{selectedUser.nickname ||
							selectedUser.username ||
							"Unknown"}
					</div>
					<p className="text-xs text-base-content/70 truncate"> {/* Adjusted opacity */}
						{isOnline ? "Online" : "Offline"}
					</p>
				</div>
			</div>

			{/* ✅ 4. Added Call Buttons */}
			<div className="flex items-center gap-1 md:gap-2">
				<button
					className="btn btn-ghost btn-circle btn-sm"
					onClick={() => handleStartCall('audio')}
					aria-label="Start Audio Call"
				>
					<Phone size={18} /> {/* Adjusted icon size */}
				</button>
				<button
					className="btn btn-ghost btn-circle btn-sm"
					onClick={() => handleStartCall('video')}
					aria-label="Start Video Call"
				>
					<Video size={18} /> {/* Adjusted icon size */}
				</button>
				{/* Add more options button here later if needed */}
			</div>
			{/* ✅ End Added Call Buttons */}
		</div>
	);
};

export default ChatHeader;