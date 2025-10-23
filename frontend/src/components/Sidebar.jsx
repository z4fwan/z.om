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
  // Removed: mobileMenuOpen state and logic

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
      {/* 1. Sidebar Container */}
      <aside
        className={`
          ${selectedUser ? "hidden" : "block"} 
          md:block 
          w-full md:w-96 
          bg-base-100 
          border-r border-base-300
          h-screen overflow-y-hidden
          flex flex-col // Added flex-col to manage scrolling better
        `}
      >
        {/* Header - Sticky for better mobile UX */}
        <div className="flex-shrink-0 p-4 border-b border-base-300 bg-base-100/90 backdrop-blur-sm md:p-3 sticky top-0 z-10">
          {/* Stranger Chat Button */}
          <Link
            to="/stranger"
            className="btn btn-primary w-full mb-4 h-12 md:h-10 text-base md:text-sm"
          >
            <Video size={20} className="md:w-[18px] md:h-[18px]" />
            <span className="ml-2">Start Stranger Chat</span>
          </Link>

          <div className="flex items-center justify-between mb-4 md:mb-0">
            <h3 className="text-xl md:text-lg font-semibold">Messages</h3>
            <button
              onClick={() => setSearchOpen(true)}
              className="p-3 md:p-2 rounded-full hover:bg-base-200 active:bg-base-300 transition-colors"
              aria-label="Search"
            >
              <Search className="w-6 h-6 md:w-5 md:h-5 text-gray-600" />
            </button>
          </div>

          <label className="flex items-center gap-3 md:gap-2 mt-5 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
              className="checkbox checkbox-sm md:checkbox-xs"
            />
            <span className="text-base md:text-sm">Show online only</span>
          </label>
        </div>

        {/* Content - Scrollable area */}
        <div className="p-4 md:p-3 flex-grow overflow-y-auto">
          {/* Stories/Quick Access */}
          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 md:pb-3 -mx-2 px-2 scrollbar-hide border-b border-base-200">
            {friends.slice(0, 8).map((u) => (
              <button
                key={u._id}
                onClick={() => {
                  setSelectedUser(u);
                }}
                className="flex-none flex flex-col items-center gap-2 md:gap-1 min-w-[60px] md:min-w-[48px]"
              >
                <div className="w-16 h-16 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-base-300 active:scale-95 transition-transform">
                  <img
                    src={u.profilePic || "/avatar.png"}
                    alt={u.nickname || u.username}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-sm md:text-xs truncate w-16 md:w-12 text-center">
                  {(u.nickname || u.username || "User").split(" ")[0]}
                </span>
              </button>
            ))}
          </div>

          {/* Users list */}
          <div className="flex flex-col gap-2 mt-4">
            {isFriendsLoading ? (
              <SidebarSkeleton />
            ) : filteredUsers.length === 0 ? (
              <div className="text-center text-zinc-500 py-10 md:py-7 text-base md:text-sm">
                No friends found
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
                    className={`w-full flex items-center gap-4 md:gap-3 p-4 md:p-2 rounded-lg text-left transition-all active:scale-98 ${
                      selectedUser?._id === user._id
                        ? "bg-primary/10"
                        : "hover:bg-base-200 active:bg-base-300"
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 md:w-12 md:h-12 rounded-full overflow-hidden border-2 border-base-300">
                        <img
                          src={user.profilePic || "/avatar.png"}
                          alt={user.nickname || user.username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {isOnline && (
                        <span className="absolute right-0 bottom-0 block w-4 h-4 md:w-3 md:h-3 rounded-full ring-2 ring-base-100 bg-emerald-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-medium truncate text-base md:text-sm">
                          {user.nickname || user.username}
                        </div>
                      </div>
                      <div className="text-sm md:text-xs text-zinc-500 truncate mt-1 md:mt-0">
                        {user.lastMessage?.text ? user.lastMessage.text : ""}
                      </div>
                    </div>

                    {unread > 0 && (
                      <span className="badge badge-primary badge-md md:badge-sm flex-shrink-0">
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 pt-16 md:pt-20 px-4 animate-fadeIn">
          <div className="bg-base-100 p-5 md:p-4 rounded-xl shadow-lg w-full max-w-lg border-2 border-primary">
            <div className="flex items-center gap-3 md:gap-2">
              <Search className="w-6 h-6 md:w-5 md:h-5 text-primary flex-shrink-0" />
              <input
                type="text"
                placeholder="Search your friends..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 p-3 md:p-2 outline-none bg-transparent text-base md:text-sm"
                autoFocus
              />
              <button
                onClick={() => {
                  setSearchOpen(false);
                  setQuery(""); // Clear query when closing search
                }}
                className="p-2 hover:bg-base-200 rounded-full transition-colors flex-shrink-0"
                aria-label="Close search"
              >
                <X className="w-6 h-6 md:w-5 md:h-5 text-gray-500" />
              </button>
            </div>

            {query && (
              <div className="mt-4 md:mt-3 bg-primary/10 rounded-md p-2 animate-fadeIn max-h-96 overflow-y-auto">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => {
                        setSelectedUser(user);
                        setSearchOpen(false);
                      }}
                      className="p-3 md:p-2 rounded hover:bg-primary/20 active:bg-primary/30 cursor-pointer transition-colors text-base md:text-sm"
                    >
                      {user.nickname || user.username}
                    </div>
                  ))
                ) : (
                  <p className="text-center text-sm text-gray-500 py-4 md:py-2">
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
