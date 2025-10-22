// backend/src/utils/socketUtils.js

import { getReceiverSocketId } from "../socket.js"; // Make sure path matches your project structure

export const emitToUser = (io, userId, event, data) => {
  const receiverSocketId = getReceiverSocketId(userId);
  if (receiverSocketId) {
    io.to(receiverSocketId).emit(event, data);
  }
};
