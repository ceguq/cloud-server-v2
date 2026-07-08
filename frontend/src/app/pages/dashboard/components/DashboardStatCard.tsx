import type { ReactNode } from "react";

type DashboardStatCardProps = {
  title: string;
  value: ReactNode;
  subtitle?: ReactNode;
  changeLabel?: string;
  changeTone?: "up" | "down" | "neutral";
  changeIcon?: ReactNode;
  icon: ReactNode;
  textColor?: string;
  mutedColor?: string;
  mutedColor2?: string;
  backgroundColor?: string;
  borderColor?: string;
  accentColor?: string;
  iconBackgroundColor?: string;
  iconBorderColor?: string;
  className?: string;
};

export function DashboardStatCard({
  title,
  value,
  subtitle,
  changeLabel,
  changeTone = "up",
  changeIcon,
  icon,
  textColor,
  mutedColor,
  mutedColor2,
  backgroundColor,
  borderColor,
  accentColor,
  iconBackgroundColor,
  iconBorderColor,
  className,
}: DashboardStatCardProps) {
  const changeColor = 
    changeTone === "down" 
      ? "#f87171" 
      : changeTone === "neutral"
        ? "#64748b"
        : "#34d399";
  const changeBackground =
    changeTone === "down"
      ? "rgba(248,113,113,0.1)"
      : changeTone === "neutral"
        ? "rgba(100,116,139,0.1)"
        : "rgba(52,211,153,0.1)";

  return (
    <div
      className={className ?? "rounded-xl p-4 transition-all hover:scale-[1.02]"}
      style={{ background: backgroundColor, border: `1px solid ${borderColor}` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            background: iconBackgroundColor,
            border: `1px solid ${iconBorderColor}`,
          }}
        >
          {icon}
        </div>
        {changeLabel ? (
          <span
            className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-md"
            style={{
              color: changeColor,
              background: changeBackground,
            }}
          >
            {changeIcon ? changeIcon : null}
            {changeLabel}
          </span>
        ) : null}
      </div>
      <div className="text-2xl font-bold" style={{ color: textColor }}>
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: mutedColor }}>
        {title}
      </div>
      <div className="text-xs mt-0.5" style={{ color: mutedColor2 }}>
        {subtitle}
      </div>
    </div>
  );
}
