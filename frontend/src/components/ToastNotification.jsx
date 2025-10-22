// src/components/ToastNotification.jsx
import { toast } from "react-hot-toast";

// Function to show the toast
export const showMessageToast = ({ senderName, senderAvatar, messageText, theme }) => {
  toast.custom(
    (t) => (
      <div
        className={`flex items-center gap-3 p-3 rounded-xl shadow-lg transition-all duration-300
          ${theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-900"}
          ${t.visible ? "opacity-100" : "opacity-0"} 
        `}
      >
        {/* Profile Picture */}
        <img
          src={senderAvatar}
          alt={senderName}
          className="w-10 h-10 rounded-full object-cover border border-gray-300"
        />
        <div className="flex flex-col max-w-[200px]">
          <span className="font-semibold truncate">{senderName}</span>
          <span className="text-sm opacity-80 truncate">{messageText}</span>
        </div>
      </div>
    ),
    {
      id: `msg-${Date.now()}`,
      duration: 4000,
    }
  );
};
