export type PageHeaderSummaryProps = {
  title: string;
  itemCount: number;
  titleColor: string;
  mutedColor: string;
};

export function PageHeaderSummary({
  title,
  itemCount,
  titleColor,
  mutedColor,
}: PageHeaderSummaryProps) {
  return (
    <div>
      <h1 className="text-xl font-semibold" style={{ color: titleColor }}>
        {title}
      </h1>
      <p className="text-xs mt-0.5" style={{ color: mutedColor }}>
        {itemCount} items
      </p>
    </div>
  );
}
