import { api } from "./api";

export interface LoginDto {
  username: string;
  password: string;
}

export const AuthService = {
  async login(dto: LoginDto) {
    const { data } = await api.post("/auth/login", dto);
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("username", data.username);
    return data;
  },

  async me() {
    const { data } = await api.get("/auth/me");
    return data;
  },

  logout() {
    localStorage.removeItem("access_token");
  },
};
