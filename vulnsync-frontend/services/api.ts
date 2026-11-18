import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";
import { authApi } from "./authApi";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api",
  // Access- и refresh-токены живут в HttpOnly-куках: браузер отправляет их сам.
  withCredentials: true,
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

type SessionProfile = {
  username?: string;
  displayName?: string;
  role?: string;
};

// Один общий запрос на обновление: параллельные 401 не плодят refresh-вызовы.
let refreshPromise: Promise<unknown> | null = null;

function refreshSession(): Promise<unknown> {
  if (!refreshPromise) {
    refreshPromise = authApi
      .post<SessionProfile>("/auth/refresh")
      .then((response) => {
        // Роль могла измениться на бэкенде — обновляем профиль для UI.
        if (typeof window !== "undefined") {
          const { username, displayName, role } = response.data ?? {};
          if (username) window.localStorage.setItem("username", username);
          if (displayName) {
            window.localStorage.setItem("displayName", displayName);
          }
          if (role) window.localStorage.setItem("role", role);
        }
        return response;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function isAuthEndpoint(url: string | undefined): boolean {
  return (
    !!url &&
    (url.includes("/auth/login") ||
      url.includes("/auth/ldap/login") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/logout"))
  );
}

function clearSessionAndRedirect() {
  if (typeof window === "undefined") return;

  window.localStorage.removeItem("username");
  window.localStorage.removeItem("displayName");
  window.localStorage.removeItem("role");
  window.location.href = "/login";
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    if (
      typeof window === "undefined" ||
      status !== 401 ||
      !config ||
      isAuthEndpoint(config.url)
    ) {
      return Promise.reject(error);
    }

    // Access-токен истёк: один раз обновляем сессию по refresh-куке и
    // повторяем исходный запрос. Иначе — выход.
    if (!config._retry) {
      config._retry = true;
      try {
        await refreshSession();
        return api(config);
      } catch {
        // refresh не удался — обрабатываем как выход ниже.
      }
    }

    clearSessionAndRedirect();
    return Promise.reject(error);
  },
);
