import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import ProfilePage from "./ProfilePage";
import StatusPage from "./StatusPage";
import CallsPage from "./CallsPage";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";

export default function DashboardPage() {
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeTab, setActiveTab] = useState("chats"); // chats | status | calls | profile
  // lastMessages: { [username]: { text, sender, createdAt } }
  const [lastMessages, setLastMessages] = useState({});
  const { logout } = useAuth();
  const { startCall } = useSocket();
  const navigate = useNavigate();

  const handleSelectUser = useCallback((username) => {
    setSelectedUser(username);
    setActiveTab("chats");
  }, []);

  const handleMessage = useCallback((username, msg) => {
    setLastMessages((prev) => ({
      ...prev,
      [username]: {
        text: msg.file?.url ? `📎 ${msg.file.name || "Attachment"}` : msg.text,
        sender: msg.sender,
        createdAt: msg.createdAt,
      },
    }));
  }, []);

  const handleClearChat = useCallback((username) => {
    setLastMessages((prev) => {
      const next = { ...prev };
      delete next[username];
      return next;
    });
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  if (activeTab === "profile") {
    return (
      <div className="h-screen dark:bg-gray-950 bg-gray-100">
        <ProfilePage onBack={() => setActiveTab("chats")} />
      </div>
    );
  }

  // On mobile, "status" and "calls" take over the full screen (matching how
  // WhatsApp's own bottom nav behaves); on desktop they render in the main
  // content pane next to the sidebar the same way chats do.
  const mobileFullScreen = activeTab === "status" || activeTab === "calls";

  return (
    <div className="h-screen flex dark:bg-gray-950 bg-gray-100 overflow-hidden relative">
      <div
        className={`flex-shrink-0 w-full md:w-[360px] lg:w-[380px] flex-col h-full
          ${selectedUser || mobileFullScreen ? "hidden md:flex" : "flex"}`}
      >
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedUser={selectedUser}
          onSelectUser={handleSelectUser}
          lastMessages={lastMessages}
        />
      </div>

      <div
        className={`flex-1 flex-col h-full overflow-hidden
          ${selectedUser || mobileFullScreen ? "flex" : "hidden md:flex"}`}
      >
        {activeTab === "status" && <StatusPage />}
        {activeTab === "calls" && (
          <CallsPage onCall={(username, video) => startCall(username, video)} />
        )}
        {activeTab === "chats" && (
          <ChatWindow
            selectedUser={selectedUser}
            onMessage={handleMessage}
            onClearChat={handleClearChat}
            onBack={() => setSelectedUser(null)}
          />
        )}
      </div>
    </div>
  );
}
