const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

export const api = {
  async request(endpoint: string, options: RequestInit = {}) {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const headers = new Headers(options.headers);
    headers.set("Content-Type", "application/json");

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw error;
    }

    return response.json();
  },

  get: (endpoint: string) => api.request(endpoint),

  post: (endpoint: string, body: any) =>
    api.request(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  put: (endpoint: string, body: any) =>
    api.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: (endpoint: string) =>
    api.request(endpoint, {
      method: "DELETE",
    }),

  auth: {
    me: () => api.request("/auth/me"),
    register: (email: string, password: string, name: string) =>
      api.request("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      }),

    login: (email: string, password: string) =>
      api.request("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),

    google: (
      googleId: string,
      email: string,
      name: string,
      profileImage?: string,
    ) =>
      api.request("/auth/google", {
        method: "POST",
        body: JSON.stringify({ googleId, email, name, profileImage }),
      }),

    getCurrentUser: () => api.request("/auth/me"),

    updateProfile: (data: any) =>
      api.request("/auth/me", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
  },

  habits: {
    getAll: () => api.request("/habits"),

    create: (habitData: any) =>
      api.request("/habits", {
        method: "POST",
        body: JSON.stringify(habitData),
      }),

    getById: (id: string) => api.request(`/habits/${id}`),

    update: (id: string, data: any) =>
      api.request(`/habits/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    delete: (id: string) =>
      api.request(`/habits/${id}`, {
        method: "DELETE",
      }),

    log: (id: string, logData: any) =>
      api.request(`/habits/${id}/log`, {
        method: "POST",
        body: JSON.stringify(logData),
      }),

    getLogs: (id: string, startDate?: string, endDate?: string) => {
      let url = `/habits/${id}/logs`;
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (params.toString()) url += `?${params.toString()}`;
      return api.request(url);
    },

    getStats: (id: string) => api.request(`/habits/${id}/stats`),
  },

  analytics: {
    getDaily: (startDate: string, endDate: string) =>
      api.request(`/analytics/daily?startDate=${startDate}&endDate=${endDate}`),

    getWeekly: (startDate: string, endDate: string) =>
      api.request(
        `/analytics/weekly?startDate=${startDate}&endDate=${endDate}`,
      ),

    getHeatmap: (year?: number) => {
      let url = "/analytics/heatmap";
      if (year) url += `?year=${year}`;
      return api.request(url);
    },

    getOverview: () => api.request("/analytics/overview"),
  },
};
