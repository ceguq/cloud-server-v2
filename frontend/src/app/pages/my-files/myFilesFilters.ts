import type { FileTypeFilterValue } from "./myFilesFormatters";

type FileTypeFilterInput = {
  mime_type?: string | null;
  original_name?: string | null;
};

export function fileMatchesTypeFilter(
  file: FileTypeFilterInput,
  filter: FileTypeFilterValue,
): boolean {
  if (filter === "all") return true;

  const mime = (file.mime_type ?? "").toLowerCase();
  const nameLower = (file.original_name ?? "").toLowerCase();
  const ext = nameLower.includes(".")
    ? (nameLower.split(".").pop() ?? "")
    : "";

  const isImage =
    mime.startsWith("image/") ||
    ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);

  const isPdf = mime === "application/pdf" || ext === "pdf";

  const isDocument =
    ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"].includes(
      ext,
    ) ||
    mime.includes("word") ||
    mime.includes("officedocument") ||
    mime.includes("presentation") ||
    mime.includes("spreadsheet");

  const isVideo =
    mime.startsWith("video/") ||
    ["mp4", "mkv", "avi", "mov", "webm"].includes(ext);

  const isAudio =
    mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a"].includes(ext);

  const isArchive =
    ["zip", "rar", "7z", "tar", "gz"].includes(ext) ||
    mime.includes("zip") ||
    mime.includes("compressed") ||
    mime.includes("tar");

  const isOthers = !(
    isImage ||
    isPdf ||
    isDocument ||
    isVideo ||
    isAudio ||
    isArchive
  );

  switch (filter) {
    case "images":
      return isImage;
    case "pdf":
      return isPdf;
    case "documents":
      return isDocument;
    case "videos":
      return isVideo;
    case "audio":
      return isAudio;
    case "archives":
      return isArchive;
    case "others":
      return isOthers;
    case "folders":
      return false;
    default:
      return true;
  }
}
