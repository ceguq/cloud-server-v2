import { LoadingSpinner } from "../../../components/LoadingSpinner";

type BulkFolderDeleteResult = {
  okCount: number;
  failCount: number;
};

type Props = {
  isOpen: boolean;
  folderCount: number;
  result: BulkFolderDeleteResult | null;
  loading: boolean;
  titleColor: string;
  textColor: string;
  mutedColor: string;
  cardBg: string;
  borderColor: string;
  buttonSoftBg: string;
  accentColor: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function MyFilesBulkFolderDeleteModal({
  isOpen,
  folderCount,
  result,
  loading,
  titleColor,
  mutedColor,
  cardBg,
  borderColor,
  buttonSoftBg,
  accentColor,
  onClose,
  onConfirm,
}: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-delete-folders-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#1a2540] bg-[#0f1729] p-6"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
      >
        <div className="mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="bulk-delete-folders-title"
                className="text-sm font-semibold"
                style={{ color: titleColor }}
              >
                Pindahkan folder ke Trash?
              </h2>
              <p className="mt-2 text-xs" style={{ color: mutedColor }}>
                {folderCount} folder terpilih akan
                dipindahkan ke Trash. Isi folder juga ikut masuk Trash.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
              style={{
                background: "#0d1829",
                border: "1px solid #1a2540",
                color: "#94a3b8",
                opacity: loading ? 0.6 : 1,
              }}
              aria-label="Tutup modal bulk delete folder"
            >
              &times;
            </button>
          </div>
        </div>

        {loading && (
          <div
            className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs flex items-center gap-2"
            style={{ color: "#67e8f9" }}
            role="status"
          >
            <LoadingSpinner size={12} /> Memindahkan...
          </div>
        )}

        {result ? (
          <>
            <div
              className="rounded-xl border border-[#1a2540] bg-[#111c2f] p-4"
              role="status"
            >
              <div className="text-xs" style={{ color: mutedColor }}>
                Hasil proses
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2"
                  style={{ color: "#34d399" }}
                >
                  <div className="text-lg font-semibold">
                    {result.okCount}
                  </div>
                  <div className="text-[11px]">berhasil</div>
                </div>
                <div
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2"
                  style={{ color: "#f87171" }}
                >
                  <div className="text-lg font-semibold">
                    {result.failCount}
                  </div>
                  <div className="text-[11px]">gagal</div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-3 py-2 text-xs font-medium"
                style={{
                  background: "#0d1829",
                  border: "1px solid #1a2540",
                  color: "#94a3b8",
                }}
              >
                Tutup
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl px-3 py-2 text-xs font-medium"
              style={{
                background: "#0d1829",
                border: "1px solid #1a2540",
                color: "#94a3b8",
                opacity: loading ? 0.6 : 1,
              }}
            >
              Batal
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className="rounded-xl px-3 py-2 text-xs font-semibold"
              style={{
                background: "#f87171",
                border: "1px solid rgba(248,113,113,0.4)",
                color: "#080d1a",
                opacity: loading ? 0.75 : 1,
              }}
            >
              {loading ? "Memindahkan..." : "Pindahkan ke Trash"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
