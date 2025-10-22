import axios from "axios";

export const axiosInstance = axios.create({
  baseURL:
    import.meta.env.MODE === "development"
      ? "http://localhost:5001/api"
      : "https://z-app-6w36.onrender.com/api", // <-- your backend Render URL
  withCredentials: true,
});
