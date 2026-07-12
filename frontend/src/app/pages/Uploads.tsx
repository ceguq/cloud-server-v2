import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, CheckCircle, XCircle, Clock, RefreshCcw } from "lucide-react";
import { useUploadManager } from "../upload/UploadManagerContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { UploadsEmptyState } from "./uploads/components/UploadsEmptyState";
import { formatBytes } from "./uploads/uploadFormatters";

type AppearanceTheme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

function safeReadAppearanceTheme(): AppearanceTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = window.localStorage.getItem("nimbus_appearance_theme");
    if (raw === "dark" || raw === "light" || raw === "system") return raw;
  } catch {
    // ignore
  }
  return "dark";
}

function safeReadAccentColor(): string {
  if (typeof window === "undefined") return "#3b82f6";
  try {
    const raw = window.localStorage.getItem("nimbus_accent_color");
    if (typeof raw === "string" && raw.trim().length > 0) return raw;
  } catch {
    // ignore
  }
  return "#3b82f6";
}

function resolveAppearanceTheme(theme: AppearanceTheme): ResolvedTheme {
  if (theme === "dark" || theme === "light") return theme;

  try {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    return mq?.matches ? "dark" : "light";
  } catch {
    return "dark";
  }
}

type UploadRowStatusConfig = {
  color: string;
  label: string;
  icon: React.ComponentType<any>;
};

