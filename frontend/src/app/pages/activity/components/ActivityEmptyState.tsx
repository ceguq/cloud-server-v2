type ActivityEmptyStateProps = {
  title?: string;
  description?: string;
  textColor?: string;
  mutedColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  accentColor?: string;
  className?: string;
};

export function ActivityEmptyState({
  title = "Activity masih kosong",
  description = "Belum ada aktivitas untuk filter pencarian yang dipilih.",
  textColor,
  mutedColor,
  backgroundColor,
  borderColor,
  accentColor,
  className,
}: ActivityEmptyStateProps) {
  return (
    <div
      className={["mt-6 flex flex-col items-center justify-center rounded-xl px-4 py-12 text-center", className].filter(Boolean).join(" ")}
      style={{
        background: backgroundColor,
        border: borderColor ? `1px solid ${borderColor}` : undefined,
      }}
    >
      <div className="text-sm font-semibold" style={{ color: textColor }}>
        {title}
      </div>
      <div className="mt-1 text-xs" style={{ color: mutedColor }}>
        {description}
      </div>
      {accentColor ? (
        <div className="mt-3 h-1.5 w-14 rounded-full" style={{ background: accentColor }} />
      ) : null}
    </div>
  );
}
