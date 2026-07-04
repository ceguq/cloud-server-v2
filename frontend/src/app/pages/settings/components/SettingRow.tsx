import type { ReactNode } from "react";

type SettingRowProps = {
  label: ReactNode;
  desc?: ReactNode;
  children?: ReactNode;
  labelColor?: string;
  descColor?: string;
  borderColor?: string;
  className?: string;
};

export function SettingRow({
  label,
  desc,
  children,
  labelColor,
  descColor,
  borderColor,
  className,
}: SettingRowProps) {
  return (
    <div
      className={["flex items-center justify-between py-3.5", className].filter(Boolean).join(" ")}
      style={{ borderBottom: `1px solid ${borderColor ?? "#0d1829"}` }}
    >
      <div>
        <div className="text-sm" style={{ color: labelColor ?? "#cbd5e1" }}>
          {label}
        </div>
        {desc ? (
          <div className="text-xs mt-0.5" style={{ color: descColor ?? "#475569" }}>
            {desc}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}
