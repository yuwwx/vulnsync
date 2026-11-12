import { api } from "./api";

export interface LogEntry {
  id: string;
  action: string;
  service?: string | null;
  description?: string | null;
  userId?: string;
  username?: string | null;
  ip?: string;
  destinationIp?: string | null;
  meta?: {
    result?: string;
    username?: string;
    userAgent?: string;
    reason?: string;
    role?: string;
  };
  createdAt: string;
}

export const LogsService = {
  async getLatest() {
    const { data } = await api.get<LogEntry[]>("/logs");
    return data;
  },
};
