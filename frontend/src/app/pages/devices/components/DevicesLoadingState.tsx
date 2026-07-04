type DevicesLoadingStateProps = {
  title?: string;
  description?: string;
  textColor?: string;
  mutedColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
};

export function DevicesLoadingState({
  title = "Loading devices...",
  description,
  textColor,
  className = "text-xs",
}: DevicesLoadingStateProps) {
  return (
    <div className={className} style={{ color: textColor }}>
      {title}
      {description ? <div className="mt-1">{description}</div> : null}
    </div>
  );
}
