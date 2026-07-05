import type {
  CSSProperties,
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";
import { FileTypeIcon } from "../../../components/FileTypeIcon";
import type { FileModel } from "../../../../services/fileService";

export type MyFilesFileGridItemProps = {
  file: FileModel;
  isSelected: boolean;
  checklistVisibilityStyle: CSSProperties;
  showFileMetadata: boolean;
  moveDragDropEnabled: boolean;
  cardBg: string;
  panelBg: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  muted2Color: string;
  accentColor: string;
  actionMenuSlot: ReactNode;
  onToggleSelection: () => void;
  onRowContextMenu: (event: ReactMouseEvent<HTMLElement>) => void;
  onRowClick: (event: ReactMouseEvent<HTMLElement>) => void;
  onRowDoubleClick: (event: ReactMouseEvent<HTMLElement>) => void;
  onDragStart: (event: ReactDragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  typeLabel: string;
  sizeLabel: string;
  modifiedLabel: string;
  visibilityLabel: string;
};

export function MyFilesFileGridItem({
  file,
  isSelected,
  checklistVisibilityStyle,
  showFileMetadata,
  moveDragDropEnabled,
  cardBg,
  panelBg,
  borderColor,
  textColor,
  mutedColor,
  muted2Color,
  accentColor,
  actionMenuSlot,
  onToggleSelection,
  onRowContextMenu,
  onRowClick,
  onRowDoubleClick,
  onDragStart,
  onDragEnd,
  typeLabel,
  sizeLabel,
  modifiedLabel,
  visibilityLabel,
}: MyFilesFileGridItemProps) {
  return (
    <div
      draggable={moveDragDropEnabled}
      onContextMenu={onRowContextMenu}
      onDoubleClick={onRowDoubleClick}
      onClick={onRowClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="rounded-xl p-3 cursor-pointer transition-colors group relative"
      style={{
        border: `1px solid ${borderColor}`,
        background: isSelected ? "rgba(59, 130, 246, 0.08)" : cardBg,
        borderLeft: isSelected ? `3px solid ${accentColor}55` : "3px solid transparent",
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <input
            type="checkbox"
            aria-label={`Pilih file ${file.original_name}`}
            checked={isSelected}
            onChange={onToggleSelection}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 14,
              height: 14,
              accentColor: "#ef4444",
              ...checklistVisibilityStyle,
            }}
          />

          <FileTypeIcon
            originalName={file.original_name}
            mimeType={file.mime_type}
            className="w-9 h-9 shrink-0"
            size={16}
          />
        </div>

        {actionMenuSlot}
      </div>

      <div className="text-sm font-medium truncate" style={{ color: textColor }}>
        {file.original_name}
      </div>

      {showFileMetadata && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className="text-[10px] px-2 py-0.5 rounded font-medium w-fit"
            style={{
              background: panelBg,
              color: accentColor,
              border: `1px solid ${borderColor}`,
            }}
          >
            {typeLabel}
          </span>
          <span className="text-xs" style={{ color: mutedColor }}>
            {modifiedLabel}
          </span>
          <span className="text-xs" style={{ color: mutedColor }}>
            {sizeLabel}
          </span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded w-fit"
            style={{
              background: panelBg,
              color: muted2Color,
              border: `1px solid ${borderColor}`,
            }}
          >
            {visibilityLabel}
          </span>
        </div>
      )}
    </div>
  );
}
