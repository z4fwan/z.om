import { useChatStore } from "../store/useChatStore";

import Sidebar from "../components/Sidebar";
import NoChatSelected from "../components/NoChatSelected";
import ChatContainer from "../components/ChatContainer";

const HomePage = () => {
  const { selectedUser } = useChatStore();

  return (
    // 1. Outer Container: Sets the background and ensures the content is centered and takes the full viewport height.
    <div className="h-screen bg-base-200 flex items-center justify-center">
      
      {/* 2. Main Chat Wrapper: Takes full width/height of the available space, constrained by max-w-6xl. 
          Using h-full or max-h-[95vh] instead of complex calc ensures height stability. */}
      <div className="bg-base-100 rounded-lg shadow-cl w-full max-w-6xl h-full md:max-h-[95vh]">
        
        {/* 3. Inner Flex Container: Critical for placing Sidebar and Chat side-by-side (flex) 
           and making them fill the vertical space (h-full). */}
        <div className="flex h-full rounded-lg overflow-hidden">
          
          {/* Sidebar: Now receives a stable height from the parent, allowing its internal list scroll (flex-grow overflow-y-auto) to work correctly. */}
          <Sidebar />

          {/* Chat area */}
          {selectedUser ? <ChatContainer /> : <NoChatSelected />}
        </div>
      </div>
    </div>
  );
};
export default HomePage;
