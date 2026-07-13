import { useEffect, useState } from "react";
import authService from "../api/authService";
import UserAvatar from "./UserAvatar";
import { useSocket } from "../context/SocketContext";

export default function ContactInfoPanel({ username, onClose, onClearChat }) {
  const { isOnline } = useSocket();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    authService
      .getUserProfile(username)
      .then(setProfile)
      .catch(() => setProfile({ username, name: username, about: "" }))
      .finally(() => setLoading(false));
  }, [username]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:w-[380px] h-full dark:bg-wa-panelDark bg-white shadow-2xl flex flex-col animate-slide-up">
        <div className="flex items-center gap-4 px-4 py-4 dark:bg-wa-tealDeep bg-wa-teal text-white">
          <button onClick={onClose} className="p-1 -ml-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h1 className="text-lg font-medium">Contact info</h1>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-wa-teal border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col items-center py-8 gap-3">
              <UserAvatar username={username} avatar={profile?.avatar} size="xxl" />
              <h2 className="text-xl font-semibold dark:text-gray-100 text-gray-900">
                {profile?.name || username}
              </h2>
              <p className={`text-sm ${isOnline(username) ? "text-green-500" : "dark:text-gray-500 text-gray-400"}`}>
                {isOnline(username) ? "online" : "offline"}
              </p>
            </div>

            <div className="px-6 py-4 border-t dark:border-gray-800 border-gray-100">
              <p className="text-xs text-wa-teal font-medium mb-1">About</p>
              <p className="dark:text-gray-300 text-gray-700 text-base">
                {profile?.about || "Hey there! I am using WhatsApp."}
              </p>
            </div>

            <div className="px-6 py-4 border-t dark:border-gray-800 border-gray-100">
              <p className="text-xs text-wa-teal font-medium mb-1">Username</p>
              <p className="dark:text-gray-400 text-gray-500 text-base">@{username}</p>
            </div>

            <div className="px-6 py-4 border-t dark:border-gray-800 border-gray-100">
              <button
                onClick={() => {
                  onClearChat?.();
                  onClose();
                }}
                className="text-red-500 text-sm font-medium"
              >
                🧹 Clear chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
