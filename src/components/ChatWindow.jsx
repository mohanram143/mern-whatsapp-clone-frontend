import { useState, useEffect, useRef, useMemo } from "react";
import EmojiPicker from "emoji-picker-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import messageService from "../api/messageService";
import UserAvatar from "./UserAvatar";
import ContactInfoPanel from "./ContactInfoPanel";
import {
  fileUrl,
  isImageFile,
  isVideoFile,
  isAudioFile,
  isPdfFile,
  fileIcon,
  formatFileSize,
} from "../config";

function formatMsgTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateDivider(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
}

function groupByDate(messages) {
  const groups = [];
  let lastDate = null;
  for (const msg of messages) {
    const date = new Date(msg.createdAt).toDateString();
    if (date !== lastDate) {
      groups.push({ type: "divider", label: formatDateDivider(msg.createdAt) });
      lastDate = date;
    }
    groups.push({ type: "message", ...msg });
  }
  return groups;
}

function Ticks({ delivered, seen }) {
  if (seen) {
    return (
      <svg className="inline w-4 h-3.5 tick-seen" viewBox="0 0 16 11" fill="none">
        <path d="M11.5 1L5 8.5 2.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 1L8.5 8.5 7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (delivered) {
    return (
      <svg className="inline w-4 h-3.5 opacity-70" viewBox="0 0 16 11" fill="none">
        <path d="M11.5 1L5 8.5 2.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M15 1L8.5 8.5 7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // sent — single tick
  return (
    <svg className="inline w-4 h-3.5 opacity-70" viewBox="0 0 16 11" fill="none">
      <path d="M11.5 1L5 8.5 2.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FileBubble({ file }) {
  const url = fileUrl(file.url);
  if (isImageFile(file.type, file.name)) {
    return (
      <a href={url} target="_blank" rel="noreferrer" title="Click to view">
        <img src={url} alt={file.name} className="max-w-[260px] max-h-72 rounded-lg cursor-pointer object-cover" />
      </a>
    );
  }
  if (isVideoFile(file.type, file.name)) {
    return <video src={url} controls className="max-w-[260px] max-h-72 rounded-lg bg-black" />;
  }
  if (isAudioFile(file.type, file.name)) {
    return <audio src={url} controls className="w-64" />;
  }
  // pdf / doc / generic file — a clickable "file card" like WhatsApp
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title="Click to view"
      className="flex items-center gap-3 dark:bg-black/20 bg-black/5 rounded-lg px-3 py-2.5 min-w-[220px] max-w-[280px] hover:opacity-90"
    >
      <span className="text-3xl leading-none">{fileIcon(file.name)}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{file.name || "File"}</p>
        <p className="text-xs opacity-70">
          {isPdfFile(file.type, file.name) ? "PDF" : "Document"}
          {file.size ? ` · ${formatFileSize(file.size)}` : ""} · Tap to view
        </p>
      </div>
    </a>
  );
}

export default function ChatWindow({ selectedUser, onMessage, onClearChat, onBack }) {
  const { currentUser } = useAuth();
  const {
    isOnline,
    clearUnread,
    registerMessageListener,
    sendSocketMessage,
    sendTyping,
    sendStopTyping,
    startCall,
    socket,
  } = useSocket();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [openMsgMenu, setOpenMsgMenu] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(false);

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimerRef = useRef(null);
  const stopTypingTimerRef = useRef(null);

  useEffect(() => {
    if (!selectedUser) return;
    setMessages([]);
    setLoading(true);
    clearUnread(selectedUser);
    setEditingMessage(null);
    setInput("");
    messageService
      .getMessages(selectedUser)
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
    messageService.markSeen(selectedUser).catch(() => {});
    inputRef.current?.focus();
  }, [selectedUser, clearUnread]);

  useEffect(() => {
    if (!selectedUser) return;
    const unregister = registerMessageListener((msg) => {
      const isCurrentChat =
        (msg.sender === selectedUser && msg.receiver === currentUser?.username) ||
        (msg.sender === currentUser?.username && msg.receiver === selectedUser);
      if (!isCurrentChat) return;

      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        const cleaned = prev.filter((m) => !(m.optimistic && m.text === msg.text));
        return [...cleaned, msg];
      });

      clearUnread(selectedUser);
      onMessage?.(selectedUser, msg);

      if (msg.sender === selectedUser) {
        messageService.markSeen(selectedUser).catch(() => {});
      }
    });
    return unregister;
  }, [selectedUser, currentUser?.username, registerMessageListener, clearUnread, onMessage]);

  useEffect(() => {
    if (!socket || !selectedUser) return;

    const handleEdited = (msg) => {
      const isCurrentChat =
        (msg.sender === selectedUser && msg.receiver === currentUser?.username) ||
        (msg.sender === currentUser?.username && msg.receiver === selectedUser);
      if (!isCurrentChat) return;
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    };

    const handleDeleted = ({ id, chatWith }) => {
      if (chatWith !== selectedUser && chatWith !== currentUser?.username) return;
      setMessages((prev) =>
        prev.map((m) =>
          m._id === id
            ? { ...m, deletedForEveryone: true, text: "", file: { url: "", name: "", type: "" } }
            : m,
        ),
      );
    };

    const handleSeen = ({ chatWith }) => {
      if (chatWith !== selectedUser) return;
      // Backend doesn't send individual ids for this event — it just means
      // "everything I'd sent you up to now has been seen", so flip every
      // one of MY messages in this open chat over to seen.
      setMessages((prev) =>
        prev.map((m) =>
          m.sender === currentUser?.username ? { ...m, seen: true, delivered: true } : m,
        ),
      );
    };

    socket.on("message_edited", handleEdited);
    socket.on("message_deleted", handleDeleted);
    socket.on("messages_seen", handleSeen);

    return () => {
      socket.off("message_edited", handleEdited);
      socket.off("message_deleted", handleDeleted);
      socket.off("messages_seen", handleSeen);
    };
  }, [socket, selectedUser, currentUser?.username]);

  useEffect(() => {
    if (!socket) return;
    const handler = ({ from }) => {
      if (from === selectedUser) {
        setTyping(true);
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => setTyping(false), 2500);
      }
    };
    const stopHandler = ({ from }) => {
      if (from === selectedUser) setTyping(false);
    };
    socket.on("typing", handler);
    socket.on("stop_typing", stopHandler);
    return () => {
      socket.off("typing", handler);
      socket.off("stop_typing", stopHandler);
    };
  }, [selectedUser, socket]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    setOpenMsgMenu(null);
    setHeaderMenuOpen(false);
    setConfirmDelete(null);
    setClearConfirmOpen(false);
    setShowContactInfo(false);
  }, [selectedUser]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!selectedUser) return;
    sendTyping(selectedUser);
    clearTimeout(stopTypingTimerRef.current);
    stopTypingTimerRef.current = setTimeout(() => sendStopTyping(selectedUser), 1500);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedUser) return;
    try {
      const uploaded = await messageService.uploadFile(selectedUser, file);
      setMessages((prev) => [...prev, uploaded]);
      sendSocketMessage(selectedUser, uploaded);
      onMessage?.(selectedUser, uploaded);
    } catch (error) {
      console.log("UPLOAD ERROR:", error);
    }
    e.target.value = "";
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedUser) return;

    if (editingMessage) {
      const { id } = editingMessage;
      setInput("");
      setEditingMessage(null);
      try {
        const updated = await messageService.editMessage(id, text);
        setMessages((prev) => prev.map((m) => (m._id === id ? updated : m)));
      } catch (error) {
        console.log("EDIT ERROR:", error);
      }
      return;
    }

    setInput("");
    sendStopTyping(selectedUser);
    setSending(true);

    const optimistic = {
      _id: `opt_${Date.now()}`,
      sender: currentUser.username,
      receiver: selectedUser,
      text,
      delivered: false,
      seen: false,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const saved = await messageService.sendMessage(selectedUser, text);
      setMessages((prev) =>
        prev.map((m) => (m._id === optimistic._id ? { ...saved, optimistic: false } : m)),
      );
      sendSocketMessage(selectedUser, saved);
      onMessage?.(selectedUser, saved);
    } catch (error) {
      console.log("Message send failed:", error);
      setMessages((prev) =>
        prev.map((m) => (m._id === optimistic._id ? { ...m, failed: true } : m)),
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape" && editingMessage) {
      setEditingMessage(null);
      setInput("");
    }
  };

  const startEdit = (msg) => {
    setEditingMessage({ id: msg._id, text: msg.text });
    setInput(msg.text);
    setOpenMsgMenu(null);
    inputRef.current?.focus();
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setInput("");
  };

  const requestDelete = (id, mode) => {
    setConfirmDelete({ id, mode });
    setOpenMsgMenu(null);
  };

  const confirmDeleteMessage = async () => {
    if (!confirmDelete) return;
    const { id, mode } = confirmDelete;
    setConfirmDelete(null);

    if (mode === "me") {
      setMessages((prev) => prev.filter((m) => m._id !== id));
    } else {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === id
            ? { ...m, deletedForEveryone: true, text: "", file: { url: "", name: "", type: "" } }
            : m,
        ),
      );
    }

    try {
      await messageService.deleteMessage(id, mode);
    } catch (error) {
      console.log("DELETE ERROR:", error);
    }
  };

  const handleClearChat = async () => {
    setClearConfirmOpen(false);
    setHeaderMenuOpen(false);
    const previous = messages;
    setMessages([]);
    try {
      await messageService.clearChat(selectedUser);
      onClearChat?.(selectedUser);
    } catch (error) {
      console.log("CLEAR CHAT ERROR:", error);
      setMessages(previous);
    }
  };

  const grouped = useMemo(() => groupByDate(messages), [messages]);

  if (!selectedUser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center dark:bg-wa-bgDark bg-wa-bgLight gap-4">
        <div className="w-20 h-20 rounded-2xl bg-wa-teal/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-wa-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-semibold dark:text-gray-300 text-gray-700">WhatsApp Clone</h2>
          <p className="text-sm dark:text-gray-500 text-gray-400 mt-1">
            Select a chat or search to start messaging
          </p>
        </div>
      </div>
    );
  }

  const online = isOnline(selectedUser);

  return (
    <div className="flex-1 flex flex-col dark:bg-wa-bgDark bg-wa-bgLight overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 dark:bg-wa-panelDark bg-wa-teal text-white shadow-sm relative z-10">
        {onBack && (
          <button onClick={onBack} className="md:hidden p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <button
          onClick={() => setShowContactInfo(true)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <UserAvatar username={selectedUser} online={online} size="md" />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{selectedUser}</p>
            <p className="text-xs opacity-90 h-4">
              {typing ? (
                <span className="flex items-center gap-1">
                  typing
                  <span className="flex gap-0.5">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1 h-1 bg-white rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </span>
                </span>
              ) : online ? (
                "online"
              ) : (
                "offline"
              )}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1">
          {[
            { title: "Video call", video: true },
            { title: "Voice call", video: false },
          ].map(({ title, video }) => (
            <button
              key={title}
              title={title}
              onClick={() => startCall(selectedUser, video)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              {video ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                  />
                </svg>
              )}
            </button>
          ))}

          <div className="relative">
            <button
              title="More options"
              onClick={() => setHeaderMenuOpen((v) => !v)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {headerMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 dark:bg-gray-800 bg-white border dark:border-gray-700 border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden text-gray-900 dark:text-gray-100">
                <button
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    setShowContactInfo(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm dark:hover:bg-gray-700 hover:bg-gray-50"
                >
                  👤 Contact info
                </button>
                <button
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    setClearConfirmOpen(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm text-red-500 dark:hover:bg-gray-700 hover:bg-gray-50"
                >
                  🧹 Clear Chat
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 wa-chat-bg">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-8 h-8 border-2 border-wa-teal border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 opacity-70">
            <p className="text-sm dark:text-gray-400 text-gray-500 dark:bg-black/20 bg-white/70 px-4 py-2 rounded-lg">
              No messages yet. Say hello! 👋
            </p>
          </div>
        ) : (
          grouped.map((item, idx) => {
            if (item.type === "divider") {
              return (
                <div key={`div_${idx}`} className="flex justify-center my-3">
                  <span className="text-[11px] dark:text-gray-300 text-gray-500 dark:bg-gray-800 bg-white px-3 py-1 rounded-lg shadow-sm">
                    {item.label}
                  </span>
                </div>
              );
            }

            const isMine = item.sender === currentUser?.username;
            const isDeleted = item.deletedForEveryone;
            const menuOpenHere = openMsgMenu === item._id;

            return (
              <div key={item._id} className={`group flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[75%] sm:max-w-[65%] flex flex-col gap-0.5 relative">
                  <div
                    className={`px-2.5 py-1.5 rounded-lg text-sm relative shadow-sm
                      ${isMine
                        ? "bg-wa-bubbleOutLight dark:bg-wa-bubbleOutDark text-gray-900 dark:text-gray-50 bubble-mine"
                        : "bg-wa-bubbleInLight dark:bg-wa-bubbleInDark text-gray-900 dark:text-gray-50 bubble-theirs"}
                      ${item.optimistic ? "opacity-75" : ""}
                      ${isDeleted ? "italic opacity-70" : ""}
                    `}
                  >
                    {isDeleted ? (
                      <span className="flex items-center gap-1 pr-10">
                        🚫 This message was deleted
                      </span>
                    ) : item.file?.url ? (
                      <div className="pb-3.5">
                        <FileBubble file={item.file} />
                      </div>
                    ) : (
                      <span className="whitespace-pre-wrap break-words pr-14">{item.text}</span>
                    )}

                    {!isDeleted && (
                      <span className="text-[10px] float-right -mt-3.5 ml-2 flex items-center gap-1 dark:text-gray-400 text-gray-500">
                        {item.edited && <span className="italic">edited</span>}
                        {formatMsgTime(item.createdAt)}
                        {isMine && (
                          item.optimistic ? (
                            <span>🕐</span>
                          ) : (
                            <Ticks delivered={item.delivered} seen={item.seen} />
                          )
                        )}
                      </span>
                    )}
                  </div>

                  {!isDeleted && !item.optimistic && (
                    <div
                      className={`absolute top-0 ${isMine ? "-left-7" : "-right-7"} opacity-0 group-hover:opacity-100 transition-opacity`}
                    >
                      <button
                        onClick={() => setOpenMsgMenu(menuOpenHere ? null : item._id)}
                        className="p-1 rounded-full dark:hover:bg-gray-800 hover:bg-gray-200 dark:text-gray-500 text-gray-400"
                        title="Message options"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <circle cx="12" cy="5" r="1.5" />
                          <circle cx="12" cy="12" r="1.5" />
                          <circle cx="12" cy="19" r="1.5" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {menuOpenHere && (
                    <div
                      className={`absolute top-6 ${isMine ? "right-0" : "left-0"} w-40 dark:bg-gray-800 bg-white border dark:border-gray-700 border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden`}
                    >
                      {isMine && !item.file?.url && (
                        <button
                          onClick={() => startEdit(item)}
                          className="w-full text-left px-4 py-2 text-sm dark:text-gray-200 text-gray-700 dark:hover:bg-gray-700 hover:bg-gray-50"
                        >
                          ✏️ Edit
                        </button>
                      )}
                      <button
                        onClick={() => requestDelete(item._id, "me")}
                        className="w-full text-left px-4 py-2 text-sm dark:text-gray-200 text-gray-700 dark:hover:bg-gray-700 hover:bg-gray-50"
                      >
                        🗑️ Delete for me
                      </button>
                      {isMine && (
                        <button
                          onClick={() => requestDelete(item._id, "everyone")}
                          className="w-full text-left px-4 py-2 text-sm text-red-500 dark:hover:bg-gray-700 hover:bg-gray-50"
                        >
                          🚫 Delete for everyone
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {typing && (
          <div className="flex justify-start">
            <div className="bg-wa-bubbleInLight dark:bg-wa-bubbleInDark rounded-lg px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {editingMessage && (
        <div className="px-4 py-2 dark:bg-gray-800 bg-gray-100 border-t dark:border-gray-800 border-gray-200 flex items-center justify-between">
          <span className="text-xs dark:text-gray-300 text-gray-600">✏️ Editing message</span>
          <button onClick={cancelEdit} className="text-xs dark:text-gray-400 text-gray-500 hover:underline">
            Cancel
          </button>
        </div>
      )}

      {/* Input bar */}
      <div className="px-3 py-2 dark:bg-wa-panelDark bg-wa-bgLight border-t dark:border-gray-800 border-gray-200">
        <div className="flex items-end gap-2">
          <div className="relative">
            <button
              onClick={() => setShowEmoji(!showEmoji)}
              className="p-2 dark:text-gray-400 text-gray-500 dark:hover:text-gray-200 hover:text-gray-700 transition-colors flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
            {showEmoji && (
              <div className="absolute bottom-14 left-0 z-50">
                <EmojiPicker onEmojiClick={(e) => setInput((prev) => prev + e.emoji)} />
              </div>
            )}
          </div>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={editingMessage ? "Edit message" : "Type a message"}
              rows={1}
              className="w-full dark:bg-gray-800 bg-white dark:text-gray-100 text-gray-900 dark:placeholder-gray-500 placeholder-gray-400 rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none max-h-32 scrollbar-none shadow-sm"
              style={{ minHeight: "42px" }}
            />
          </div>

          {!editingMessage && (
            <>
              <input type="file" id="fileUpload" hidden onChange={handleFileUpload} />
              <label
                htmlFor="fileUpload"
                className="p-2 dark:text-gray-400 text-gray-500 dark:hover:text-gray-200 hover:text-gray-700 transition-colors flex-shrink-0 cursor-pointer"
                title="Attach file (any type: pdf, doc, image, video...)"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </label>
            </>
          )}

          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="w-10 h-10 bg-wa-teal hover:bg-wa-tealDark disabled:opacity-50 rounded-full flex items-center justify-center flex-shrink-0 transition-all shadow-lg"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="dark:bg-gray-900 bg-white rounded-2xl p-6 w-[320px] shadow-xl">
            <p className="dark:text-gray-100 text-gray-900 text-sm font-medium mb-1">
              {confirmDelete.mode === "everyone" ? "Delete for everyone?" : "Delete for me?"}
            </p>
            <p className="dark:text-gray-400 text-gray-500 text-xs mb-5">
              {confirmDelete.mode === "everyone"
                ? "This message will be removed for both of you."
                : "This message will be removed from your view only."}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm rounded-lg dark:text-gray-300 text-gray-600 dark:hover:bg-gray-800 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMessage}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {clearConfirmOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="dark:bg-gray-900 bg-white rounded-2xl p-6 w-[320px] shadow-xl">
            <p className="dark:text-gray-100 text-gray-900 text-sm font-medium mb-1">Clear this chat?</p>
            <p className="dark:text-gray-400 text-gray-500 text-xs mb-5">
              All messages in this conversation will be removed from your view only —
              {` ${selectedUser} `} will still see them.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setClearConfirmOpen(false)}
                className="px-4 py-2 text-sm rounded-lg dark:text-gray-300 text-gray-600 dark:hover:bg-gray-800 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleClearChat}
                className="px-4 py-2 text-sm rounded-lg bg-red-500 hover:bg-red-600 text-white"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {showContactInfo && (
        <ContactInfoPanel
          username={selectedUser}
          onClose={() => setShowContactInfo(false)}
          onClearChat={() => setClearConfirmOpen(true)}
        />
      )}
    </div>
  );
}
