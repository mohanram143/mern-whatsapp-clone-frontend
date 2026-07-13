import { useEffect, useRef, useState } from "react";
import { fileUrl } from "../config";
import { useAuth } from "../context/AuthContext";
import statusService from "../api/statusService";
import UserAvatar from "./UserAvatar";

const DURATION = 5000; // ms per image status

export default function StatusViewer({ username, statuses, onClose, onViewed }) {
  const { currentUser } = useAuth();
  const isMine = username === currentUser?.username;

  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showViewers, setShowViewers] = useState(false);
  const [paused, setPaused] = useState(false);

  const startRef = useRef(null);
  const rafRef = useRef(null);
  const videoRef = useRef(null);

  const current = statuses[index];

  useEffect(() => {
    if (!current) return;
    if (!isMine) {
      statusService.markViewed(current._id).then(onViewed).catch(() => {});
    }
  }, [current?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setProgress(0);
    setShowViewers(false);
    startRef.current = performance.now();

    const isVideo = current?.mediaType === "video";

    if (isVideo) {
      // progress driven by the <video> element's timeupdate instead
      return;
    }

    const tick = (now) => {
      if (paused) {
        startRef.current = now - progress * DURATION;
      }
      const elapsed = now - startRef.current;
      const pct = Math.min(1, elapsed / DURATION);
      setProgress(pct);
      if (pct >= 1) {
        goNext();
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [index, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  const goNext = () => {
    if (index < statuses.length - 1) {
      setIndex((i) => i + 1);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (index > 0) setIndex((i) => i - 1);
  };

  if (!current) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="relative w-full max-w-md h-full sm:h-[90vh] sm:rounded-xl overflow-hidden bg-black">
        {/* Progress bars */}
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
          {statuses.map((s, i) => (
            <div key={s._id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{
                  width: i < index ? "100%" : i === index ? `${progress * 100}%` : "0%",
                  transition: i === index ? "none" : "width 0.15s",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 left-3 right-3 flex items-center gap-3 z-20">
          <UserAvatar username={username} size="sm" />
          <div className="flex-1 text-white">
            <p className="text-sm font-medium">{username}</p>
            <p className="text-[11px] opacity-80">
              {new Date(current.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <button onClick={onClose} className="text-white p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Media */}
        <div
          className="w-full h-full flex items-center justify-center"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          {current.mediaType === "video" ? (
            <video
              ref={videoRef}
              src={fileUrl(current.mediaUrl)}
              autoPlay
              playsInline
              className="max-h-full max-w-full"
              onTimeUpdate={(e) => {
                const v = e.target;
                if (v.duration) setProgress(v.currentTime / v.duration);
              }}
              onEnded={goNext}
            />
          ) : (
            <img
              src={fileUrl(current.mediaUrl)}
              alt="status"
              className="max-h-full max-w-full object-contain"
            />
          )}
        </div>

        {/* Tap zones */}
        <button
          onClick={goPrev}
          className="absolute left-0 top-0 w-1/3 h-full z-10"
          aria-label="Previous"
        />
        <button
          onClick={goNext}
          className="absolute right-0 top-0 w-1/3 h-full z-10"
          aria-label="Next"
        />

        {/* Caption */}
        {current.caption && (
          <p className="absolute bottom-16 left-0 right-0 text-center text-white text-sm px-6 z-20">
            {current.caption}
          </p>
        )}

        {/* Viewers (own status only) */}
        {isMine && (
          <div className="absolute bottom-0 left-0 right-0 z-20">
            <button
              onClick={() => setShowViewers((v) => !v)}
              className="w-full flex items-center justify-center gap-2 text-white text-sm py-3 bg-gradient-to-t from-black/70 to-transparent"
            >
              👁 {current.viewers?.length || 0} view{current.viewers?.length === 1 ? "" : "s"}
            </button>
            {showViewers && (
              <div className="bg-gray-900 rounded-t-2xl max-h-56 overflow-y-auto px-4 py-3">
                {(current.viewers || []).length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No views yet</p>
                ) : (
                  current.viewers.map((v) => (
                    <div key={v.username} className="flex items-center gap-3 py-2">
                      <UserAvatar username={v.username} size="sm" />
                      <div className="flex-1">
                        <p className="text-white text-sm">{v.username}</p>
                        <p className="text-gray-400 text-xs">
                          {new Date(v.viewedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
