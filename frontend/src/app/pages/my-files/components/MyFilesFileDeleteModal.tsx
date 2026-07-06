import type { FileModel } from "../../../../services/fileService";

type Props = {
  file: FileModel | null;
  deleteLoading: boolean;
  deleteError?: string | null;
  titleColor: string;
  textColor: string;
  mutedColor: string;
  cardBg: string;
  borderColor: string;
  buttonSoftBg: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function MyFilesFileDeleteModal({
  file,
  deleteLoading,
  deleteError,
  titleColor,
  textColor,
  mutedColor,
  cardBg,
  borderColor,
  onClose,
  onConfirm,
}: Props) {
  if (!file) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      onMouseDown={() => {
        if (!deleteLoading) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6"
        style={{
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          background: cardBg,
          border: `1px solid ${borderColor}`,
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-3">
          <h2 className="text-sm font-semibold" style={{ color: titleColor }}>
            Delete File?
          </h2>
          <p className="text-xs mt-2" style={{ color: mutedColor }}>
            Apakah kamu yakin ingin menghapus "{file.original_name}"?
            <br />
            File akan dipindahkan ke Trash.
          </p>
        </div>

        {deleteError && (
          <div
            className="text-xs rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 mb-3"
            style={{ color: "#f87171" }}
          >
            {deleteError}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            disabled={deleteLoading}
            onClick={() => {
              onClose();
            }}
            className="px-3 py-2 rounded-xl text-xs font-medium"
            style={{
              background: buttonSoftBg,
              color: textColor,
              border: `1px solid ${borderColor}`,
              opacity: deleteLoading ? 0.6 : 1,
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={deleteLoading}
            onClick={() => onConfirm()}
            className="px-3 py-2 rounded-xl text-xs font-semibold"
            style={{
              background: "#f87171",
              border: `1px solid rgba(248,113,113,0.4)`,
              color: "#fff",
              opacity: deleteLoading ? 0.75 : 1,
            }}
          >
            {deleteLoading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MyFilesFileDeleteModal;
