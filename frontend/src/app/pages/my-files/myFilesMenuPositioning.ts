import type { MenuCoordinate } from "./types";

type ActionMenuPositionInput = {
  clientX: number;
  clientY: number;
  menuWidth: number;
  menuHeight: number;
  padding?: number;
  viewportWidth?: number;
  viewportHeight?: number;
};

export function calculateActionMenuPosition({
  clientX,
  clientY,
  menuWidth,
  menuHeight,
  padding = 8,
  viewportWidth,
  viewportHeight,
}: ActionMenuPositionInput): MenuCoordinate {
  const resolvedViewportWidth =
    typeof viewportWidth === "number"
      ? viewportWidth
      : typeof window !== "undefined"
        ? window.innerWidth
        : clientX;

  const resolvedViewportHeight =
    typeof viewportHeight === "number"
      ? viewportHeight
      : typeof window !== "undefined"
        ? window.innerHeight
        : clientY;

  const x =
    typeof viewportWidth === "number" || typeof window !== "undefined"
      ? Math.min(clientX, resolvedViewportWidth - menuWidth)
      : clientX;

  const y =
    typeof viewportHeight === "number" || typeof window !== "undefined"
      ? Math.min(clientY, resolvedViewportHeight - menuHeight)
      : clientY;

  return {
    x: Math.max(padding, x),
    y: Math.max(padding, y),
  };
}
