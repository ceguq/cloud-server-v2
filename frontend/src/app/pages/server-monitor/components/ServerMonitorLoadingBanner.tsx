type ServerMonitorLoadingBannerProps = {
  title?: string;
  description?: string;
  textColor?: string;
  mutedColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
};

export function ServerMonitorLoadingBanner({
  title = "Memuat data server monitor...",
  description,
  textColor,
  mutedColor,
  backgroundColor,
  borderColor,
  className = "mt-3 rounded-xl border p-3 text-sm",
}: ServerMonitorLoadingBannerProps) {
  return (
    <div
      className={className}
      style={{
        background: backgroundColor,
        borderColor,
        color: textColor,
      }}
    >
      {title}
      {description ? <div className="mt-1 text-xs" style={{ color: mutedColor }}>{description}</div> : null}
    </div>
  );
}
