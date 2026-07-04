type DevicesEmptyStateProps = {
  title?: string;
  description?: string;
  textColor?: string;
  mutedColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  accentColor?: string;
  className?: string;
};

export function DevicesEmptyState({
  title = "No devices found yet.",
  description = "Devices will appear here after device tracking is available.",
  textColor,
  mutedColor,
  backgroundColor,
  borderColor,
  className = "rounded-xl p-6",
}: DevicesEmptyStateProps) {
  return (
    <div
      className={className}
      style={{
        background: backgroundColor,
        border: `1px solid ${borderColor}`,
      }}
    >
      <div className="text-sm font-semibold" style={{ color: textColor }}>
        {title}
      </div>
      <div className="text-xs mt-1" style={{ color: mutedColor }}>
        {description}
      </div>
    </div>
  );
}
