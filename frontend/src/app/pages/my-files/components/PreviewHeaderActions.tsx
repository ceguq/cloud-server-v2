import { Download, Maximize2, Minimize2, Minus, X } from "lucide-react";
import type { FileModel } from "../../services/fileService";
import { PreviewImageZoomControls } from "./PreviewImageZoomControls";
import { PreviewModalActionButton } from "./PreviewModalActionButton";

export type PreviewHeaderActionsProps = {
  previewFile: FileModel | null;
  previewContentType: string;
  previewModalMode: "normal" | "minimized" | "maximized";
  previewImageScale: number;
  onDownload: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onZoomIn: () => void;
  onMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  panelColor: string;
  accentColor: string;
};

export function PreviewHeaderActions({
  previewFile,
  previewContentType,
  previewModalMode,
  previewImageScale,
  onDownload,
  onZoomOut,
  onResetZoom,
  onZoomIn,
  onMinimize,
  onToggleMaximize,
  onClose,
  textColor,
  mutedColor,
  borderColor,
  panelColor,
  accentColor,
}: PreviewHeaderActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {(() => {
        if (!previewFile) return null;

        return (
          <PreviewModalActionButton
            icon={<Download size={14} />}
            title="Download"
            ariaLabel="Download preview file"
            onClick={onDownload}
            textColor={accentColor}
            backgroundColor={`${accentColor}14`}
            borderColor={`${accentColor}33`}
            size="medium"
          />
        );
      })()}

      {previewContentType.startsWith("image/") && (
        <PreviewImageZoomControls
          previewImageScale={previewImageScale}
          onZoomOut={onZoomOut}
          onResetZoom={onResetZoom}
          onZoomIn={onZoomIn}
          textColor={textColor}
          mutedColor={mutedColor}
          borderColor={borderColor}
          panelColor={panelColor}
        />
      )}

      <PreviewModalActionButton
        icon={<Minus size={15} />}
        title="Minimize preview"
        ariaLabel="Minimize preview"
        onClick={onMinimize}
        textColor={mutedColor}
        backgroundColor={panelColor}
        borderColor={borderColor}
      />

      <PreviewModalActionButton
        icon={
          previewModalMode === "maximized" ? (
            <Minimize2 size={15} />
          ) : (
            <Maximize2 size={15} />
          )
        }
        title={
          previewModalMode === "maximized"
            ? "Restore preview size"
            : "Maximize preview"
        }
        ariaLabel={
          previewModalMode === "maximized"
            ? "Restore preview size"
            : "Maximize preview"
        }
        onClick={onToggleMaximize}
        textColor={mutedColor}
        backgroundColor={panelColor}
        borderColor={borderColor}
      />

      <PreviewModalActionButton
        icon={<X size={15} />}
        title="Close preview"
        ariaLabel="Close preview"
        onClick={onClose}
        textColor={mutedColor}
        backgroundColor={panelColor}
        borderColor={borderColor}
      />
    </div>
  );
}
