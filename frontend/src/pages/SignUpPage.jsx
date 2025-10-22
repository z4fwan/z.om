import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import {
	Eye,
	EyeOff,
	Loader2,
	Lock,
	Mail,
	MessageSquare,
	User,
	AtSign, // ✅ Added AtSign icon
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import AuthImagePattern from "../components/AuthImagePattern";
import toast from "react-hot-toast";

const SignUpPage = () => {
	const navigate = useNavigate();
	const [showPassword, setShowPassword] = useState(false);
	const [formData, setFormData] = useState({
		fullName: "",
		username: "", // ✅ Added username to state
		email: "",
		password: "",
	});

	const { signup, isSigningUp } = useAuthStore();

	const validateForm = () => {
		if (!formData.fullName.trim()) return toast.error("Full name is required");

		// ✅ Added username validation
		if (!formData.username.trim()) return toast.error("Username is required");
		if (formData.username.length < 3)
			return toast.error("Username must be at least 3 characters");
		if (!/^[a-zA-Z0-9_.]+$/.test(formData.username))
			return toast.error(
				"Username can only contain letters, numbers, underscores, and periods."
			);

		if (!formData.email.trim()) return toast.error("Email is required");
		if (!/\S+@\S+\.\S+/.test(formData.email))
			return toast.error("Invalid email format");
		if (!formData.password) return toast.error("Password is required");
		if (formData.password.length < 6)
			return toast.error("Password must be at least 6 characters");
		return true;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		const isValid = validateForm();
		if (isValid === true) {
			// ✅ Send username as lowercase to match backend logic
			const dataToSend = {
				...formData,
				username: formData.username.toLowerCase(),
			};
			const success = await signup(dataToSend);
			if (success) navigate("/");
		}
	};

	return (
		<div className="min-h-screen grid lg:grid-cols-2">
			{/* Left Side */}
			<div className="flex flex-col justify-center items-center px-4 py-8 sm:px-8 lg:px-12">
				<div className="w-full max-w-md space-y-8">
					{/* Logo / Heading */}
					<div className="text-center mb-6 sm:mb-8">
						<div className="flex flex-col items-center gap-2 group">
							<div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
								<MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
							</div>
							<h1 className="text-xl sm:text-2xl font-bold mt-2">Create Account</h1>
							<p className="text-sm sm:text-base text-base-content/60">
								Get started with your free account
							</p>
						</div>
					</div>

					{/* Form */}
					<form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
						{/* Full Name */}
						<div className="form-control">
							<label className="label">
								<span className="label-text font-medium">Full Name</span>
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<User className="w-5 h-5 text-base-content/40" />
								</div>
								<input
									type="text"
									className="input input-bordered w-full pl-10"
									placeholder="Full Name"
									value={formData.fullName}
									onChange={(e) =>
										setFormData({ ...formData, fullName: e.target.value })
									}
								/>
							</div>
						</div>

						{/* ✅ START: New Username Field */}
						<div className="form-control">
							<label className="label">
								<span className="label-text font-medium">Username</span>
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<AtSign className="w-5 h-5 text-base-content/40" />
								</div>
								<input
									type="text"
									className="input input-bordered w-full pl-10"
									placeholder="your_unique_username"
									value={formData.username}
									onChange={(e) =>
										setFormData({ ...formData, username: e.target.value })
									}
								/>
							</div>
						</div>
						{/* ✅ END: New Username Field */}

						{/* Email */}
						<div className="form-control">
							<label className="label">
								<span className="label-text font-medium">Email</span>
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<Mail className="w-5 h-5 text-base-content/40" />
								</div>
								<input
									type="email"
									className="input input-bordered w-full pl-10"
									placeholder="example@gmail.com"
									value={formData.email}
									onChange={(e) =>
										setFormData({ ...formData, email: e.target.value })
									}
								/>
							</div>
						</div>

						{/* Password */}
						<div className="form-control">
							<label className="label">
								<span className="label-text font-medium">Password</span>
							</label>
							<div className="relative">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<Lock className="w-5 h-5 text-base-content/40" />
								</div>
								<input
									type={showPassword ? "text" : "password"}
									className="input input-bordered w-full pl-10"
									placeholder="Password"
									value={formData.password}
									onChange={(e) =>
										setFormData({ ...formData, password: e.target.value })
									}
								/>
								<button
									type="button"
									className="absolute inset-y-0 right-0 pr-3 flex items-center"
									onClick={() => setShowPassword(!showPassword)}
								>
									{showPassword ? (
										<EyeOff className="w-5 h-5 text-base-content/40" />
									) : (
										<Eye className="w-5 h-5 text-base-content/40" />
									)}
								</button>
							</div>
						</div>

						{/* Submit */}
						<button
							type="submit"
							className="btn btn-primary w-full text-sm sm:text-base py-2 sm:py-3"
							disabled={isSigningUp}
						>
							{isSigningUp ? (
								<>
									<Loader2 className="w-5 h-5 animate-spin" />
									Loading...
								</>
							) : (
								"Create Account"
							)}
						</button>
					</form>

					{/* Already have account */}
					<div className="text-center text-sm sm:text-base">
						<p className="text-base-content/60">
							Already have an account?{" "}
							<Link to="/login" className="link link-primary">
								Sign in
							</Link>
						</p>
					</div>
				</div>
			</div>

			{/* Right Side - Image */}
			<AuthImagePattern
				title="Join our community"
				subtitle="Connect with friends, share moments, and stay in touch with your loved ones."
			/>
		</div>
	);
};

export default SignUpPage;