import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login if unauthorized
      window.location.href = "/auth/signin";
    }
    return Promise.reject(error);
  }
);

export default api;

// User API
export const userApi = {
  get: () => api.get("/user"),
  update: (data: Record<string, unknown>) => api.patch("/user", data),
};

// Folder API
export const folderApi = {
  getAll: () => api.get("/folder"),
  get: (id: string) => api.get(`/folder/${id}`),
  create: (data: { name?: string; parentFolderId?: string | null }) =>
    api.post("/folder", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/folder/${id}`, data),
  delete: (id: string) => api.delete(`/folder/${id}`),
};

// Page API
export const pageApi = {
  getAll: (folderId?: string | null) =>
    api.get("/page", { params: { folderId } }),
  get: (id: string) => api.get(`/page/${id}`),
  create: (
    data: { title?: string; folderId: string; icon?: string } // folderId is required
  ) => api.post("/page", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/page/${id}`, data),
  delete: (id: string) => api.delete(`/page/${id}`),
};

// Entry API
export const entryApi = {
  create: (
    pageId: string,
    dayIndex: number,
    data: {
      title: string;
      amount: number;
      description?: string;
      category?: string;
      tags?: string[];
    }
  ) => api.post(`/page/${pageId}/day/${dayIndex}/entry`, data),
  update: (
    pageId: string,
    dayIndex: number,
    entryId: string,
    data: Record<string, unknown>
  ) => api.patch(`/page/${pageId}/day/${dayIndex}/entry/${entryId}`, data),
  delete: (pageId: string, dayIndex: number, entryId: string) =>
    api.delete(`/page/${pageId}/day/${dayIndex}/entry/${entryId}`),
};

// AI API
export const aiApi = {
  generateDailySummary: (provider?: string) =>
    api.post("/ai/summary/daily", { provider }),
  generateWeeklySummary: (provider?: string) =>
    api.post("/ai/summary/weekly", { provider }),
  getDailySummaries: (limit?: number) =>
    api.get("/ai/summary/daily", { params: { limit } }),
  getWeeklySummaries: (limit?: number) =>
    api.get("/ai/summary/weekly", { params: { limit } }),
};

// Export API
export const exportApi = {
  generatePdf: async (pageId: string) => {
    const response = await api.post(
      "/export/pdf",
      { pageId },
      { responseType: "blob" }
    );
    return response.data;
  },
};
