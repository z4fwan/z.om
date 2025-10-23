@@ -4,226 +4,242 @@ import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
// Remove Search, X icons as they are no longer needed for Sidebar's internal search
import { Video } from "lucide-react"; 
import { Search, X, Video } from "lucide-react";

const Sidebar = () => {
  const {
    selectedUser,
    setSelectedUser,
    unreadCounts = {},
  } = useChatStore();
  const {
    selectedUser,
    setSelectedUser,
    unreadCounts = {},
  } = useChatStore();

  const { onlineUsers = [] } = useAuthStore();
  const { friends, isLoading: isFriendsLoading } = useFriendStore();
  const { onlineUsers = [] } = useAuthStore();
  const { friends, isLoading: isFriendsLoading } = useFriendStore();

  // REMOVED: [searchOpen, setSearchOpen] state
  // REMOVED: [query, setQuery] state
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showOnlineOnly, setShowOnlineOnly] = useState(false);

  // FIX: Remove query filtering from the main list. The main list should only filter by online status now.
  const filteredUsers = friends
    .filter((u) => u && u._id)
    .filter((u) => (showOnlineOnly ? onlineUsers.includes(u._id) : true))
    .sort((a, b) => {
      const aOnline = onlineUsers.includes(a._id);
      const bOnline = onlineUsers.includes(b._id);
      return aOnline === bOnline ? 0 : aOnline ? -1 : 1;
    });
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
      {/* 1. Sidebar Container: Full screen on mobile when no user selected */}
      <aside
        className={`
          ${selectedUser ? "hidden" : "block"} 
          md:block 
          w-full md:w-96 h-screen 
          bg-base-100 
          border-r border-base-300
          flex flex-col 
        `}
      >
        {/* Header - Sticky controls area */}
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-base-300 bg-base-100/90 backdrop-blur-sm sticky top-0 z-10">
          
          {/* Chats Title (Search button removed) */}
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold">Chats</h3> 
            {/* REMOVED: Search button previously here */}
          </div>
  return (
    <>
      {/* 1. Sidebar Container: Full screen on mobile when no user selected */}
      <aside
        className={`
          ${selectedUser ? "hidden" : "block"} 
          md:block 
          w-full md:w-96 h-screen 
          bg-base-100 
          border-r border-base-300
          flex flex-col 
        `}
      >
        {/* Header - Sticky controls area */}
        {/* Adjusted padding/margin for a cleaner header area */}
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-base-300 bg-base-100/90 backdrop-blur-sm sticky top-0 z-10">
          
          {/* Chats Title and Search Button */}
          <div className="flex items-center justify-between">
            {/* Instagram Style Title */}
            <h3 className="text-2xl font-bold">Chats</h3> 
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-full hover:bg-base-200 active:bg-base-300 transition-colors"
              aria-label="Search"
            >
              <Search className="w-6 h-6 text-base-content" />
            </button>
          </div>

          {/* Stories/Quick Access - Horizontal Scroll */}
          <div className="flex gap-4 overflow-x-auto py-3 -mx-4 px-4 scrollbar-hide border-t border-base-200 mt-3">
            
            {/* Stranger Chat Button */}
            <Link
              to="/stranger"
              className="flex-none flex flex-col items-center gap-1 min-w-[64px] active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-base-content/50 flex items-center justify-center bg-base-200">
                  <Video size={28} className="text-base-content/70" />
              </div>
              <span className="text-sm truncate w-16 text-center text-base-content/70 font-semibold">
                Stranger
              </span>
            </Link>
            
            {/* Friend Stories */}
            {friends.slice(0, 8).map((u) => (
              <button
                key={u._id}
                onClick={() => {
                  setSelectedUser(u);
                }}
                className="flex-none flex flex-col items-center gap-1 min-w-[64px] active:scale-95 transition-transform"
              >
                <div className="w-16 h-16 rounded-full p-[2px] border-2 border-transparent ring-2 ring-pink-500 overflow-hidden"> 
                  <img
                    src={u.profilePic || "/avatar.png"}
                    alt={u.nickname || u.username}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <span className="text-sm truncate w-16 text-center">
                  {(u.nickname || u.username || "User").split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>
          {/* Stories/Quick Access - Horizontal Scroll */}
          <div className="flex gap-4 overflow-x-auto py-3 -mx-4 px-4 scrollbar-hide border-t border-base-200 mt-3">
            
            {/* Stranger Chat Button - Styled like a prominent Story/Quick Action */}
            <Link
              to="/stranger"
              className="flex-none flex flex-col items-center gap-1 min-w-[64px] active:scale-95 transition-transform"
            >
              {/* Avatar area with video icon for "Stranger Chat" */}
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-dashed border-base-content/50 flex items-center justify-center bg-base-200">
                  <Video size={28} className="text-base-content/70" />
              </div>
              <span className="text-sm truncate w-16 text-center text-base-content/70 font-semibold">
                Stranger
              </span>
            </Link>
            
            {/* Friend Stories - With Instagram-style colorful ring */}
            {friends.slice(0, 8).map((u) => (
              <button
                key={u._id}
                onClick={() => {
                  setSelectedUser(u);
                }}
                className="flex-none flex flex-col items-center gap-1 min-w-[64px] active:scale-95 transition-transform"
              >
                {/* Colorful ring effect */}
                <div className="w-16 h-16 rounded-full p-[2px] border-2 border-transparent ring-2 ring-pink-500 overflow-hidden"> 
                  <img
                    src={u.profilePic || "/avatar.png"}
                    alt={u.nickname || u.username}
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <span className="text-sm truncate w-16 text-center">
                  {(u.nickname || u.username || "User").split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-4 flex-grow overflow-y-auto">
          
          {/* Online Filter Checkbox */}
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-base font-semibold">Show Active only</span>
          </label>
          
          {/* Main Conversations List */}
          <div className="flex flex-col gap-1">
            {isFriendsLoading ? (
              <SidebarSkeleton />
            ) : filteredUsers.length === 0 ? (
              <div className="text-center text-zinc-500 py-10 text-base">
                No active chats found
              </div>
            ) : (
              filteredUsers.map((user) => {
                const unread = unreadCounts[user._id] || 0;
                const isOnline = onlineUsers.includes(user._id);
                return (
                  <button
                    key={user._id}
                    onClick={() => {
                      setSelectedUser(user);
                    }}
                    className={`w-full flex items-center gap-4 p-3 rounded-lg text-left transition-all hover:bg-base-200 active:bg-base-300 ${
                      selectedUser?._id === user._id
                        ? "bg-base-200" 
                        : ""
                    }`}
                  >
                    {/* Avatar and Online Status */}
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-full overflow-hidden">
                        <img
                          src={user.profilePic || "/avatar.png"}
                          alt={user.nickname || user.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {isOnline && (
                        // Subtle online badge
                        <span className="absolute right-0 bottom-0 block w-3 h-3 rounded-full ring-2 ring-base-100 bg-emerald-400" /> 
                      )}
                    </div>
        {/* Scrollable Content Area */}
        <div className="p-4 flex-grow overflow-y-auto">
          
          {/* Online Filter Checkbox - Placed above the main list */}
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm"
            />
            <span className="text-base font-semibold">Show Active only</span>
          </label>
          
          {/* Main Conversations List */}
          <div className="flex flex-col gap-1">
            {isFriendsLoading ? (
              <SidebarSkeleton />
            ) : filteredUsers.length === 0 ? (
              <div className="text-center text-zinc-500 py-10 text-base">
                No active chats found
              </div>
            ) : (
              filteredUsers.map((user) => {
                const unread = unreadCounts[user._id] || 0;
                const isOnline = onlineUsers.includes(user._id);
                return (
                  <button
                    key={user._id}
                    onClick={() => {
                      setSelectedUser(user);
                    }}
                    // Optimized for cleaner mobile touch/selection
                    className={`w-full flex items-center gap-4 p-3 rounded-lg text-left transition-all hover:bg-base-200 active:bg-base-300 ${
                      selectedUser?._id === user._id
                        ? "bg-base-200" 
                        : ""
                    }`}
                  >
                    {/* Avatar and Online Status */}
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-full overflow-hidden">
                        <img
                          src={user.profilePic || "/avatar.png"}
                          alt={user.nickname || user.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {isOnline && (
                        // Subtle online badge
                        <span className="absolute right-0 bottom-0 block w-3 h-3 rounded-full ring-2 ring-base-100 bg-emerald-400" /> 
                      )}
                    </div>

                    {/* Name and Last Message */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate text-base">
                        {user.nickname || user.username}
                      </div>
                      {/* Last message should be subtle */}
                      <div className="text-sm text-zinc-500 truncate mt-0.5">
                        {user.lastMessage?.text || "Start a chat!"}
                      </div>
                    </div>
                    {/* Name and Last Message */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate text-base">
                        {user.nickname || user.username}
                      </div>
                      {/* Last message should be subtle */}
                      <div className="text-sm text-zinc-500 truncate mt-0.5">
                        {user.lastMessage?.text || "Start a chat!"}
                      </div>
                    </div>

                    {/* Unread Count Badge */}
                    {unread > 0 && (
                      <span className="badge badge-error badge-sm rounded-full w-5 h-5 flex-shrink-0 text-white"> 
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
                    {/* Unread Count Badge */}
                    {unread > 0 && (
                      // Small, simple red badge (badge-error/badge-accent for DaisyUI)
                      <span className="badge badge-error badge-sm rounded-full w-5 h-5 flex-shrink-0 text-white"> 
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

      {/* 2. Floating Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 pt-16 px-4 animate-fadeIn">
          <div className="bg-base-100 p-5 rounded-xl shadow-lg w-full max-w-lg border-2 border-primary">
            <div className="flex items-center gap-3">
              <Search className="w-6 h-6 text-primary flex-shrink-0" />
              <input
                type="text"
                placeholder="Search your friends..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 p-3 outline-none bg-transparent text-base"
                autoFocus
              />
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setQuery(""); 
                }}
                className="p-2 hover:bg-base-200 rounded-full transition-colors flex-shrink-0"
                aria-label="Close search"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
      {/* 2. Floating Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 pt-16 px-4 animate-fadeIn">
          <div className="bg-base-100 p-5 rounded-xl shadow-lg w-full max-w-lg border-2 border-primary">
            <div className="flex items-center gap-3">
              <Search className="w-6 h-6 text-primary flex-shrink-0" />
              <input
                type="text"
                placeholder="Search your friends..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 p-3 outline-none bg-transparent text-base"
                autoFocus
              />
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setQuery(""); 
                }}
                className="p-2 hover:bg-base-200 rounded-full transition-colors flex-shrink-0"
                aria-label="Close search"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {query && (
              <div className="mt-4 bg-primary/10 rounded-md p-2 animate-fadeIn max-h-96 overflow-y-auto">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => {
                        setSelectedUser(user);
                        setSearchOpen(false);
                      }}
                      className="p-3 rounded hover:bg-primary/20 active:bg-primary/30 cursor-pointer transition-colors text-base"
                    >
                      {user.nickname || user.username}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-gray-500 py-4">
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
            {query && (
              <div className="mt-4 bg-primary/10 rounded-md p-2 animate-fadeIn max-h-96 overflow-y-auto">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => {
                        setSelectedUser(user);
                        setSearchOpen(false);
                      }}
                      className="p-3 rounded hover:bg-primary/20 active:bg-primary/30 cursor-pointer transition-colors text-base"
                    >
                      {user.nickname || user.username}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-gray-500 py-4">
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
