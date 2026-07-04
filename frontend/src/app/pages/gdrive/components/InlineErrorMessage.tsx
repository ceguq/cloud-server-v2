import type { AriaRole } from "react";

export type InlineErrorMessageProps = {
  message: string;
  tone?: "error" | "warning";
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
  role?: AriaRole;
  ariaLive?: "off" | "polite" | "assertive";
};

export function InlineErrorMessage({
  message,
  tone = "error",
  textColor,
  backgroundColor,
  borderColor,
  className = "",
  role,
  ariaLive,
}: InlineErrorMessageProps) {
  const resolvedTextColor = textColor ?? (tone === "warning" ? "#f59e0b" : "#ef4444");
  const resolvedBackgroundColor =
    backgroundColor ?? (tone === "warning" ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)");
  const resolvedBorderColor =
    borderColor ?? (tone === "warning" ? "rgba(245,158,11,0.24)" : "rgba(239,68,68,0.24)");

  return (
    <div
      className={`rounded-xl border px-3 py-4 text-xs ${className}`.trim()}
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
