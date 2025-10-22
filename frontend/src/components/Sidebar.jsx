import { useState } from "react";
import { Link } from "react-router-dom"; // ✅ 1. Import Link
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Search, X, Video } from "lucide-react"; // ✅ 2. Import Video icon

const Sidebar = () => {
	const {
		selectedUser,
		setSelectedUser,
		unreadCounts = {},
	} = useChatStore();

	const { onlineUsers = [] } = useAuthStore();
	const { friends, isLoading: isFriendsLoading } = useFriendStore();

	const [searchOpen, setSearchOpen] = useState(false);
	const [query, setQuery] = useState("");
	const [showOnlineOnly, setShowOnlineOnly] = useState(false);

	const filteredUsers = friends
		.filter((u) => u && u._id)
		.filter((u) => {
			if (!query) return true;
			return `${u.nickname || u.username}`
				.toLowerCase()
				.includes(query.toLowerCase());
		})
		.filter((u) => (showOnlineOnly ? onlineUsers.includes(u._id) : true))
		.sort((a, b) => {
			const aOnline = onlineUsers.includes(a._id);
			const bOnline = onlineUsers.includes(b._id);
			return aOnline === bOnline ? 0 : aOnline ? -1 : 1;
		});

	return (
		<>
			<aside
				className={`${
					selectedUser ? "hidden" : "block"
				} md:block w-full md:w-96 bg-base-100 border-r border-base-300`}
			>
				{/* --- Header --- */}
				<div className="p-4 border-b border-base-300 md:p-3">
					
					{/* ✅ 3. ADDED STRANGER CHAT BUTTON */}
					<Link
						to="/stranger"
						className="btn btn-primary w-full mb-4"
					>
						<Video size={18} />
						Start Stranger Chat
					</Link>
					{/* ✅ END OF NEW BUTTON */}

					<div className="flex items-center justify-between">
						<h3 className="text-lg font-semibold">Messages</h3>
						<button
							onClick={() => setSearchOpen(true)}
							className="p-2 rounded-full hover:bg-base-200"
						>
							<Search className="w-5 h-5 text-gray-600" />
						</button>
					</div>
					<label className="flex items-center gap-2 mt-5 cursor-pointer">
						<input
							type="checkbox"
							checked={showOnlineOnly}
							onChange={(e) => setShowOnlineOnly(e.target.checked)}
							className="checkbox checkbox-sm"
						/>
						<span className="text-sm">Show online only</span>
					</label>
				</div>

				{/* --- Content (no changes) --- */}
				<div className="p-3">
					{/* Stories */}
					<div className="flex gap-6 overflow-x-auto pb-3">
						{friends.slice(0, 8).map((u) => (
							<button
								key={u._id}
								onClick={() => setSelectedUser(u)}
								className="flex-none flex flex-col items-center gap-1"
							>
								<div className="w-12 h-12 rounded-full overflow-hidden border">
									<img
										src={u.profilePic || "/avatar.png"}
										alt={u.nickname || u.username}
										className="w-full h-full object-cover"
									/>
								</div>
								<span className="text-xs truncate w-12 text-center">
									{(u.nickname || u.username || "User").split(" ")[0]}
								</span>
							</button>
						))}
					</div>

					{/* Users list */}
					<div className="flex flex-col gap-2 max-h-[calc(100vh-200px)] overflow-y-auto">
						{isFriendsLoading ? (
							<SidebarSkeleton />
						) : filteredUsers.length === 0 ? (
							<div className="text-center text-zinc-500 py-7">
								No friends found
							</div>
						) : (
							filteredUsers.map((user) => {
								const unread = unreadCounts[user._id] || 0;
								const isOnline = onlineUsers.includes(user._id);
								return (
									<button
										key={user._id}
										onClick={() => setSelectedUser(user)}
										className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${
											selectedUser?._id === user._id
												? "bg-primary/10"
												: "hover:bg-base-200"
										}`}
									>
										<div className="relative">
											<div className="w-12 h-12 rounded-full overflow-hidden border">
												<img
													src={user.profilePic || "/avatar.png"}
													alt={user.nickname || user.username}
													className="w-full h-full object-cover"
												/>
											</div>
											{isOnline && (
												<span className="absolute right-0 bottom-0 block w-3 h-3 rounded-full ring-2 ring-base-100 bg-emerald-400" />
											)}
										</div>

										<div className="flex-1 min-w-0">
											<div className="flex items-center justify-between">
												<div className="font-medium truncate">
													{user.nickname || user.username}
												</div>
											</div>
											<div className="text-sm text-zinc-500 truncate">
												{user.lastMessage?.text
													? user.lastMessage.text
													: ""}
											</div>
										</div>

										{unread > 0 && (
											<span className="badge badge-primary badge-sm">
												{unread > 9 ? "9+" : unread}
											</span>
										)}
									</button>
								);
							})
						)}
					</div>
				</div>
			</aside>

			{/* --- Floating Search Overlay (no changes) --- */}
			{searchOpen && (
				<div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 pt-20 animate-fadeIn">
					<div className="bg-base-100 p-4 rounded-xl shadow-lg w-full max-w-lg mx-4 border-2 border-primary">
						<div className="flex items-center gap-2">
							<Search className="w-5 h-5 text-primary" />
							<input
								type="text"
								placeholder="Search your friends..."
								value={query}
								onChange={(e) => setQuery(e.target.value)}
								className="flex-1 p-2 outline-none bg-transparent"
								autoFocus
							/>
							<button onClick={() => setSearchOpen(false)}>
								<X className="w-5 h-5 text-gray-500" />
							</button>
						</div>

						{query && (
							<div className="mt-3 bg-primary/10 rounded-md p-2 animate-fadeIn">
								{filteredUsers.length > 0 ? (
									filteredUsers.map((user) => (
										<div
											key={user._id}
											onClick={() => {
												setSelectedUser(user);
												setSearchOpen(false);
											}}
											className="p-2 rounded hover:bg-primary/20 cursor-pointer"
										>
											{user.nickname || user.username}
										</div>
									))
								) : (
									<p className="text-center text-sm text-gray-500">
										No friends found
									</p>
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</>
	);
};

export default Sidebar;