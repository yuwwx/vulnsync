import { api } from "./api";

export type UserRole = "USER" | "VIEWER" | "ADMIN";

export interface ManagedUser {
  id: string;
  username: string;
  displayName?: string | null;
  email?: string | null;
  jobTitle?: string | null;
  role: UserRole;
  allowedProductTypeIds: number[];
  createdAt: string;
  updatedAt: string;
}

export const UsersService = {
  async list(): Promise<ManagedUser[]> {
    const { data } = await api.get<ManagedUser[]>("/users");
    return data;
  },

  async updateProductTypes(
    id: string,
    allowedProductTypeIds: number[],
  ): Promise<ManagedUser> {
    const { data } = await api.patch<ManagedUser>(`/users/${id}/product-types`, {
      allowedProductTypeIds,
    });
    return data;
  },
};
