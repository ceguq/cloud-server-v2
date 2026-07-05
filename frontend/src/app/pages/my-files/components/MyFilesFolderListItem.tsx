import type { MouseEvent as ReactMouseEvent, DragEvent as ReactDragEvent, CSSProperties } from "react";
import { Folder, MoreHorizontal } from "lucide-react";
import type { Folder as FolderModel } from "../../services/folderService";
import type { MenuCoordinate } from "../types";

export type MyFilesFolderListItemProps = {
  folder: FolderModel;
  isSelected: boolean;
  checklistVisibilityStyle: CSSProperties;
  showFolderMetadata: boolean;
  folderListColumnTemplate: string;
  cardBg: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  openFolderActionId: string | null;
  folderActionMenuPosition: MenuCoordinate | null;
  onToggleSelection: () => void;
  onOpenFolder: () => void;
  onOpenFolderMenuAtCursor: (event: ReactMouseEvent, folderId: string) => void;
  onRowContextMenu: (event: ReactMouseEvent) => void;
  onRowClick: (event: ReactMouseEvent) => void;
  onRowDoubleClick: (event: ReactMouseEvent) => void;
  onDragOver: (event: ReactDragEvent) => void;
  onDrop: (event: ReactDragEvent) => void;
  onCloseFolderAction: () => void;
  onOpenRenameFolderModal: () => void;
  onOpenDeleteFolderModal: () => void;
};

export function MyFilesFolderListItem({
  folder,
  isSelected,
  checklistVisibilityStyle,
  showFolderMetadata,
  folderListColumnTemplate,
  cardBg,
  borderColor,
  textColor,
  mutedColor,
  accentColor,
  openFolderActionId,
  folderActionMenuPosition,
  onToggleSelection,
  onOpenFolder,
  onOpenFolderMenuAtCursor,
  onRowContextMenu,
  onRowClick,
  onRowDoubleClick,
  onDragOver,
  onDrop,
  onCloseFolderAction,
  onOpenRenameFolderModal,
  onOpenDeleteFolderModal,
}: MyFilesFolderListItemProps) {
  return (
    <div
      onContextMenu={onRowContextMenu}
      onDoubleClick={onRowDoubleClick}
      onClick={onRowClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className="grid px-4 py-2.5 items-center cursor-pointer hover:bg-[#0d1829] transition-colors group relative rounded-xl"
      style={{
        gridTemplateColumns: folderListColumnTemplate,
        borderBottom: "1px solid #0a1020",
        background: cardBg,
        border: `1px solid ${borderColor}`,
      }}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={onToggleSelection}
        onClick={(event) => {
          event.stopPropagation();
        }}
        style={{
          width: 14,
          height: 14,
          accentColor: "#3b82f6",
          ...checklistVisibilityStyle,
        }}
        aria-label={`Select folder ${folder.name}`}
      />

      <div className="flex min-w-0 items-center gap-3">
        <Folder size={18} style={{ color: "#60a5fa", flexShrink: 0 }} />
        <span className="min-w-0 truncate" style={{ color: textColor }}>
          {folder.name}
        </span>
      </div>

      {showFolderMetadata && (
        <>
          <span className="text-xs font-medium" style={{ color: "#60a5fa" }}>
            FOLDER
          </span>

          <span className="text-xs" style={{ color: "#64748b" }}>
            {folder.updated_at || folder.created_at
              ? new Date(folder.updated_at ?? folder.created_at ?? "").toLocaleDateString()
              : "—"}
          </span>

          <span className="text-xs" style={{ color: "#64748b" }}>
            —
          </span>

          <span className="text-xs" style={{ color: "#64748b" }}>
            Private
          </span>
        </>
      )}

      <div
        className="relative flex items-center justify-center"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <button
          type="button"
          onClick={(event) => onOpenFolderMenuAtCursor(event, folder.id)}
          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[#1e2d45] z-50"
          style={{
            color: "#94a3b8",
          }}
          aria-label={`Folder actions for ${folder.name}`}
          title="Folder actions"
        >
          <MoreHorizontal size={16} />
        </button>

        {openFolderActionId === folder.id && !folderActionMenuPosition && (
          <div
            className="absolute right-0 top-8 z-50 min-w-[128px] overflow-hidden rounded-lg"
            style={{
              background: "#0d1829",
              border: "1px solid #1a2540",
            }}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs hover:bg-[#1e2d45]"
              style={{ color: "#cbd5e1" }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onCloseFolderAction();
                onOpenRenameFolderModal();
              }}
              aria-label={`Rename ${folder.name}`}
            >
              Rename
            </button>

            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-xs hover:bg-[#1e2d45]"
              style={{ color: "#f87171" }}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onCloseFolderAction();
                onOpenDeleteFolderModal();
              }}
              aria-label={`Delete ${folder.name}`}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
