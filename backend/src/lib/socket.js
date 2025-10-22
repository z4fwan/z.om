import { Server } from "socket.io";
import http from "http";
import express from "express";
import cloudinary from "./cloudinary.js";
import Report from "../models/report.model.js";

const app = express();
const server = http.createServer(app);

// Setup Socket.IO server
const io = new Server(server, {
    cors: {
        origin: [
            "http://localhost:5173",
            "https://z-app-frontend-2-0.onrender.com",
        ],
        credentials: true,
    },
});

// === PRIVATE CHAT LOGIC ===
const userSocketMap = {}; // { userId: socketId }

const getUserIdFromSocketId = (socketId) => {
    return Object.keys(userSocketMap).find(
        (key) => userSocketMap[key] === socketId
    );
};

export const getReceiverSocketId = (userId) => userSocketMap[userId];

export const emitToUser = (userId, event, data) => {
    const socketId = userSocketMap[userId];
    if (socketId) {
        console.log(`Emitting ['${event}'] to user ${userId} (socket ${socketId})`);
        io.to(socketId).emit(event, data);
    } else {
        console.log(`Could not find socket for user ${userId} to emit ['${event}']`);
    }
};
// === END PRIVATE CHAT LOGIC ===

// === STRANGER CHAT LOGIC ===
let waitingQueue = [];
const matchedPairs = new Map(); // socketId -> partnerSocketId

// ✅ Find and match strangers
const findMatch = (socket) => {
    console.log(`🔍 Finding match for ${socket.id}. Queue size: ${waitingQueue.length}`);
    
    // Remove current socket from queue if present
    waitingQueue = waitingQueue.filter(id => id !== socket.id);
    
    if (waitingQueue.length > 0) {
        // Match with first person in queue
        const partnerSocketId = waitingQueue.shift();
        const partnerSocket = io.sockets.sockets.get(partnerSocketId);
        
        if (partnerSocket) {
            // Create match
            matchedPairs.set(socket.id, partnerSocketId);
            matchedPairs.set(partnerSocketId, socket.id);
            
            console.log(`✅ Matched ${socket.id} with ${partnerSocketId}`);
            
            // Notify both users
            socket.emit("stranger:matched", { partnerId: partnerSocketId });
            partnerSocket.emit("stranger:matched", { partnerId: socket.id });
        } else {
            // Partner socket no longer exists, try again
            console.log(`⚠️ Partner socket ${partnerSocketId} not found, retrying...`);
            findMatch(socket);
        }
    } else {
        // Add to queue
        waitingQueue.push(socket.id);
        console.log(`⏳ Added ${socket.id} to queue. Queue size: ${waitingQueue.length}`);
        socket.emit("stranger:waiting");
    }
};

// ✅ Clean up matches when user disconnects or skips
const cleanupMatch = (socket) => {
    const partnerSocketId = matchedPairs.get(socket.id);
    
    if (partnerSocketId) {
        const partnerSocket = io.sockets.sockets.get(partnerSocketId);
        
        // Remove both from matched pairs
        matchedPairs.delete(socket.id);
        matchedPairs.delete(partnerSocketId);
        
        console.log(`🧹 Cleaned up match: ${socket.id} <-> ${partnerSocketId}`);
        
        if (partnerSocket) {
            // Notify partner that stranger disconnected
            partnerSocket.emit("stranger:disconnected");
            return partnerSocket;
        }
    }
    
    // Also remove from waiting queue
    waitingQueue = waitingQueue.filter(id => id !== socket.id);
    
    return null;
};
// === END STRANGER CHAT LOGIC ===

