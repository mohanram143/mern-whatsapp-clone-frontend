import axiosInstance from "./axiosInstance";

const messageService = {
  getMessages: async (receiver) => {
    const res = await axiosInstance.get(`/api/messages/${receiver}`);
    return res.data;
  },

  sendMessage: async (receiver, text) => {
    const res = await axiosInstance.post("/api/messages", { receiver, text });
    return res.data;
  },

  uploadFile: async (receiver, file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("receiver", receiver);
    const res = await axiosInstance.post("/api/messages/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  editMessage: async (id, text) => {
    const res = await axiosInstance.put(`/api/messages/${id}`, { text });
    return res.data;
  },

  deleteMessage: async (id, mode) => {
    const res = await axiosInstance.delete(`/api/messages/${id}`, { data: { mode } });
    return res.data;
  },

  clearChat: async (withUser) => {
    const res = await axiosInstance.delete(`/api/messages/clear/${withUser}`);
    return res.data;
  },

  markSeen: async (withUser) => {
    const res = await axiosInstance.put(`/api/messages/seen/${withUser}`);
    return res.data;
  },
};

export default messageService;
