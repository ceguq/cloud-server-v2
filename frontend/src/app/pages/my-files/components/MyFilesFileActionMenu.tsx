import type { RefObject } from "react";
import {
  Eye,
  FileText,
  Download,
  Share2,
  Edit3,
  Folder,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { MenuItemButton } from "../components/MenuItemButton";
import type { FileActionFeedback } from "../types";
import type { File as FileModel } from "../../../services/fileService";
import type { MenuCoordinate } from "../types";

export type MyFilesFileActionMenuProps = {
  file: FileModel;
  isOpen: boolean;
  position: MenuCoordinate | null;
  menuRef: RefObject<HTMLDivElement | null> | null;
  panelBg: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  previewing: boolean;
  sharing: boolean;
  openingInNewTab: boolean;
  feedback: FileActionFeedback | null;
  onPreview: () => void;
  onOpenInNewTab: () => void;
  onDetails: () => void;
  onDownload: () => void;
  onShare: () => void;
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
};

export function MyFilesFileActionMenu({
  file,
  isOpen,
  position,
  menuRef,
  panelBg,
  borderColor,
  textColor,
  mutedColor,
  accentColor,
  previewing,
  sharing,
  openingInNewTab,
  feedback,
  onPreview,
  onOpenInNewTab,
  onDetails,
  onDownload,
  onShare,
  onRename,
  onMove,
  onDelete,
}: MyFilesFileActionMenuProps) {
  if (!isOpen || !position) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: position.y,
        left: position.x,
        width: 260,
        zIndex: 9999,
        background: panelBg,
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        padding: 6,
        boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
      }}
      role="menu"
      aria-label={`File actions ${file.original_name}`}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <MenuItemButton
        label={previewing ? "Opening..." : "Preview"}
        icon={<Eye size={14} />}
        disabled={!file || previewing}
        ariaLabel={`Preview ${file.original_name}`}
        onClick={onPreview}
        textColor={textColor}
        accentColor={accentColor}
      />

      <MenuItemButton
        label="Open in new tab"
        icon={<ExternalLink size={14} />}
        disabled={openingInNewTab}
        ariaLabel={`Open in new tab ${file.original_name}`}
        onClick={onOpenInNewTab}
        textColor={textColor}
        accentColor={accentColor}
      />

      <MenuItemButton
        label="Details"
        icon={<FileText size={14} />}
        ariaLabel={`Details ${file.original_name}`}
        onClick={onDetails}
        textColor={textColor}
        accentColor={accentColor}
      />

      <MenuItemButton
        label="Download"
        icon={<Download size={14} />}
        ariaLabel={`Download ${file.original_name}`}
        onClick={onDownload}
        textColor={textColor}
        accentColor={accentColor}
      />

      <MenuItemButton
        label="Share"
        icon={<Share2 size={14} />}
        disabled={sharing}
        ariaLabel={`Share ${file.original_name}`}
        onClick={onShare}
        textColor={textColor}
        accentColor={accentColor}
      />

      <div
        className="mt-2 border-t pt-2"
        style={{ borderColor }}
      >
        <MenuItemButton
          label="Rename"
          icon={<Edit3 size={14} />}
          ariaLabel={`Rename ${file.original_name}`}
          onClick={onRename}
          textColor={textColor}
          accentColor={accentColor}
        />

        <MenuItemButton
          label="Move to..."
          icon={<Folder size={14} />}
          ariaLabel={`Move ${file.original_name}`}
          onClick={onMove}
          textColor={textColor}
          accentColor={accentColor}
        />

        <MenuItemButton
          label="Trash"
          icon={<Trash2 size={14} />}
          danger
          ariaLabel={`Trash ${file.original_name}`}
          onClick={onDelete}
          textColor={textColor}
          accentColor={accentColor}
        />
      </div>

      {feedback ? (
        <div
          className="mt-2 w-full rounded-lg px-2 py-1 text-[10px] font-semibold"
          style={{
            background:
              feedback.type === "error"
                ? "rgba(239,68,68,0.10)"
                : `${accentColor}14`,
            color: feedback.type === "error" ? "#ef4444" : accentColor,
          }}
          role="alert"
        >
          {feedback.message}
        </div>
      ) : null}
    </div>
  );
}
