import type { FormEvent } from "react";

type Props = {
  isOpen: boolean;
  fileRenameName: string;
  fileModalError?: string | null;
  fileActionLoading: boolean;
  titleColor: string;
  textColor: string;
  mutedColor: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  accentColor: string;
  buttonSoftBg: string;
  cardBg: string;
  borderColor: string;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function MyFilesFileRenameModal({
  isOpen,
  fileRenameName,
  fileModalError,
  fileActionLoading,
  titleColor,
  textColor,
  mutedColor,
  inputBg,
  inputBorder,
  inputText,
  accentColor,
  buttonSoftBg,
  cardBg,
  borderColor,
  onClose,
  onNameChange,
  onSubmit,
}: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl border p-6"
        style={{
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          background: cardBg,
          border: `1px solid ${borderColor}`,
        }}
      >
        <div className="mb-4">
          <h2 className="text-sm font-semibold" style={{ color: titleColor }}>
            Rename File
          </h2>
          <p className="text-xs mt-1" style={{ color: mutedColor }}>
            Ganti nama file.
          </p>
        </div>

        {fileModalError && (
          <div
            className="text-xs rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 mb-3"
            style={{ color: "#f87171" }}
          >
            {fileModalError}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-xs" style={{ color: mutedColor }}>
              New name
            </label>
            <input
              autoFocus
              type="text"
              className="mt-1 w-full rounded-xl border px-4 py-2 text-sm outline-none focus:border-blue-500"
              value={fileRenameName}
              onChange={(e) => onNameChange(e.target.value)}
              aria-label="Rename file input"
              style={{
                background: inputBg,
                border: `1px solid ${inputBorder}`,
                color: inputText,
                caretColor: accentColor,
              }}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={fileActionLoading}
              className="px-3 py-2 rounded-xl text-xs font-medium"
              style={{
                background: buttonSoftBg,
                border: `1px solid ${borderColor}`,
                color: textColor,
                opacity: fileActionLoading ? 0.6 : 1,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={fileActionLoading}
              className="px-3 py-2 rounded-xl text-xs font-semibold text-white"
              style={{
                background: `linear-gradient(135deg, ${accentColor}, #22d3ee)`,
                opacity: fileActionLoading ? 0.7 : 1,
              }}
            >
              {fileActionLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
