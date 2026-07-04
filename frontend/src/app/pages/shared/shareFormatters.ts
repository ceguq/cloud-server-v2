import {
  FileText,
  Image,
  Film,
  Music,
  Archive,
} from "lucide-react";

export function formatBytes(bytes?: number | null): string {
  const v = typeof bytes === "number" ? bytes : 0;
  if (v === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(v) / Math.log(1024)),
    units.length - 1,
  );
  const num = v / Math.pow(1024, i);
  return `${num.toFixed(num >= 10 ? 1 : 2)} ${units[i]}`;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getMimeIcon(mime?: string | null) {
  if (!mime) return { Icon: FileText, color: "#64748b" };
  if (mime.startsWith("image/")) return { Icon: Image, color: "#a78bfa" };
  if (mime.startsWith("video/")) return { Icon: Film, color: "#f59e0b" };
  if (mime.startsWith("audio/")) return { Icon: Music, color: "#22d3ee" };
  if (
    mime.includes("zip") ||
    mime.includes("compressed") ||
    mime.includes("tar")
  )
    return { Icon: Archive, color: "#34d399" };
  if (mime.includes("pdf")) return { Icon: FileText, color: "#ef4444" };
  return { Icon: FileText, color: "#3b82f6" };
}
