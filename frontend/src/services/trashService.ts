import api from "./api";

export type TrashFile = {
  id: string;
  original_name: string;
  mime_type: string | null;
  size: number;
  deleted_at: string | null;
  folder_id: string | null;
  created_at?: string | null;
};

export type TrashFolder = {
  id: string;
  name: string;
  parent_id: string | null;
  deleted_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function unwrapData<T>(payload: any): T[] {
  if (payload?.data && Array.isArray(payload.data)) {
    return payload.data as T[];
  }
  if (Array.isArray(payload)) {
    return payload as T[];
  }
  return [];
}

export async function getTrashFiles(): Promise<TrashFile[]> {
  const res = await api.get("/trash/files");
  return unwrapData<TrashFile>(res.data);
}

export async function getTrashFolders(): Promise<TrashFolder[]> {
  const res = await api.get("/trash/folders");
  return unwrapData<TrashFolder>(res.data);
}

export async function restoreFile(id: string): Promise<TrashFile | null> {
  const res = await api.post(`/trash/files/${id}/restore`);
  return (res.data?.data as TrashFile) ?? null;
}

export async function restoreFolder(id: string): Promise<TrashFolder | null> {
  const res = await api.post(`/trash/folders/${id}/restore`);
  return (res.data?.data as TrashFolder) ?? null;
}

export async function forceDeleteFile(id: string): Promise<void> {
  await api.delete(`/trash/files/${id}/force`);
}

export async function forceDeleteFolder(id: string): Promise<void> {
  await api.delete(`/trash/folders/${id}/force`);
}
