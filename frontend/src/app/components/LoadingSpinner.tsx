type LoadingSpinnerProps = {
  size?: number;
  color?: string;
  trackColor?: string;
  className?: string;
};

export function LoadingSpinner({
  size = 14,
  color = "#22d3ee",
  trackColor = "rgba(148, 163, 184, 0.25)",
  className = "",
}: LoadingSpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block animate-spin rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        border: `2px solid ${trackColor}`,
        borderTopColor: color,
      }}
    />
  );
}
