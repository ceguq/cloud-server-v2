export const PREVIEW_IMAGE_MIN_SCALE = 0.5;
export const PREVIEW_IMAGE_MAX_SCALE = 4;
export const PREVIEW_IMAGE_ZOOM_STEP = 0.1;

export function clampPreviewImageScale(scale: number): number {
  return Math.min(
    PREVIEW_IMAGE_MAX_SCALE,
    Math.max(PREVIEW_IMAGE_MIN_SCALE, Number(scale.toFixed(2))),
  );
}

export function formatTime(seconds?: number | null): string {
  const s =
    typeof seconds === "number" && Number.isFinite(seconds) ? seconds : 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

export function getPreviewContentTypeFromFileName(
  fileName: string,
  contentType?: string,
): string {
  const normalized = (contentType || "").toLowerCase();
  if (normalized && normalized !== "application/octet-stream") {
    return normalized;
  }

  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "bmp":
      return "image/bmp";
    case "svg":
      return "image/svg+xml";
    case "pdf":
      return "application/pdf";
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    case "mov":
      return "video/quicktime";
    case "m4v":
      return "video/mp4";
    case "mp3":
      return "audio/mpeg";
    case "wav":
      return "audio/wav";
    case "ogg":
      return "audio/ogg";
    case "m4a":
      return "audio/mp4";
    case "txt":
    case "log":
    case "md":
    case "markdown":
      return "text/plain";
    case "json":
      return "application/json";
    case "xml":
      return "application/xml";
    case "js":
      return "application/javascript";
    case "ts":
      return "application/typescript";
    case "css":
      return "text/css";
    case "html":
      return "text/html";
    case "csv":
      return "text/csv";
    default:
      return normalized || "application/octet-stream";
  }
}
