// services/notifications.service.ts
import { api } from "./api";
import axios from "axios";

export interface ProductTypeNotification {
  id: string;
  ddProductTypeId: number;
  emails: string;
  createdAt?: string;
  updatedAt?: string;
}

export const NotificationsService = {
  async getProductTypeNotification(
    ddProductTypeId: number,
  ): Promise<ProductTypeNotification | null> {
    try {
      const { data } = await api.get<ProductTypeNotification>(
        "/notifications/product-type",
        {
          params: { ddProductTypeId },
        },
      );

      return data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        return null;
      }

      throw err;
    }
  },

  async saveProductTypeNotification(
    ddProductTypeId: number,
    emails: string,
  ): Promise<ProductTypeNotification> {
    const { data } = await api.post<ProductTypeNotification>(
      "/notifications/product-type",
      { ddProductTypeId, emails },
    );
    return data;
  },
};
