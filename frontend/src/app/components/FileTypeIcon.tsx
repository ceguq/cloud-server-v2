import {
  FileText,
  Image,
  Film,
  Music,
  Archive,
  FileCode,
  Database,
  File,
  Sheet,
  Cpu,
} from "lucide-react";

interface FileTypeIconProps {
  fileName?: string;
  originalName?: string;
  mimeType?: string | null;
  mimeTypeField?: string | null;
  className?: string;
  size?: number;
}

// Get file extension from filename
function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot > -1 ? filename.substring(lastDot + 1).toLowerCase() : "";
}

// Determine icon and color based on mime type or extension
function getIconConfig(
  mimeType: string | null | undefined,
  fileName: string | undefined,
): { Icon: typeof File; color: string; bgColor: string } {
  let mime = mimeType?.toLowerCase() || "";
  let ext = fileName ? getFileExtension(fileName).toLowerCase() : "";

  // If mime is generic, fallback to extension
  if (
    mime === "application/octet-stream" ||
    mime === "application/x-octet-stream"
  ) {
    mime = "";
  }

  // PDF
  if (mime.includes("pdf") || ext === "pdf") {
    return {
      Icon: FileText,
      color: "#ef4444",
      bgColor: "rgba(239,68,68,0.12)",
    };
  }

  // Images
  if (
    mime.includes("image") ||
    ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)
  ) {
    return {
      Icon: Image,
      color: "#3b82f6",
      bgColor: "rgba(59,130,246,0.12)",
    };
  }

  // Videos
  if (
    mime.includes("video") ||
    ["mp4", "mkv", "mov", "avi", "webm"].includes(ext)
  ) {
    return {
      Icon: Film,
      color: "#a78bfa",
      bgColor: "rgba(167,139,250,0.12)",
    };
  }

  // Audio
  if (
    mime.includes("audio") ||
    ["mp3", "wav", "ogg", "m4a", "flac"].includes(ext)
  ) {
    return {
      Icon: Music,
      color: "#f59e0b",
      bgColor: "rgba(245,158,11,0.12)",
    };
  }

  // Archives
  if (
    mime.includes("zip") ||
    mime.includes("rar") ||
    mime.includes("7z") ||
    mime.includes("tar") ||
    mime.includes("gzip") ||
    ["zip", "rar", "7z", "tar", "gz"].includes(ext)
  ) {
    return {
      Icon: Archive,
      color: "#eab308",
      bgColor: "rgba(234,179,8,0.12)",
    };
  }

  // Spreadsheets
  if (
    mime.includes("sheet") ||
    mime.includes("excel") ||
    mime.includes("csv") ||
    ["xls", "xlsx", "csv"].includes(ext)
  ) {
    return {
      Icon: Sheet,
      color: "#22c55e",
      bgColor: "rgba(34,197,94,0.12)",
    };
  }

  // Database
  if (mime.includes("sql") || ["db", "sqlite", "sqlite3"].includes(ext)) {
    return {
      Icon: Database,
      color: "#22c55e",
      bgColor: "rgba(34,197,94,0.12)",
    };
  }

  // Documents (Word, Text, RTF)
  if (
    mime.includes("word") ||
    mime.includes("document") ||
    mime.includes("text") ||
    mime.includes("rtf") ||
    ["doc", "docx", "txt", "rtf"].includes(ext)
  ) {
    return {
      Icon: FileText,
      color: "#3b82f6",
      bgColor: "rgba(59,130,246,0.12)",
    };
  }

  // Code & Config
  if (
    mime.includes("json") ||
    mime.includes("xml") ||
    mime.includes("yaml") ||
    mime.includes("code") ||
    mime.includes("script") ||
    mime.includes("javascript") ||
    mime.includes("typescript") ||
    mime.includes("php") ||
    mime.includes("python") ||
    mime.includes("html") ||
    mime.includes("css") ||
    [
      "json",
      "xml",
      "yaml",
      "yml",
      "js",
      "ts",
      "tsx",
      "jsx",
      "php",
      "py",
      "html",
      "css",
    ].includes(ext)
  ) {
    return {
      Icon: FileCode,
      color: "#6366f1",
      bgColor: "rgba(99,102,241,0.12)",
    };
  }

  // Default: Generic file
  return {
    Icon: File,
    color: "#60a5fa",
    bgColor: "rgba(96,165,250,0.12)",
  };
}

export function FileTypeIcon({
  fileName,
  originalName,
  mimeType,
  mimeTypeField,
  className = "w-7 h-7",
  size = 14,
}: FileTypeIconProps) {
  const finalMimeType = mimeType || mimeTypeField;
  const finalFileName = fileName || originalName;

  const { Icon, color, bgColor } = getIconConfig(finalMimeType, finalFileName);

  return (
    <div
      className={`${className} rounded-md flex items-center justify-center`}
      style={{ background: bgColor }}
    >
      <Icon size={size} style={{ color }} />
    </div>
  );
}
