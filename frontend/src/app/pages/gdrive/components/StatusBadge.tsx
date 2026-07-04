import type { AriaRole } from "react";

export type StatusBadgeTone = "success" | "error" | "warning" | "info";

export type StatusBadgeProps = {
  message: string;
  tone?: StatusBadgeTone;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
  role?: AriaRole;
  ariaLive?: "off" | "polite" | "assertive";
};

export function StatusBadge({
  message,
  tone = "info",
  textColor,
  backgroundColor,
  borderColor,
  className = "",
  role,
  ariaLive,
}: StatusBadgeProps) {
  const resolvedTextColor =
    textColor ??
    (tone === "success"
      ? "#22c55e"
      : tone === "warning"
        ? "#f59e0b"
        : tone === "error"
          ? "#ef4444"
          : "#3b82f6");
  const resolvedBackgroundColor =
    backgroundColor ??
    (tone === "success"
      ? "rgba(34,197,94,0.10)"
      : tone === "warning"
        ? "rgba(245,158,11,0.10)"
        : tone === "error"
          ? "rgba(239,68,68,0.10)"
          : "rgba(59,130,246,0.10)");
  const resolvedBorderColor =
    borderColor ??
    (tone === "success"
      ? "rgba(34,197,94,0.20)"
      : tone === "warning"
        ? "rgba(245,158,11,0.20)"
        : tone === "error"
          ? "rgba(239,68,68,0.20)"
          : "rgba(59,130,246,0.20)");

  return (
    <div
      className={`shrink-0 rounded-lg border px-3 py-2 text-[11px] font-semibold ${className}`.trim()}
      style={{
        background: resolvedBackgroundColor,
        borderColor: resolvedBorderColor,
        color: resolvedTextColor,
      }}
      role={role}
      aria-live={ariaLive}
    >
      {message}
    </div>
  );
}