export function Uploads() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveAppearanceTheme(safeReadAppearanceTheme()),
  );
  const [accentColor, setAccentColor] = useState<string>(() =>
    safeReadAccentColor(),
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const { items, addFiles, cancelItem, retryItem, addFilesError, removeCompletedItems } = useUploadManager();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncThemeFromStorage = () => {
      setResolvedTheme(resolveAppearanceTheme(safeReadAppearanceTheme()));
      setAccentColor(safeReadAccentColor());
    };

    syncThemeFromStorage();

    window.addEventListener("nimbus-appearance-change", syncThemeFromStorage);
    window.addEventListener("storage", syncThemeFromStorage);
    window.addEventListener("focus", syncThemeFromStorage);

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", syncThemeFromStorage);

    return () => {
      window.removeEventListener("nimbus-appearance-change", syncThemeFromStorage);
      window.removeEventListener("storage", syncThemeFromStorage);
      window.removeEventListener("focus", syncThemeFromStorage);
      mq?.removeEventListener?.("change", syncThemeFromStorage);
    };
  }, []);

  const queue = useMemo(() => items, [items]);

  const total = queue.length;
  const uploading = queue.filter(
    (i) => i.status === "queued" || i.status === "uploading",
  ).length;
  const completed = queue.filter((i) => i.status === "completed").length;
  const failed = queue.filter((i) => i.status === "failed").length;
  const cancelled = queue.filter((i) => i.status === "cancelled").length;

  const overallProgress = useMemo(() => {
    // Include only relevant statuses: queued, uploading, completed
    const progressItems = queue.filter((item) =>
      item.status === "queued" ||
      item.status === "uploading" ||
      item.status === "completed",
    );

    if (progressItems.length === 0) return null; // indicate no active uploads

    const sum = progressItems.reduce(
      (acc, it) => acc + (it.status === "completed" ? 100 : it.progress || 0),
      0,
    );

    return Math.round(sum / progressItems.length);
  }, [queue]);

  const uploadsColors =
    resolvedTheme === "light"
      ? {
          pageBg: "#f8fafc",
          cardBg: "#ffffff",
          panelBg: "#f1f5f9",
          border: "#dbe3ef",
          title: "#0f172a",
          text: "#334155",
          muted: "#64748b",
          muted2: "#94a3b8",
          inputBg: "#ffffff",
          inputBorder: "#dbe3ef",
          inputText: "#334155",
          headerText: "#64748b",
          rowBorder: "#e5eaf1",
          rowHoverBg: "#f8fafc",
          progressTrack: "#e2e8f0",
          buttonSoftBg: "#f1f5f9",
          errorText: "#b91c1c",
        }
      : {
          pageBg: "#080d1a",
          cardBg: "#0f1729",
          panelBg: "#0d1829",
          border: "#1a2540",
          title: "#e2e8f0",
          text: "#cbd5e1",
          muted: "#64748b",
          muted2: "#475569",
          inputBg: "#0d1829",
          inputBorder: "#1a2540",
          inputText: "#94a3b8",
          headerText: "#334155",
          rowBorder: "#0a1020",
          rowHoverBg: "#111c2f",
          progressTrack: "#1a2540",
          buttonSoftBg: "#1a2540",
          errorText: "#f87171",
        };

  const statusConfig: Record<string, UploadRowStatusConfig> = {
    queued: { color: uploadsColors.muted2, label: "Queued", icon: Clock },
    uploading: { color: accentColor, label: "Uploading", icon: Clock },
    completed: { color: "#34d399", label: "Completed", icon: CheckCircle },
    failed: { color: "#ef4444", label: "Failed", icon: XCircle },
    cancelled: { color: uploadsColors.muted2, label: "Cancelled", icon: XCircle },
  };

  return (
    <div
      className="flex-1 overflow-y-auto p-6 nimbus-scrollbar"
      style={{ background: uploadsColors.pageBg }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: uploadsColors.title }}>
            Uploads
          </h1>
          <p className="text-xs mt-0.5" style={{ color: uploadsColors.muted }}>
            Manage your file uploads
          </p>
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
          style={{
            background: `linear-gradient(135deg, ${accentColor}, #22d3ee)`,
            color: "#fff",
          }}
        >
          <Upload size={13} /> Upload Files
        </button>

        <input
          aria-label="Upload Files"
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            if (files.length > 0) {
              addFiles(files, null);
            }
            // reset input so selecting same file again works
            e.currentTarget.value = "";
          }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Uploads", value: uploading, color: accentColor },
          { label: "Completed", value: completed, color: "#34d399" },
          { label: "Failed", value: failed + cancelled, color: "#ef4444" },
          {
            label: "Overall Progress",
            value:
              overallProgress === null ? "No active uploads" : `${overallProgress}%`,
            color: accentColor,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4"
            style={{
              background: uploadsColors.cardBg,
              border: `1px solid ${uploadsColors.border}`,
            }}
          >
            <div className="text-2xl font-bold mb-1" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-xs" style={{ color: uploadsColors.muted2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const files = Array.from(e.dataTransfer.files || []);
          if (files.length > 0) addFiles(files, null);
        }}
        className="rounded-xl p-10 mb-6 flex flex-col items-center justify-center cursor-pointer transition-all"
        style={{
          border: `2px dashed ${isDragOver ? accentColor : uploadsColors.border}`,
          background: isDragOver ? `${accentColor}0D` : uploadsColors.panelBg,
        }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
          style={{
            background: `${accentColor}1A`,
            border: `2px solid ${accentColor}33`,
          }}
        >
          <Upload size={22} style={{ color: accentColor }} />
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: uploadsColors.title }}>
          {isDragOver ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="text-xs" style={{ color: uploadsColors.muted }}>
          or click to browse · Max 1 GB per file
        </p>
        {addFilesError ? (
          <div className="mt-2 text-sm" style={{ color: uploadsColors.errorText }}>
            {addFilesError}
          </div>
        ) : null}
      </div>

      {/* Upload Queue */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: uploadsColors.cardBg,
          border: `1px solid ${uploadsColors.border}`,
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: `1px solid ${uploadsColors.border}` }}
        >
          <span className="text-sm font-semibold" style={{ color: uploadsColors.title }}>
            Upload Queue
          </span>

          <div className="flex items-center gap-3">
            <div className="text-xs" style={{ color: uploadsColors.muted }}>
              {total === 0
                ? ""
                : `${uploading} uploading · ${completed} completed`}
            </div>

            {completed > 0 ? (
              <button
                type="button"
                onClick={() => removeCompletedItems()}
                className="px-2 py-1 rounded-lg text-xs font-semibold"
                style={{
                  background: uploadsColors.buttonSoftBg,
                  border: `1px solid ${uploadsColors.border}`,
                  color: uploadsColors.muted2,
                }}
              >
                Clear completed
              </button>
            ) : null}
          </div>
        </div>

        <div
          className="grid px-4 py-2.5"
          style={{
            gridTemplateColumns: "1fr 140px 110px 100px 120px 90px",
            borderBottom: `1px solid ${uploadsColors.border}`,
          }}
        >
          {["File", "Size", "Progress", "Status", "Actions", "Error"].map(
            (h) => (
              <span
                key={h}
                className="text-[11px] font-medium uppercase tracking-wider"
                style={{ color: uploadsColors.headerText }}
              >
                {h}
              </span>
            ),
          )}
        </div>

        {total === 0 ? (
          <UploadsEmptyState
            title="Belum ada aktivitas upload"
            textColor={uploadsColors.title}
            mutedColor={uploadsColors.muted}
            backgroundColor="transparent"
            borderColor={undefined}
            accentColor={accentColor}
            className="px-4 py-5 text-xs"
          />
        ) : (
          queue.map((it) => {
            const cfg = statusConfig[it.status] as UploadRowStatusConfig;
            const pct = Math.max(
              0,
              Math.min(100, it.status === "completed" ? 100 : it.progress || 0),
            );

            return (
              <div
                key={it.id}
                className="grid px-4 py-3 items-center transition-colors group"
                style={{
                  gridTemplateColumns: "1fr 140px 110px 100px 120px 90px",
                  borderBottom: `1px solid ${uploadsColors.rowBorder}`,
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = uploadsColors.rowHoverBg;
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = "transparent";
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center"
                    style={{ background: `${accentColor}14` }}
                  >
                    <Upload size={14} style={{ color: cfg.color }} />
                  </div>
                  <span
                    className="text-sm truncate"
                    style={{ color: uploadsColors.text }}
                    title={it.fileName}
                  >
                    {it.fileName}
                  </span>
                </div>

                <span className="text-xs" style={{ color: uploadsColors.muted }}>
                  {formatBytes(it.size)}
                  {it.folderId ? (
                    <span
                      className="block text-[10px] mt-0.5"
                      style={{ color: uploadsColors.muted2 }}
                    >
                      Folder: {it.folderId}
                    </span>
                  ) : null}
                </span>

                <div>
                  {it.status === "queued" ? (
                    <div
                      className="flex items-center gap-1.5"
                      style={{ color: uploadsColors.muted }}
                    >
                      <LoadingSpinner size={10} />
                      <span className="text-[10px]">Antri...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between mb-1">
                        <span
                          className="text-[10px]"
                          style={{ color: uploadsColors.muted2 }}
                        >
                          {pct}%
                        </span>
                      </div>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ background: uploadsColors.progressTrack }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background:
                              it.status === "completed"
                                ? "#34d399"
                                : it.status === "failed"
                                  ? "#ef4444"
                                  : `linear-gradient(90deg, ${accentColor}, #22d3ee)`,
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <cfg.icon size={13} style={{ color: cfg.color }} />
                  <span className="text-[10px]" style={{ color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {(it.status === "queued" || it.status === "uploading") && (
                    <button
                      type="button"
                      onClick={() => cancelItem(it.id)}
                      className="px-2 py-1 rounded-lg text-[10px] font-semibold hover:opacity-90"
                      style={{
                        background: uploadsColors.buttonSoftBg,
                        border: `1px solid ${uploadsColors.border}`,
                        color: uploadsColors.text,
                      }}
                    >
                      Cancel
                    </button>
                  )}

                  {it.status === "failed" && (
                    <button
                      type="button"
                      onClick={() => retryItem(it.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold hover:opacity-90"
                      style={{
                        background: uploadsColors.buttonSoftBg,
                        border: `1px solid ${uploadsColors.border}`,
                        color: uploadsColors.text,
                      }}
                    >
                      <RefreshCcw size={12} /> Retry
                    </button>
                  )}
                </div>

                <span
                  className="text-[10px]"
                  style={{
                    color: it.errorMessage
                      ? uploadsColors.errorText
                      : uploadsColors.muted2,
                  }}
                >
                  {it.errorMessage ? it.errorMessage : ""}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
