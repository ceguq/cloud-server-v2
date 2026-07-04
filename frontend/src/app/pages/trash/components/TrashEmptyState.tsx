type TrashEmptyStateProps = {
  title?: string;
  description?: string;
  textColor?: string;
  mutedColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  accentColor?: string;
  className?: string;
};

export function TrashEmptyState({
  title = "Trash kosong.",
  description,
  textColor,
  mutedColor,
  backgroundColor,
  borderColor,
  accentColor,
  className = "text-sm",
}: TrashEmptyStateProps) {
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
    >
      <div style={{ color: textColor }}>{title}</div>
      {description ? (
        <div style={{ color: mutedColor ?? accentColor }}>{description}</div>
      ) : null}
    </div>
  );
}
