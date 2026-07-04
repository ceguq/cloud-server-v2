export function formatSize(bytes?: number | null): string {
  const b = typeof bytes === "number" ? bytes : 0;
  const units = ["B", "KB", "MB", "GB"];
  if (b < 1024) return `${b} B`;
  const i = Math.min(
    Math.floor(Math.log(b) / Math.log(1024)),
    units.length - 1,
  );
  const value = b / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[i]}`;
}

export function formatDate(d?: string | null): string {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}
