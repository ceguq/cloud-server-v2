import type { AriaRole } from "react";

type TrashErrorMessageProps = {
  message: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
  role?: AriaRole;
  ariaLive?: "off" | "polite" | "assertive";
};

export function TrashErrorMessage({
  message,
  textColor = "#ef4444",
  backgroundColor,
  borderColor,
  className = "text-sm",
  role,
  ariaLive,
}: TrashErrorMessageProps) {
  return (
    <div
      className={className}
      style={{
        color: textColor,
        ...(backgroundColor || borderColor
          ? {
              backgroundColor,
              borderColor,
              border: backgroundColor || borderColor ? "1px solid" : undefined,
            }
          : {}),
      }}
      role={role}
      aria-live={ariaLive}
    >
      {message}
    </div>
  );
}
