import api from "./api";

export type GDriveAccount = {
  id: string;
  label: string | null;
  email: string;
  google_account_id: string | null;
  avatar_url: string | null;
  scopes: string[] | null;
  token_expires_at: string | null;
  connected_at: string | null;
  last_synced_at: string | null;
  revoked_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  status: "connected" | "revoked";
  is_connected: boolean;
  is_revoked: boolean;
};

export type GDriveFile = {
  id: string | null;
  account_id: string;
  account_email: string;
  name: string | null;
  mime_type: string | null;
  icon_link: string | null;
  web_view_link: string | null;
  web_content_link: string | null;
  size: string | number | null;
  created_time: string | null;
  modified_time: string | null;
  shared: boolean | null;
  owner_name: string | null;
  owner_email: string | null;
  source: "gdrive";
};

export type GDriveAccountsResponse = {
  data: GDriveAccount[];
};

export type GDriveFilesResponse = {
  data: GDriveFile[];
  meta: {
    account_count?: number;
    account_id?: string;
    account_email?: string;
    next_page_token?: string | null;
    next_page_tokens?: Record<string, string | null>;
    errors?: Array<{
      account_id: string;
      account_email: string;
      message: string;
    }>;
  };
};

function unwrapData<T>(response: any): T {
  // Backend kemungkinan:
  // 1) { data: [...] }
  // 2) [...]
  // 3) { data: {...} }
  if (response == null) return response as T;
  if (Array.isArray(response)) return response as T;
  if (typeof response !== "object") return response as T;
  if ("data" in response) return (response.data ?? response) as T;
  return response as T;
}

export async function getGDriveAccounts(): Promise<GDriveAccountsResponse> {
  const res = await api.get("/gdrive/accounts");
  // Expect shape: { data: GDriveAccount[] } (or raw data)
  return {
    data: unwrapData<GDriveAccount[]>(res.data),
  };
}

export async function getGDriveFiles(params?: {
  page_size?: number;
  page_tokens?: Record<string, string | null>;
}): Promise<GDriveFilesResponse> {
  const res = await api.get("/gdrive/files", {
    params,
  });

  // Expect shape: { data: GDriveFile[], meta: {...} }
  if (res.data && typeof res.data === "object" && "meta" in res.data) {
    return res.data as GDriveFilesResponse;
  }

  // Fallback: try unwrap data
  return {
    data: unwrapData<GDriveFile[]>(res.data),
    meta: {},
  };
}

export async function getGDriveAccountFiles(
  accountId: string,
  params?: {
    page_size?: number;
    page_token?: string | null;
  },
): Promise<GDriveFilesResponse> {
  const res = await api.get(`/gdrive/accounts/${accountId}/files`, {
    params,
  });

  // Expect shape: { data: GDriveFile[], meta: {...} }
  if (res.data && typeof res.data === "object" && "meta" in res.data) {
    return res.data as GDriveFilesResponse;
  }

  // Fallback: try unwrap data
  return {
    data: unwrapData<GDriveFile[]>(res.data),
    meta: {},
  };
}

export async function disconnectGDriveAccount(accountId: string) {
  const res = await api.delete(`/gdrive/accounts/${accountId}`);
  return res.data;
}

export async function getGDriveConnectUrl(): Promise<string> {
  const res = await api.get("/gdrive/connect");
  const url = res.data?.url;

  if (typeof url !== "string" || url.trim() === "") {
    throw new Error("Invalid OAuth connect URL from backend.");
  }

  return url;
}


