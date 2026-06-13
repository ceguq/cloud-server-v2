import { useMemo, useRef, useState } from "react";
import { Upload, CheckCircle, XCircle, Clock, RefreshCcw } from "lucide-react";
import { useUploadManager } from "../upload/UploadManagerContext";
import { LoadingSpinner } from "../components/LoadingSpinner";

function formatBytes(bytes: number): string {
  const v = typeof bytes === "number" ? bytes : 0;
  if (v === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(v) / Math.log(1024)),
    units.length - 1,
  );
  const num = v / Math.pow(1024, i);
  const fixed = num >= 10 ? 1 : 2;
  return `${num.toFixed(fixed)} ${units[i]}`;
}

type UploadRowStatusConfig = {
  color: string;
  label: string;
  icon: React.ComponentType<any>;
};

export function Uploads() {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { items, addFiles, cancelItem, retryItem } = useUploadManager();

  const queue = useMemo(() => items, [items]);

  const total = queue.length;
  const uploading = queue.filter(
    (i) => i.status === "queued" || i.status === "uploading",
  ).length;
  const completed = queue.filter((i) => i.status === "completed").length;
  const failed = queue.filter((i) => i.status === "failed").length;
  const cancelled = queue.filter((i) => i.status === "cancelled").length;

  const overallProgress = useMemo(() => {
    if (total === 0) return 0;
    const sum = queue.reduce(
      (acc, it) => acc + (it.status === "completed" ? 100 : it.progress || 0),
      0,
    );
    return Math.round(sum / total);
  }, [queue, total]);

  const statusConfig: Record<string, UploadRowStatusConfig> = {
    queued: { color: "#94a3b8", label: "Queued", icon: Clock },
    uploading: { color: "#3b82f6", label: "Uploading", icon: Clock },
    completed: { color: "#34d399", label: "Completed", icon: CheckCircle },
    failed: { color: "#ef4444", label: "Failed", icon: XCircle },
    cancelled: { color: "#94a3b8", label: "Cancelled", icon: XCircle },
  };

  return (
    <div
      className="flex-1 overflow-y-auto p-6 nimbus-scrollbar"
      style={{ background: "#080d1a" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#e2e8f0" }}>
            Uploads
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
            Manage your file uploads
          </p>
        </div>

        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
          style={{
            background: "linear-gradient(135deg, #3b82f6, #22d3ee)",
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
          { label: "Active Uploads", value: uploading, color: "#3b82f6" },
          { label: "Completed", value: completed, color: "#34d399" },
          { label: "Failed", value: failed + cancelled, color: "#ef4444" },
          {
            label: "Overall Progress",
            value: `${overallProgress}%`,
            color: "#22d3ee",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl p-4"
            style={{ background: "#0f1729", border: "1px solid #1a2540" }}
          >
            <div className="text-2xl font-bold mb-1" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-xs" style={{ color: "#475569" }}>
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
          border: `2px dashed ${isDragOver ? "#3b82f6" : "#1a2540"}`,
          background: isDragOver ? "rgba(59,130,246,0.05)" : "#0d1829",
        }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
          style={{
            background: "rgba(59,130,246,0.1)",
            border: "2px solid rgba(59,130,246,0.2)",
          }}
        >
          <Upload size={22} style={{ color: "#3b82f6" }} />
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: "#e2e8f0" }}>
          {isDragOver ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="text-xs" style={{ color: "#475569" }}>
          or click to browse · Max 5 GB per file
        </p>
      </div>

      {/* Upload Queue */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: "#0f1729", border: "1px solid #1a2540" }}
      >
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: "1px solid #1a2540" }}
        >
          <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>
            Upload Queue
          </span>
          <div className="text-xs" style={{ color: "#64748b" }}>
            {total === 0
              ? ""
              : `${uploading} uploading · ${completed} completed`}
          </div>
        </div>

        <div
          className="grid px-4 py-2.5"
          style={{
            gridTemplateColumns: "1fr 140px 110px 100px 120px 90px",
            borderBottom: "1px solid #1a2540",
          }}
        >
          {["File", "Size", "Progress", "Status", "Actions", "Error"].map(
            (h) => (
              <span
                key={h}
                className="text-[11px] font-medium uppercase tracking-wider"
                style={{ color: "#334155" }}
              >
                {h}
              </span>
            ),
          )}
        </div>

        {total === 0 ? (
          <div className="px-4 py-5 text-xs" style={{ color: "#64748b" }}>
            Belum ada aktivitas upload
          </div>
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
                className="grid px-4 py-3 items-center hover:bg-[#0d1829] transition-colors group"
                style={{
                  gridTemplateColumns: "1fr 140px 110px 100px 120px 90px",
                  borderBottom: "1px solid #0a1020",
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center"
                    style={{ background: "rgba(59,130,246,0.08)" }}
                  >
                    <Upload size={14} style={{ color: cfg.color }} />
                  </div>
                  <span
                    className="text-sm truncate"
                    style={{ color: "#cbd5e1" }}
                    title={it.fileName}
                  >
                    {it.fileName}
                  </span>
                </div>

                <span className="text-xs" style={{ color: "#64748b" }}>
                  {formatBytes(it.size)}
                  {it.folderId ? (
                    <span
                      className="block text-[10px] mt-0.5"
                      style={{ color: "#475569" }}
                    >
                      Folder: {it.folderId}
                    </span>
                  ) : null}
                </span>

                <div>
                  {it.status === "queued" ? (
                    <div
                      className="flex items-center gap-1.5"
                      style={{ color: "#94a3b8" }}
                    >
                      <LoadingSpinner size={10} />
                      <span className="text-[10px]">Antri...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between mb-1">
                        <span
                          className="text-[10px]"
                          style={{ color: "#475569" }}
                        >
                          {pct}%
                        </span>
                      </div>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ background: "#1e2d45" }}
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
                                  : "linear-gradient(90deg, #3b82f6, #22d3ee)",
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
                        background: "#0d1829",
                        border: "1px solid #1a2540",
                        color: "#e2e8f0",
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
                        background: "#0d1829",
                        border: "1px solid #1a2540",
                        color: "#e2e8f0",
                      }}
                    >
                      <RefreshCcw size={12} /> Retry
                    </button>
                  )}
                </div>

                <span
                  className="text-[10px]"
                  style={{ color: it.errorMessage ? "#f87171" : "#475569" }}
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
