import axios from "axios";

// Get the base URL from the environment variable (e.g., https://z-om-backend-4bod.onrender.com)
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// Check if the environment variable is set in production
if (!apiBaseUrl && import.meta.env.PROD) {
  console.error("VITE_API_BASE_URL is not defined in the environment!");
  // Consider throwing an error or setting a default that will clearly fail
}

export const axiosInstance = axios.create({
  // Use the environment variable + /api for production, fallback to localhost for development
  baseURL: import.meta.env.PROD
    ? `${apiBaseUrl}/api` // ✅ ADDED /api prefix here
    : "http://localhost:5001/api", // Development URL already includes /api
  withCredentials: true, // Send cookies with requests
});

// Optional: Add request/response interceptors if needed
axiosInstance.interceptors.response.use(
  (response) => response, // Simply return successful responses
  (error) => {
    // Log detailed error information
    console.error("API Error:", {
        message: error.message,
        // config: error.config, // Request config can be verbose, uncomment if needed
        status: error.response?.status, // Response status
        response: error.response?.data // Response data if available
    });
    // Reject the promise so downstream `.catch()` blocks can handle it
    return Promise.reject(error);
  }
);
