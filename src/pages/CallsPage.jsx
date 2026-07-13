import { useEffect, useState } from "react";
import callService from "../api/callService";
import UserAvatar from "../components/UserAvatar";

function formatWhen(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === now.toDateString()) return time;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString([], { day: "2-digit", month: "short" })}, ${time}`;
}

function formatDuration(seconds = 0) {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function CallsPage({ onCall }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    callService
      .getHistory()
      .then(setCalls)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full dark:bg-wa-panelDark bg-white">
      <div className="px-4 py-4 dark:bg-wa-tealDeep bg-wa-teal text-white">
        <h1 className="text-lg font-medium">Calls</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-wa-teal border-t-transparent rounded-full animate-spin" />
          </div>
        ) : calls.length === 0 ? (
          <p className="px-6 py-10 text-sm text-center dark:text-gray-500 text-gray-400">
            No call history yet. Start a voice or video call from any chat.
          </p>
        ) : (
          calls.map((call) => {
            const isOutgoing = call.direction === "outgoing";
            const other = call.withUser;
            const missed = call.status === "missed" || call.status === "declined";

            return (
              <div
                key={call._id}
                className="flex items-center gap-3 px-4 py-3 dark:hover:bg-gray-800 hover:bg-gray-50 transition-colors"
              >
                <UserAvatar username={other} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium dark:text-gray-100 text-gray-900 text-sm truncate">
                    {other}
                  </p>
                  <div className={`flex items-center gap-1 text-xs ${missed ? "text-red-500" : "dark:text-gray-500 text-gray-400"}`}>
                    <svg
                      className={`w-3.5 h-3.5 ${isOutgoing ? "" : "rotate-180"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={isOutgoing ? "M7 17L17 7M17 7H8M17 7v9" : "M17 7L7 17M7 17h9M7 17V8"}
                      />
                    </svg>
                    <span>{formatWhen(call.createdAt)}</span>
                    {call.status === "answered" && call.duration > 0 && (
                      <span>· {formatDuration(call.duration)}</span>
                    )}
                    {missed && <span>· {call.status}</span>}
                  </div>
                </div>
                <button
                  onClick={() => onCall?.(other, call.video)}
                  className="p-2 rounded-full text-wa-teal dark:hover:bg-gray-800 hover:bg-gray-100"
                  title={call.video ? "Video call" : "Voice call"}
                >
                  {call.video ? (
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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
