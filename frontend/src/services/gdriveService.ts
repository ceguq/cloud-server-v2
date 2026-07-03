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
  storage_quota?: {
    limit: string | number | null;
    usage: string | number | null;
    usage_in_drive: string | number | null;
    usage_in_drive_trash: string | number | null;
  } | null;
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
  starred?: boolean | null;
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
    folder_id?: string | null;
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

export async function getTrashedGDriveFiles(
  accountId: string,
  params?: {
    page_token?: string;
    page_size?: number;
  },
): Promise<GDriveFilesResponse> {
  const res = await api.get(`/gdrive/accounts/${accountId}/trash`, {
    params,
  });

  // Backend trashedFiles returns: { success, data, meta }
  if (res.data && typeof res.data === "object" && "meta" in res.data) {
    return res.data as GDriveFilesResponse;
  }

  return {
    data: unwrapData<GDriveFile[]>(res.data),
    meta: {},
  };
}

export type GDriveUploadResponse = {
  message: string;
  data: GDriveFile;
};

export async function uploadGDriveFile(
  accountId: string,
  file: File,
): Promise<GDriveUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post(
    `/gdrive/accounts/${accountId}/files/upload`,
    formData,
  );
  return res.data;
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

function getFileNameFromContentDisposition(
  contentDisposition: string | undefined,
): string | undefined {
  if (typeof contentDisposition !== "string") return undefined;

  // content-disposition: attachment; filename="..."
  // Be tolerant to quoted/unquoted variants.
  const match = contentDisposition.match(/filename\s*=\s*"?([^";]+)"?/i);
  if (!match?.[1]) return undefined;
  return match[1].trim();
}

export async function downloadGDriveFile(
  accountId: string,
  fileId: string,
  fallbackName?: string,
): Promise<void> {
  const res = await api.get(
    `/gdrive/accounts/${accountId}/files/${fileId}/download`,
    {
      responseType: "blob",
    },
  );

  const blob = res.data as Blob;

  const cd: string | undefined =
    typeof res.headers?.["content-disposition"] === "string"
      ? (res.headers?.["content-disposition"] as string)
      : undefined;

  let fileName: string | undefined;
  if (cd) {
    fileName = getFileNameFromContentDisposition(cd);
  }

  const nameToUse = fileName || fallbackName || `gdrive-file`;

  const url = window.URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = url;
    a.download = nameToUse;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    window.URL.revokeObjectURL(url);
  }
}

export async function getGDriveFileBlob(
  accountId: string,
  fileId: string,
): Promise<{ blob: Blob; contentType: string; fileName?: string }> {
  const res = await api.get(
    `/gdrive/accounts/${accountId}/files/${fileId}/download`,
    {
      responseType: "blob",
    },
  );

  const blob = res.data as Blob;

  const contentTypeFromHeader =
    typeof res.headers?.["content-type"] === "string"
      ? (res.headers?.["content-type"] as string)
      : undefined;

  const contentType =
    contentTypeFromHeader || blob.type || "application/octet-stream";

  const cd: string | undefined =
    typeof res.headers?.["content-disposition"] === "string"
      ? (res.headers?.["content-disposition"] as string)
      : undefined;

  const fileName = getFileNameFromContentDisposition(cd);

  return {
    blob,
    contentType,
    fileName: fileName || undefined,
  };
}

export async function trashGDriveFile(
  accountId: string,
  fileId: string,
): Promise<any> {
  const res = await api.post(
    `/gdrive/accounts/${accountId}/files/${fileId}/trash`,
  );

  return res.data;
}

export async function restoreGDriveFile(
  accountId: string,
  fileId: string,
): Promise<any> {
  const res = await api.post(
    `/gdrive/accounts/${accountId}/files/${fileId}/restore`,
  );

  return res.data;
}

export async function updateGDriveFileVisibility(
  accountId: string,
  fileId: string,
  visibility: "public" | "private",
): Promise<{ message: string; data: GDriveFile }> {
  const res = await api.post(
    `/gdrive/accounts/${accountId}/files/${fileId}/visibility`,
    { visibility },
  );

  return res.data;
}

export async function deleteGDriveFilePermanently(
  accountId: string,
  fileId: string,
): Promise<{
  success: boolean;
  message?: string;
  data?: { id: string; deleted: boolean };
}> {
  const res = await api.delete(
    `/gdrive/accounts/${accountId}/files/${fileId}/permanent`,
  );

  return res.data;
}

export async function renameGDriveFile(
  accountId: string,
  fileId: string,
  newName: string,
): Promise<{ message: string; data: GDriveFile }> {
  const res = await api.patch(
    `/gdrive/accounts/${accountId}/files/${fileId}/rename`,
    { name: newName },
  );

  return res.data;
}

export async function createGDriveFolder(
  accountId: string,
  name: string,
  parentId?: string | null,
): Promise<GDriveFile> {
  const payload: Record<string, any> = { name };
  if (parentId !== undefined) {
    payload.parent_id = parentId;
  }

  const res = await api.post(
    `/gdrive/accounts/${accountId}/folders`,
    payload,
  );

  return res.data?.data ?? res.data;
}

















