import React, { useMemo } from "react";
import {
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCcw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useUploadManager, useUploadTrayStats } from "./UploadManagerContext";

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function UploadTray() {
  const {
    items,
    hasActiveUploads,
    retryItem,
    cancelItem,
    closeTray,
    isTrayVisible,
    collapsed,
    setCollapsed,
  } = useUploadManager();

  const { activeCount, completedCount, failedCount, total, formatBytes } =
    useUploadTrayStats();

  const progressSummary = useMemo(() => {
    const activeQueueItems = items.filter((i) =>
      ["queued", "uploading", "completed", "failed", "cancelled"].includes(
        i.status,
      ),
    );

    const y = activeQueueItems.length;
    const uploadingIndex = activeQueueItems.findIndex(
      (i) => i.status === "uploading",
    );
    const completedLikeBefore = activeQueueItems.filter((i) =>
      ["completed", "failed", "cancelled"].includes(i.status),
    ).length;

    const position =
      uploadingIndex >= 0 ? completedLikeBefore + 1 : completedLikeBefore;

    if (hasActiveUploads && y > 0) {
      return `Mengupload ${position} dari ${y}`;
    }

    if (!hasActiveUploads && y > 0) {
      const cancelledCount = items.filter(
        (i) => i.status === "cancelled",
      ).length;

      if (failedCount > 0 || cancelledCount > 0) {
        const parts = [
          `${completedCount} berhasil`,
          failedCount > 0 ? `${failedCount} gagal` : null,
          cancelledCount > 0 ? `${cancelledCount} dibatalkan` : null,
        ].filter(Boolean) as string[];
        return parts.join(", ");
      }

      return `${completedCount} upload selesai`;
    }

    return "";
  }, [completedCount, failedCount, hasActiveUploads, items]);

  const visibleItems = useMemo(() => {
    if (collapsed) return [];

    // Prioritize: uploading, queued, failed; then completed (newest + summarized)
    const uploading = items.filter((i) => i.status === "uploading");
    const queued = items.filter((i) => i.status === "queued");
    const failed = items.filter((i) => i.status === "failed");
    const completed = items.filter((i) => i.status === "completed");

    // cap to keep panel short & responsive
    const maxExpandedItems = 6;

    const base = [...uploading, ...queued, ...failed];
    const remainingSlots = Math.max(0, maxExpandedItems - base.length);

    const completedSorted = completed
      .slice()
      .sort((a, b) => (b.id || "").localeCompare(a.id || ""));
    const completedShown = completedSorted.slice(0, remainingSlots);

    const remainingCompleted = Math.max(
      0,
      completedSorted.length - completedShown.length,
    );

    return {
      base,
      completedShown,
      remainingCompleted,
    };
  }, [collapsed, items]);

  if (isTrayVisible === false) return null;

  return (
    <div
      className="fixed right-4 bottom-4 z-[200]"
      style={{ width: 360, maxWidth: "calc(100vw - 32px)" }}
    >
      <div
        className="rounded-2xl shadow-2xl overflow-hidden border"
        style={{
          borderColor: "rgba(59,130,246,0.25)",
          background: "#0f1729",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-2 px-3 py-3"
          style={{ borderBottom: "1px solid #1a2540" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(59,130,246,0.14)" }}
            >
              <Upload size={16} style={{ color: "#22d3ee" }} />
            </div>
            <div className="min-w-0">
              <div
                className="text-xs font-semibold truncate"
                style={{ color: "#e2e8f0" }}
              >
                {progressSummary || "Upload"}
              </div>
              <div className="text-[10px]" style={{ color: "#64748b" }}>
                {hasActiveUploads
                  ? "Mohon jangan tutup tab sampai selesai"
                  : failedCount > 0
                    ? "Selesaikan upload yang gagal jika perlu"
                    : ""}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#1a2540]"
              style={{ border: "1px solid #1a2540", color: "#94a3b8" }}
              aria-label={
                collapsed ? "Expand upload tray" : "Collapse upload tray"
              }
            >
              {/* Requirement: expanded => chevron down, collapsed => chevron up */}
              {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <button
              type="button"
              onClick={closeTray}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[#1a2540]"
              style={{ border: "1px solid #1a2540", color: "#94a3b8" }}
              aria-label="Close upload tray"
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Expanded content (NO internal scrollbar) */}
        {!collapsed && (
          <div className="px-3 py-2">
            {(() => {
              const expanded = visibleItems as any;
              const list: any[] = [
                ...(expanded?.base || []),
                ...(expanded?.completedShown || []),
              ];
              const remainingCompleted = expanded?.remainingCompleted ?? 0;

              return (
                <>
                  {list.map((it) => {
                    const statusColor =
                      it.status === "completed"
                        ? "#34d399"
                        : it.status === "failed"
                          ? "#f87171"
                          : it.status === "uploading"
                            ? "#22d3ee"
                            : "#64748b";

                    return (
                      <div
                        key={it.id}
                        className="px-2 py-2 rounded-xl mb-2"
                        style={{
                          background: "rgba(2,6,23,0.35)",
                          border: "1px solid #1a2540",
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div
                              className="text-[12px] font-medium truncate"
                              style={{ color: "#e2e8f0" }}
                              title={it.fileName}
                            >
                              {it.fileName}
                            </div>
                            <div
                              className="text-[10px]"
                              style={{ color: "#64748b" }}
                            >
                              {formatBytes(it.size || 0)}
                            </div>
                          </div>

                          <div
                            className="flex items-center gap-1.5"
                            style={{ color: statusColor }}
                          >
                            {it.status === "completed" ? (
                              <CheckCircle size={14} />
                            ) : it.status === "failed" ? (
                              <XCircle size={14} />
                            ) : (
                              <Upload
                                size={14}
                                style={{ color: statusColor }}
                              />
                            )}
                          </div>
                        </div>

                        <div className="mt-2">
                          {it.status === "uploading" ||
                          it.status === "queued" ? (
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div
                                className="text-[10px]"
                                style={{ color: "#64748b" }}
                              >
                                {it.status === "queued"
                                  ? "Antrean"
                                  : "Sedang diproses"}
                              </div>

                              <button
                                type="button"
                                onClick={() => cancelItem(it.id)}
                                className="w-6 h-6 rounded-full flex items-center justify-center"
                                style={{
                                  background: "#0d1829",
                                  border: "1px solid #1a2540",
                                  color: "#94a3b8",
                                  opacity: 0.95,
                                }}
                                aria-label={`Cancel ${it.fileName}`}
                                title="Cancel file"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <div>
                              {it.status === "failed" ? (
                                <div
                                  className="text-[10px] mt-1"
                                  style={{ color: statusColor }}
                                >
                                  Gagal
                                </div>
                              ) : (
                                <div
                                  className="text-[10px] mt-1"
                                  style={{ color: statusColor }}
                                >
                                  Selesai
                                </div>
                              )}
                            </div>
                          )}

                          {it.status === "failed" && (
                            <div className="mt-2 flex items-center gap-2">
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
                            </div>
                          )}

                          {it.status === "failed" && it.errorMessage && (
                            <div
                              className="text-[10px] mt-1"
                              style={{ color: "#f87171" }}
                            >
                              {it.errorMessage}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {remainingCompleted > 0 && (
                    <div
                      className="px-2 py-2 rounded-xl mb-2"
                      style={{
                        background: "rgba(2,6,23,0.2)",
                        border: "1px solid #1a2540",
                      }}
                    >
                      <div
                        className="text-[12px] font-medium"
                        style={{ color: "#94a3b8" }}
                      >
                        {remainingCompleted} file lainnya selesai
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* Collapsed footer */}
        {collapsed && total > 0 && (
          <div className="px-3 py-3" style={{ borderTop: "1px solid #1a2540" }}>
            <div className="text-[10px]" style={{ color: "#64748b" }}>
              {hasActiveUploads
                ? progressSummary
                : failedCount > 0
                  ? `${completedCount} berhasil, ${failedCount} gagal`
                  : `${completedCount} upload selesai`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
