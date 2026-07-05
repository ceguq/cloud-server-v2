import type { ReactNode } from "react";

export type AdminUsersStateMessageTone = "loading" | "error" | "empty";

export type AdminUsersStateMessageProps = {
  tone: AdminUsersStateMessageTone;
  title: ReactNode;
  message?: ReactNode;
  className?: string;
  role?: React.AriaRole;
  ariaLive?: "off" | "polite" | "assertive";
};

export function AdminUsersStateMessage({
  tone,
  title,
  message,
  className,
  role,
  ariaLive,
}: AdminUsersStateMessageProps) {
  const textColor = tone === "error" ? "#f87171" : "#475569";

  return (
    <div
      className={className}
      style={{ color: textColor }}
      role={role}
      aria-live={ariaLive}
    >
      <div>{title}</div>
      {message ? <div className="mt-1">{message}</div> : null}
    </div>
  );
}
