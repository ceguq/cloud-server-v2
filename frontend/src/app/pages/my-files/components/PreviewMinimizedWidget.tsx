import { X } from "lucide-react";

export type PreviewMinimizedWidgetProps = {
  title: string;
  subtitle?: string;
  accentColor: string;
  titleColor: string;
  mutedColor: string;
  backgroundColor: string;
  borderColor: string;
  onRestore: () => void;
  onClose: () => void;
};

export function PreviewMinimizedWidget({
  title,
  subtitle = "Preview minimized",
  accentColor,
  titleColor,
  mutedColor,
  backgroundColor,
  borderColor,
  onRestore,
  onClose,
}: PreviewMinimizedWidgetProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed bottom-4 right-4 z-[150]"
      style={{
        background: backgroundColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 12,
        boxShadow: "0 20px 60px rgba(0,0,0,0.65)",
        width: 320,
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <div
        className="flex items-center justify-between gap-3 px-3 py-2"
        style={{ borderBottom: `1px solid ${borderColor}` }}
      >
        <div className="min-w-0">
          <div
            className="truncate text-xs font-semibold"
            style={{ color: titleColor }}
            title={title}
          >
            {title}
          </div>
          <div className="mt-0.5 text-[10px]" style={{ color: mutedColor }}>
            {subtitle}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRestore}
            className="flex h-8 items-center justify-center rounded-lg px-2 text-xs font-semibold"
            style={{
              background: `${accentColor}14`,
              border: `1px solid ${accentColor}33`,
              color: accentColor,
            }}
            aria-label="Restore preview"
            title="Restore preview"
          >
            Restore
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold"
            style={{
              color: mutedColor,
              background: backgroundColor,
              border: `1px solid ${borderColor}`,
            }}
            aria-label="Close preview"
            title="Close preview"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
