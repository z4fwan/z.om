import { useChatStore } from "../store/useChatStore";
import { useAuthStore } from "../store/useAuthStore";
import { useEffect, useRef } from "react";

import ChatHeader from "./ChatHeader";
import MessageInput from "./MessageInput";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages = [],
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
  } = useChatStore();

  const { authUser } = useAuthStore();
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!selectedUser?._id) return;
    getMessages?.(selectedUser._id);
    const unsub = subscribeToMessages?.(selectedUser._id);
    return () => typeof unsub === "function" && unsub();
  }, [selectedUser?._id, getMessages, subscribeToMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h2 className="text-2xl font-bold">Welcome to Z-APP</h2>
          <p className="text-zinc-500 mt-2">
            Select a conversation to start messaging.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full w-full">
      <ChatHeader />
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-base-100">
        {isMessagesLoading ? (
          <MessageSkeleton />
        ) : messages.length === 0 ? (
          <div className="text-center text-zinc-500 mt-8">
            No messages yet — say hello 👋
          </div>
        ) : (
          messages.map((message) => {
            const mine = message.senderId === authUser?._id;
            return (
              <div
                key={message._id || message.id}
                className={`flex flex-col ${mine ? "items-end" : "items-start"}`}
              >
                <div className="flex items-end max-w-[80%]">
                  {!mine && (
                    <div className="w-8 h-8 rounded-full overflow-hidden border mr-2">
                      <img
                        src={mine ? authUser.profilePic : selectedUser.profilePic}
                        alt="avatar"
                      />
                    </div>
                  )}
                  <div
                    className={`relative px-3 py-2 text-sm rounded-2xl ${
                      mine
                        ? "bg-primary text-primary-content bubble-right"
                        : "bg-base-200 text-base-content bubble-left"
                    }`}
                  >
                    {message.image && (
                      <img
                        src={message.image}
                        className="rounded-md mb-2 max-h-60 object-cover"
                        alt="attached"
                      />
                    )}
                    {message.text && (
                      <div className="whitespace-pre-wrap">{message.text}</div>
                    )}
                  </div>
                </div>
                <span className="text-[11px] text-zinc-400 mt-1">
                  {formatMessageTime(message.createdAt)}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="border-t border-base-300 p-3">
        <MessageInput />
      </div>

      <style>{`
        .bubble-left::after {
          content: "";
          position: absolute;
          left: -6px;
          bottom: 4px;
          border-top: 6px solid transparent;
          border-right: 6px solid var(--b2);
          border-bottom: 6px solid transparent;
        }
        .bubble-right::after {
          content: "";
          position: absolute;
          right: -6px;
          bottom: 4px;
          border-top: 6px solid transparent;
          border-left: 6px solid var(--p);
          border-bottom: 6px solid transparent;
        }
      `}</style>
    </div>
  );
};

export default ChatContainer;
