import type { RefObject } from "react";
import { FileText, Folder, Edit3, Trash2 } from "lucide-react";
import type { Folder as FolderModel } from "../../../services/folderService";
import type { MenuCoordinate } from "../types";

export type MyFilesFolderActionMenuProps = {
  folder: FolderModel | null;
  position: MenuCoordinate | null;
  menuRef: RefObject<HTMLDivElement | null>;
  panelBg: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
  onShowDetails: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
};

export function MyFilesFolderActionMenu({
  folder,
  position,
  menuRef,
  panelBg,
  borderColor,
  textColor,
  accentColor,
  onShowDetails,
  onRename,
  onMove,
  onDelete,
}: MyFilesFolderActionMenuProps) {
  if (!folder || !position) return null;

  return (
    <div
      ref={menuRef}
      className="rounded-xl shadow-2xl"
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        width: 176,
        zIndex: 9999,
        background: panelBg,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: 6,
      }}
      role="menu"
      aria-label={`Folder menu ${folder.name}`}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        role="menuitem"
        className="w-full rounded-lg px-2 py-1 text-left text-xs font-semibold"
        style={{ color: textColor, background: "transparent" }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = `${accentColor}10`;
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = "transparent";
        }}
        onClick={onShowDetails}
        aria-label={`Details ${folder.name}`}
      >
        <div className="flex items-center gap-2">
          <FileText size={14} />
          <span>Details</span>
        </div>
      </button>

      <button
        type="button"
        role="menuitem"
        className="mt-1 w-full rounded-lg px-2 py-1 text-left text-xs font-semibold"
        style={{ color: textColor, background: "transparent" }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = `${accentColor}10`;
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = "transparent";
        }}
        onClick={onRename}
        aria-label={`Rename ${folder.name}`}
      >
        <div className="flex items-center gap-2">
          <Edit3 size={14} />
          <span>Rename</span>
        </div>
      </button>

      <button
        type="button"
        role="menuitem"
        className="mt-1 w-full rounded-lg px-2 py-1 text-left text-xs font-semibold"
        style={{ color: textColor, background: "transparent" }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = `${accentColor}10`;
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = "transparent";
        }}
        onClick={onMove}
        aria-label={`Move ${folder.name}`}
      >
        <div className="flex items-center gap-2">
          <Folder size={14} />
          <span>Move to...</span>
        </div>
      </button>

      <button
        type="button"
        role="menuitem"
        className="mt-1 w-full rounded-lg px-2 py-1 text-left text-xs font-semibold"
        style={{ color: "#f87171", background: "transparent" }}
        onMouseEnter={(event) => {
          event.currentTarget.style.background = "rgba(239,68,68,0.12)";
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = "transparent";
        }}
        onClick={onDelete}
        aria-label={`Delete ${folder.name}`}
      >
        <div className="flex items-center gap-2">
          <Trash2 size={14} />
          <span>Trash</span>
        </div>
      </button>
    </div>
  );
}
