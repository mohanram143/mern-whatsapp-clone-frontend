import axiosInstance from "./axiosInstance";

const authService = {
  register: async (username, password) => {
    const res = await axiosInstance.post("/api/auth/register", { username, password });
    return res.data;
  },

  login: async (username, password) => {
    const res = await axiosInstance.post("/api/auth/login", { username, password });
    return res.data;
  },

  // Search the user directory (sidebar "start new chat" search bar)
  searchUsers: async (query) => {
    const res = await axiosInstance.get("/api/auth/users/search", {
      params: { q: query },
    });
    return res.data;
  },

  // Everyone the current user already has a conversation with
  getConversations: async () => {
    const res = await axiosInstance.get("/api/auth/conversations");
    return res.data;
  },

  getMyProfile: async () => {
    const res = await axiosInstance.get("/api/auth/me");
    return res.data;
  },

  updateMyProfile: async ({ about }) => {
    const res = await axiosInstance.put("/api/auth/me", { about });
    return res.data;
  },

  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append("avatar", file);
    const res = await axiosInstance.post("/api/auth/me/avatar", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  getUserProfile: async (username) => {
    const res = await axiosInstance.get(`/api/auth/users/${username}`);
    return res.data;
  },

  verifyToken: async () => {
    try {
      await axiosInstance.get("/api/auth/me");
      return true;
    } catch {
      return false;
    }
  },

  saveSession: (token, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  },

  updateStoredUser: (patch) => {
    const u = authService.getStoredUser() || {};
    const updated = { ...u, ...patch };
    localStorage.setItem("user", JSON.stringify(updated));
    return updated;
  },

  clearSession: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },

  getStoredUser: () => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  },

  getToken: () => localStorage.getItem("token"),
};

export default authService;
