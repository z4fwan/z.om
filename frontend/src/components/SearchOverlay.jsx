import { X, Search } from "lucide-react";

const SearchOverlay = ({ query, setQuery, results, onClose, onSelect }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className="
          bg-base-100 
          p-4 
          rounded-xl 
          w-full 
          max-w-lg 
          mx-4 
          border-none 
          outline-none 
          shadow-none 
          ring-0
        "
        style={{
          boxShadow: "0 0 20px rgba(0,0,0,0.4)", // dark subtle shadow
        }}
      >
        {/* Search Header */}
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-5 h-5 text-primary" />
          <input
            type="text"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-base-content"
          />
          <button onClick={onClose} className="text-base-content hover:text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        <div className="space-y-2">
          {results.length > 0 ? (
            results.map((user, idx) => {
              // fallback to generated placeholder if avatar is missing
              const avatarUrl =
                user.avatar && user.avatar.trim() !== ""
                  ? user.avatar
                  : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      user.name || "User"
                    )}&background=random&color=fff`;

              return (
                <button
                  key={idx}
                  onClick={() => onSelect(user)}
                  className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-base-200 transition"
                >
                  <img
                    src={avatarUrl}
                    alt={user.name || "User"}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="text-base-content">{user.name}</span>
                </button>
              );
            })
          ) : (
            <p className="text-sm text-base-content/70">No results found</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchOverlay;
