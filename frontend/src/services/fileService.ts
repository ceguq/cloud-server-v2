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

const fileService = {
  getFiles,
  uploadFile,
  renameFile,
  deleteFile,
  downloadFile,
  cancelUpload,
};

export default fileService;
