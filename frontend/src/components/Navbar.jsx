import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import {
	LayoutDashboard,
	Settings,
	User,
	LogOut,
	Search,
	Loader2,
	X,
	UserPlus,
} from "lucide-react";
import { axiosInstance } from "../lib/axios.js";
import toast from "react-hot-toast";

const Navbar = () => {
	const { logout, authUser } = useAuthStore();
	const isAdmin = authUser?.isAdmin;

	const { pendingReceived, acceptRequest, rejectRequest } = useFriendStore();

	// Search state
	const [searchQuery, setSearchQuery] = useState("");
	const [searchResults, setSearchResults] = useState([]);
	const [isLoadingSearch, setIsLoadingSearch] = useState(false);
	// We will use a separate state for the mobile search overlay
	const [isSearchOverlayOpen, setIsSearchOverlayOpen] = useState(false); 
	const searchRef = useRef(null);

	// Friend request state
	const [isFriendRequestOpen, setIsFriendRequestOpen] = useState(false);
	const friendRequestRef = useRef(null);
	const [loadingRequestId, setLoadingRequestId] = useState(null);

	// Debounced search effect
	useEffect(() => {
		// Only run search if query exists and is not empty
		if (!searchQuery.trim()) {
			setSearchResults([]);
			setIsLoadingSearch(false);
			return;
		}
		
		setIsLoadingSearch(true);
		
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


	// Click outside to close *both* dropdowns/overlays
	useEffect(() => {
		const handleClickOutside = (event) => {
			// Handle desktop search dropdown
			if (searchRef.current && !searchRef.current.contains(event.target) && !isSearchOverlayOpen) {
				// We don't use this state on mobile anymore, but keep it for desktop logic
			}
			// Handle friend request dropdown
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
	}, [isSearchOverlayOpen]);


	// Clear search function, now also closes the mobile overlay
	const clearSearch = () => {
		setSearchQuery("");
		setSearchResults([]);
		setIsSearchOverlayOpen(false);
	};

	// Handlers for friend requests
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
					{/* 1. Logo */}
					<Link to="/" className="flex items-center gap-2 flex-shrink-0">
						<img
							src="/zn4.png"
							alt="Z-APP Logo"
							className="h-10 w-auto object-contain"
						/>
					</Link>

					{/* 2. Search Bar - Hidden on mobile, full bar on desktop */}
					<div className="hidden md:block relative w-full max-w-sm" ref={searchRef}>
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
								// Simplified onFocus behavior for desktop dropdown
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
						{/* Search Results Dropdown (Desktop) */}
						{searchQuery && !isLoadingSearch && (
							<div className="absolute top-full mt-2 w-full bg-base-100 border border-base-300 rounded-lg shadow-xl max-h-96 overflow-y-auto">
								{searchResults.length === 0 ? (
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

					{/* 3. Navigation Buttons - Optimized for Mobile */}
					<div className="flex items-center gap-1 flex-shrink-0">

						{/* Search Icon (Mobile Only) */}
						<button
							onClick={() => setIsSearchOverlayOpen(true)}
							className="btn btn-ghost btn-circle btn-sm md:hidden"
							aria-label="Search Users"
						>
							<Search size={18} />
						</button>

						{/* Admin Dashboard */}
						{isAdmin && (
							<Link
								to="/admin"
								className="btn btn-ghost btn-circle btn-sm"
								aria-label="Admin Dashboard"
							>
								<LayoutDashboard size={18} />
							</Link>
						)}

						{/* Friend Request Button & Dropdown */}
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
									<div className="absolute top-full right-0 mt-2 w-72 bg-base-100 border border-base-300 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
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

			{/* 4. Mobile Search Overlay - Full screen search experience */}
			{isSearchOverlayOpen && (
				<div className="fixed inset-0 z-50 bg-base-100 md:hidden">
					<div className="p-4 flex flex-col h-full">
						{/* Search Input Bar (at the top) */}
						<div className="relative flex-shrink-0">
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Search className="h-5 w-5 text-primary" />
							</div>
							<input
								type="text"
								placeholder="Search for users..."
								className="input input-bordered input-lg w-full pl-10 pr-12 text-base font-medium"
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								autoFocus // Focus automatically when the overlay opens
							/>
							<div className="absolute inset-y-0 right-0 pr-2 flex items-center">
								{isLoadingSearch ? (
									<Loader2 className="h-5 w-5 animate-spin text-primary" />
								) : (
									<button
										onClick={clearSearch}
										className="btn btn-ghost btn-lg btn-circle"
										aria-label="Close search"
									>
										<X className="h-6 w-6 text-base-content/60" />
									</button>
								)}
							</div>
						</div>

						{/* Search Results Area */}
						<div className="flex-grow mt-4 overflow-y-auto">
							{/* ... (Search results rendering logic - using the same logic as desktop) ... */}
							{searchQuery.trim() && (
								<>
									{isLoadingSearch && searchResults.length === 0 ? (
										<div className="p-4 text-center text-sm text-base-content/60">
											Searching...
										</div>
									) : searchResults.length === 0 ? (
										<div className="p-4 text-center text-sm text-base-content/60">
											No users found for &quot;{searchQuery}&quot;
										</div>
									) : (
										searchResults.map((user) => (
											<Link
												to={`/profile/${user.username}`}
												key={user._id}
												onClick={clearSearch} // Clear search and close overlay on click
												className="flex items-center gap-3 p-3 hover:bg-base-200 transition"
											>
												<div className="avatar">
													<div className="w-12 rounded-full">
														<img
															src={user.profilePic || "/default-avatar.png"}
															alt={user.username}
														/>
													</div>
												</div>
												<div>
													<p className="font-semibold text-base">
														{user.nickname}
													</p>
													<p className="text-sm text-base-content/70">
														@{user.username}
													</p>
												</div>
											</Link>
										))
									)}
								</>
							)}
						</div>

						{/* Close button for mobile overlay (optional, as X button is in the input) */}
						<div className="flex-shrink-0 mt-4">
							<button
								onClick={clearSearch}
								className="btn btn-ghost btn-block text-base-content/60"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</header>
	);
};

export default Navbar;
