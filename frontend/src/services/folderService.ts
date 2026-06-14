import api from "./api";

export type Folder = {
  id: string;
  name: string;
  parent_id: string | null;
  created_at?: string;
  updated_at?: string;
};

function unwrapData<T>(response: any): T {
  // Backend kemungkinan:
  // 1) { data: [...] }
  // 2) [...]
  // 3) { folder: {...} }
  // 4) { data: {...} }
  if (response == null) return response as T;

  if (Array.isArray(response)) return response as T;
  if (typeof response !== "object") return response as T;

  if ("data" in response) return (response.data ?? response) as T;
  if ("folder" in response) return response.folder as T;

  return response as T;
}

export async function getFolders(
  parentId?: string | null,
  search?: string | null,
) {
  const params: Record<string, any> = {};

  const keyword = search?.trim() ?? "";

  // If searching: send search only (global search)
  if (keyword) {
    params.search = keyword;
  } else {
    // Legacy behavior: send parent_id if provided
    if (parentId !== undefined) {
      params.parent_id = parentId;
    }
  }

  const res = await api.get("/folders", { params });
  return unwrapData<Folder[]>(res.data);
}


export async function createFolder(name: string, parentId?: string | null) {
  const payload: Record<string, any> = { name };
  if (parentId !== undefined) payload.parent_id = parentId;

  const res = await api.post("/folders", payload);
  return unwrapData<Folder>(res.data);
}

export async function renameFolder(id: string, name: string) {
  // rename spec: gunakan patch {name, parent_id} bila backend butuh parent_id.
  // Namun service ini hanya rename name; parent_id akan diambil null bila tidak disediakan.
  // Untuk aman, kita kirim parent_id: null hanya jika user tidak punya parent context.
  const res = await api.patch(`/folders/${id}`, { name });
  return unwrapData<Folder>(res.data);
}

export async function moveFolder(folderId: string, parentId: string | null) {
  const res = await api.patch(`/folders/${folderId}/move`, {
    parent_id: parentId,
  });
  return unwrapData<Folder>(res.data);
}

export async function deleteFolder(id: string) {
  const res = await api.delete(`/folders/${id}`);
  return unwrapData<any>(res.data);
}


const folderService = {
  getFolders,
  createFolder,
  renameFolder,
  moveFolder,
  deleteFolder,
};


export default folderService;
