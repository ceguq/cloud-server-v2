import type { AriaRole } from "react";

type SharedErrorMessageProps = {
  message: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
  role?: AriaRole;
  ariaLive?: "off" | "polite" | "assertive";
};

export function SharedErrorMessage({
  message,
  textColor,
  backgroundColor,
  borderColor,
  className,
  role = "alert",
  ariaLive = "polite",
}: SharedErrorMessageProps) {
  return (
    <div
      className={className}
      style={{
        background: backgroundColor,
        border: borderColor ? `1px solid ${borderColor}` : undefined,
        color: textColor,
      }}
      role={role}
      aria-live={ariaLive}
    >
      {message}
    </div>
  );
}
