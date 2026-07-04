import type { ReactNode } from "react";

type ServerMonitorStatusPillProps = {
  label: ReactNode;
  icon?: ReactNode;
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  className?: string;
  title?: string;
};

export function ServerMonitorStatusPill({
  label,
  icon,
  textColor,
  backgroundColor,
  borderColor,
  className = "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full",
  title,
}: ServerMonitorStatusPillProps) {
  return (
    <span
      className={className}
      style={{
        background: backgroundColor,
        border: borderColor ? `1px solid ${borderColor}` : undefined,
        color: textColor,
      }}
      title={title}
    >
      {icon ? <span className="inline-flex items-center">{icon}</span> : null}
      {label}
    </span>
  );
}
