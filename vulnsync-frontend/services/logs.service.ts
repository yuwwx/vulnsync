import { api } from "./api";

export interface LogEntry {
  id: string;
  action: string;
  userId?: string;
  ip?: string;
  meta?: {
    result?: string;
    username?: string;
    userAgent?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const LogsService = {
  async getLatest() {
    const { data } = await api.get<LogEntry[]>("/logs");
    return data;
  },
};
