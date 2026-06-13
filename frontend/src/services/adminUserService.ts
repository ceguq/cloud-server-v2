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

export async function getAdminUsers(): Promise<AdminUser[]> {
  const response = await api.get<AdminUsersResponse>("/admin/users");
  return response.data.data;
}
