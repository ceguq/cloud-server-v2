import api from "./api";

export type FileModel = {
  id: string;
  user_id?: string;
  folder_id?: string | null;
  original_name: string;
  stored_name?: string;
  path?: string;
  mime_type?: string | null;
  size?: number;
  created_at?: string;
  updated_at?: string;
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

function buildFileUrlForDownload(id: string) {
  return `/files/${id}/download`;
}

export async function getFiles(folderId?: string | null) {
  const params: Record<string, any> = {};

  if (folderId !== undefined && folderId !== null) {
    params.folder_id = folderId;
  }

  // Jika folderId null/undefined: GET /files (tanpa folder_id)
  const res = await api.get("/files", { params });
  return unwrapData<FileModel[]>(res.data);
}

export async function uploadFile(
  file: File,
  folderId?: string | null,
  onUploadProgress?: (progressEvent: any) => void,
  signal?: AbortSignal,
) {
  const formData = new FormData();
  formData.append("file", file);

  if (folderId !== undefined && folderId !== null) {
    formData.append("folder_id", folderId);
  }

  const res = await api.post("/files/upload", formData, {
    headers: {
      // Jangan set Content-Type manual untuk FormData.
    },
    onUploadProgress,
    signal,
  });

  return unwrapData<FileModel>(res.data);
}

export async function renameFile(id: string, originalName: string) {
  const res = await api.patch(`/files/${id}`, { original_name: originalName });
  return unwrapData<FileModel>(res.data);
}

export async function deleteFile(id: string) {
  const res = await api.delete(`/files/${id}`);
  return unwrapData<any>(res.data);
}

export async function downloadFile(id: string, originalName: string) {
  const res = await api.get(buildFileUrlForDownload(id), {
    responseType: "blob",
  });

  const blob = res.data;
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = originalName;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.URL.revokeObjectURL(url);
}

export async function cancelUpload(id: string) {
  const res = await api.post(`/files/${id}/cancel-upload`);
  return unwrapData<any>(res.data);
}

export function canPreviewFile(file: FileModel): boolean {
  const mime = (file.mime_type ?? "").toLowerCase();

  return (
    mime.startsWith("image/") ||
    mime === "application/pdf" ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    // text/code preview (internal)
    mime.startsWith("text/") ||
    mime === "application/json" ||
    mime === "application/xml" ||
    mime === "text/xml" ||
    mime === "application/javascript" ||
    mime === "application/x-javascript" ||
    mime === "text/css" ||
    mime === "text/html" ||
    mime === "text/markdown" ||
    mime === "text/csv" ||
    mime === "application/typescript"
  );
}

export type FilePreviewBlobResult = {
  blob: Blob;
  contentType: string;
};

export async function getFilePreviewBlob(
  id: string,
): Promise<FilePreviewBlobResult> {
  const res = await api.get(`/files/${id}/preview`, {
    responseType: "blob",
  });

  const rawContentType = res.headers?.["content-type"];
  const contentType =
    typeof rawContentType === "string"
      ? rawContentType
      : "application/octet-stream";

  const blob =
    res.data instanceof Blob
      ? res.data
      : new Blob([res.data], { type: contentType });

  return { blob, contentType };
}

const fileService = {
  getFiles,
  uploadFile,
  renameFile,
  deleteFile,
  downloadFile,
  cancelUpload,
  canPreviewFile,
  getFilePreviewBlob,
};

export default fileService;
