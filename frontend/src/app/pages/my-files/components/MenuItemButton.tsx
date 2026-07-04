import type { ReactNode } from "react";
import { getMenuItemStyle } from "../myFilesMenuUtils";

type MenuItemButtonProps = {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
  ariaLabel?: string;
  textColor: string;
  accentColor: string;
};

export function MenuItemButton({
  label,
  icon,
  onClick,
  disabled = false,
  danger = false,
  title,
  ariaLabel,
  textColor,
  accentColor,
}: MenuItemButtonProps) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-label={ariaLabel ?? label}
      title={title ?? label}
      className="w-full rounded-lg px-2 py-1 text-left text-xs font-semibold"
      disabled={disabled}
      style={getMenuItemStyle(danger, disabled, textColor)}
      onMouseEnter={(event) => {
        if (disabled) return;
        event.currentTarget.style.background = danger
          ? "rgba(239,68,68,0.12)"
          : `${accentColor}10`;
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = "transparent";
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (disabled) return;
        onClick();
      }}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span>{label}</span>
      </div>
    </button>
  );
}