// Socket.IO connection logic
io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);
    
    const initialUserId = socket.handshake.query.userId;
    if (initialUserId && initialUserId !== 'undefined') {
        console.log(`User ${initialUserId} connected with socket ${socket.id}`);
        userSocketMap[initialUserId] = socket.id;
        socket.userId = initialUserId;
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    }

    // === PRIVATE CHAT (FRIENDS) EVENTS ===
    socket.on("register-user", (userId) => {
        if (userId) {
            userSocketMap[userId] = socket.id;
            socket.userId = userId;
            console.log(`✅ Registered user ${userId} → socket ${socket.id}`);
            io.emit("getOnlineUsers", Object.keys(userSocketMap));
        }
    });

    socket.on("admin-action", ({ targetUserId, action, payload }) => {
        console.log(`👮 Admin action: ${action} for user ${targetUserId}`);
        emitToUser(targetUserId, "admin-action", { action, payload });
    });
    // === END PRIVATE CHAT EVENTS ===

    // === STRANGER CHAT (OMEGLE) EVENTS ===
    socket.on("stranger:joinQueue", (payload) => {
        console.log(`🚀 ${socket.id} joining stranger queue`, payload);
        socket.strangerData = payload; // Store user data on socket
        findMatch(socket);
    });

    socket.on("stranger:skip", () => {
        console.log(`⏭️ ${socket.id} skipping stranger`);
        const partnerSocket = cleanupMatch(socket);
        
        // Notify partner if they exist
        if (partnerSocket) {
            partnerSocket.emit("stranger:disconnected");
        }
        
        // Re-queue the user who skipped
        findMatch(socket);
    });

    socket.on("stranger:chatMessage", (payload) => {
        const { message } = payload;
        const partnerSocketId = matchedPairs.get(socket.id);
        
        if (partnerSocketId) {
            const partnerSocket = io.sockets.sockets.get(partnerSocketId);
            if (partnerSocket) {
                console.log(`💬 Message from ${socket.id} to ${partnerSocketId}`);
                partnerSocket.emit("stranger:chatMessage", { message });
            }
        }
    });

    socket.on("stranger:addFriend", () => {
        const partnerSocketId = matchedPairs.get(socket.id);
        
        if (partnerSocketId) {
            const partnerSocket = io.sockets.sockets.get(partnerSocketId);
            if (partnerSocket) {
                console.log(`👥 Friend request from ${socket.id} to ${partnerSocketId}`);
                
                // Send both users' data to each other
                partnerSocket.emit("stranger:friendRequest", {
                    userData: socket.strangerData,
                    fromSocketId: socket.id
                });
                
                socket.emit("stranger:friendRequestSent", {
                    userData: partnerSocket.strangerData
                });
            }
        }
    });

    socket.on("stranger:report", async (payload) => {
        const { reporterId, reason, description, category } = payload;
        const partnerSocketId = matchedPairs.get(socket.id);
        
        if (partnerSocketId) {
            const partnerSocket = io.sockets.sockets.get(partnerSocketId);
            
            if (partnerSocket && partnerSocket.userId) {
                try {
                    const report = new Report({
                        reporter: reporterId,
                        reportedUser: partnerSocket.userId,
                        reason,
                        description,
                        category: category || "stranger_chat",
                        context: {
                            chatType: "stranger",
                            socketIds: [socket.id, partnerSocketId]
                        }
                    });
                    
                    await report.save();
                    console.log(`🚨 Report saved: ${reporterId} reported ${partnerSocket.userId}`);
                    
                    socket.emit("stranger:reportSuccess", { message: "Report submitted" });
                } catch (error) {
                    console.error("Error saving report:", error);
                    socket.emit("stranger:reportError", { error: "Failed to submit report" });
                }
            }
        }
    });
    // === END STRANGER CHAT EVENTS ===

    // === WEBRTC SIGNALING (STRANGER CHAT) ===
    socket.on("webrtc:offer", (payload) => {
        const { sdp } = payload;
        const partnerSocketId = matchedPairs.get(socket.id);
        
        if (partnerSocketId) {
            const partnerSocket = io.sockets.sockets.get(partnerSocketId);
            if (partnerSocket) {
                console.log(`📹 WebRTC offer from ${socket.id} to ${partnerSocketId}`);
                partnerSocket.emit("webrtc:offer", { sdp, from: socket.id });
            }
        }
    });

    socket.on("webrtc:answer", (payload) => {
        const { sdp } = payload;
        const partnerSocketId = matchedPairs.get(socket.id);
        
        if (partnerSocketId) {
            const partnerSocket = io.sockets.sockets.get(partnerSocketId);
            if (partnerSocket) {
                console.log(`📹 WebRTC answer from ${socket.id} to ${partnerSocketId}`);
                partnerSocket.emit("webrtc:answer", { sdp, from: socket.id });
            }
        }
    });

    socket.on("webrtc:ice-candidate", (payload) => {
        const { candidate } = payload;
        const partnerSocketId = matchedPairs.get(socket.id);
        
        if (partnerSocketId) {
            const partnerSocket = io.sockets.sockets.get(partnerSocketId);
            if (partnerSocket) {
                partnerSocket.emit("webrtc:ice-candidate", { candidate, from: socket.id });
            }
        }
    });
    // === END STRANGER WEBRTC ===

    // === PRIVATE CALL (FRIENDS) EVENTS ===
    socket.on("private:initiate-call", (payload) => {
        const { receiverId, callerInfo, callType } = payload;
        const callerId = socket.userId;
        console.log(`📞 Call initiated from ${callerId} to ${receiverId} (Type: ${callType})`);
        
        if (callerId) {
            emitToUser(receiverId, "private:incoming-call", {
                callerId,
                callerInfo,
                callType,
            });
        } else {
            console.error("Cannot initiate call: callerId not found on socket.");
        }
    });

    socket.on("private:call-accepted", (payload) => {
        const { callerId, acceptorInfo } = payload;
        const acceptorId = socket.userId;
        console.log(`✅ Call accepted by ${acceptorId} for caller ${callerId}`);
        
        if (acceptorId) {
            emitToUser(callerId, "private:call-accepted", {
                acceptorId,
                acceptorInfo,
            });
        } else {
            console.error("Cannot accept call: acceptorId not found on socket.");
        }
    });

    socket.on("private:call-rejected", (payload) => {
        const { callerId, reason } = payload;
        const rejectorId = socket.userId;
        console.log(`❌ Call rejected by ${rejectorId} for caller ${callerId}. Reason: ${reason}`);
        
        if (rejectorId) {
            emitToUser(callerId, "private:call-rejected", {
                rejectorId,
                reason,
            });
        } else {
            console.error("Cannot reject call: rejectorId not found on socket.");
        }
    });

    socket.on("private:offer", (payload) => {
        const { receiverId, sdp } = payload;
        const callerId = socket.userId;
        console.log(`🔒 private:offer from ${callerId} to ${receiverId}`);
        
        if (callerId) {
            emitToUser(receiverId, "private:offer", { callerId, sdp });
        } else {
            console.error("Cannot send offer: callerId not found on socket.");
        }
    });

    socket.on("private:answer", (payload) => {
        const { callerId, sdp } = payload;
        const acceptorId = socket.userId;
        console.log(`🔒 private:answer from ${acceptorId} to ${callerId}`);
        
        if (acceptorId) {
            emitToUser(callerId, "private:answer", { acceptorId, sdp });
        } else {
            console.error("Cannot send answer: acceptorId not found on socket.");
        }
    });

    socket.on("private:ice-candidate", (payload) => {
        const { targetUserId, candidate } = payload;
        const senderId = socket.userId;
        
        if (senderId) {
            emitToUser(targetUserId, "private:ice-candidate", { senderId, candidate });
        } else {
            console.error("Cannot send ICE candidate: senderId not found on socket.");
        }
    });

    socket.on("private:end-call", (payload) => {
        const { targetUserId } = payload;
        const userId = socket.userId;
        console.log(`📞 Ending call between ${userId} and ${targetUserId}`);
        
        if (userId) {
            emitToUser(targetUserId, "private:call-ended", { userId });
        } else {
            console.error("Cannot end call: userId not found on socket.");
        }
    });
    // === END PRIVATE CALL EVENTS ===

    // Handle disconnects
    socket.on("disconnect", () => {
        console.log("❌ User disconnected:", socket.id);
        const disconnectedUserId = socket.userId || getUserIdFromSocketId(socket.id);

        // Cleanup Stranger Chat
        waitingQueue = waitingQueue.filter((id) => id !== socket.id);
        const partnerSocket = cleanupMatch(socket);
        if (partnerSocket) {
            partnerSocket.emit("stranger:disconnected");
            findMatch(partnerSocket);
        }

        // Cleanup Private Chat
        if (disconnectedUserId) {
            console.log(`User ${disconnectedUserId} disconnected fully.`);
            delete userSocketMap[disconnectedUserId];
            io.emit("getOnlineUsers", Object.keys(userSocketMap));
        }
    });
});

// Make io accessible globally for admin controller
app.set("io", io);

// Export for index.js
export { io, server, app, userSocketMap };