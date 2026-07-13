import { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import authService from "../api/authService";
import UserAvatar from "../components/UserAvatar";

export default function ProfilePage({ onBack }) {
  const { currentUser, updateProfile } = useAuth();
  const [about, setAbout] = useState(currentUser?.about || "");
  const [editingAbout, setEditingAbout] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const saveAbout = async () => {
    setSaving(true);
    try {
      const updated = await authService.updateMyProfile({ about });
      updateProfile(updated);
    } catch (error) {
      console.log("PROFILE SAVE ERROR", error);
    } finally {
      setSaving(false);
      setEditingAbout(false);
    }
  };

  const handleAvatarPick = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const updated = await authService.uploadAvatar(file);
      updateProfile(updated);
    } catch (error) {
      console.log("AVATAR UPLOAD ERROR", error);
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col h-full dark:bg-wa-panelDark bg-white">
      <div className="flex items-center gap-4 px-4 py-4 dark:bg-wa-tealDeep bg-wa-teal text-white">
        <button onClick={onBack} className="p-1 -ml-1">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-medium">Profile</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="flex justify-center py-8 dark:bg-wa-panelDark bg-white">
          <div className="relative">
            <UserAvatar username={currentUser?.username} avatar={currentUser?.avatar} size="xxl" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-wa-teal hover:bg-wa-tealDark text-white flex items-center justify-center shadow-lg disabled:opacity-60"
              title="Change photo"
            >
              {uploadingAvatar ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <circle cx="12" cy="13" r="3.5" strokeWidth={1.8} stroke="currentColor" fill="none" />
                </svg>
              )}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleAvatarPick} />
          </div>
        </div>

        <div className="px-6 py-4 border-b dark:border-gray-800 border-gray-100">
          <p className="text-xs text-wa-teal font-medium mb-1">Username</p>
          <p className="dark:text-gray-100 text-gray-900 text-base">{currentUser?.username}</p>
        </div>

        <div className="px-6 py-4 border-b dark:border-gray-800 border-gray-100">
          <p className="text-xs text-wa-teal font-medium mb-1">About</p>
          {editingAbout ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                maxLength={140}
                className="flex-1 bg-transparent border-b-2 border-wa-teal dark:text-gray-100 text-gray-900 text-base py-1 focus:outline-none"
              />
              <button onClick={saveAbout} disabled={saving} className="text-wa-teal font-medium text-sm">
                Save
              </button>
            </div>
          ) : (
            <div
              onClick={() => setEditingAbout(true)}
              className="flex items-center justify-between cursor-pointer group"
            >
              <p className="dark:text-gray-300 text-gray-700 text-base">
                {about || "Hey there! I am using WhatsApp."}
              </p>
              <span className="opacity-0 group-hover:opacity-100 text-xs dark:text-gray-500 text-gray-400">
                ✏️ edit
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
