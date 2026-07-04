export function formatBytes(value: number | null | undefined): string {
  if (typeof value !== "number") return "N/A";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function formatPercent(value: number | null | undefined): string {
  return typeof value === "number" ? `${value.toFixed(1)}%` : "N/A";
}

export function clampPercent(value: number | null | undefined): number {
  if (typeof value !== "number") return 0;
  return Math.min(Math.max(value, 0), 100);
}

export function formatLoad(value: number | null | undefined): string {
  return typeof value === "number" ? value.toFixed(2) : "N/A";
}

export function formatDuration(seconds: number | null | undefined): string {
  if (typeof seconds !== "number") return "N/A";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
}

export function formatCpuCores(
  physical: number | null | undefined,
  logical: number | null | undefined,
): string {
  if (typeof physical !== "number" && typeof logical !== "number") return "N/A";
  if (typeof physical === "number" && typeof logical === "number") {
    return `${physical} physical / ${logical} logical`;
  }
  return typeof logical === "number" ? `${logical} logical` : `${physical} physical`;
}

export function formatIpList(ips: string[] | undefined): string {
  if (!ips || ips.length === 0) return "N/A";
  return ips.slice(0, 3).join(", ");
}
