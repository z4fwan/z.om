// src/hooks/useSocketHandler.js
import { useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:5001", {
  withCredentials: true,
});

export const useSocketHandler = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?._id) return;

    // Join the socket room for the user
    socket.emit("register-user", user._id); // ✅ match backend


    // Listen for admin actions
    socket.on("user-action", ({ type, reason, until }) => {
      switch (type) {
        case "suspended":
          toast.error(`Suspended until ${new Date(until).toLocaleString()} — ${reason}`);
          logout();
          navigate("/suspended");
          break;

        case "blocked":
          toast.error("Blocked by admin.");
          logout();
          navigate("/blocked");
          break;

        case "deleted":
          toast.error("Your account has been deleted.");
          logout();
          navigate("/goodbye");
          break;

        case "unsuspended":
          toast.success("Suspension lifted. Please log in.");
          break;

        case "unblocked":
          toast.success("You have been unblocked. Please log in.");
          break;

        default:
          break;
      }
    });

    return () => {
      socket.off("user-action");
    };
  }, [user?._id, logout, navigate]);
};
