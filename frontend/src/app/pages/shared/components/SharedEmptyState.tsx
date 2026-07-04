import { Link2 } from "lucide-react";

type SharedEmptyStateProps = {
  title?: string;
  description?: string;
  textColor?: string;
  mutedColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  accentColor?: string;
  className?: string;
};

export function SharedEmptyState({
  title = "Belum ada link share.",
  description = "Buka MyFiles → klik ⋯ pada file → Share untuk membuat link.",
  textColor,
  mutedColor,
  backgroundColor,
  borderColor,
  accentColor,
  className,
}: SharedEmptyStateProps) {
  return (
    <div
      className={className}
      style={{
        background: backgroundColor,
        border: borderColor ? `1px solid ${borderColor}` : undefined,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: "rgba(59,130,246,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Link2 size={22} style={{ color: accentColor ?? "#3b82f6" }} />
      </div>
      <div style={{ color: textColor, fontSize: 13 }}>{title}</div>
      <div style={{ color: mutedColor, fontSize: 11 }}>{description}</div>
    </div>
  );
}
