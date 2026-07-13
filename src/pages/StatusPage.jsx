import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import statusService from "../api/statusService";
import UserAvatar from "../components/UserAvatar";
import StatusViewer from "../components/StatusViewer";

export default function StatusPage() {
  const { currentUser } = useAuth();
  const { socket } = useSocket();
  const [feed, setFeed] = useState([]); // [{ user, items, allViewed }]
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null); // { username, statuses }
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const load = useCallback(() => {
    statusService
      .getFeed()
      .then((data) => setFeed(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onPosted = () => load();
    const onViewed = () => load();
    socket.on("status_posted", onPosted);
    socket.on("status_viewed", onViewed);
    return () => {
      socket.off("status_posted", onPosted);
      socket.off("status_viewed", onViewed);
    };
  }, [socket, load]);

  const handlePost = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      await statusService.post(file);
      load();
    } catch (error) {
      console.log("STATUS POST ERROR", error);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const mine = feed.find((f) => f.user === currentUser?.username);
  const myStatuses = mine?.items || [];

  const others = feed.filter((f) => f.user !== currentUser?.username);
  const unviewed = others.filter((f) => !f.allViewed);
  const viewed = others.filter((f) => f.allViewed);

  const renderRow = ({ user, items, allViewed }) => (
    <button
      key={user}
      onClick={() => setViewing({ username: user, statuses: items })}
      className="w-full flex items-center gap-3 px-4 py-3 dark:hover:bg-gray-800 hover:bg-gray-50 transition-colors text-left"
    >
      <UserAvatar
        username={user}
        size="lg"
        className={`rounded-full ring-2 ring-offset-2 dark:ring-offset-wa-panelDark ring-offset-white ${
          allViewed ? "ring-gray-300 dark:ring-gray-600" : "ring-wa-teal"
        }`}
      />
      <div>
        <p className="font-medium dark:text-gray-100 text-gray-900 text-sm">{user}</p>
        <p className="text-xs dark:text-gray-500 text-gray-400">
          {new Date(items[items.length - 1].createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
    </button>
  );

  return (
    <div className="flex flex-col h-full dark:bg-wa-panelDark bg-white">
      <div className="px-4 py-4 dark:bg-wa-tealDeep bg-wa-teal text-white">
        <h1 className="text-lg font-medium">Status</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-wa-teal border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* My status */}
            <div className="px-4 py-3">
              <div
                onClick={() =>
                  myStatuses.length
                    ? setViewing({ username: currentUser.username, statuses: myStatuses })
                    : fileInputRef.current?.click()
                }
                className="flex items-center gap-3 cursor-pointer"
              >
                <div className="relative">
                  <UserAvatar
                    username={currentUser?.username}
                    avatar={currentUser?.avatar}
                    size="lg"
                    className={
                      myStatuses.length
                        ? "ring-2 ring-wa-teal ring-offset-2 dark:ring-offset-wa-panelDark ring-offset-white rounded-full"
                        : ""
                    }
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-wa-teal text-white flex items-center justify-center text-sm shadow"
                    title="Add status"
                  >
                    {uploading ? (
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      "+"
                    )}
                  </button>
                </div>
                <div>
                  <p className="font-medium dark:text-gray-100 text-gray-900 text-sm">My status</p>
                  <p className="text-xs dark:text-gray-500 text-gray-400">
                    {myStatuses.length
                      ? `${myStatuses.length} update${myStatuses.length > 1 ? "s" : ""}`
                      : "Tap to add status update"}
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                hidden
                onChange={handlePost}
              />
            </div>

            {unviewed.length > 0 && (
              <>
                <p className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide dark:text-gray-500 text-gray-400">
                  Recent updates
                </p>
                {unviewed.map(renderRow)}
              </>
            )}

            {viewed.length > 0 && (
              <>
                <p className="px-4 pt-4 pb-1 text-xs font-semibold uppercase tracking-wide dark:text-gray-500 text-gray-400">
                  Viewed updates
                </p>
                {viewed.map(renderRow)}
              </>
            )}

            {others.length === 0 && !myStatuses.length && (
              <p className="px-6 py-10 text-sm text-center dark:text-gray-500 text-gray-400">
                No status updates yet. Statuses from you and your contacts will appear here.
              </p>
            )}
          </>
        )}
      </div>

      {viewing && (
        <StatusViewer
          username={viewing.username}
          statuses={viewing.statuses}
          onClose={() => {
            setViewing(null);
            load();
          }}
          onViewed={() => load()}
        />
      )}
    </div>
  );
}
