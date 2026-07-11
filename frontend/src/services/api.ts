import axios from "axios";

const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

const apiBaseUrl = (() => {
  if (configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  if (import.meta.env.PROD) {
    throw new Error("VITE_API_BASE_URL is required in production.");
  }

  const fallback = "http://127.0.0.1:8000/api";

  console.warn(
    `VITE_API_BASE_URL is missing; using local development fallback ${fallback}`,
  );

  return fallback;
})();

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nimbus_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default api;
