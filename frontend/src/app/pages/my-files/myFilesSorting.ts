export type SortDirection = "asc" | "desc";
export type SortBy = "name" | "date" | "size" | "type";

type SortableFolder = {
  name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SortableFile = {
  original_name?: string | null;
  mime_type?: string | null;
  size?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export function getFolderDateValue(folder: SortableFolder): number {
  const created = folder.created_at ? new Date(folder.created_at).getTime() : 0;
  const updated = folder.updated_at ? new Date(folder.updated_at).getTime() : 0;
  return created || updated || 0;
}

export function getFileDateValue(file: SortableFile): number {
  const created = file.created_at ? new Date(file.created_at).getTime() : 0;
  const updated = file.updated_at ? new Date(file.updated_at).getTime() : 0;
  return created || updated || 0;
}

function getFileTypeValue(file: SortableFile): string {
  const mime = (file.mime_type ?? "").toLowerCase();
  if (mime) {
    if (mime.includes("pdf")) return "pdf";
    if (mime.includes("presentation")) return "pptx";
    if (mime.includes("image")) return "image";
    if (mime.includes("zip")) return "zip";
    if (mime.includes("audio")) return "audio";
    if (mime.includes("video")) return "video";
    if (mime.includes("spreadsheet")) return "xlsx";
    const ext = mime.split("/")[1];
    return ext ?? mime;
  }
  // fallback to extension from original name
  const parts = (file.original_name ?? "").split(".");
  return (parts[parts.length - 1] ?? "").toLowerCase();
}

export function sortFolders<T extends SortableFolder>(
  folders: T[],
  sortBy: SortBy,
  sortDirection: SortDirection,
): T[] {
  const arr = [...folders];
  arr.sort((a, b) => {
    const dir = sortDirection === "asc" ? 1 : -1;

    if (sortBy === "name") {
      const an = (a.name ?? "").toLowerCase();
      const bn = (b.name ?? "").toLowerCase();
      return an.localeCompare(bn) * dir;
    }

    if (sortBy === "date") {
      return (getFolderDateValue(a) - getFolderDateValue(b)) * dir;
    }

    // folders: size = 0, type = "folder" (semua sama, jadi urutan tetap)
    if (sortBy === "size") return 0;
    if (sortBy === "type") return 0;

    return 0;
  });
  return arr;
}

export function sortFiles<T extends SortableFile>(
  files: T[],
  sortBy: SortBy,
  sortDirection: SortDirection,
): T[] {
  const arr = [...files];
  arr.sort((a, b) => {
    const dir = sortDirection === "asc" ? 1 : -1;

    if (sortBy === "name") {
      const an = (a.original_name ?? "").toLowerCase();
      const bn = (b.original_name ?? "").toLowerCase();
      return an.localeCompare(bn) * dir;
    }

    if (sortBy === "date") {
      return (getFileDateValue(a) - getFileDateValue(b)) * dir;
    }

    if (sortBy === "size") {
      const as = typeof a.size === "number" ? a.size : 0;
      const bs = typeof b.size === "number" ? b.size : 0;
      return (as - bs) * dir;
    }

    if (sortBy === "type") {
      const at = getFileTypeValue(a);
      const bt = getFileTypeValue(b);
      return at.localeCompare(bt) * dir;
    }

    return 0;
  });
  return arr;
}
