import type { ReactNode } from "react";

export type PreviewModalActionButtonProps = {
  icon: ReactNode;
  title: string;
  ariaLabel?: string;
  onClick: () => void;
  textColor: string;
  backgroundColor?: string;
  borderColor?: string;
  size?: "small" | "medium";
  disabled?: boolean;
  accent?: boolean;
};

export function PreviewModalActionButton({
  icon,
  title,
  ariaLabel,
  onClick,
  textColor,
  backgroundColor,
  borderColor,
  size = "small",
  disabled = false,
  accent = false,
}: PreviewModalActionButtonProps) {
  const isSmall = size === "small";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={isSmall ? "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold" : "flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold"}
      style={{
        background: backgroundColor ?? (accent ? `${textColor}14` : "transparent"),
        border: borderColor ? `1px solid ${borderColor}` : undefined,
        color: textColor,
        opacity: disabled ? 0.6 : 1,
      }}
      aria-label={ariaLabel ?? title}
      title={title}
    >
      {icon}
    </button>
  );
}
