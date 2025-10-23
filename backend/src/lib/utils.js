import jwt from "jsonwebtoken";

export const generateToken = (userId, res) => {
	const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
		expiresIn: "7d",
	});

	// ✅ This code works for BOTH production and local development
	res.cookie("jwt", token, {
		maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
		httpOnly: true, // prevent XSS
		
		// Set 'secure' to true only in production (when NODE_ENV is 'production')
		secure: process.env.NODE_ENV === "production", 
		
		// Set 'sameSite' to 'none' in production (for cross-site) 
		// and 'strict' in development
		sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", 
		
		path: "/",
	});

	return token;
};
