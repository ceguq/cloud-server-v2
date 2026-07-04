import type { GDriveAccount } from "../../../services/gdriveService";

export function parseByteValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

export function formatBytes(bytes: number | null | undefined, fallback = "-"): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) {
    return fallback;
  }
  if (bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, index);
  const fixed = value >= 10 ? 1 : 2;
  return `${value.toFixed(fixed)} ${units[index]}`;
}

export function formatDate(iso: string): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "not synced yet";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "not synced yet";

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60 * 1000) return "just now";

  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  return formatDate(iso);
}

export function getAccountName(account: Pick<GDriveAccount, "label" | "email">): string {
  return account.label || account.email || "Google Drive";
}

export function getAccountInitials(account: Pick<GDriveAccount, "label" | "email">): string {
  const label = getAccountName(account).trim();
  const words = label.split(/[\s._-]+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return "GD";
}

export function getQuotaDisplay(account: Pick<GDriveAccount, "storage_quota">) {
  const quota = account.storage_quota ?? null;
  const usage = parseByteValue(quota?.usage_in_drive) ?? parseByteValue(quota?.usage);
  const limit = parseByteValue(quota?.limit);

  if (usage !== null && limit !== null && limit > 0) {
    const percent = Math.min(100, Math.max(0, Math.round((usage / limit) * 100)));
    return {
      label: `${formatBytes(usage, "0 B")} of ${formatBytes(limit, "0 B")} used`,
      value: `${percent}%`,
      percent,
      hasQuota: true,
    };
  }

  if (usage !== null) {
    return {
      label: `${formatBytes(usage, "0 B")} used`,
      value: "",
      percent: 0,
      hasQuota: false,
    };
  }

  return {
    label: "Storage unavailable",
    value: "",
    percent: 0,
    hasQuota: false,
  };
}
