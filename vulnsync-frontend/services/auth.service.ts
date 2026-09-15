// auth.service.ts
import { authApi } from "./authApi";
import axios from "axios";

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthUser {
  access_token: string;
  username: string;
  displayName: string;
  role: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

// Режим аутентификации: "local" - локальные аккаунты (POST /auth/login),
// иначе LDAP (POST /auth/ldap/login). Настраивается через NEXT_PUBLIC_AUTH_MODE.
const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE ?? "ldap";
const LOGIN_ENDPOINT =
  AUTH_MODE === "local" ? "/auth/login" : "/auth/ldap/login";

export const AuthService = {
  async login(dto: LoginDto) {
    try {
      const { data } = await authApi.post<AuthUser>(LOGIN_ENDPOINT, dto);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("username", data.username);
      localStorage.setItem("displayName", data.displayName);
      localStorage.setItem("role", data.role);
      return data;
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        throw new AuthError("Неверный логин или пароль");
      }
      throw e;
    }
  },

  logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
    localStorage.removeItem("displayName");
    localStorage.removeItem("role");
  },
};
