type ActivityErrorMessageProps = {
  message: string;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
  role?: React.AriaRole;
  ariaLive?: "off" | "polite" | "assertive";
};

export function ActivityErrorMessage({
  message,
  textColor,
  backgroundColor,
  borderColor,
  className,
  role,
  ariaLive,
}: ActivityErrorMessageProps) {
  return (
    <div
      className={["mb-4 rounded-xl border border-red-400/20 px-4 py-4 text-sm", className].filter(Boolean).join(" ")}
      style={{
        background: backgroundColor,
        borderColor: borderColor ?? "rgba(248,113,113,0.4)",
        color: "#f87171",
      }}
      role={role}
      aria-live={ariaLive}
    >
      <div className="font-semibold">Gagal memuat aktivitas</div>
      <div className="mt-1" style={{ color: textColor, fontSize: 12 }}>
        {message}
      </div>
    </div>
  );
}
