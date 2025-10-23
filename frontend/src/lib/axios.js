import axios from "axios";

// Get the base URL from the environment variable set during the build process
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// Check if the environment variable is set, otherwise fall back or throw error
if (!apiBaseUrl && import.meta.env.PROD) { // Only error in production
  console.error("VITE_API_BASE_URL is not defined in the environment!");
  // Depending on your setup, you might want to throw an error
  // or default to a non-functional URL to make the error obvious.
}

export const axiosInstance = axios.create({
  // Use the environment variable for production, fallback to localhost for development
  baseURL: import.meta.env.PROD // Vite uses 'PROD' for production builds
    ? apiBaseUrl // Use the variable read from .env (provided by Render)
    : "http://localhost:5001/api", // Use localhost for development (npm run dev)
  withCredentials: true, // Send cookies with requests
});

// Optional: Add request/response interceptors if needed
axiosInstance.interceptors.response.use(
  (response) => response, // Simply return successful responses
  (error) => {
    // Log detailed error information
    console.error("API Error:", {
        message: error.message,
        config: error.config, // Request config
        response: error.response?.data // Response data if available
    });
    // Reject the promise so downstream `.catch()` blocks can handle it
    return Promise.reject(error);
  }
);
