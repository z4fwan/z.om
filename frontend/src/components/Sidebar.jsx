import { useState } from "react";
import { Link } from "react-router-dom";
import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import SidebarSkeleton from "./skeletons/SidebarSkeleton";
import { Search, X, Video } from "lucide-react";

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
      // Sort: Online users come first
      const aOnline = onlineUsers.includes(a._id);
      const bOnline = onlineUsers.includes(b._id);
      return aOnline === bOnline ? 0 : aOnline ? -1 : 1;
    });

  return (
    <>
      {/* 1. Sidebar Container: Full screen on mobile when no user selected */}
      <aside
        // h-screen and flex flex-col remain correct here
        className={`
          ${selectedUser ? "hidden" : "block"} 
          md:block 
          w-full md:w-96 
          h-screen 
          bg-base-100 
          border-r border-base-300
          flex flex-col
        `}
      >
        
        {/* Header - Sticky controls area */}
        {/* flex-shrink-0 ensures this fixed-height section is respected */}
        <div 
          id="sidebar-header" // 🎯 Added ID for potential future fixes
          className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-base-300 bg-base-100/90 backdrop-blur-sm"
        >
          
          {/* Chats Title and Search Button */}
          <div className="flex items-center justify-between">
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
            
            {/* Friend Stories (Max 8 shown) */}
            {friends.slice(0, 8).map((u) => (
              <button
                key={u._id}
                onClick={() => {
                  setSelectedUser(u);
                }}
                className="flex-none flex flex-col items-center gap-1 min-w-[64px] active:scale-95 transition-transform focus:outline-none"
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
        {/* 🎯 THE KEY FIX: Using a combination of flex-grow and overflow-y-auto */}
        {/* If flex-grow still fails, it's an external issue, but this is the correct structure. */}
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
                {query ? "No results found" : "No active chats found"}
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
                      // Close search if it was open on mobile
                      if (searchOpen) setSearchOpen(false); 
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

                    {/* Name and Last Message */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate text-base">
                        {user.nickname || user.username}
                      </div>
                      <div className="text-sm text-zinc-500 truncate mt-0.5">
                        {user.lastMessage?.text || "Start a chat!"}
                      </div>
                    </div>

                    {/* Unread Count Badge */}
                    {unread > 0 && (
                      <span className="badge badge-error badge-sm rounded-full w-5 h-5 flex-shrink-0 text-white flex items-center justify-center p-0"> 
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

      {/* 2. Floating Search Overlay (No changes needed here for scrolling) */}
      {searchOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 pt-16 px-4 animate-fadeIn">
          <div className="bg-base-100 p-5 rounded-xl shadow-2xl w-full max-w-lg border-2 border-primary">
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 border-b pb-3 border-base-300">
              <Search className="w-6 h-6 text-primary flex-shrink-0" />
              <input
                type="text"
                placeholder="Search your friends by name or username..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 p-2 outline-none bg-transparent text-lg"
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

            {/* Search Results */}
            {query && (
              <div className="mt-4 max-h-80 overflow-y-auto">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => {
                        setSelectedUser(user);
                        setSearchOpen(false);
                        setQuery("");
                      }}
                      className="p-3 my-1 rounded flex items-center gap-3 hover:bg-base-200 active:bg-base-300 cursor-pointer transition-colors text-base"
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                        <img 
                          src={user.profilePic || "/avatar.png"} 
                          alt={user.nickname || user.username} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="font-semibold">
                        {user.nickname || user.username}
                      </span>
                      <span className="text-sm text-zinc-500">
                        {user.username && `(@${user.username})`}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-zinc-500 py-6">
                    No friends found matching "{query}"
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
