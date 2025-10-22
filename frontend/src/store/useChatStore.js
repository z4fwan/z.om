import { create } from "zustand";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios"; // Keep axiosInstance for getMessages/sendMessage
import { useAuthStore } from "./useAuthStore"; // Auth store needed for socket & user info

export const useChatStore = create((set, get) => ({
    // --- Existing Chat State ---
    messages: [],
    selectedUser: null, // User object for the currently selected chat partner
    isMessagesLoading: false,
    unreadCounts: {},

    // --- NEW: Call State ---
    callState: "idle", // 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'connected'
    callPartner: null, // User object of the person in the call (callerInfo or acceptorInfo)
    callType: null, // 'audio' | 'video'
    incomingCallData: null, // Stores { callerId, callerInfo, callType } for incoming calls
    isMuted: false,
    isCameraOff: false,
    // --- End Call State ---

    // --- Existing Chat Actions ---
    getMessages: async (userId) => {
        set({ isMessagesLoading: true, messages: [] }); // Clear previous messages
        try {
            const res = await axiosInstance.get(`/messages/${userId}`);
            set({ messages: res.data });
            get().resetUnread(userId); // reset unread when opening chat
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to fetch messages");
            set({ messages: [] }); // Clear messages on error
        } finally {
            set({ isMessagesLoading: false });
        }
    },

    sendMessage: async (messageData) => {
        const { selectedUser, messages } = get();
        if (!selectedUser) return; // Don't send if no user selected
        try {
            const res = await axiosInstance.post(`/messages/send/${selectedUser._id}`, messageData);
            // Append without creating duplicates, check message structure
             if (res.data && res.data._id && !messages.find((m) => m._id === res.data._id)) {
                 set({ messages: [...messages, res.data] });
            } else if (res.data && !res.data._id) {
                 console.warn("Sent message response missing _id:", res.data);
                 // Handle potentially incomplete response if necessary
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send message");
        }
    },

    subscribeToMessages: () => {
        const { socket } = useAuthStore.getState(); // Get socket directly
        if (!socket) return;

        // Define handler separately
        const messageHandler = (newMessage) => {
            const { selectedUser, messages } = get(); // Get latest state inside handler

            // Prevent duplicate messages
            if (newMessage && newMessage._id && !messages.find((m) => m._id === newMessage._id)) {
                // Add message to state if it's for the selected user
                if (selectedUser && (newMessage.senderId === selectedUser._id || newMessage.receiverId === selectedUser._id)) {
                    set({ messages: [...messages, newMessage] });
                } else if (newMessage.senderId) { // Check if senderId exists before incrementing
                    // Increment unread count if chat not open
                    get().incrementUnread(newMessage.senderId);
                     // Optional: Show toast notification for new message
                     // const senderInfo = ? // Need a way to get sender info if not selectedUser
                     // toast(`New message from ${senderInfo?.nickname || 'someone'}`);
                }
            } else if (!newMessage || !newMessage._id) {
                 console.warn("Received invalid message object:", newMessage);
            }
        };

        socket.off("newMessage", messageHandler); // Remove previous listener first
        socket.on("newMessage", messageHandler); // Add the new listener
        console.log("Subscribed to newMessage events");
    },

    unsubscribeFromMessages: () => {
        const { socket } = useAuthStore.getState();
        if (!socket) return;
        socket.off("newMessage"); // Remove all listeners for 'newMessage'
        console.log("Unsubscribed from newMessage events");
    },

    setSelectedUser: (user) => { // Renamed param for clarity
        set({ selectedUser: user });
        if (user) {
            get().getMessages(user._id); // Fetch messages for the selected user
            // resetUnread is called within getMessages on success
        } else {
            set({ messages: [] }); // Clear messages when deselecting user
        }
    },

    incrementUnread: (userId) => set((state) => ({ unreadCounts: {...state.unreadCounts, [userId]: (state.unreadCounts[userId] || 0) + 1} })),
    resetUnread: (userId) => set((state) => { const updated = {...state.unreadCounts}; delete updated[userId]; return { unreadCounts: updated }; }),


    // --- NEW: Call Actions ---
    resetCallState: () => {
        set({
            callState: "idle",
            callPartner: null,
            callType: null,
            incomingCallData: null,
            isMuted: false,
            isCameraOff: false,
        });
        console.log("Call state reset to idle.");
        // WebRTC cleanup should be triggered in the component using this state
    },

    initiateCall: (partner, type) => {
        const { callState } = get();
        if (callState !== "idle") {
            // Allow initiating if connecting fails? Maybe reset first.
            // For now, prevent multiple outgoing calls.
            return toast.error("Already busy in another call attempt.");
        }
        const { authUser, socket } = useAuthStore.getState();
        if (!socket || !authUser || !partner || !partner._id) {
             console.error("Initiate call failed: Missing socket, authUser, or partner info.");
             return toast.error("Cannot initiate call. Connection error.");
        }

        set({
            callState: "outgoing",
            callPartner: partner,
            callType: type,
            isCameraOff: type === 'audio',
        });

        console.log(`Initiating ${type} call to ${partner.nickname || partner.username} (${partner._id})`);
        socket.emit("private:initiate-call", {
            receiverId: partner._id,
            callerInfo: {
                _id: authUser._id,
                nickname: authUser.nickname || authUser.username,
                profilePic: authUser.profilePic,
            },
            callType: type,
        });
    },

    acceptCall: () => {
        const { incomingCallData } = get();
        const { authUser, socket } = useAuthStore.getState();
        if (!incomingCallData || !socket || !authUser) {
             console.error("Accept call failed: Missing call data, socket, or authUser.");
             return;
        }

        console.log(`Accepting ${incomingCallData.callType} call from ${incomingCallData.callerInfo?.nickname}`);
        set({
            callState: "connecting", // Move to connecting
            callPartner: incomingCallData.callerInfo, // Caller is the partner
            callType: incomingCallData.callType,
            isCameraOff: incomingCallData.callType === 'audio',
            incomingCallData: null, // Clear incoming data
        });

        socket.emit("private:call-accepted", {
            callerId: incomingCallData.callerId,
            acceptorInfo: {
                _id: authUser._id,
                nickname: authUser.nickname || authUser.username,
                profilePic: authUser.profilePic,
            },
        });
        // WebRTC negotiation will now start, usually triggered by the CallModal component
    },

    rejectCall: (reason = 'declined') => {
        const { callState, incomingCallData, callPartner } = get();
        const { socket } = useAuthStore.getState();
        if (!socket) return;

        if (callState === "incoming" && incomingCallData) {
            console.log(`Rejecting incoming call from ${incomingCallData.callerInfo?.nickname}. Reason: ${reason}`);
            socket.emit("private:call-rejected", {
                callerId: incomingCallData.callerId,
                reason: reason,
            });
        } else if (callState === "outgoing" && callPartner) {
            console.log(`Cancelling outgoing call to ${callPartner.nickname || callPartner.username}`);
            socket.emit("private:end-call", { targetUserId: callPartner._id }); // Use end-call to notify
        }
        get().resetCallState(); // Reset state immediately
    },

    endCall: () => {
        const { callState, callPartner } = get();
        const { socket } = useAuthStore.getState();
        if (!socket || callState === 'idle') return;

        console.log(`Ending call with ${callPartner?.nickname || callPartner?.username || 'partner'}`);
        if (callPartner && (callState === 'connected' || callState === 'connecting' || callState === 'outgoing')) {
            socket.emit("private:end-call", { targetUserId: callPartner._id });
        }
        get().resetCallState(); // Reset state immediately
        // WebRTC cleanup should be triggered in the CallModal component
    },

    handleIncomingCall: (data) => {
        const { callState } = get(); // Check current call state
        const { socket } = useAuthStore.getState(); // Need socket to reject if busy

        if (callState !== "idle") {
            console.log(`Received incoming call from ${data.callerInfo?.nickname} but already busy (state: ${callState}). Rejecting.`);
            if(socket) {
                socket.emit("private:call-rejected", { callerId: data.callerId, reason: 'busy' });
            }
            return; // Ignore the incoming call further
        }
        console.log(`Incoming ${data.callType} call from ${data.callerInfo?.nickname}`);
        set({
            callState: "incoming",
            incomingCallData: data,
            callPartner: data.callerInfo, // Set partner info for UI
            callType: data.callType,
        });
        // Component listening to callState will show UI
    },

    handleCallAccepted: (data) => {
        const { callState } = get();
        if (callState !== "outgoing") {
             console.warn("Received call-accepted signal but wasn't in outgoing state.");
             return;
        }
        console.log(`Call accepted by ${data.acceptorInfo?.nickname}`);
        // Update partner info with acceptor details if needed, though usually caller initiated with partner info
        // set({ callPartner: data.acceptorInfo });
        set({ callState: "connecting" }); // Move to connecting, WebRTC starts
    },

    handleCallRejected: (data) => {
        const { callState, callPartner } = get();
        // Only act if we were the caller waiting for acceptance
        if (callState === "outgoing" && callPartner?._id === data.rejectorId) {
            console.log(`Call rejected by ${callPartner.nickname}. Reason: ${data.reason}`);
            toast.error(`Call ${data.reason || 'declined'} by user.`);
            get().resetCallState();
        } else {
             console.warn("Received call-rejected signal but wasn't the caller or partner mismatch.");
        }
    },

    handleCallEnded: (data) => { // data might contain { userId } of who ended
        const { callState, callPartner } = get();
        if (callState !== 'idle') {
            console.log(`Received signal: Call ended by ${data?.userId === callPartner?._id ? callPartner.nickname : 'partner'}.`);
            toast.info("Call ended.");
            get().resetCallState();
            // WebRTC cleanup should be triggered in the CallModal component
        }
    },

    toggleMute: () => { set((state) => ({ isMuted: !state.isMuted })); },
    toggleCamera: () => { set((state) => ({ isCameraOff: !state.isCameraOff })); },

    // --- NEW: Subscribe/Unsubscribe Call Events ---
    subscribeToCallEvents: () => {
        const { socket } = useAuthStore.getState();
        if (!socket) return;
        console.log("Subscribing to private call events");

        // Define handlers referencing `get()` to access current store state/actions
        const onIncomingCall = (data) => get().handleIncomingCall(data);
        const onCallAccepted = (data) => get().handleCallAccepted(data);
        const onCallRejected = (data) => get().handleCallRejected(data);
        const onCallEnded = (data) => get().handleCallEnded(data);

        // Remove previous listeners first to avoid duplicates
        socket.off("private:incoming-call", onIncomingCall);
        socket.off("private:call-accepted", onCallAccepted);
        socket.off("private:call-rejected", onCallRejected);
        socket.off("private:call-ended", onCallEnded);

        // Add new listeners
        socket.on("private:incoming-call", onIncomingCall);
        socket.on("private:call-accepted", onCallAccepted);
        socket.on("private:call-rejected", onCallRejected);
        socket.on("private:call-ended", onCallEnded);
    },

    unsubscribeFromCallEvents: () => {
        const { socket } = useAuthStore.getState();
        if (!socket) return;
        console.log("Unsubscribing from private call events");

        // Remove all listeners for these events
        socket.off("private:incoming-call");
        socket.off("private:call-accepted");
        socket.off("private:call-rejected");
        socket.off("private:call-ended");
    },

}));

// Auto-Subscription logic
// Using a flag to prevent multiple subscriptions if state updates rapidly
let subscribed = false;
useAuthStore.subscribe((state, prevState) => {
    const chatStore = useChatStore.getState();
    // Subscribe when socket becomes available and wasn't before
    if (state.socket && !prevState.socket && !subscribed) {
        console.log("AuthStore subscription: Socket connected, subscribing call events.");
        chatStore.subscribeToCallEvents();
        chatStore.subscribeToMessages(); // Also subscribe to messages here
        subscribed = true;
    }
    // Unsubscribe when socket becomes unavailable and was available before
    else if (!state.socket && prevState.socket && subscribed) {
        console.log("AuthStore subscription: Socket disconnected, unsubscribing call events.");
        chatStore.unsubscribeFromCallEvents();
        chatStore.unsubscribeFromMessages(); // Also unsubscribe from messages
        chatStore.resetCallState(); // Reset call state on logout/disconnect
        subscribed = false;
    }
});