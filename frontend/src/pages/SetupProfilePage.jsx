import { useState, useRef } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Camera, Loader2, User, FileText } from "lucide-react";
import { axiosInstance } from "../lib/axios.js";

const SetupProfilePage = () => {
	const { authUser, setAuthUser } = useAuthStore();
	const navigate = useNavigate();
	const [isLoading, setIsLoading] = useState(false);

	// State for form data
	const [nickname, setNickname] = useState(authUser?.nickname || authUser?.fullName || "");
	const [bio, setBio] = useState(authUser?.bio || "");
	
	// State for profile picture preview and file
	const [profilePicFile, setProfilePicFile] = useState(null);
	const [profilePicPreview, setProfilePicPreview] = useState(authUser?.profilePic || null);
	
	const fileInputRef = useRef(null);

	const handleImageChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			setProfilePicFile(file);
			// Create a preview URL
			const reader = new FileReader();
			reader.onloadend = () => {
				setProfilePicPreview(reader.result);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!nickname.trim()) {
			return toast.error("Nickname is required.");
		}
		
		setIsLoading(true);
		
		let profilePicDataUrl = null;
		
		// If a new file was selected, convert it to Data URL for Cloudinary
		if (profilePicFile) {
			profilePicDataUrl = profilePicPreview; // This is already a Data URL from FileReader
		}

		try {
			const res = await axiosInstance.post("/auth/setup-profile", {
				nickname,
				bio,
				// Only send profilePic if it's a new upload
				profilePic: profilePicDataUrl, 
			});

			// Update the global authUser state with the new, completed profile
			setAuthUser(res.data);
			
			// Also update localStorage
			localStorage.setItem("authUser", JSON.stringify(res.data));

			toast.success("Profile setup complete!");
			navigate("/"); // Navigate to the homepage
			
		} catch (error) {
			console.error("Profile setup error:", error);
			toast.error(error.response?.data?.message || "Failed to set up profile.");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-base-200 pt-16">
			<div className="w-full max-w-md p-8 space-y-6 bg-base-100 rounded-xl shadow-lg">
				<div className="text-center">
					<h1 className="text-3xl font-bold">Welcome!</h1>
					<p className="text-base-content/70">Let&#39;s set up your profile.</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Profile Picture Upload */}
					<div className="flex flex-col items-center">
						<div className="avatar relative w-32 h-32 rounded-full group">
							<img
								src={profilePicPreview || "/default-avatar.png"}
								alt="Profile Preview"
								className="w-32 h-32 rounded-full object-cover"
							/>
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
								aria-label="Change profile picture"
							>
								<Camera className="w-8 h-8 text-white" />
							</button>
						</div>
						<input
							type="file"
							ref={fileInputRef}
							onChange={handleImageChange}
							accept="image/png, image/jpeg, image/jpg"
							className="hidden"
						/>
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="btn btn-link btn-sm mt-2"
						>
							Upload Photo
						</button>
					</div>
					
					{/* Nickname */}
					<div className="form-control">
						<label className="label">
							<span className="label-text font-medium">Nickname (Display Name)</span>
						</label>
						<div className="relative">
							<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<User className="w-5 h-5 text-base-content/40" />
							</div>
							<input
								type="text"
								placeholder="Your display name"
								className="input input-bordered w-full pl-10"
								value={nickname}
								onChange={(e) => setNickname(e.target.value)}
								required
							/>
						</div>
					</div>

					{/* Bio */}
					<div className="form-control">
						<label className="label">
							<span className="label-text font-medium">Bio (Optional)</span>
						</label>
						<div className="relative">
							<div className="absolute top-3 left-0 pl-3 flex items-center pointer-events-none">
								<FileText className="w-5 h-5 text-base-content/40" />
							</div>
							<textarea
								placeholder="Tell everyone a little about yourself..."
								className="textarea textarea-bordered w-full pl-10 h-24"
								value={bio}
								onChange={(e) => setBio(e.target.value)}
								maxLength={150}
							/>
							<span className="absolute bottom-2 right-3 text-xs text-base-content/50">
								{bio.length} / 150
							</span>
						</div>
					</div>
					
					{/* Submit Button */}
					<button
						type="submit"
						className="btn btn-primary w-full"
						disabled={isLoading}
					>
						{isLoading ? (
							<Loader2 className="w-6 h-6 animate-spin" />
						) : (
							"Save and Continue"
						)}
					</button>
				</form>
			</div>
		</div>
	);
};

export default SetupProfilePage;