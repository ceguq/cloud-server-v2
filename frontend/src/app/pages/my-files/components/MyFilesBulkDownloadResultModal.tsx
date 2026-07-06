type BulkDownloadResult = {
  okCount: number;
  failCount: number;
};

type Props = {
  result: BulkDownloadResult | null;
  titleColor: string;
  mutedColor: string;
  cardBg: string;
  borderColor: string;
  buttonSoftBg: string;
  onClose: () => void;
};

export function MyFilesBulkDownloadResultModal({
  result,
  titleColor,
  mutedColor,
  cardBg,
  borderColor,
  buttonSoftBg,
  onClose,
}: Props) {
  if (!result) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-download-result-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#1a2540] bg-[#0f1729] p-6"
        style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2
              id="bulk-download-result-title"
              className="text-sm font-semibold"
              style={{ color: titleColor }}
            >
              Download selesai
            </h2>
            <p className="mt-2 text-xs" style={{ color: mutedColor }}>
              Jika browser memblokir multiple download otomatis, beberapa
              file mungkin perlu diunduh ulang.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
            style={{
              background: "#0d1829",
              border: "1px solid #1a2540",
              color: "#94a3b8",
            }}
            aria-label="Tutup hasil bulk download"
          >
            &times;
          </button>
        </div>

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
              <div className="text-lg font-semibold">{result.okCount}</div>
              <div className="text-[11px]">berhasil</div>
            </div>
            <div
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2"
              style={{ color: "#f87171" }}
            >
              <div className="text-lg font-semibold">{result.failCount}</div>
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
      </div>
    </div>
  );
}
