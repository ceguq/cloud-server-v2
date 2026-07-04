import type { ReactNode } from "react";

type PublicShareErrorStateProps = {
  title?: ReactNode;
  message: ReactNode;
  status?: ReactNode;
  className?: string;
};

export function PublicShareErrorState({
  title,
  message,
  status,
  className,
}: PublicShareErrorStateProps) {
  return (
    <div
      className={className}
      style={{
        borderRadius: 12,
        border: "1px solid rgba(248,113,113,0.25)",
        background: "rgba(248,113,113,0.08)",
        padding: "16px 18px",
      }}
      role="alert"
    >
      <div style={{ color: "#f87171", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ color: "#94a3b8", fontSize: 12 }}>{message}</div>
      {status ? <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>{status}</div> : null}
    </div>
  );
}
