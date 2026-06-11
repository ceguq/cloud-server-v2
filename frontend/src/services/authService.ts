import api from "./api";

export type LoginResponse = {
  message: string;
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
};

export const authService = {
  async login(email: string, password: string) {
    const response = await api.post<LoginResponse>("/auth/login", {
      email,
      password,
    });

    return response.data;
  },

  async logout() {
    const response = await api.post("/auth/logout");
    return response.data;
  },

  async me() {
    const response = await api.get("/auth/me");
    return response.data;
  },
};
