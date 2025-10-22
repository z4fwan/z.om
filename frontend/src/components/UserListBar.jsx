import { useChatStore } from "../store/useChatStore";
import { useFriendStore } from "../store/useFriendStore"; // ✅ 1. Import friend store

const UserListBar = () => {
	// ✅ 2. Get friends list from the correct store
	const { friends } = useFriendStore();
	// ✅ 3. Get chat state from the chat store
	const { selectedUser, setSelectedUser } = useChatStore();

	// ✅ 4. Sort the 'friends' array
	// Note: The property is 'isOnline', not 'online'
	const sortedFriends = [...friends].sort((a, b) => {
		if (a.isOnline === b.isOnline) return 0;
		return b.isOnline ? 1 : -1;
	});

	return (
		<div className="flex gap-4 overflow-x-auto p-3 border-b border-base-300 bg-base-100">
			{/* ✅ 5. Map over sortedFriends */}
			{sortedFriends.map((friend) => (
				<div
					key={friend._id}
					onClick={() => setSelectedUser(friend)} // This sets the active chat
					className={`relative cursor-pointer shrink-0 ${
						selectedUser?._id === friend._id
							? "ring-2 ring-primary rounded-full"
							: ""
					}`}
				>
					<div className="w-14 h-14 rounded-full overflow-hidden relative">
						<img
							src={friend.profilePic || "/default-avatar.png"} // ✅ 6. Use friend data
							alt={friend.nickname} // ✅ 7. Use nickname
							className="w-full h-full object-cover"
						/>

						{/* ✅ 8. Check friend.isOnline */}
						{friend.isOnline && (
							<span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-base-100 rounded-full"></span>
						)}
					</div>
				</div>
			))}
		</div>
	);
};

export default UserListBar;