import api from "./api";

export type RecentFile = {
  id: string;
  original_name: string;
  mime_type: string | null;
  size: number;
  size_human: string;
  folder_id: string | null;
  folder_name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function unwrapRecentFilesResponse(payload: any): RecentFile[] {
  // Backend spec: { data: [ ... ] }
  if (payload?.data && Array.isArray(payload.data)) {
    return payload.data as RecentFile[];
  }

  // Safety: sometimes wrapped as { data: { data: [...] } }
  if (payload?.data?.data && Array.isArray(payload.data.data)) {
    return payload.data.data as RecentFile[];
  }

  // Safety: sometimes directly array
  if (Array.isArray(payload)) {
    return payload as RecentFile[];
  }

  return [];
}

async function getRecentFiles(): Promise<RecentFile[]> {
  const res = await api.get("/files/recent");
  return unwrapRecentFilesResponse(res.data);
}

const recentFileService = {
  getRecentFiles,
};

export default recentFileService;
