export type FileTypeFilterValue =
  | "all"
  | "folders"
  | "images"
  | "pdf"
  | "documents"
  | "videos"
  | "audio"
  | "archives"
  | "others";

export function formatBytes(bytes?: number | null): string {
  const v = typeof bytes === "number" ? bytes : 0;
  if (v === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(v) / Math.log(1024)),
    units.length - 1,
  );
  const num = v / Math.pow(1024, i);
  const fixed = num >= 10 ? 1 : 2;
  return `${num.toFixed(fixed)} ${units[i]}`;
}

export function getTypeLabel(mime?: string | null): string {
  if (!mime) return "FILE";

  const normalized = String(mime).trim().toLowerCase();

  // Office (prefer explicit MIME when available)
  if (
    normalized === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalized === "application/msword" ||
    normalized.includes("wordprocessingml") ||
    normalized.includes("msword") ||
    normalized.includes("/word")
  ) {
    return "DOCX";
  }

  if (
    normalized === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    normalized === "application/vnd.ms-excel" ||
    normalized.includes("spreadsheetml") ||
    normalized.includes("/excel")
  ) {
    return "XLSX";
  }

  if (
    normalized === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    normalized === "application/vnd.ms-powerpoint" ||
    normalized.includes("presentationml") ||
    normalized.includes("/powerpoint")
  ) {
    return "PPTX";
  }

  // PDF
  if (
    normalized === "application/pdf" ||
    normalized.endsWith("/pdf") ||
    normalized.includes("+pdf")
  ) {
    return "PDF";
  }

  // Images
  if (
    normalized === "image/jpeg" ||
    normalized === "image/jpg" ||
    normalized.endsWith("/jpeg") ||
    normalized.endsWith("/jpg")
  ) {
    return "JPG";
  }

  if (normalized === "image/png" || normalized.endsWith("/png")) return "PNG";
  if (normalized === "image/webp" || normalized.endsWith("/webp")) return "WEBP";
  if (normalized === "image/gif" || normalized.endsWith("/gif")) return "GIF";
  if (normalized.startsWith("image/")) return "IMAGE";

  // Video
  if (normalized.startsWith("video/")) return "VIDEO";

  // Audio
  if (normalized.startsWith("audio/")) return "AUDIO";

  // Archives
  if (
    normalized === "application/zip" ||
    normalized.includes("/zip") ||
    normalized.includes("zip")
  ) {
    return "ZIP";
  }

  // Text / CSV / JSON / XML
  if (
    normalized.startsWith("text/") ||
    normalized.includes("json") ||
    normalized.includes("xml") ||
    normalized.includes("csv")
  ) {
    return "TXT";
  }

  return "FILE";
}

export function fileTypeFilterLabel(value: FileTypeFilterValue): string {
  switch (value) {
    case "all":
      return "All";
    case "folders":
      return "Folders";
    case "images":
      return "Images";
    case "pdf":
      return "PDF";
    case "documents":
      return "Documents";
    case "videos":
      return "Videos";
    case "audio":
      return "Audio";
    case "archives":
      return "Archives";
    case "others":
      return "Others";
    default:
      return "All";
  }
}
