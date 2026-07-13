import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";

import socketService from "../services/socketService";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { currentUser, isAuthenticated } = useAuth();

  const [onlineUsers, setOnlineUsers] = useState([]);
  const [connected, setConnected] = useState(false);
  const [unreadMap, setUnreadMap] = useState({});

  // Single shared call state so only one CallModal is ever mounted,
  // whether the call is incoming or outgoing.
  const [activeCall, setActiveCall] = useState(null);

  const socketRef = useRef(null);
  const listenersRef = useRef([]); // message listeners (ChatWindow subscribes)

  useEffect(() => {
    if (!isAuthenticated || !currentUser?.username) return;

    const socket = socketService.connect(currentUser.username);
    socketRef.current = socket;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    const handleOnlineUsers = (users) => {
      setOnlineUsers(users.filter((u) => u !== currentUser.username));
    };

    const handleReceiveMessage = (msg) => {
      listenersRef.current.forEach((cb) => cb(msg));

      if (msg.sender !== currentUser.username) {
        setUnreadMap((prev) => ({
          ...prev,
          [msg.sender]: (prev[msg.sender] || 0) + 1,
        }));
      }
    };

    // "call_offer" carries everything needed to render the incoming-call
    // screen (who's calling, video/audio, and the SDP offer), so that's
    // the single source of truth that pops the modal open.
    const handleCallOffer = (data) => {
      setActiveCall({
        from: data.from,
        offer: data.offer,
        video: data.video,
        incoming: true,
      });
    };

    const handleEndCall = () => setActiveCall(null);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("online_users", handleOnlineUsers);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("call_offer", handleCallOffer);
    socket.on("end_call", handleEndCall);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("online_users", handleOnlineUsers);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("call_offer", handleCallOffer);
      socket.off("end_call", handleEndCall);
    };
  }, [isAuthenticated, currentUser?.username]);

  const registerMessageListener = useCallback((callback) => {
    listenersRef.current.push(callback);
    return () => {
      listenersRef.current = listenersRef.current.filter((fn) => fn !== callback);
    };
  }, []);

  const sendSocketMessage = useCallback((receiver, msg) => {
    socketRef.current?.emit("send_message", { ...msg, receiver });
  }, []);

  const sendTyping = useCallback((to) => {
    socketRef.current?.emit("typing", { to });
  }, []);

  const sendStopTyping = useCallback((to) => {
    socketRef.current?.emit("stop_typing", { to });
  }, []);

  const sendCallSignal = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  // Kick off an outgoing call — CallModal watches activeCall and does the
  // actual getUserMedia + createOffer work once this is set.
  const startCall = useCallback((receiver, video) => {
    socketRef.current?.emit("call_user", { to: receiver, video });
    setActiveCall({ receiver, video, outgoing: true });
  }, []);

  const clearUnread = useCallback((username) => {
    setUnreadMap((prev) => ({ ...prev, [username]: 0 }));
  }, []);

  const isOnline = useCallback(
    (username) => onlineUsers.includes(username),
    [onlineUsers],
  );

  return (
    <SocketContext.Provider
      value={{
        connected,
        onlineUsers,
        unreadMap,
        registerMessageListener,
        sendSocketMessage,
        sendCallSignal,
        sendTyping,
        sendStopTyping,
        clearUnread,
        isOnline,
        activeCall,
        setActiveCall,
        startCall,
        socket: socketRef.current,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error("useSocket must be inside SocketProvider");
  return context;
}
