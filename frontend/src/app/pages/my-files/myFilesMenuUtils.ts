import type { CSSProperties } from "react";

export function getMenuItemStyle(
  danger = false,
  disabled = false,
  textColor: string,
): CSSProperties {
  return {
    marginTop: 4,
    opacity: disabled ? 0.45 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
    color: danger ? "#ef4444" : textColor,
    background: "transparent",
  };
}
