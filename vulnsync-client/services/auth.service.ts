// auth.service.ts
import { api } from "./api";

export interface LoginDto {
  username: string;
  password: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export const AuthService = {
  async login(dto: LoginDto) {
    try {
      const { data } = await api.post("/auth/login", dto);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("username", data.username);
      return data;
    } catch (e: any) {
      if (e.response?.status === 401) {
        throw new AuthError("Неверный логин или пароль");
      }
      throw e;
    }
  },

  async me() {
    const { data } = await api.get("/auth/me");
    return data;
  },

  logout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("username");
  },
};
