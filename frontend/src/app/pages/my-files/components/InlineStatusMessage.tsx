import type { AriaRole } from "react";

export type InlineStatusMessageProps = {
  message: string;
  tone?: "error" | "info" | "success" | "warning";
  role?: AriaRole;
  ariaLive?: "off" | "polite" | "assertive";
  textColor: string;
  backgroundColor: string;
  borderColor?: string;
  className?: string;
};

export function InlineStatusMessage({
  message,
  tone = "info",
  role = "status",
  ariaLive = "polite",
  textColor,
  backgroundColor,
  borderColor,
  className = "",
}: InlineStatusMessageProps) {
  const resolvedBorderColor = borderColor ?? "rgba(148, 163, 184, 0.24)";
  const resolvedTextColor = textColor;
  const resolvedBackgroundColor = backgroundColor;

  const toneStyles = {
    error: {
      borderColor: "rgba(248,113,113,0.35)",
      backgroundColor: "rgba(248,113,113,0.12)",
      color: "#f87171",
    },
    info: {
      borderColor: "rgba(59,130,246,0.3)",
      backgroundColor: "rgba(59,130,246,0.12)",
      color: "#60a5fa",
    },
    success: {
      borderColor: "rgba(34,197,94,0.3)",
      backgroundColor: "rgba(34,197,94,0.12)",
      color: "#4ade80",
    },
    warning: {
      borderColor: "rgba(245,158,11,0.3)",
      backgroundColor: "rgba(245,158,11,0.12)",
      color: "#fbbf24",
    },
  } as const;

  const style = toneStyles[tone];

  return (
    <div
      className={`text-xs px-3 py-2 rounded-lg border ${className}`.trim()}
      style={{
        borderColor: borderColor ?? style.borderColor,
        background: backgroundColor || style.backgroundColor,
        color: textColor || style.color,
      }}
      role={role}
      aria-live={ariaLive}
    >
      {message}
    </div>
  );
}
