type UploadsEmptyStateProps = {
  title?: string;
  description?: string;
  textColor?: string;
  mutedColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  accentColor?: string;
  className?: string;
};

export function UploadsEmptyState({
  title = "Belum ada aktivitas upload",
  description,
  textColor,
  mutedColor,
  backgroundColor,
  borderColor,
  accentColor,
  className,
}: UploadsEmptyStateProps) {
  return (
    <div
      className={className}
      style={{
        color: mutedColor,
        background: backgroundColor,
        borderColor,
        border: borderColor ? `1px solid ${borderColor}` : undefined,
        padding: "16px 16px",
        fontSize: 12,
      }}
    >
      <span style={{ color: textColor, fontSize: 12 }}>{title}</span>
      {description ? <div style={{ color: mutedColor, marginTop: 4 }}>{description}</div> : null}
      {accentColor ? <div style={{ color: accentColor, marginTop: 6, fontSize: 11 }}>Ready for uploads</div> : null}
    </div>
  );
}
