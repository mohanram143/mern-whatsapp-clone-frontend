// Single source of truth for the backend URL.
// Set VITE_API_URL in your .env (or on Vercel) to your deployed backend.
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Turn a relative path returned by the backend (e.g. "/uploads/x.png") into
// a full, usable URL. Also passes through already-absolute URLs untouched.
export function fileUrl(path) {
  if (!path) return "";
  if (path.startsWith("http") || path.startsWith("blob:") || path.startsWith("data:")) {
    return path;
  }
  return `${API_URL}${path}`;
}

// ---- File-type helpers (used for previews / icons in chat & status) ----

export function getExt(name = "") {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

export function isImageFile(type = "", name = "") {
  return type.startsWith("image") || /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(name);
}

export function isVideoFile(type = "", name = "") {
  return type.startsWith("video") || /\.(mp4|webm|mov|mkv|avi)$/i.test(name);
}

export function isAudioFile(type = "", name = "") {
  return type.startsWith("audio") || /\.(mp3|wav|ogg|m4a)$/i.test(name);
}

export function isPdfFile(type = "", name = "") {
  return type === "application/pdf" || /\.pdf$/i.test(name);
}

export function formatFileSize(bytes = 0) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = bytes;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

// Small icon glyph by file extension, used in the file-attachment card
export function fileIcon(name = "") {
  const ext = getExt(name);
  if (ext === "pdf") return "📕";
  if (["doc", "docx"].includes(ext)) return "📘";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📗";
  if (["ppt", "pptx"].includes(ext)) return "📙";
  if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
  if (["txt", "md"].includes(ext)) return "📄";
  return "📎";
}
