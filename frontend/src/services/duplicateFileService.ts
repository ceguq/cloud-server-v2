import api from "./api";

export type DuplicateFileItem = {
  id: string;
  original_name: string;
  mime_type: string | null;
  size: number;
  created_at: string;
  updated_at: string;
  folder_id: string | null;
};

export type DuplicateFileGroup = {
  duplicate_key: string;
  original_name: string;
  size: number;
  size_human: string;
  count: number;
  total_size: number;
  total_wasted_size: number;
  files: DuplicateFileItem[];
};

export type DuplicateFilesMeta = {
  groups_count: number;
  files_count: number;
  total_wasted_size: number;
};

export type DuplicateFilesResponse = {
  data: DuplicateFileGroup[];
  meta: DuplicateFilesMeta;
};

function unwrapData<T>(response: any): T {
  if (response == null) return response as T;
  if (Array.isArray(response)) return response as T;
  if (typeof response !== "object") return response as T;
  if ("data" in response) return (response.data ?? response) as T;
  return response as T;
}

export async function getDuplicateFiles(): Promise<DuplicateFilesResponse> {
  const res = await api.get("/files/duplicates");

  // Backend expected shape:
  // { data: DuplicateFileGroup[], meta: {...} }
  // But be tolerant and unwrap "data" if needed.
  const raw = res.data as any;

  if (raw && typeof raw === "object" && "meta" in raw) {
    return raw as DuplicateFilesResponse;
  }

  // Fallback: if backend returns { data: [...], meta: {...} } but typed
  // might be nested differently.
  const data = unwrapData<DuplicateFileGroup[]>(raw);
  const meta = (raw?.meta ?? {}) as DuplicateFilesMeta;

  return {
    data,
    meta,
  };
}

