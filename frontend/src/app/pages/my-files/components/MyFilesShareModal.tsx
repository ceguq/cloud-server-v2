import { X } from "lucide-react";
import type { ShareMode } from "../types";

type Props = {
  isOpen: boolean;
  selectedFileName: string;
  shareMode: ShareMode;
  activeShareLinkUrl: string | null;
  shareLoading: boolean;
  shareError: string;
  copySuccess: string;
  shareModalPassword: string;
  titleColor: string;
  textColor: string;
  mutedColor: string;
  muted2Color: string;
  panelBg: string;
  cardBg: string;
  borderColor: string;
  buttonSoftBg: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  accentColor: string;
  onClose: () => void;
  onModeChange: (mode: ShareMode) => void;
  onPasswordChange: (value: string) => void;
  onCopyLink: () => void;
  onSubmit: () => void;
};

export function MyFilesShareModal({
  isOpen,
  selectedFileName,
  shareMode,
  activeShareLinkUrl,
  shareLoading,
  shareError,
  copySuccess,
  shareModalPassword,
  titleColor,
  textColor,
  mutedColor,
  muted2Color,
  panelBg,
  cardBg,
  borderColor,
  buttonSoftBg,
  inputBg,
  inputBorder,
  inputText,
  accentColor,
  onClose,
  onModeChange,
  onPasswordChange,
  onCopyLink,
  onSubmit,
}: Props) {
  if (!isOpen) return null;

  const hasActiveShareLink = Boolean(activeShareLinkUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border p-6"
        style={{
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          background: cardBg,
          border: `1px solid ${borderColor}`,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: titleColor }}
            >
              Share
            </h2>
            <p className="text-xs mt-1" style={{ color: mutedColor }}>
              {selectedFileName}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close share dialog"
            onClick={onClose}
            className="rounded-xl p-2 text-sm"
            style={{
              color: mutedColor,
              background: buttonSoftBg,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {shareError && (
          <div
            className="text-xs rounded-2xl border px-3 py-2 mb-4"
            style={{
              borderColor: "rgba(248,113,113,0.35)",
              background: "rgba(248,113,113,0.12)",
              color: "#f87171",
            }}
          >
            {shareError}
          </div>
        )}

        <div className="space-y-4">
          <div
            className="rounded-2xl border p-4"
            style={{
              borderColor,
              background: panelBg,
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div
                  className="text-[11px] font-semibold uppercase"
                  style={{ color: muted2Color }}
                >
                  Status
                </div>
                <div
                  className="mt-2 text-sm font-semibold"
                  style={{ color: textColor }}
                >
                  {hasActiveShareLink ? "Shared" : "Private"}
                </div>
              </div>
              <div
                className="rounded-full px-3 py-1 text-[11px] font-semibold"
                style={{
                  background: hasActiveShareLink
                    ? `${accentColor}14`
                    : buttonSoftBg,
                  color: hasActiveShareLink ? accentColor : mutedColor,
                }}
              >
                {hasActiveShareLink ? "Shared" : "Private"}
              </div>
            </div>
            <div className="mt-3 text-[11px]" style={{ color: muted2Color }}>
              {hasActiveShareLink
                ? "A share link is currently active."
                : "No public link is active."
              }
            </div>
          </div>

          <div
            className="rounded-2xl border p-4"
            style={{
              borderColor,
              background: panelBg,
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-semibold" style={{ color: mutedColor }}>
                  Mode
                </div>
                <div className="mt-1 text-[11px]" style={{ color: muted2Color }}>
                  Choose sharing mode for this file.
                </div>
              </div>
              <div
                className="flex rounded-2xl border"
                style={{
                  borderColor,
                  background: buttonSoftBg,
                }}
              >
                {(["private", "shared"] as const).map((mode) => {
                  const active = shareMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => onModeChange(mode)}
                      className="rounded-2xl px-4 py-2 text-sm font-semibold"
                      style={{
                        background: active ? accentColor : "transparent",
                        color: active ? "white" : textColor,
                        borderRadius: "1rem",
                      }}
                    >
                      {mode === "private" ? "Private" : "Shared"}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-3 text-[11px]" style={{ color: muted2Color }}>
              {shareMode === "private"
                ? "Private mode revokes the existing public link so it can no longer be used."
                : "Shared mode creates or updates a public link. You can optionally protect it with a password."
              }
            </div>
          </div>

          {shareMode === "shared" ? (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold" style={{ color: mutedColor }}>
                    Public link
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={activeShareLinkUrl ?? ""}
                      placeholder="No public link yet"
                      aria-label="Public share URL"
                      className="flex-1 rounded-2xl border px-4 py-3 text-sm outline-none"
                      style={{
                        background: inputBg,
                        border: `1px solid ${inputBorder}`,
                        color: hasActiveShareLink ? inputText : muted2Color,
                      }}
                    />
                    <button
                      type="button"
                      onClick={onCopyLink}
                      disabled={!hasActiveShareLink}
                      className="rounded-2xl px-4 py-3 text-xs font-semibold text-white"
                      style={{
                        background: hasActiveShareLink
                          ? `linear-gradient(135deg, ${accentColor}, #22d3ee)`
                          : buttonSoftBg,
                        opacity: hasActiveShareLink ? 1 : 0.6,
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  {copySuccess && (
                    <div className="text-[11px]" style={{ color: "#34d399" }}>
                      {copySuccess}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold" style={{ color: mutedColor }}>
                    Password optional
                  </label>
                  <input
                    type="password"
                    value={shareModalPassword}
                    onChange={(event) => onPasswordChange(event.target.value)}
                    placeholder="Leave empty for a public link"
                    className="w-full rounded-2xl border px-4 py-3 text-sm outline-none"
                    style={{
                      background: inputBg,
                      border: `1px solid ${inputBorder}`,
                      color: inputText,
                      caretColor: accentColor,
                    }}
                  />
                  <div className="text-[11px]" style={{ color: muted2Color }}>
                    Leave empty for a public link. Add a password to require it before viewing/downloading.
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {shareMode === "private" ? (
              <button
                type="button"
                onClick={onSubmit}
                disabled={shareLoading || !hasActiveShareLink}
                className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, #22d3ee)`,
                  opacity: shareLoading || !hasActiveShareLink ? 0.6 : 1,
                }}
              >
                {shareLoading ? "Updating..." : "Make file private"}
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={shareLoading}
                className="w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, #22d3ee)`,
                  opacity: shareLoading ? 0.6 : 1,
                }}
              >
                {shareLoading ? "Updating..." : "Update share settings"}
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={shareLoading}
            className="rounded-2xl px-4 py-3 text-sm font-medium"
            style={{
              background: buttonSoftBg,
              border: `1px solid ${borderColor}`,
              color: textColor,
              opacity: shareLoading ? 0.6 : 1,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
