import api from "./api";

export type AdminUser = {
  id: number | string;
  name: string;
  email: string;
  role: "admin" | "user" | string;
  created_at?: string;
  updated_at?: string;
};

type AdminUsersResponse = {
  data: AdminUser[];
};

export type CreateAdminUserPayload = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
};

export async function getAdminUsers(): Promise<AdminUser[]> {
  const response = await api.get<AdminUsersResponse>("/admin/users");
  return response.data.data;
}

export async function createAdminUser(
  payload: CreateAdminUserPayload,
): Promise<AdminUser> {
  const response = await api.post<{ user: AdminUser }>("/admin/users", payload);
  return response.data.user;
}
