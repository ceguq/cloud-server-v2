import { X } from "lucide-react";
import type { FileModel } from "../../../services/fileService";
import type { Folder as FolderModel } from "../../../services/folderService";
import { formatBytes, getTypeLabel } from "../myFilesFormatters";
import type { DetailsItem } from "../types";

export type MyFilesDetailsModalProps = {
  detailsItem: DetailsItem | null;
  titleColor: string;
  textColor: string;
  mutedColor: string;
  panelBg: string;
  cardBg: string;
  borderColor: string;
  onClose: () => void;
};

export function MyFilesDetailsModal({
  detailsItem,
  titleColor,
  textColor,
  mutedColor,
  panelBg,
  cardBg,
  borderColor,
  onClose,
}: MyFilesDetailsModalProps) {
  if (!detailsItem) return null;

  const item = detailsItem.item;
  const isFile = detailsItem.type === "file";
  const title = isFile ? (item as FileModel).original_name : (item as FolderModel).name;
  const typeLabel = isFile
    ? getTypeLabel((item as FileModel).mime_type ?? null)
    : "Folder";
  const modifiedAt =
    item.updated_at || item.created_at
      ? new Date(item.updated_at ?? item.created_at ?? "").toLocaleString()
      : "-";
  const createdAt = item.created_at ? new Date(item.created_at).toLocaleString() : "-";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-5"
        style={{
          background: cardBg,
          borderColor,
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold" style={{ color: titleColor }}>
              Details
            </div>
            <div
              className="mt-1 truncate text-xs"
              style={{ color: mutedColor }}
              title={title}
            >
              {title}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{
              background: panelBg,
              border: `1px solid ${borderColor}`,
              color: mutedColor,
            }}
            aria-label="Close details"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="font-semibold" style={{ color: mutedColor }}>
              Type
            </div>
            <div className="mt-1" style={{ color: textColor }}>
              {typeLabel}
            </div>
          </div>
          <div>
            <div className="font-semibold" style={{ color: mutedColor }}>
              Status
            </div>
            <div className="mt-1" style={{ color: textColor }}>
              {isFile ? "Private" : "Folder"}
            </div>
          </div>
          <div>
            <div className="font-semibold" style={{ color: mutedColor }}>
              Modified
            </div>
            <div className="mt-1" style={{ color: textColor }}>
              {modifiedAt}
            </div>
          </div>
          <div>
            <div className="font-semibold" style={{ color: mutedColor }}>
              Size
            </div>
            <div className="mt-1" style={{ color: textColor }}>
              {isFile ? formatBytes((item as FileModel).size) : "-"}
            </div>
          </div>
          <div className="col-span-2">
            <div className="font-semibold" style={{ color: mutedColor }}>
              Created
            </div>
            <div className="mt-1" style={{ color: textColor }}>
              {createdAt}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
