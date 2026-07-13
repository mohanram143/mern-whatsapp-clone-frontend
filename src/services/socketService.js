import { io } from "socket.io-client";
import { API_URL } from "../config";

let socket = null;
let currentUsername = null;

const socketService = {
  connect(username) {
    // Same user, already have a live/reconnecting socket — reuse it.
    if (socket && currentUsername === username) {
      if (!socket.connected) socket.connect();
      return socket;
    }

    // Different user than whoever we were last connected as (e.g. logged
    // out and back in as someone else in the same tab) — tear down the
    // stale connection first so we don't leak an old identity.
    if (socket) {
      socket.disconnect();
      socket = null;
    }

    currentUsername = username;

    socket = io(API_URL, {
      auth: { username },
      // allow polling fallback — some hosts (free tiers) can be slow/flaky
      // with a pure websocket upgrade
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on("connect", () => {
      console.log("✅ Socket Connected:", socket.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Socket Disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.log("❌ Socket Error:", err.message);
    });

    return socket;
  },

  getSocket() {
    return socket;
  },

  emit(event, data) {
    socket?.emit(event, data);
  },

  on(event, callback) {
    socket?.on(event, callback);
  },

  off(event, callback) {
    socket?.off(event, callback);
  },

  disconnect() {
    socket?.disconnect();
    socket = null;
    currentUsername = null;
  },
};

export default socketService;
