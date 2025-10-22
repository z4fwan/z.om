import { useThemeStore } from "../store/useThemeStore";

const DeveloperLogo = () => {
  const { theme } = useThemeStore();

  const getTint = () => {
    switch (theme) {
      case "dark":
        return "#FFD700"; // Gold
      case "light":
        return "#000000"; // Black
      case "dracula":
        return "#BD93F9"; // Dracula violet
      default:
        return "#ffffff";
    }
  };

  return (
    <a
      href="https://your-site.com" // Replace with your real link
      target="_blank"
      rel="noopener noreferrer"
      title="Made by ZN4STUDIO"
      className="fixed bottom-2 right-2 z-50 opacity-70 hover:opacity-100 transition-opacity hidden sm:block"
    >
      <img
        src="/logoogoogo.png" // Must be in frontend/public/
        alt="ZN4STUDIO Logo"
        className="w-12 h-12"
        style={{
          filter: `brightness(0) saturate(100%) invert(1) sepia(1) hue-rotate(180deg) drop-shadow(0 0 4px ${getTint()})`,
        }}
      />
    </a>
  );
};

export default DeveloperLogo;
