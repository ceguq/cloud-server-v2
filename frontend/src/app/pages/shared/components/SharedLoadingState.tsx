import { LoadingSpinner } from "../../../components/LoadingSpinner";

type SharedLoadingStateProps = {
  title?: string;
  description?: string;
  textColor?: string;
  mutedColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
};

export function SharedLoadingState({
  title = "Memuat share link...",
  description,
  textColor,
  mutedColor,
  backgroundColor,
  borderColor,
  className,
}: SharedLoadingStateProps) {
  return (
    <div
      className={className}
      style={{
        background: backgroundColor,
        border: borderColor ? `1px solid ${borderColor}` : undefined,
        color: textColor,
      }}
    >
      <div className="flex items-center gap-2">
        <LoadingSpinner size={12} />
        {title}
      </div>
      {description ? (
        <div className="mt-2 text-[11px]" style={{ color: mutedColor }}>
          {description}
        </div>
      ) : null}
    </div>
  );
}
