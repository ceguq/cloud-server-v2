type ActivityLoadingStateProps = {
  title?: string;
  description?: string;
  textColor?: string;
  mutedColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
};

export function ActivityLoadingState({
  title = "Memuat aktivitas...",
  description,
  textColor,
  mutedColor,
  backgroundColor,
  borderColor,
  className,
}: ActivityLoadingStateProps) {
  return (
    <div
      className={["mb-4 rounded-xl border px-4 py-4 text-xs", className].filter(Boolean).join(" ")}
      style={{
        background: backgroundColor,
        border: borderColor ? `1px solid ${borderColor}` : undefined,
        color: textColor,
      }}
    >
      <div>{title}</div>
      {description ? <div className="mt-1" style={{ color: mutedColor }}>{description}</div> : null}
    </div>
  );
}
