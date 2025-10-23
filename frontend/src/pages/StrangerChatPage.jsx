import { useEffect, useState, useRef, useCallback } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { useFriendStore } from "../store/useFriendStore";
import toast from "react-hot-toast";
import {
	PhoneOff,
	Send,
	UserPlus,
	SkipForward,
	Loader2,
	MessageSquare,
	AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const REPORT_REASONS = [
	"Nudity or Sexual Content",
	"Harassment or Hate Speech",
	"Spam or Scams",
	"Threatening Behavior",
	"Underage User",
	"Other",
];

// --- Report Modal Component ---
const ReportModal = ({ isOpen, onClose, onSubmit, screenshotPreview, isSubmitting }) => {
	const [reason, setReason] = useState("");
	useEffect(() => { if (isOpen) setReason(""); }, [isOpen]);
	if (!isOpen) return null;
	
	const handleSubmit = (e) => {
		e.preventDefault();
		if (!reason) { toast.error("Please select a reason."); return; }
		onSubmit(reason);
	};

	return (
		<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div className="bg-base-100 p-6 rounded-lg shadow-xl w-full max-w-md">
				<h2 className="text-xl font-bold mb-4">Report User</h2>
				<p className="text-sm mb-4 text-base-content/80">A screenshot will be sent for review.</p>
				{screenshotPreview && (
					<div className="mb-4 border border-base-300 rounded overflow-hidden">
						<img src={screenshotPreview} alt="Report Screenshot" className="max-h-40 w-full object-contain bg-black" />
					</div>
				)}
				<form onSubmit={handleSubmit}>
					<div className="form-control mb-4">
						<label className="label"><span className="label-text">Reason:</span></label>
						<select className="select select-bordered w-full" value={reason} onChange={(e) => setReason(e.target.value)} required>
							<option value="" disabled>Select a reason</option>
							{REPORT_REASONS.map((r) => (<option key={r} value={r}>{r}</option>))}
						</select>
					</div>
					<div className="flex justify-end gap-3 mt-6">
						<button type="button" className="btn btn-ghost" onClick={onClose} disabled={isSubmitting}>Cancel</button>
						<button type="submit" className="btn btn-error" disabled={isSubmitting || !reason}>
							{isSubmitting ? <Loader2 className="animate-spin" /> : "Submit Report"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

// --- Stranger Chat Page Component ---
const StrangerChatPage = () => {
	const { authUser, socket } = useAuthStore();
	const { getFriendshipStatus } = useFriendStore();
	const navigate = useNavigate();

	const [status, setStatus] = useState("idle");
	const [tempMessages, setTempMessages] = useState([]);
	const [currentMessage, setCurrentMessage] = useState("");
	const [friendStatus, setFriendStatus] = useState("NOT_FRIENDS");
	const [isReportModalOpen, setIsReportModalOpen] = useState(false);
	const [reportScreenshot, setReportScreenshot] = useState(null);
	const [isSubmittingReport, setIsSubmittingReport] = useState(false);

	const peerConnectionRef = useRef(null);
	const localStreamRef = useRef(null);
	const remoteStreamRef = useRef(null);
	const localVideoRef = useRef(null);
	const remoteVideoRef = useRef(null);
	const iceCandidateQueueRef = useRef([]);

	const addMessage = useCallback((sender, message) => {
		setTempMessages((prev) => [...prev, { sender, message }]);
	}, []);

	// --- WebRTC helper functions (unchanged from yours) ---
	const createPeerConnection = useCallback(() => {
		console.log("WebRTC: Creating PeerConnection");
		const pc = new RTCPeerConnection({
			iceServers: [
				{ urls: "stun:stun.l.google.com:19302" },
				{ urls: "stun:stun1.l.google.com:19302" }
			]
		});

		pc.onicecandidate = (e) => {
			if (e.candidate && socket) {
				socket.emit("webrtc:ice-candidate", { candidate: e.candidate });
			}
		};

		pc.ontrack = (e) => {
			if (e.streams && e.streams[0]) {
				console.log("WebRTC: Received remote track");
				remoteStreamRef.current = e.streams[0];
				if (remoteVideoRef.current) {
					remoteVideoRef.current.srcObject = e.streams[0];
				}
			}
		};

		if (localStreamRef.current) {
			localStreamRef.current.getTracks().forEach((track) => {
				pc.addTrack(track, localStreamRef.current);
			});
		}

		peerConnectionRef.current = pc;
		iceCandidateQueueRef.current = [];
		return pc;
	}, [socket]);

	const startCall = useCallback(async () => {
		console.log("WebRTC: Starting call as initiator");
		if (!localStreamRef.current) {
			console.error("No local stream!");
			return;
		}

		try {
			const pc = createPeerConnection();
			const offer = await pc.createOffer();
			await pc.setLocalDescription(offer);
			console.log("WebRTC: Sending offer");
			socket.emit("webrtc:offer", { sdp: offer });
		} catch (err) {
			console.error("Error creating offer:", err);
		}
	}, [createPeerConnection, socket]);

	const handleOffer = useCallback(async (sdp) => {
		console.log("WebRTC: Received offer, creating answer");
		if (!localStreamRef.current) {
			console.error("No local stream for answer!");
			return;
		}

		try {
			const pc = createPeerConnection();
			await pc.setRemoteDescription(new RTCSessionDescription(sdp));
			const answer = await pc.createAnswer();
			await pc.setLocalDescription(answer);
			console.log("WebRTC: Sending answer");
			socket.emit("webrtc:answer", { sdp: answer });

			// Process queued ICE candidates
			iceCandidateQueueRef.current.forEach(candidate => {
				pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("ICE error:", e));
			});
			iceCandidateQueueRef.current = [];
		} catch (err) {
			console.error("Error handling offer:", err);
		}
	}, [createPeerConnection, socket]);

	const handleAnswer = useCallback(async (sdp) => {
		console.log("WebRTC: Received answer");
		const pc = peerConnectionRef.current;
		if (!pc) return;

		try {
			await pc.setRemoteDescription(new RTCSessionDescription(sdp));
			iceCandidateQueueRef.current.forEach(candidate => {
				pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("ICE error:", e));
			});
			iceCandidateQueueRef.current = [];
		} catch (err) {
			console.error("Error handling answer:", err);
		}
	}, []);

	const handleIceCandidate = useCallback(async (candidate) => {
		if (!candidate) return;
		const pc = peerConnectionRef.current;

		if (!pc || !pc.remoteDescription) {
			iceCandidateQueueRef.current.push(candidate);
		} else {
			try {
				await pc.addIceCandidate(new RTCIceCandidate(candidate));
			} catch (err) {
				console.error("Error adding ICE candidate:", err);
			}
		}
	}, []);

	const closeConnection = useCallback(() => {
		console.log("WebRTC: Closing connection");
		if (peerConnectionRef.current) {
			peerConnectionRef.current.close();
			peerConnectionRef.current = null;
		}
		if (remoteStreamRef.current) {
			remoteStreamRef.current.getTracks().forEach(t => t.stop());
			remoteStreamRef.current = null;
		}
		if (remoteVideoRef.current) {
			remoteVideoRef.current.srcObject = null;
		}
		setTempMessages([]);
		setFriendStatus("NOT_FRIENDS");
		iceCandidateQueueRef.current = [];
	}, []);

	// --- Main Socket Effect ---
	useEffect(() => {
		if (!socket || !authUser) {
			toast.error("Connection error.");
			navigate("/");
			return;
		}

		let isMounted = true;
		let hasJoinedQueue = false;

		navigator.mediaDevices.getUserMedia({ video: true, audio: true })
			.then((stream) => {
				if (!isMounted) {
					stream.getTracks().forEach(t => t.stop());
					return;
				}
				
				localStreamRef.current = stream;
				if (localVideoRef.current) {
					localVideoRef.current.srcObject = stream;
				}
				
				setStatus("waiting");
				
				if (!hasJoinedQueue) {
					socket.emit("stranger:joinQueue", { userId: authUser._id });
					hasJoinedQueue = true;
				}
			})
			.catch((err) => {
				console.error("Media error:", err);
				toast.error("Camera/Mic access denied.");
				navigate("/");
			});

		const onWaiting = () => {
			if (isMounted) setStatus("waiting");
		};

		const onMatched = (data) => {
			console.log("Socket: matched with", data.partnerId);
			if (isMounted) {
				addMessage("System", "Partner found!");
				setStatus("connected");
				
				const shouldInitiate = socket.id < data.partnerId;
				console.log(`Should I initiate? ${shouldInitiate}`);
				
				if (shouldInitiate) {
					setTimeout(() => startCall(), 1000);
				}
			}
		};

		const onDisconnected = () => {
			if (isMounted) {
				addMessage("System", "Partner disconnected.");
				closeConnection();
				setStatus("waiting");
				socket.emit("stranger:joinQueue", { userId: authUser._id });
			}
		};

		const onChatMessage = (payload) => {
			if (isMounted) addMessage("Stranger", payload.message);
		};

		// --- UPDATED: handle incoming friend request from partner ---
		const onFriendRequest = (data) => {
			if (isMounted) {
				toast.success("Stranger sent you a friend request!");
				// update button/UI so the receiver knows a request arrived
				setFriendStatus("REQUEST_RECEIVED");
			}
		};

		// --- NEW: confirm to sender that request was created server-side ---
		const onFriendRequestSent = (data) => {
			if (isMounted) {
				toast.success("Friend request sent!");
				setFriendStatus("REQUEST_SENT");
			}
		};

		const onOffer = (payload) => {
			console.log("Socket: received offer");
			if (isMounted) handleOffer(payload.sdp);
		};

		const onAnswer = (payload) => {
			console.log("Socket: received answer");
			if (isMounted) handleAnswer(payload.sdp);
		};

		const onIce = (payload) => {
			if (isMounted) handleIceCandidate(payload.candidate);
		};

        // --- *** ADDED/FIXED LISTENERS *** ---
        const onAddFriendError = ({ error }) => {
            if (isMounted) {
                toast.error(error);
                setFriendStatus("NOT_FRIENDS"); // Reset the button
            }
        };

        const onReportSuccess = ({ message }) => {
            if (isMounted) {
                toast.success(message);
                setIsSubmittingReport(false);
                setIsReportModalOpen(false);
            }
        };

        const onReportError = ({ error }) => {
            if (isMounted) {
                toast.error(error);
                setIsSubmittingReport(false);
            }
        };

        socket.on("stranger:addFriendError", onAddFriendError);
        socket.on("stranger:reportSuccess", onReportSuccess);
        socket.on("stranger:reportError", onReportError);
        // --- *** END OF ADDED/FIXED LISTENERS *** ---

		socket.on("stranger:waiting", onWaiting);
		socket.on("stranger:matched", onMatched);
		socket.on("stranger:disconnected", onDisconnected);
		socket.on("stranger:chatMessage", onChatMessage);
		socket.on("stranger:friendRequest", onFriendRequest);
		socket.on("stranger:friendRequestSent", onFriendRequestSent); // <-- new listener
		socket.on("webrtc:offer", onOffer);
		socket.on("webrtc:answer", onAnswer);
		socket.on("webrtc:ice-candidate", onIce);

		return () => {
			isMounted = false;
			setStatus("idle");
			
			if (localStreamRef.current) {
				localStreamRef.current.getTracks().forEach(t => t.stop());
				localStreamRef.current = null;
			}
			if (localVideoRef.current) {
				localVideoRef.current.srcObject = null;
			}
			
			closeConnection();
			
			if (socket && socket.connected) {
				socket.emit("stranger:skip");
			}
			
			socket.off("stranger:waiting", onWaiting);
			socket.off("stranger:matched", onMatched);
			socket.off("stranger:disconnected", onDisconnected);
			socket.off("stranger:chatMessage", onChatMessage);
			socket.off("stranger:friendRequest", onFriendRequest);
			socket.off("stranger:friendRequestSent", onFriendRequestSent); // <-- cleanup
			socket.off("webrtc:offer", onOffer);
			socket.off("webrtc:answer", onAnswer);
			socket.off("webrtc:ice-candidate", onIce);

            // --- *** ADDED CLEANUP *** ---
            socket.off("stranger:addFriendError", onAddFriendError);
            socket.off("stranger:reportSuccess", onReportSuccess);
            socket.off("stranger:reportError", onReportError);
            // --- *** END OF ADDED CLEANUP *** ---
		};
	}, [socket, authUser, navigate, addMessage, closeConnection, startCall, handleOffer, handleAnswer, handleIceCandidate]);

	const handleSkip = () => {
		if (status === "idle") return;
		if (status === "connected") addMessage("System", "Skipping...");
		socket.emit("stranger:skip");
		closeConnection();
		setStatus("waiting");
	};

	const handleSendTempMessage = (e) => {
		e.preventDefault();
		if (!currentMessage.trim() || status !== "connected") return;
		socket.emit("stranger:chatMessage", { message: currentMessage });
		addMessage("You", currentMessage);
		setCurrentMessage("");
	};

	const handleAddFriend = () => {
		if (status !== "connected") return;
		// optimistic UI change: sender sees request sent immediately
		setFriendStatus("REQUEST_SENT");
		socket.emit("stranger:addFriend");
		// backend will emit "stranger:friendRequestSent" back to confirm or "stranger:addFriendError"
	};

	const captureScreenshot = () => {
		if (!remoteVideoRef.current || remoteVideoRef.current.videoWidth === 0) {
			toast.error("Cannot capture screenshot.");
			return null;
		}
		const canvas = document.createElement("canvas");
		canvas.width = remoteVideoRef.current.videoWidth;
		canvas.height = remoteVideoRef.current.videoHeight;
		const ctx = canvas.getContext("2d");
		ctx.drawImage(remoteVideoRef.current, 0, 0);
		return canvas.toDataURL("image/jpeg");
	};

	const handleReport = () => {
		const screenshot = captureScreenshot();
		if (screenshot) {
			setReportScreenshot(screenshot);
			setIsReportModalOpen(true);
		}
	};

	const handleSubmitReport = (reason) => {
		if (!reportScreenshot || !reason) return;
		setIsSubmittingReport(true);
		socket.emit("stranger:report", {
			reporterId: authUser._id,
			reason,
			description: "Reported from stranger chat",
			screenshot: reportScreenshot
		});
	};

	return (
		<div className="h-screen pt-14 flex flex-col bg-base-300">
			<div className="flex-1 flex flex-col md:flex-row gap-2 md:gap-4 p-2 md:p-4 overflow-hidden">
				<div className="flex-1 flex flex-col gap-2 md:gap-4 relative overflow-hidden">
					<div className="w-full flex-1 bg-black rounded-lg overflow-hidden relative aspect-video md:aspect-auto">
						<video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
						{status === "waiting" && (
							<div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-2 md:gap-4 bg-black/70">
								<Loader2 className="w-12 h-12 md:w-16 md:h-16 animate-spin text-primary" />
								<p className="text-lg md:text-xl font-semibold">Finding a partner...</p>
							</div>
						)}
						{status === "connected" && (
							<button onClick={handleReport} className="btn btn-error btn-xs md:btn-sm absolute top-2 right-2 opacity-70 hover:opacity-100 z-10 flex items-center gap-1">
								<AlertTriangle size={14} /> Report
							</button>
						)}
					</div>
					<div className="w-24 h-auto aspect-video md:w-48 bg-black rounded-lg overflow-hidden absolute bottom-2 right-2 md:bottom-4 md:right-4 border-2 border-base-100 z-10 shadow-lg">
						<video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
					</div>
				</div>

				<div className="w-full md:w-96 h-2/5 md:h-auto flex flex-col bg-base-100 rounded-lg shadow-lg overflow-hidden max-h-[90vh]">
					<div className="flex items-center gap-2 p-2 md:p-3 border-b border-base-300">
						<button onClick={handleSkip} className="btn btn-primary btn-sm md:btn-md flex-1" disabled={status === "idle"}>
							<SkipForward size={16} className="mr-1"/> {status === "connected" ? "Skip" : "Find"}
						</button>
						<button onClick={() => navigate("/")} className="btn btn-error btn-outline btn-sm md:btn-md">
							<PhoneOff size={16} className="mr-1"/> Leave
						</button>
					</div>
					<div className="p-2 md:p-3 border-b border-base-300">
						<button
							className="btn btn-secondary btn-sm md:btn-md w-full"
							disabled={status !== "connected" || friendStatus !== "NOT_FRIENDS"}
							onClick={handleAddFriend}
						>
							<UserPlus size={16} className="mr-1"/>
							{friendStatus === "NOT_FRIENDS" && "Add Friend"}
							{friendStatus === "REQUEST_SENT" && "Request Sent"}
							{friendStatus === "REQUEST_RECEIVED" && "Request Received"}
						</button>
					</div>
					<div className="flex-1 flex flex-col p-2 md:p-3 overflow-hidden">
						<h3 className="text-md md:text-lg font-semibold mb-2 flex items-center gap-2 shrink-0">
							<MessageSquare size={18} /> Temp Chat
						</h3>
						<div className="flex-1 overflow-y-auto mb-2 space-y-1 md:space-y-2 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-base-200">
							{tempMessages.map((msg, index) => (
								<div key={index} className={`chat ${msg.sender === 'You' ? 'chat-end' : 'chat-start'}`}>
									<div className={`chat-bubble text-sm ${msg.sender === 'You' ? 'chat-bubble-primary' : (msg.sender === 'System' ? 'chat-bubble-accent text-xs' : 'chat-bubble-secondary')}`}>
										{msg.message}
									</div>
								</div>
							))}
						</div>
						<form onSubmit={handleSendTempMessage} className="flex gap-2 mt-auto shrink-0">
							<input type="text" placeholder="Message..." className="input input-sm md:input-md input-bordered flex-1" value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} disabled={status !== "connected"} />
							<button type="submit" className="btn btn-primary btn-sm md:btn-md" disabled={status !== "connected" || !currentMessage.trim()}>
								<Send size={16} />
							</button>
						</form>
					</div>
				</div>
			</div>

			<ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} onSubmit={handleSubmitReport} screenshotPreview={reportScreenshot} isSubmitting={isSubmittingReport} />
		</div>
	);
};

export default StrangerChatPage;
