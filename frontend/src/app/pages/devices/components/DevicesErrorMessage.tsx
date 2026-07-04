import type { AriaRole } from "react";

type DevicesErrorMessageProps = {
  message: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
  role?: AriaRole;
  ariaLive?: "off" | "polite" | "assertive";
};

export function DevicesErrorMessage({
  message,
  textColor = "#f87171",
  backgroundColor = "rgba(248,113,113,0.12)",
  borderColor = "rgba(248,113,113,0.25)",
  className = "text-xs p-3 rounded-lg mb-4",
  role = "alert",
  ariaLive = "polite",
}: DevicesErrorMessageProps) {
  return (
    <div
      className={className}
      style={{
        background: backgroundColor,
        border: `1px solid ${borderColor}`,
        color: textColor,
      }}
      role={role}
      aria-live={ariaLive}
    >
      {message}
    </div>
  );
}
