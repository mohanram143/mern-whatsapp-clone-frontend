import axiosInstance from "./axiosInstance";

// Calls are logged server-side automatically (the backend tracks each call's
// offer/answer/end over the socket connection and writes the CallLog itself),
// so the frontend only ever needs to read history — never write it.
const callService = {
  getHistory: async () => {
    const res = await axiosInstance.get("/api/calls");
    return res.data;
  },
};

export default callService;
