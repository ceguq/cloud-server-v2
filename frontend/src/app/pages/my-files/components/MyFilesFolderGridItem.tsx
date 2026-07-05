import type { CSSProperties, DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from "react";
import { Folder, MoreHorizontal } from "lucide-react";
import type { Folder as FolderModel } from "../../services/folderService";

export type MyFilesFolderGridItemProps = {
  folder: FolderModel;
  isSelected: boolean;
  checklistVisibilityStyle: CSSProperties;
  showFolderMetadata: boolean;
  moveDragDropEnabled: boolean;
  cardBg: string;
  panelBg: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  muted2Color: string;
  accentColor: string;
  onToggleSelection: () => void;
  onOpenFolderMenuAtCursor: (event: ReactMouseEvent, folderId: string) => void;
  onRowContextMenu: (event: ReactMouseEvent) => void;
  onRowClick: (event: ReactMouseEvent) => void;
  onRowDoubleClick: (event: ReactMouseEvent) => void;
  onDragStart: (event: ReactDragEvent) => void;
  onDragEnd: () => void;
  onDragOver: (event: ReactDragEvent) => void;
  onDrop: (event: ReactDragEvent) => void;
};

export function MyFilesFolderGridItem({
  folder,
  isSelected,
  checklistVisibilityStyle,
  showFolderMetadata,
  moveDragDropEnabled,
  cardBg,
  panelBg,
  borderColor,
  textColor,
  mutedColor,
  muted2Color,
  accentColor,
  onToggleSelection,
  onOpenFolderMenuAtCursor,
  onRowContextMenu,
  onRowClick,
  onRowDoubleClick,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: MyFilesFolderGridItemProps) {
  return (
    <div
      key={folder.id}
      draggable={moveDragDropEnabled}
      onContextMenu={onRowContextMenu}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDoubleClick={onRowDoubleClick}
      onClick={onRowClick}
      className="rounded-xl p-3 cursor-pointer transition-all group"
      style={{
        background: isSelected ? "rgba(59, 130, 246, 0.08)" : cardBg,
        border: `1px solid ${borderColor}`,
        borderLeft: isSelected ? `3px solid ${accentColor}55` : "3px solid transparent",
      }}
    >
      <div className="flex items-start justify-between mb-2 relative pl-6">
        <div className="absolute left-0 top-1 z-10">
          <input
            type="checkbox"
            aria-label={`Pilih folder ${folder.name}`}
            checked={isSelected}
            onChange={onToggleSelection}
            onClick={(e) => {
              e.stopPropagation();
            }}
            style={{
              width: 14,
              height: 14,
              accentColor: "#ef4444",
              ...checklistVisibilityStyle,
            }}
          />
        </div>

        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: panelBg }}
        >
          <Folder size={25} style={{ color: accentColor }} />
        </div>

        <button
          type="button"
          onClick={(event) => onOpenFolderMenuAtCursor(event, folder.id)}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          style={{
            color: mutedColor,
            background: "transparent",
            border: "1px solid transparent",
          }}
          onMouseEnter={(event) => {
            const el = event.currentTarget;
            el.style.background = `${accentColor}10`;
            el.style.borderColor = `${accentColor}55`;
            el.style.color = textColor;
          }}
          onMouseLeave={(event) => {
            const el = event.currentTarget;
            el.style.background = "transparent";
            el.style.borderColor = "transparent";
            el.style.color = mutedColor;
          }}
          aria-label={`Folder actions for ${folder.name}`}
          title="Folder actions"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      <div className="text-xs font-medium truncate" style={{ color: textColor }}>
        {folder.name}
      </div>
      {showFolderMetadata && (
        <>
          <div className="text-[10px] mt-0.5" style={{ color: mutedColor }}>
            -
          </div>
          <div className="text-[10px]" style={{ color: muted2Color }}>
            -
          </div>
        </>
      )}
    </div>
  );
}
