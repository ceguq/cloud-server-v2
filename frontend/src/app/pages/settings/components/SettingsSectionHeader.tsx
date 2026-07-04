import type { ReactNode } from "react";

type SettingsSectionHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  textColor?: string;
  mutedColor?: string;
  className?: string;
};

export function SettingsSectionHeader({
  title,
  description,
  icon,
  textColor,
  mutedColor,
  className,
}: SettingsSectionHeaderProps) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h2 className="text-lg font-semibold" style={{ color: textColor }}>
          {title}
        </h2>
      </div>
      {description ? (
        <p className="text-xs" style={{ color: mutedColor }}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
