import axiosInstance from "./axiosInstance";

const statusService = {
  // GET /api/status -> { username: [status, status, ...], ... }
  getFeed: async () => {
    const res = await axiosInstance.get("/api/status");
    return res.data;
  },

  post: async (file, caption = "") => {
    const formData = new FormData();
    formData.append("media", file);
    formData.append("caption", caption);
    const res = await axiosInstance.post("/api/status", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  markViewed: async (id) => {
    const res = await axiosInstance.post(`/api/status/${id}/view`);
    return res.data;
  },

  remove: async (id) => {
    const res = await axiosInstance.delete(`/api/status/${id}`);
    return res.data;
  },
};

export default statusService;
