import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore"; // ✅ 1. Import friend store
import {
	LayoutDashboard,
	Settings,
	User,
	LogOut,
	Search,
	Loader2,
	X,
	UserPlus, // ✅ 2. Import new icons
} from "lucide-react";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

const Navbar = () => {
	const { logout, authUser } = useAuthStore();
	const isAdmin = authUser?.isAdmin;

	// ✅ 3. Get friend store data and actions
	const { pendingReceived, acceptRequest, rejectRequest } = useFriendStore();

	// Search state
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState([]);
	const [isLoadingSearch, setIsLoadingSearch] = useState(false);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const searchRef = useRef(null);

	// ✅ 4. New state for friend request dropdown
	const [isFriendRequestOpen, setIsFriendRequestOpen] = useState(false);
	const friendRequestRef = useRef(null);
	const [loadingRequestId, setLoadingRequestId] = useState(null); // For accept/reject buttons

	// Debounced search effect
	useEffect(() => {
		if (!searchQuery.trim()) {
			setSearchResults([]);
			setIsSearchOpen(false);
			return;
		}
		setIsLoadingSearch(true);
		setIsSearchOpen(true);
		const timerId = setTimeout(() => {
			const fetchUsers = async () => {
				try {
					const res = await axiosInstance.get(`/users/search?q=${searchQuery}`);
					setSearchResults(res.data);
				} catch (error) {
					console.error("Search error:", error);
					toast.error("Failed to search users");
				} finally {
					setIsLoadingSearch(false);
				}
			};
			fetchUsers();
		}, 300);
		return () => clearTimeout(timerId);
	}, [searchQuery]);

	// ✅ 5. Click outside to close *both* search and friend requests
	useEffect(() => {
		const handleClickOutside = (event) => {
			if (searchRef.current && !searchRef.current.contains(event.target)) {
				setIsSearchOpen(false);
			}
			if (
				friendRequestRef.current &&
				!friendRequestRef.current.contains(event.target)
			) {
				setIsFriendRequestOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	// Clear search function
	const clearSearch = () => {
		setSearchQuery("");
		setSearchResults([]);
		setIsSearchOpen(false);
	};

	// ✅ 6. Handlers for friend requests
	const handleAccept = async (id) => {
		setLoadingRequestId(id);
		await acceptRequest(id);
		setLoadingRequestId(null);
	};

	const handleReject = async (id) => {
		setLoadingRequestId(id);
		await rejectRequest(id);
		setLoadingRequestId(null);
	};

	return (
		<header className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 backdrop-blur-lg bg-base-100/80">
			<div className="max-w-7xl mx-auto px-5 h-14">
				<div className="flex items-center justify-between h-full gap-4">
					{/* Logo */}
					<Link to="/" className="flex items-center gap-2 flex-shrink-0">
						<img
							src="/zn4.png"
							alt="Z-APP Logo"
							className="h-10 w-auto object-contain"
						/>
					</Link>

					{/* Search Bar */}
					<div className="relative w-full max-w-sm" ref={searchRef}>
						{/* ... (search input code, no changes) ... */}
						<div className="relative">
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Search className="h-4 w-4 text-base-content/60" />
							</div>
							<input
								type="text"
								placeholder="Search for users..."
								className="input input-bordered input-sm w-full pl-9"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								onFocus={() => setIsSearchOpen(true)}
							/>
							<div className="absolute inset-y-0 right-0 pr-3 flex items-center">
								{isLoadingSearch ? (
									<Loader2 className="h-4 w-4 animate-spin text-base-content/60" />
								) : (
									searchQuery && (
										<button
											onClick={clearSearch}
											className="btn btn-ghost btn-xs btn-circle"
										>
											<X className="h-4 w-4" />
										</button>
									)
								)}
							</div>
						</div>
						{/* Search Results Dropdown */}
						{isSearchOpen && (
							<div className="absolute top-full mt-2 w-full bg-base-100 border border-base-300 rounded-lg shadow-xl max-h-96 overflow-y-auto">
								{/* ... (search results logic, no changes) ... */}
								{isLoadingSearch && searchResults.length === 0 ? (
									<div className="p-4 text-center text-sm text-base-content/60">
										Loading...
									</div>
								) : !isLoadingSearch &&
								  searchResults.length === 0 &&
								  searchQuery ? (
									<div className="p-4 text-center text-sm text-base-content/60">
										No users found for &quot;{searchQuery}&quot;
									</div>
								) : (
									searchResults.map((user) => (
										<Link
											to={`/profile/${user.username}`}
											key={user._id}
											onClick={clearSearch}
											className="flex items-center gap-3 p-3 hover:bg-base-200 transition"
										>
											<div className="avatar">
												<div className="w-10 rounded-full">
													<img
														src={user.profilePic || "/default-avatar.png"}
														alt={user.username}
													/>
												</div>
											</div>
											<div>
												<p className="font-semibold text-sm">
													{user.nickname}
												</p>
												<p className="text-xs text-base-content/70">
													@{user.username}
												</p>
											</div>
										</Link>
									))
								)}
							</div>
						)}
					</div>

					{/* Navigation Buttons */}
					<div className="flex items-center gap-1 flex-shrink-0">
						{isAdmin && (
							<Link
								to="/admin"
								className="btn btn-ghost btn-circle btn-sm"
								aria-label="Admin Dashboard"
							>
								<LayoutDashboard size={18} />
							</Link>
						)}

						{/* ✅ 7. Friend Request Button & Dropdown */}
						{authUser && (
							<div className="relative" ref={friendRequestRef}>
								<button
									onClick={() => setIsFriendRequestOpen((prev) => !prev)}
									className="btn btn-ghost btn-circle btn-sm relative"
									aria-label="Friend Requests"
								>
									<UserPlus size={18} />
									{pendingReceived.length > 0 && (
										<span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
											{pendingReceived.length}
										</span>
									)}
								</button>

								{/* Friend Request Dropdown */}
								{isFriendRequestOpen && (
									<div className="absolute top-full right-0 mt-2 w-72 bg-base-100 border border-base-300 rounded-lg shadow-xl max-h-96 overflow-y-auto">
										<div className="p-3 border-b border-base-300">
											<h3 className="font-semibold text-sm">
												Friend Requests
											</h3>
										</div>
										{pendingReceived.length === 0 ? (
											<p className="p-4 text-center text-sm text-base-content/60">
												No pending requests.
											</p>
										) : (
											<div>
												{pendingReceived.map((user) => (
													<div
														key={user._id}
														className="p-3 border-b border-base-300"
													>
														<div className="flex items-center gap-3">
															<div className="avatar">
																<div className="w-10 rounded-full">
																	<img
																		src={
																			user.profilePic ||
																			"/default-avatar.png"
																		}
																		alt={user.username}
																	/>
																</div>
															</div>
															<div>
																<p className="font-semibold text-sm">
																	{user.nickname}
																</p>
																<p className="text-xs text-base-content/70">
																	@{user.username}
																</p>
															</div>
														</div>
														<div className="flex gap-2 mt-3">
															<button
																className="btn btn-success btn-xs flex-1"
																onClick={() => handleAccept(user._id)}
																disabled={loadingRequestId === user._id}
															>
																{loadingRequestId === user._id ? (
																	<Loader2
																		size={14}
																		className="animate-spin"
																	/>
																) : (
																	"Accept"
																)}
															</button>
															<button
																className="btn btn-ghost btn-xs flex-1"
																onClick={() => handleReject(user._id)}
																disabled={loadingRequestId === user._id}
															>
																{loadingRequestId === user._id ? (
																	<Loader2
																		size={14}
																		className="animate-spin"
																	/>
																) : (
																	"Reject"
																)}
															</button>
														</div>
													</div>
												))}
											</div>
										)}
									</div>
								)}
							</div>
						)}

						<Link
							to="/settings"
							className="btn btn-ghost btn-circle btn-sm"
							aria-label="Settings"
						>
							<Settings size={18} />
						</Link>

						{authUser && (
							<>
								<Link
									to="/profile"
									className="btn btn-ghost btn-circle btn-sm"
									aria-label="My Profile"
								>
									<User size={18} />
								</Link>

								<button
									onClick={logout}
									className="btn btn-ghost btn-circle btn-sm"
									aria-label="Logout"
								>
									<LogOut size={18} />
								</button>
							</>
						)}
					</div>
				</div>
			</div>
		</header>
	);
};

export default Navbar;