import type { ReactNode } from "react";
import type { PreviewModalMode } from "../types";

type Props = {
  isOpen: boolean;
  mode: PreviewModalMode;
  resolvedTheme: string;
  titleColor: string;
  textColor: string;
  mutedColor: string;
  panelBg: string;
  cardBg: string;
  borderColor: string;
  accentColor: string;
  onClose: () => void;
  header: ReactNode;
  children: ReactNode;
};

export function MyFilesPreviewModal({
  isOpen,
  mode,
  resolvedTheme,
  titleColor,
  textColor,
  mutedColor,
  panelBg,
  cardBg,
  borderColor,
  accentColor,
  onClose,
  header,
  children,
}: Props) {
  if (!isOpen || mode === "minimized") return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center md:items-center"
      style={{
        background:
          resolvedTheme === "light"
            ? "rgba(15,23,42,0.35)"
            : "rgba(0,0,0,0.55)",
      }}
      onMouseDown={onClose}
    >
      <div
        className="pointer-events-auto flex flex-col overflow-hidden rounded-xl border"
        style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
          boxShadow: "0 20px 60px rgba(0,0,0,0.65)",
          width:
            mode === "maximized"
              ? "calc(100vw - 8px)"
              : mode === "normal"
                ? "min(1120px, calc(100vw - 48px))"
                : undefined,
          height:
            mode === "maximized"
              ? "calc(100vh - 8px)"
              : "min(82vh, 760px)",
          maxWidth: "none",
          maxHeight: "none",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between gap-4 px-3 py-2"
          style={{
            borderBottom: `1px solid ${borderColor}`,
          }}
        >
          {header}
        </div>

        <div
          className="mx-3 mb-3 mt-3 flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl border"
          style={{
            background: panelBg,
            border: `1px solid ${borderColor}`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
