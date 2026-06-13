import { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload, Download, Share2, Trash2, Edit3, Eye,
  FolderPlus, Link2, Shield, Clock, Filter, Search,
  FileText, Image, Film, Folder, Archive
} from "lucide-react";

const activityLog = [
  { action: "Uploaded", file: "Annual Report 2024.pdf", user: "You", time: "2 minutes ago", date: "Today", icon: Upload, color: "#22d3ee", fileIcon: FileText, fileColor: "#ef4444" },
  { action: "Shared", file: "Project Assets folder", user: "You", time: "15 minutes ago", date: "Today", icon: Share2, color: "#3b82f6", fileIcon: Folder, fileColor: "#f59e0b" },
  { action: "Downloaded", file: "Budget 2024.xlsx", user: "Sarah K.", time: "1 hour ago", date: "Today", icon: Download, color: "#34d399", fileIcon: FileText, fileColor: "#22c55e" },
  { action: "Created folder", file: "Q2 Reports", user: "You", time: "3 hours ago", date: "Today", icon: FolderPlus, color: "#f59e0b", fileIcon: Folder, fileColor: "#f59e0b" },
  { action: "Shared link", file: "Product Demo.mp4", user: "You", time: "5 hours ago", date: "Today", icon: Link2, color: "#a78bfa", fileIcon: Film, fileColor: "#a78bfa" },
  { action: "Deleted", file: "old_backup.zip", user: "You", time: "Yesterday 4:32 PM", date: "Yesterday", icon: Trash2, color: "#ef4444", fileIcon: Archive, fileColor: "#64748b" },
  { action: "Downloaded", file: "Cover Image.jpg", user: "Alex M.", time: "Yesterday 2:15 PM", date: "Yesterday", icon: Download, color: "#34d399", fileIcon: Image, fileColor: "#3b82f6" },
  { action: "Renamed", file: "final_v3.psd → logo_final.psd", user: "You", time: "Yesterday 11:00 AM", date: "Yesterday", icon: Edit3, color: "#f59e0b", fileIcon: Image, fileColor: "#a78bfa" },
  { action: "Uploaded", file: "source_code_v2.zip", user: "You", time: "May 20, 2024", date: "May 20", icon: Upload, color: "#22d3ee", fileIcon: Archive, fileColor: "#64748b" },
  { action: "Viewed", file: "Team Roadmap.pdf", user: "Bob J.", time: "May 20, 2024", date: "May 20", icon: Eye, color: "#94a3b8", fileIcon: FileText, fileColor: "#ef4444" },
];

const filters = ["All", "Uploads", "Downloads", "Shares", "Edits", "Deletes"];
const DELETED_ACTIVITY_STORAGE_KEY = "nimbus_deleted_activity_ids";

function readDeletedActivityIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_ACTIVITY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeDeletedActivityIds(ids: Set<string>) {
  try {
    localStorage.setItem(DELETED_ACTIVITY_STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore storage failures; current session state still updates
  }
}

export function Activity() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [activities, setActivities] = useState(() =>
    activityLog
      .map((item, index) => ({
        ...item,
        id: `activity-${index}`,
      }))
      .filter((item) => !readDeletedActivityIds().has(item.id)),
  );
  const [selectedActivityIds, setSelectedActivityIds] = useState<Set<string>>(
    new Set(),
  );
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteResult, setBulkDeleteResult] = useState<{
    okCount: number;
    failCount: number;
  } | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const clearSelection = () => setSelectedActivityIds(new Set());

  const filteredActivities = useMemo(() => {
    const query = search.trim().toLowerCase();

    return activities.filter((item) => {
      const matchesSearch =
        !query ||
        item.action.toLowerCase().includes(query) ||
        item.file.toLowerCase().includes(query) ||
        item.user.toLowerCase().includes(query);

      if (!matchesSearch) return false;
      if (activeFilter === "All") return true;
      if (activeFilter === "Uploads") return item.action.includes("Upload");
      if (activeFilter === "Downloads") return item.action.includes("Download");
      if (activeFilter === "Shares") return item.action.includes("Shar");
      if (activeFilter === "Edits") return item.action.includes("Renam");
      if (activeFilter === "Deletes") return item.action.includes("Delet");

      return true;
    });
  }, [activeFilter, activities, search]);

  const groupedActivity = useMemo(() => {
    return filteredActivities.reduce(
      (groups, item) => {
        if (!groups[item.date]) groups[item.date] = [];
        groups[item.date].push(item);
        return groups;
      },
      {} as Record<string, typeof filteredActivities>,
    );
  }, [filteredActivities]);

  const activityStats = useMemo(
    () => [
      {
        label: "Actions Today",
        value: activities.filter((item) => item.date === "Today").length,
        color: "#3b82f6",
      },
      {
        label: "Uploads",
        value: activities.filter((item) => item.action.includes("Upload"))
          .length,
        color: "#22d3ee",
      },
      {
        label: "Shares",
        value: activities.filter((item) => item.action.includes("Shar")).length,
        color: "#a78bfa",
      },
      {
        label: "Downloads",
        value: activities.filter((item) => item.action.includes("Download"))
          .length,
        color: "#34d399",
      },
    ],
    [activities],
  );

  const selectedVisibleCount = filteredActivities.reduce(
    (count, item) => count + (selectedActivityIds.has(item.id) ? 1 : 0),
    0,
  );
  const allVisibleSelected =
    filteredActivities.length > 0 &&
    selectedVisibleCount === filteredActivities.length;
  const selectAllIndeterminate =
    selectedVisibleCount > 0 && !allVisibleSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectAllIndeterminate;
    }
  }, [selectAllIndeterminate]);

  const openBulkDeleteModal = () => {
    const ids = Array.from(selectedActivityIds);
    if (ids.length === 0) return;

    setBulkDeleteIds(ids);
    setBulkDeleteResult(null);
    setIsBulkDeleteModalOpen(true);
  };

  const closeBulkDeleteModal = () => {
    if (bulkDeleteLoading) return;

    setIsBulkDeleteModalOpen(false);
    setBulkDeleteIds([]);
    setBulkDeleteResult(null);
  };

  const handleConfirmBulkDelete = () => {
    if (bulkDeleteLoading || bulkDeleteIds.length === 0) return;

    setBulkDeleteLoading(true);
    const deletedIds = readDeletedActivityIds();
    bulkDeleteIds.forEach((id) => deletedIds.add(id));
    writeDeletedActivityIds(deletedIds);

    setActivities((current) =>
      current.filter((item) => !bulkDeleteIds.includes(item.id)),
    );
    clearSelection();
    setBulkDeleteResult({ okCount: bulkDeleteIds.length, failCount: 0 });
    setBulkDeleteLoading(false);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "#080d1a" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#e2e8f0" }}>Activity</h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>Complete audit log of all file activity</p>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs"
          style={{ background: "#0d1829", border: "1px solid #1a2540", color: "#94a3b8" }}
        >
          <Download size={13} /> Export Log
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {activityStats.map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
            <div className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: "#475569" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#475569" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity..."
            className="pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: "#0d1829", border: "1px solid #1a2540", color: "#94a3b8", width: "200px" }}
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "#0d1829", border: "1px solid #1a2540" }}>
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="px-3 py-1 rounded-md text-xs transition-all"
              style={{
                background: activeFilter === f ? "#1a2540" : "transparent",
                color: activeFilter === f ? "#e2e8f0" : "#475569",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {filteredActivities.length > 0 && (
        <div
          className="mb-4 flex flex-col gap-3 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: "#0f1729", border: "1px solid #1a2540" }}
        >
          <label className="flex items-center gap-3 text-xs" style={{ color: "#94a3b8" }}>
            <input
              ref={selectAllRef}
              type="checkbox"
              checked={allVisibleSelected}
              onChange={(event) => {
                if (event.target.checked) {
                  setSelectedActivityIds(
                    new Set(filteredActivities.map((item) => item.id)),
                  );
                } else {
                  clearSelection();
                }
              }}
              className="h-4 w-4 rounded border-[#1a2540] bg-[#0d1829]"
              style={{ accentColor: "#22d3ee" }}
              aria-label="Pilih semua activity"
            />
            <span>
              <span style={{ color: "#e2e8f0", fontWeight: 700 }}>
                {selectedActivityIds.size}
              </span>{" "}
              activity dipilih
            </span>
          </label>

          <div className="flex flex-wrap items-center gap-2">
            {selectedActivityIds.size > 0 && (
              <button
                type="button"
                onClick={openBulkDeleteModal}
                disabled={bulkDeleteLoading}
                className="rounded-lg px-3 py-2 text-xs font-semibold"
                style={{
                  background: "#f87171",
                  border: "1px solid rgba(248,113,113,0.4)",
                  color: "#0b1121",
                  opacity: bulkDeleteLoading ? 0.75 : 1,
                }}
                aria-label="Hapus activity terpilih"
              >
                Hapus Activity
              </button>
            )}

            {selectedActivityIds.size > 0 && (
              <button
                type="button"
                onClick={clearSelection}
                disabled={bulkDeleteLoading}
                className="rounded-lg px-3 py-2 text-xs font-medium"
                style={{
                  background: "#0d1829",
                  border: "1px solid #1a2540",
                  color: "#94a3b8",
                  opacity: bulkDeleteLoading ? 0.6 : 1,
                }}
                aria-label="Batalkan pilihan activity"
              >
                Batalkan pilihan
              </button>
            )}
          </div>
        </div>
      )}

      {isBulkDeleteModalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="activity-bulk-delete-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#1a2540] bg-[#0f1729] p-6"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="activity-bulk-delete-title"
                  className="text-sm font-semibold"
                  style={{ color: "#e2e8f0" }}
                >
                  Hapus activity?
                </h2>
                <p className="mt-2 text-xs" style={{ color: "#94a3b8" }}>
                  {bulkDeleteIds.length} activity terpilih akan dihapus dari
                  tampilan Activity.
                </p>
              </div>

              <button
                type="button"
                onClick={closeBulkDeleteModal}
                disabled={bulkDeleteLoading}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                style={{
                  background: "#0d1829",
                  border: "1px solid #1a2540",
                  color: "#94a3b8",
                  opacity: bulkDeleteLoading ? 0.55 : 1,
                }}
                aria-label="Tutup modal hapus activity"
              >
                ×
              </button>
            </div>

            {bulkDeleteLoading && (
              <div
                className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs"
                style={{ color: "#67e8f9" }}
                role="status"
              >
                Menghapus activity...
              </div>
            )}

            {bulkDeleteResult ? (
              <>
                <div
                  className="rounded-xl border border-[#1a2540] bg-[#0b1121] p-4"
                  role="status"
                >
                  <div className="text-xs" style={{ color: "#94a3b8" }}>
                    Hasil proses
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div
                      className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2"
                      style={{ color: "#34d399" }}
                    >
                      <div className="text-lg font-semibold">
                        {bulkDeleteResult.okCount}
                      </div>
                      <div className="text-[11px]">berhasil</div>
                    </div>
                    <div
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2"
                      style={{ color: "#f87171" }}
                    >
                      <div className="text-lg font-semibold">
                        {bulkDeleteResult.failCount}
                      </div>
                      <div className="text-[11px]">gagal</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={closeBulkDeleteModal}
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
                  onClick={closeBulkDeleteModal}
                  disabled={bulkDeleteLoading}
                  className="rounded-xl px-3 py-2 text-xs font-medium"
                  style={{
                    background: "#0d1829",
                    border: "1px solid #1a2540",
                    color: "#94a3b8",
                    opacity: bulkDeleteLoading ? 0.6 : 1,
                  }}
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleConfirmBulkDelete}
                  disabled={bulkDeleteLoading}
                  className="rounded-xl px-3 py-2 text-xs font-semibold"
                  style={{
                    background: "#f87171",
                    border: "1px solid rgba(248,113,113,0.4)",
                    color: "#0b1121",
                    opacity: bulkDeleteLoading ? 0.75 : 1,
                  }}
                >
                  {bulkDeleteLoading ? "Menghapus..." : "Hapus Activity"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Activity Feed */}
      <div className="space-y-6">
        {Object.entries(groupedActivity).map(([date, items]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#334155" }}>{date}</span>
              <div className="flex-1 h-px" style={{ background: "#1a2540" }} />
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
              {items.map((item, i) => {
                const ActionIcon = item.icon;
                const FileIcon = item.fileIcon;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-[#0d1829] transition-colors"
                    style={{ borderBottom: i < items.length - 1 ? "1px solid #0a1020" : "none" }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedActivityIds.has(item.id)}
                      onChange={(event) => {
                        setSelectedActivityIds((prev) => {
                          const next = new Set(prev);
                          if (event.target.checked) next.add(item.id);
                          else next.delete(item.id);
                          return next;
                        });
                      }}
                      className="h-4 w-4 rounded border-[#1a2540] bg-[#0d1829] shrink-0"
                      style={{ accentColor: "#22d3ee" }}
                      aria-label={`Pilih activity ${item.action} ${item.file}`}
                    />

                    {/* Action Icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${item.color}18`, border: `1px solid ${item.color}22` }}
                    >
                      <ActionIcon size={14} style={{ color: item.color }} />
                    </div>

                    {/* File Icon */}
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: `${item.fileColor}18` }}
                    >
                      <FileIcon size={13} style={{ color: item.fileColor }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium" style={{ color: item.color }}>{item.action}</span>
                        <span className="text-xs" style={{ color: "#94a3b8" }}>
                          {item.file}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: "linear-gradient(135deg, #3b82f6, #22d3ee)", color: "#fff" }}>
                          {item.user[0]}
                        </div>
                        <span className="text-[10px]" style={{ color: "#475569" }}>{item.user}</span>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Clock size={10} style={{ color: "#334155" }} />
                      <span className="text-[10px]" style={{ color: "#334155" }}>{item.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
