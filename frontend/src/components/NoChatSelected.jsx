const NoChatSelected = () => {
  return (
    // Hidden on small screens, block on medium (desktop) screens
    <div className="hidden md:flex w-full flex-1 flex-col items-center justify-center p-6 bg-base-100/50">
      <div className="max-w-md text-center space-y-6">
        <div className="flex justify-center gap-4 mb-4">
          <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center animate-bounce">
            <img src="/z-app-logo.png" alt="Z-APP Logo" className="w-12 h-12 object-contain" />
          </div>
        </div>

        <h2 className="text-2xl font-bold">Welcome to Z-APP!</h2>
        <p className="text-base-content/60">
          Select a conversation from the sidebar to start chatting
        </p>
      </div>
    </div>
  );
};

export default NoChatSelected;
