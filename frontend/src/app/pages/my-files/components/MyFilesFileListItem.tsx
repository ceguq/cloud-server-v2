import type {
  CSSProperties,
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";
import { FileTypeIcon } from "../../../components/FileTypeIcon";
import type { FileModel } from "../../../../services/fileService";

export type MyFilesFileListItemProps = {
  file: FileModel;
  isSelected: boolean;
  checklistVisibilityStyle: CSSProperties;
  showFileMetadata: boolean;
  fileListColumnTemplate: string;
  cardBg: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  muted2Color: string;
  panelBg: string;
  accentColor: string;
  actionMenuSlot: ReactNode;
  draggable: boolean;
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

export function MyFilesFileListItem({
  file,
  isSelected,
  checklistVisibilityStyle,
  showFileMetadata,
  fileListColumnTemplate,
  cardBg,
  borderColor,
  textColor,
  mutedColor,
  muted2Color,
  panelBg,
  accentColor,
  actionMenuSlot,
  draggable,
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
}: MyFilesFileListItemProps) {
  return (
    <div
      draggable={draggable}
      onContextMenu={onRowContextMenu}
      onDoubleClick={onRowDoubleClick}
      onClick={onRowClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="grid items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-colors group relative"
      style={{
        gridTemplateColumns: fileListColumnTemplate,
        border: `1px solid ${borderColor}`,
        background: isSelected ? "rgba(59, 130, 246, 0.08)" : cardBg,
        borderLeft: isSelected ? `3px solid ${accentColor}55` : "3px solid transparent",
      }}
    >
      <div className="flex items-center">
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
      </div>

      <div className="flex items-center gap-2.5 min-w-0">
        <FileTypeIcon
          originalName={file.original_name}
          mimeType={file.mime_type}
          className="w-7 h-7"
          size={14}
        />
        <span className="text-sm truncate" style={{ color: textColor }}>
          {file.original_name}
        </span>
      </div>

      {showFileMetadata && (
        <>
          <span
            className="text-[10px] px-2 py-0.5 rounded font-medium w-fit"
            style={{
              background: panelBg,
              color: accentColor,
              border: `1px solid ${borderColor}`,
              justifySelf: "start",
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
        </>
      )}

      {actionMenuSlot}
    </div>
  );
}
