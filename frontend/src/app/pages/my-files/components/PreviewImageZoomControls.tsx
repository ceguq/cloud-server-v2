import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";

export type PreviewImageZoomControlsProps = {
  previewImageScale: number;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onZoomIn: () => void;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  panelColor: string;
};

export function PreviewImageZoomControls({
  previewImageScale,
  onZoomOut,
  onResetZoom,
  onZoomIn,
  textColor,
  mutedColor,
  borderColor,
  panelColor,
}: PreviewImageZoomControlsProps) {
  return (
    <>
      <button
        type="button"
        onClick={onZoomOut}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
        style={{
          background: panelColor,
          border: `1px solid ${borderColor}`,
          color: mutedColor,
        }}
        aria-label="Zoom out image"
        title="Zoom out"
      >
        <ZoomOut size={15} />
      </button>

      <button
        type="button"
        onClick={onResetZoom}
        className="flex h-8 w-[76px] items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold"
        style={{
          background: panelColor,
          border: `1px solid ${borderColor}`,
          color: mutedColor,
        }}
        aria-label="Reset image zoom"
        title="Reset zoom"
      >
        <RotateCcw size={13} />
        <span>{Math.round(previewImageScale * 100)}%</span>
      </button>

      <button
        type="button"
        onClick={onZoomIn}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
        style={{
          background: panelColor,
          border: `1px solid ${borderColor}`,
          color: mutedColor,
        }}
        aria-label="Zoom in image"
        title="Zoom in"
      >
        <ZoomIn size={15} />
      </button>
    </>
  );
}
