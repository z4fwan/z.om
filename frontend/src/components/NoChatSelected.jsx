const NoChatSelected = () => {
  return (
    <div className="w-full flex-1 flex flex-col items-center justify-center p-8 md:p-6 bg-base-100/50">
      <div className="max-w-md text-center space-y-6 md:space-y-4 px-4">
        <div className="flex justify-center gap-4 mb-6 md:mb-4">
          <div className="w-32 h-32 md:w-24 md:h-24 rounded-2xl bg-primary/10 flex items-center justify-center animate-bounce">
            <img 
              src="/z-app-logo.png" 
              alt="Z-APP Logo" 
              className="w-16 h-16 md:w-12 md:h-12 object-contain" 
            />
          </div>
        </div>

        <h2 className="text-3xl md:text-2xl font-bold">Welcome to Z-APP!</h2>
        <p className="text-base md:text-sm text-base-content/60 leading-relaxed">
          Select a conversation from the sidebar to start chatting
        </p>
      </div>
    </div>
  );
};

export default NoChatSelected;
