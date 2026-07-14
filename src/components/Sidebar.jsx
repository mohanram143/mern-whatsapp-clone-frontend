import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useTheme } from "../context/ThemeContext";
import authService from "../api/authService";
import UserAvatar from "./UserAvatar";
import { BsFillChatSquareTextFill } from "react-icons/bs";
import { RiChat3Fill } from "react-icons/ri";
import { IoMdCall } from "react-icons/io";
import { RiContactsFill } from "react-icons/ri";
import { RiLogoutBoxLine } from "react-icons/ri";

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  selectedUser,
  onSelectUser,
  lastMessages,
}) {
  const { currentUser, logout } = useAuth();
  const { isOnline, unreadMap, clearUnread, socket } = useSocket();
  const { dark, toggle } = useTheme();

  const [conversations, setConversations] = useState([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchTimer = useRef(null);

  const loadConversations = useCallback(() => {
    authService
      .getConversations()
      .then((data) => setConversations(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingConvos(false));
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Whenever a chat gets a fresh last-message, make sure that user appears
  // in the conversation list (new chats started via search included).
  useEffect(() => {
    const knownUsernames = new Set(conversations.map((c) => c.username));
    const missing = Object.keys(lastMessages || {}).filter((u) => !knownUsernames.has(u));
    if (missing.length) loadConversations();
  }, [lastMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for messages globally (not just in the currently-open chat) so a
  // brand-new conversation partner — someone who messages you first, or
  // whose chat isn't open right now — still shows up in the list right away.
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  useEffect(() => {
    if (!socket) return;
    const handleIncoming = (msg) => {
      const other = msg.sender === currentUser?.username ? msg.receiver : msg.sender;
      const alreadyKnown = conversationsRef.current.some((c) => c.username === other);
      if (!alreadyKnown) loadConversations();
    };
    socket.on("receive_message", handleIncoming);
    return () => socket.off("receive_message", handleIncoming);
  }, [socket, currentUser?.username, loadConversations]);

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await authService.searchUsers(query.trim());
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  const startChatWith = (username) => {
    setQuery("");
    setSearchResults([]);
    onSelectUser(username);
    // ensure it shows up immediately even before the first message
    setConversations((prev) =>
      prev.some((c) => c.username === username)
        ? prev
        : [{ username, name: username, avatar: "" }, ...prev],
    );
  };

  const sorted = [...conversations].sort((a, b) => {
    const ta = new Date(lastMessages?.[a.username]?.createdAt || 0).getTime();
    const tb = new Date(lastMessages?.[b.username]?.createdAt || 0).getTime();
    return tb - ta;
  });

  const showingSearch = query.trim().length > 0;

  return (
    <div className="flex flex-col h-full dark:bg-wa-panelDark bg-white border-r dark:border-gray-800 border-gray-200">
      {/* Top bar: own profile + actions */}
      <div className="flex items-center justify-between px-4 py-2.5 dark:bg-wa-panelDark bg-wa-bgLight dark:border-gray-800 border-b border-gray-200">
        <UserAvatar
          username={currentUser?.username}
          avatar={currentUser?.avatar}
          size="md"
          onClick={() => setActiveTab("profile")}
        />
        <div className="flex items-center gap-1">
          <button
            onClick={toggle}
            title="Toggle theme"
            className="p-2 rounded-full dark:hover:bg-gray-800 hover:bg-gray-200 dark:text-gray-300 text-gray-600"
          >
            {dark ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 01-4.4 2.26 5.403 5.403 0 01-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36 6.36l-.7-.7M6.34 6.34l-.7-.7m12.72 0l-.7.7M6.34 17.66l-.7.7M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            )}
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-2 rounded-full dark:hover:bg-gray-800 hover:bg-gray-200 dark:text-gray-300 text-gray-600"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-40 dark:bg-gray-800 bg-white border dark:border-gray-700 border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setActiveTab("profile");
                  }}
                  className="w-full text-left px-6 py-2.5 text-sm dark:text-gray-200 text-gray-700 dark:hover:bg-gray-700 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2">
                        <div>
                            <RiContactsFill />
                          </div>           
                          <div>
                            Profile
                            </div>                  
                    </div> 
                </button>
                <button
                  onClick={logout}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 dark:hover:bg-gray-700 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-2 pl-1">
                    <div>
                        <RiLogoutBoxLine />
                    </div>
                    <div>
                        Logout
                    </div>
                  </div>
                  
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search bar — the ONLY way to discover a new person to message */}
      <div className="px-3 py-2 dark:bg-wa-panelDark bg-white">
        <div className="relative flex items-center dark:bg-gray-800 bg-wa-bgLight rounded-lg px-3 py-2">
          <svg
            className="w-4 h-4 dark:text-gray-500 text-gray-400 mr-2 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or start new chat"
            className="w-full bg-transparent text-sm dark:text-gray-200 text-gray-800 dark:placeholder-gray-500 placeholder-gray-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="dark:text-gray-500 text-gray-400 text-lg leading-none px-1"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* List area */}
      <div className="flex-1 overflow-y-auto">
        {showingSearch ? (
          <>
            <p className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide dark:text-gray-500 text-gray-400">
              {searching ? "Searching..." : "Search results"}
            </p>
            {!searching && searchResults.length === 0 && (
              <p className="px-4 py-6 text-sm text-center dark:text-gray-500 text-gray-400">
                No users found for "{query}"
              </p>
            )}
            {searchResults.map((u) => (
              <button
                key={u.username}
                onClick={() => startChatWith(u.username)}
                className="w-full flex items-center gap-3 px-4 py-3 dark:hover:bg-gray-800 hover:bg-gray-50 transition-colors text-left"
              >
                <UserAvatar username={u.username} avatar={u.avatar} size="md" online={isOnline(u.username)} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium dark:text-gray-100 text-gray-900 text-sm truncate">
                    {u.name || u.username}
                  </p>
                  <p className="text-xs dark:text-gray-500 text-gray-400 truncate">{u.about}</p>
                </div>
              </button>
            ))}
          </>
        ) : loadingConvos ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-wa-teal border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 px-6 text-center">
            <p className="text-sm dark:text-gray-500 text-gray-400">
              No chats yet. Use the search bar above to find someone and say hi 👋
            </p>
          </div>
        ) : (
          sorted.map((u) => {
            const last = lastMessages?.[u.username];
            const unread = unreadMap?.[u.username] || 0;
            return (
              <button
                key={u.username}
                onClick={() => {
                  onSelectUser(u.username);
                  clearUnread(u.username);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left border-l-4 ${
                  selectedUser === u.username
                    ? "dark:bg-gray-800 bg-wa-bgLight border-wa-teal"
                    : "border-transparent dark:hover:bg-gray-800/60 hover:bg-gray-50"
                }`}
              >
                <UserAvatar
                  username={u.username}
                  avatar={u.avatar}
                  size="md"
                  online={isOnline(u.username)}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium dark:text-gray-100 text-gray-900 text-sm truncate">
                      {u.name || u.username}
                    </p>
                    {last?.createdAt && (
                      <span
                        className={`text-[11px] flex-shrink-0 ml-2 ${
                          unread ? "text-wa-teal font-semibold" : "dark:text-gray-500 text-gray-400"
                        }`}
                      >
                        {timeAgo(last.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs dark:text-gray-400 text-gray-500 truncate">
                      {last ? `${last.sender === currentUser?.username ? "You: " : ""}${last.text}` : "Tap to chat"}
                    </p>
                    {unread > 0 && (
                      <span className="ml-2 flex-shrink-0 bg-wa-teal text-white text-[11px] font-semibold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

{/* Bottom Navigation */}
{/* Bottom Navigation */}
<div className="fixed bottom-0 left-0 right-0 z-50 w-full border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-wa-panelDark">
  <div className="flex items-center justify-around h-16">
    {[
      {
        key: "chats",
        label: "Chats",
        icon: <BsFillChatSquareTextFill />,
      },
      {
        key: "status",
        label: "Updates",
        icon: <RiChat3Fill />,
      },
      {
        key: "calls",
        label: "Calls",
        icon: <IoMdCall />,
      },
    ].map((tab) => (
      <button
        key={tab.key}
        onClick={() => setActiveTab(tab.key)}
        className={`flex flex-1 flex-col items-center justify-center ${
          activeTab === tab.key
            ? "text-wa-teal"
            : "text-gray-500 dark:text-gray-400"
        }`}
      >
        <span className="text-xl">{tab.icon}</span>
        <span className="text-xs mt-1">{tab.label}</span>
      </button>
    ))}
  </div>
</div>
    </div>
  );
}
