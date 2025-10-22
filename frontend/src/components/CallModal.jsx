import { useEffect, useRef, useState, useCallback } from 'react';
import { useChatStore } from '../store/useChatStore';
import { useAuthStore } from '../store/useAuthStore';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Volume2, X, Phone, Loader2 } from 'lucide-react'; // Added Phone and Loader2
import toast from 'react-hot-toast';

const CallModal = () => {
    // --- Store State & Actions ---
    const {
        callState, callPartner, callType, incomingCallData,
        isMuted, isCameraOff, toggleMute, toggleCamera,
        acceptCall, rejectCall, endCall, resetCallState
    } = useChatStore();
    const { socket, authUser } = useAuthStore();

    // --- WebRTC Refs ---
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    const remoteStreamRef = useRef(null);
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const iceCandidateQueueRef = useRef([]);

    // --- Local State ---
    const [duration, setDuration] = useState(0);
    const timerRef = useRef(null);

    // --- Timer Logic ---
    useEffect(() => {
        if (callState === 'connected') {
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            clearInterval(timerRef.current);
            setDuration(0);
        }
        return () => clearInterval(timerRef.current);
    }, [callState]);

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    // --- WebRTC Cleanup ---
    const cleanupWebRTC = useCallback(() => {
        console.log("CallModal: Cleaning up WebRTC...");
        if (peerConnectionRef.current) {
            peerConnectionRef.current.getSenders().forEach(sender => sender.track?.stop());
            peerConnectionRef.current.onicecandidate = null;
            peerConnectionRef.current.ontrack = null;
            if (peerConnectionRef.current.signalingState !== 'closed') {
                try { peerConnectionRef.current.close(); } catch (e) { console.error("Error closing PC:", e); }
            }
            peerConnectionRef.current = null;
        }
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        if (remoteStreamRef.current) {
            remoteStreamRef.current.getTracks().forEach(track => track.stop());
            remoteStreamRef.current = null;
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        iceCandidateQueueRef.current = [];
        console.log("CallModal: WebRTC Cleanup finished.");
    }, []); // No dependencies needed

    // --- WebRTC Setup ---
    const createPeerConnection = useCallback(() => {
        console.log("CallModal: Creating PeerConnection");
        cleanupWebRTC(); // Ensure clean state before creating
        const servers = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }] };
        const pc = new RTCPeerConnection(servers);

        pc.onicecandidate = (event) => { if (event.candidate && socket && callPartner) { console.log("CallModal: Sending ICE candidate"); socket.emit("private:ice-candidate", { targetUserId: callPartner._id, candidate: event.candidate }); } };
        pc.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                console.log("CallModal: Received remote track");
                remoteStreamRef.current = event.streams[0];
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
                // Don't set state to connected here, let the store manage it via signals
            }
        };

        if (localStreamRef.current) {
            console.log("CallModal: Adding local tracks");
            localStreamRef.current.getTracks().forEach(track => {
                // Only add video track if callType is 'video' and camera isn't off
                if (track.kind === 'video' && (callType === 'audio' || isCameraOff)) {
                    track.enabled = false; // Keep track but disable it initially for audio call / camera off
                }
                 try { pc.addTrack(track, localStreamRef.current); } catch(e) { console.error("Error adding track:", e); }
            });
        }
        iceCandidateQueueRef.current = [];
        peerConnectionRef.current = pc;
        return pc;
    }, [socket, callPartner, callType, isCameraOff, cleanupWebRTC]); // Add dependencies

     // --- WebRTC Signaling Handlers ---
    const handleOffer = useCallback(async (callerId, sdp) => {
        if (!localStreamRef.current) { console.error("Cannot handle offer: local stream not ready."); return; }
        console.log("CallModal: Handling Offer");
        const pc = createPeerConnection();
        try {
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            if (socket) socket.emit("private:answer", { callerId, sdp: pc.localDescription });
            iceCandidateQueueRef.current.forEach(candidate => pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("Error adding queued ICE (offer):", e)));
            iceCandidateQueueRef.current = [];
        } catch (error) { console.error("Error handling offer:", error); cleanupWebRTC(); resetCallState(); }
    }, [createPeerConnection, socket, cleanupWebRTC, resetCallState]); // Add dependencies

    const handleAnswer = useCallback(async (sdp) => {
        const pc = peerConnectionRef.current;
        if (!pc || pc.signalingState !== 'have-local-offer') { console.warn(`CallModal: Ignoring Answer in state ${pc?.signalingState}`); return; }
        try {
            console.log("CallModal: Handling Answer");
            await pc.setRemoteDescription(new RTCSessionDescription(sdp));
            iceCandidateQueueRef.current.forEach(candidate => pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("Error adding queued ICE (answer):", e)));
            iceCandidateQueueRef.current = [];
        } catch (error) { console.error("Error handling answer:", error); cleanupWebRTC(); resetCallState(); }
    }, [cleanupWebRTC, resetCallState]); // Add dependencies

    const handleIceCandidate = useCallback(async (candidate) => {
        const pc = peerConnectionRef.current;
        try {
            if (!pc || !pc.remoteDescription || !pc.remoteDescription.type) { iceCandidateQueueRef.current.push(candidate); }
            else { await pc.addIceCandidate(new RTCIceCandidate(candidate)); }
        } catch (error) { console.error("Error adding ICE candidate:", error); }
    }, []); // No dependencies

    // --- Main useEffect for Call Setup & Socket Listeners ---
    useEffect(() => {
        if (callState === 'idle' || !socket || !callPartner) {
            cleanupWebRTC(); // Clean up if call ends or socket/partner missing
            return;
        }

        let isMounted = true;

        // Get Media -> Create PC -> Handle Signaling
        const setupCall = async () => {
             // 1. Get User Media
             if (!localStreamRef.current) {
                  try {
                       console.log("CallModal: Requesting media...");
                       const stream = await navigator.mediaDevices.getUserMedia({ video: callType === 'video', audio: true });
                       if (!isMounted) { stream.getTracks().forEach(t => t.stop()); return; }
                       localStreamRef.current = stream;
                       if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                       console.log("CallModal: Media obtained.");
                  } catch (err) {
                       console.error("Media error:", err); toast.error("Camera/Mic access denied.");
                       if (isMounted) endCall(); // End call attempt if media fails
                       return; // Stop setup if media failed
                  }
             }

             // 2. Create Peer Connection (if needed) and add tracks
             if (!peerConnectionRef.current) {
                  createPeerConnection(); // Creates PC and adds tracks based on current stream
             }

             // 3. Initiate Offer if we are the caller (state was 'outgoing' then 'connecting')
             if (callState === 'connecting' && incomingCallData === null) { // Check incomingCallData to infer if we are caller
                  const pc = peerConnectionRef.current;
                  if (pc && pc.signalingState === 'stable') { // Only create offer if stable
                      console.log("CallModal: Initiating Offer...");
                      pc.createOffer()
                        .then(offer => pc.setLocalDescription(offer))
                        .then(() => { if (socket && callPartner) socket.emit("private:offer", { receiverId: callPartner._id, sdp: pc.localDescription }); })
                        .catch(err => { console.error("Error creating offer:", err); cleanupWebRTC(); resetCallState(); });
                  }
             }
        };

        if (callState === 'connecting' || callState === 'connected') {
             setupCall();
        }

        // --- Socket Event Listeners for Signaling ---
        const onOffer = (data) => { if (isMounted && data.callerId === callPartner?._id) handleOffer(data.callerId, data.sdp); };
        const onAnswer = (data) => { if (isMounted && data.acceptorId === callPartner?._id) handleAnswer(data.sdp); };
        const onIceCandidate = (data) => { if (isMounted && data.senderId === callPartner?._id) handleIceCandidate(data.candidate); };

        socket.on("private:offer", onOffer);
        socket.on("private:answer", onAnswer);
        socket.on("private:ice-candidate", onIceCandidate);

        return () => {
            isMounted = false;
            console.log("CallModal: Detaching signaling listeners.");
            socket.off("private:offer", onOffer);
            socket.off("private:answer", onAnswer);
            socket.off("private:ice-candidate", onIceCandidate);
             // Cleanup WebRTC on state change away from connected/connecting, handled by main check
             if (callState !== 'connecting' && callState !== 'connected') {
                 cleanupWebRTC();
             }
        };
    // Re-run when call state or partner changes, or socket connects
    }, [callState, callPartner, socket, callType, incomingCallData, cleanupWebRTC, createPeerConnection, handleOffer, handleAnswer, handleIceCandidate, endCall, resetCallState]);


    // --- UI Event Handlers ---
    const handleToggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
            toggleMute(); // Update store state
        }
    };

    const handleToggleCamera = () => {
        if (localStreamRef.current && callType === 'video') {
            localStreamRef.current.getVideoTracks().forEach(track => { track.enabled = !isCameraOff; });
            toggleCamera(); // Update store state
        }
    };


    // --- Render Logic ---
    if (callState === 'idle') return null; // Don't render anything if no call

    const partnerName = callPartner?.nickname || callPartner?.username || incomingCallData?.callerInfo?.nickname || "Unknown User";
    const partnerAvatar = callPartner?.profilePic || incomingCallData?.callerInfo?.profilePic || "/default-avatar.png";

    // Show Incoming Call Prompt
    if (callState === 'incoming') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="bg-base-100 rounded-lg p-6 text-center shadow-xl max-w-sm w-full">
                    <div className="avatar mb-4">
                        <div className="w-24 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                            <img src={partnerAvatar} alt={partnerName} />
                        </div>
                    </div>
                    <h2 className="text-xl font-semibold mb-1">{partnerName}</h2>
                    <p className="text-base-content/70 mb-6">Incoming {callType} call...</p>
                    <div className="flex justify-center gap-4">
                        <button className="btn btn-error btn-circle btn-lg" onClick={() => rejectCall('declined')}>
                            <PhoneOff />
                        </button>
                        <button className="btn btn-success btn-circle btn-lg" onClick={acceptCall}>
                            {callType === 'video' ? <Video /> : <Phone />}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Show Outgoing/Connecting/Connected Call UI
    return (
        <div className="fixed inset-0 z-40 bg-base-300 flex flex-col">
            {/* Header (Optional Close Button) */}
             <div className="absolute top-2 right-2 z-50">
                 <button className="btn btn-ghost btn-circle btn-sm text-base-content/50 hover:bg-base-100/20" onClick={endCall}>
                     <X size={20}/>
                 </button>
             </div>

            {/* Video Feeds */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                {/* Remote Video (Background) */}
                <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover bg-black" />

                 {/* Status Overlay */}
                 {(callState === 'outgoing' || callState === 'connecting') && (
                     <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2 bg-black/50 z-20">
                         <div className="avatar mb-2">
                             <div className="w-16 rounded-full ring ring-primary/50">
                                 <img src={partnerAvatar} alt={partnerName} />
                             </div>
                         </div>
                         <p>{callState === 'outgoing' ? `Calling ${partnerName}...` : `Connecting...`}</p>
                         <Loader2 className="animate-spin" />
                     </div>
                 )}

                 {/* Call Duration */}
                 {callState === 'connected' && (
                     <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/30 text-white px-3 py-1 rounded-full text-sm z-20">
                         {formatDuration(duration)}
                     </div>
                 )}

                {/* Local Video (Picture-in-Picture style) */}
                <div className={`absolute bottom-4 right-4 w-24 md:w-32 lg:w-40 aspect-video bg-black rounded-md overflow-hidden border-2 border-base-100 shadow-lg z-30 ${callType === 'audio' ? 'hidden' : ''}`}>
                    <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : 'block'}`} />
                     {/* Show avatar if camera is off during video call */}
                     {isCameraOff && callType === 'video' && authUser && (
                         <div className="w-full h-full flex items-center justify-center bg-base-200">
                              <div className="avatar placeholder">
                                  <div className="bg-neutral text-neutral-content rounded-full w-12 md:w-16">
                                      <span className="text-xl md:text-3xl">{authUser?.nickname?.charAt(0) || authUser?.username?.charAt(0) || '?'}</span>
                                  </div>
                              </div>
                         </div>
                     )}
                </div>
            </div>

            {/* Controls Footer */}
            <div className="bg-base-200/80 backdrop-blur-sm p-3 flex justify-center items-center gap-3 z-40">
                <button className={`btn btn-circle ${isMuted ? 'btn-neutral' : 'btn-ghost'}`} onClick={handleToggleMute}>
                    {isMuted ? <MicOff /> : <Mic />}
                </button>
                {callType === 'video' && (
                     <button className={`btn btn-circle ${isCameraOff ? 'btn-neutral' : 'btn-ghost'}`} onClick={handleToggleCamera}>
                         {isCameraOff ? <VideoOff /> : <Video />}
                     </button>
                 )}
                 {/* Volume control might need libraries like webrtc-adapter for full control, placeholder */}
                 <button className="btn btn-ghost btn-circle hidden md:inline-flex">
                     <Volume2 />
                 </button>
                <button className="btn btn-error btn-circle btn-lg mx-4" onClick={endCall}>
                    <PhoneOff />
                </button>
            </div>
        </div>
    );
};

export default CallModal;