type TrashLoadingStateProps = {
  title?: string;
  textColor?: string;
  className?: string;
};

export function TrashLoadingState({
  title = "Loading trash...",
  textColor,
  className = "text-sm",
}: TrashLoadingStateProps) {
  return (
    <div className={className} style={{ color: textColor }}>
      {title}
    </div>
  );
}
