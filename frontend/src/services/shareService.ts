import api from "./api";

export type ShareLinkFile = {
  id: string;
  original_name: string;
  mime_type: string | null;
  size: number | null;
  created_at: string | null;
};

export type ShareLink = {
  id: string;
  token: string;
  file?: ShareLinkFile | null;
  download_count?: number;
  expires_at?: string | null;
  password?: string | null;
  created_at?: string | null;
};

function unwrapData<T>(response: any): T {
  if (response == null) return response as T;
  if (Array.isArray(response)) return response as T;
  if (typeof response !== "object") return response as T;
  if ("data" in response) return (response.data ?? response) as T;
  return response as T;
}

export async function getShareLinks() {
  const res = await api.get("/share-links");
  return unwrapData<ShareLink[]>(res.data);
}

export type CreateShareLinkPayload = {
  password?: string | null;
  expires_at?: string | null;
};

export async function createShareLink(fileId: string, payload?: CreateShareLinkPayload) {
  const body = payload ? { ...payload } : {};
  const res = await api.post(`/files/${fileId}/share`, body);
  return unwrapData<ShareLink>(res.data);
}

export async function deleteShareLink(shareLinkId: string) {
  const res = await api.delete(`/share-links/${shareLinkId}`);
  return unwrapData<any>(res.data);
}

export function getPublicShareUrl(token: string) {
  return `${window.location.origin}/share/${token}`;
}

export function getPublicDownloadUrl(token: string) {
  const apiBase =
    (import.meta as any).env?.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

  return `${apiBase}/share/${token}/download`;
}
