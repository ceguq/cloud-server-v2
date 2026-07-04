export type PreviewHeaderTitleProps = {
  title: string;
  subtitle?: string;
  titleColor: string;
  mutedColor: string;
};

export function PreviewHeaderTitle({
  title,
  subtitle = "Preview",
  titleColor,
  mutedColor,
}: PreviewHeaderTitleProps) {
  return (
    <div className="min-w-0">
      <h2
        className="truncate text-sm font-semibold"
        style={{ color: titleColor }}
        title={title}
      >
        {title}
      </h2>
      <p className="truncate text-xs mt-1" style={{ color: mutedColor }}>
        {subtitle}
      </p>
    </div>
  );
}
