import type { Folder as FolderModel } from "../../../../services/folderService";
import type { MoveItemType } from "../types";

type Props = {
  isOpen: boolean;
  itemType: MoveItemType | null;
  itemName: string;
  itemId: string | null;
  fileIds: string[];
  targetFolderId: string | null;
  error: string;
  loading: boolean;
  folders: FolderModel[];
  titleColor: string;
  mutedColor: string;
  textColor: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  cardBg: string;
  borderColor: string;
  panelBg: string;
  buttonSoftBg: string;
  accentColor: string;
  onClose: () => void;
  onTargetFolderChange: (folderId: string | null) => void;
  onSubmit: () => void;
};

export function MyFilesMoveModal({
  isOpen,
  itemType,
  itemName,
  itemId,
  fileIds,
  targetFolderId,
  error,
  loading,
  folders,
  titleColor,
  mutedColor,
  textColor,
  inputBg,
  inputBorder,
  inputText,
  cardBg,
  borderColor,
  buttonSoftBg,
  accentColor,
  onClose,
  onTargetFolderChange,
  onSubmit,
}: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="move-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-5 shadow-2xl"
        style={{
          background: cardBg,
          border: `1px solid ${borderColor}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2
              id="move-modal-title"
              className="text-lg font-semibold"
              style={{ color: titleColor }}
            >
              {itemType === "folder" ? "Move Folder" : "Move File"}
            </h2>
            <p className="mt-1 text-sm" style={{ color: mutedColor }}>
              Pilih folder tujuan untuk memindahkan item ini.
            </p>
          </div>

          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm transition-colors"
            style={{
              color: mutedColor,
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.background = `${accentColor}10`;
              el.style.color = textColor;
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.background = "transparent";
              el.style.color = mutedColor;
            }}
            onClick={onClose}
            disabled={loading}
            aria-label="Close move modal"
          >
            &times;
          </button>
        </div>

        <div
          className="mb-4 rounded-xl border p-3"
          style={{
            background: panelBg,
            border: `1px solid ${borderColor}`,
          }}
        >
          <p className="text-xs uppercase tracking-wide" style={{ color: mutedColor }}>
            Item
          </p>
          <p className="mt-1 truncate text-sm font-medium" style={{ color: textColor }}>
            {itemType === "file" && fileIds.length > 1 ? `${fileIds.length} files selected` : itemName}
          </p>
        </div>

        <label className="mb-2 block text-sm font-medium" style={{ color: textColor }}>
          Folder tujuan
        </label>

        <select
          className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
          value={targetFolderId ?? "__root__"}
          onChange={(e) =>
            onTargetFolderChange(
              e.target.value === "__root__" ? null : e.target.value,
            )
          }
          disabled={loading}
          style={{
            background: inputBg,
            border: `1px solid ${inputBorder}`,
            color: inputText,
            caretColor: accentColor,
          }}
        >
          <option value="__root__">Root / My Files</option>
          {folders
            .filter((folder) =>
              itemType === "folder" ? folder.id !== itemId : true,
            )
            .map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
        </select>

        {error && (
          <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            className="rounded-xl px-4 py-2 text-sm font-medium transition-colors"
            onClick={onClose}
            disabled={loading}
            style={{
              background: buttonSoftBg,
              border: `1px solid ${borderColor}`,
              color: textColor,
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onSubmit}
            disabled={loading || !itemId || !itemType}
            style={{
              background: `linear-gradient(135deg, ${accentColor}, #22d3ee)`,
            }}
          >
            {loading ? "Moving..." : "Move"}
          </button>
        </div>
      </div>
    </div>
  );
}
