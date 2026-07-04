import type { AriaRole } from "react";

type LoginErrorMessageProps = {
  message: string;
  className?: string;
  role?: AriaRole;
  ariaLive?: "off" | "polite" | "assertive";
};

export function LoginErrorMessage({
  message,
  className,
  role = "alert",
  ariaLive = "assertive",
}: LoginErrorMessageProps) {
  if (!message) return null;

  return (
    <div
      role={role}
      aria-live={ariaLive}
      className={[
        "mt-3 rounded-2xl border border-red-400/25 bg-red-500/10 px-4 py-2 text-center text-xs text-red-200",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {message}
    </div>
  );
}
