import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Если токен протух — выход и редирект
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("username");
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);
