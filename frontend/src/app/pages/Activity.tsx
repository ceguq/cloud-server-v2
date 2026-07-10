import { useEffect, useMemo, useRef, useState } from "react";
import {
  Upload,
  Download,
  Share2,
  Trash2,
  Edit3,
  LogIn,
  ArrowRightLeft,
  RotateCcw,
  Clock,
  Search,
  FileText,
  Image,
  Film,
  Folder,
  Archive,
} from "lucide-react";
import { getActivityLogs } from "../../services/activityLogService";
import type { ActivityLogItem } from "../../types/activityLog";
import { localDateLabel, localTimeLabel } from "./activity/activityFormatters";
import { getActionUI } from "./activity/activityActionUi";
import { ActivityErrorMessage } from "./activity/components/ActivityErrorMessage";
import { ActivityLoadingState } from "./activity/components/ActivityLoadingState";
import { ActivityEmptyState } from "./activity/components/ActivityEmptyState";

// keep icon components loosely typed to avoid TS mismatch with lucide-react types
// (we only pass them as React components to JSX)
type LucideIcon = any;

type AppearanceTheme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

function safeReadAppearanceTheme(): AppearanceTheme {
  try {
    const raw = localStorage.getItem("nimbus_appearance_theme");
    if (!raw) return "system";
    if (raw === "dark" || raw === "light" || raw === "system") return raw;
    return "system";
  } catch {
    return "system";
  }
}

function safeReadAccentColor(): string {
  try {
    const raw = localStorage.getItem("nimbus_accent_color");
    return raw ? String(raw) : "#a78bfa";
  } catch {
    return "#a78bfa";
  }
}

function resolveAppearanceTheme(theme: AppearanceTheme): ResolvedTheme {
  if (theme === "dark" || theme === "light") return theme;

  try {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch {
      return "light";
  }
}

const filters = ["All", "Uploads", "Downloads", "Shares", "Edits", "Deletes", "Login", "Trash", "Move"];


const DELETED_ACTIVITY_STORAGE_KEY = "nimbus_deleted_activity_ids";

type ActivityUIItem = {
  id: string;
  action: string;
  file: string;
  user: string;
  time: string;
  date: string;
  icon: LucideIcon;
  color: string;
  fileIcon: LucideIcon;
  fileColor: string;
};









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

function mapBackendToUIRows(rows: ActivityLogItem[]): ActivityUIItem[] {

  const deletedIds = readDeletedActivityIds();

  return rows
    .map((row, index) => {
      const id = row.id || row.created_at || `activity-${index}`;
      const action = row.action || "Aktivitas";

      const file =
        (row.description && row.description.trim()) ||
        "";

      const user =
        row.user?.name?.trim() ||
        row.user?.email?.trim() ||
        "You";

      const date = localDateLabel(row.created_at);
      const time = localTimeLabel(row.created_at);

      const ui = getActionUI(action, row.subject_type);

      return {
        id,
        action,
        file: file || "Activity item",
        user,
        time,
        date,
        icon: ui.icon,
        color: ui.color,
        fileIcon: ui.fileIcon,
        fileColor: ui.fileColor,
      };
    })
    .filter((item) => !deletedIds.has(item.id));
}

export function Activity() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");

  const [appearanceTheme, setAppearanceTheme] = useState<AppearanceTheme>(() => safeReadAppearanceTheme());
  const [accentColor, setAccentColor] = useState<string>(() => safeReadAccentColor());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveAppearanceTheme(safeReadAppearanceTheme()));


  function normalizeActivityAction(action: string | null, file: string, message?: string): string {
    const a = (action || "").toLowerCase();
    const d = (file || "").toLowerCase();
    const m = (message || "").toLowerCase();

    const combined = `${a} ${d} ${m}`.trim();

    const hasAny = (needles: string[]) => needles.some((n) => combined.includes(n));

    if (
      hasAny([
        "upload",
        "uploaded",
        "file_uploaded",
        "file.uploaded",
        "file.upload",
      ])
    )
      return "upload";

    if (
      hasAny([
        "download",
        "downloaded",
        "file_downloaded",
        "file.downloaded",
        "file.download",
      ])
    )
      return "download";

    if (hasAny(["share", "shared", "link", "public"])) return "share";

    if (
      hasAny([
        "edit",
        "edited",
        "rename",
        "renamed",
        "update",
        "updated",
      ])
    )
      return "edit";

    if (
      hasAny([
        "login",
        "logged_in",
        "logged in",
        "sign in",
        "signed in",
        "auth.login",
        "user_login",
      ])
    )
      return "login";

    // Trash is separate from Deletes.
    if (
      hasAny([
        "trash",
        "trashed",
        "move_to_trash",
        "moved_to_trash",
        "restore",
        "restored",
        "file_trashed",
        "folder_trashed",
        "file_restored",
        "folder_restored",
      ])
    )
      return "trash";

    if (
      hasAny([
        "move",
        "moved",
        "file_moved",
        "folder_moved",
        "moved_file",
        "moved_folder",
        "parent changed",
        "folder changed",
      ])
    )
      return "move";

    if (
      hasAny([
        "delete",
        "deleted",
        "remove",
        "removed",
        "permanent",
      ])
    )
      return "delete";

    return "unknown";
  }



  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activities, setActivities] = useState<ActivityUIItem[]>([]);


  useEffect(() => {
    const handler = () => {
      const nextAppearance = safeReadAppearanceTheme();
      setAppearanceTheme(nextAppearance);
      setAccentColor(safeReadAccentColor());
      setResolvedTheme(resolveAppearanceTheme(nextAppearance));
    };

    // nimbus-appearance-change custom event
    const maybeNimbus = () => {
      try {
        window.dispatchEvent(new Event("nimbus-appearance-change"));
      } catch {
        // ignore
      }
    };

    try {
      window.addEventListener("nimbus-appearance-change", handler as EventListener);
    } catch {
      // ignore
    }

    // storage changes (e.g., switching theme in another tab)
    try {
      window.addEventListener("storage", (e) => {
        if (!e.key) return;
        if (e.key === "nimbus_appearance_theme" || e.key === "nimbus_accent_color") handler();
      });
    } catch {
      // ignore
    }

    // focus (covers some SPA theme toggles)
    try {
      window.addEventListener("focus", handler);
    } catch {
      // ignore
    }

    // prefers-color-scheme changes (system theme)
    let mql: MediaQueryList | null = null;
    try {
      mql = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");
      if (mql) {
        const onMqlChange = () => handler();
        if ("addEventListener" in mql) {
          mql.addEventListener("change", onMqlChange);
        } else {
          (mql as any).addListener(onMqlChange);
        }
      }
    } catch {
      // ignore
    }

    // initial sync
    handler();

    return () => {
      try {
        window.removeEventListener("nimbus-appearance-change", handler as EventListener);
      } catch {
        // ignore
      }

      try {
        window.removeEventListener("focus", handler);
      } catch {
        // ignore
      }

      try {
        if (mql) {
          const onMqlChange = () => handler();
          // Best-effort cleanup (browser support varies)
          if ("removeEventListener" in mql) {
            mql.removeEventListener("change", onMqlChange);
          } else {
            (mql as any).removeListener(onMqlChange);
          }
        }
      } catch {
        // ignore
      }
    };
  }, []);

  const activityColors = useMemo(() => {
    if (resolvedTheme === "light") {
      return {
        pageBg: "#f8fafc",
        cardBg: "#ffffff",
        panelBg: "#f1f5f9",
        inputBg: "#ffffff",
        border: "#dbe3ef",
        borderSoft: "#e5eaf1",
        title: "#0f172a",
        text: "#334155",
        muted: "#64748b",
        muted2: "#94a3b8",
        rowHover: "#f8fafc",
        selectedBg: "rgba(168, 85, 247, 0.08)",
        modalBg: "#ffffff",
        overlay: "rgba(15, 23, 42, 0.45)",
      };
    }

    return {
      pageBg: "#111c2f",
      cardBg: "#0f1729",
      panelBg: "#0d1829",
      inputBg: "#0d1829",
      border: "#1a2540",
      borderSoft: "#0a1020",
      title: "#e2e8f0",
      text: "#94a3b8",
      muted: "#64748b",
      muted2: "#475569",
      rowHover: "#0d1829",
      selectedBg: "rgba(168, 85, 247, 0.08)",
      modalBg: "#0f1729",
      overlay: "rgba(0, 0, 0, 0.70)",
    };
  }, [resolvedTheme]);

  useEffect(() => {
    let cancelled = false;


    async function run() {

      setLoading(true);
      setError(null);

      try {
        const res = await getActivityLogs({ page: 1, per_page: 50 });
        if (cancelled) return;
        const rows = mapBackendToUIRows(res.data);
        setActivities(rows);
      } catch (e: unknown) {
        if (cancelled) return;
        setActivities([]);
        setError(e instanceof Error ? e.message : "Gagal memuat aktivitas.");
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, []);



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

  const escapeCsvCell = (value: string): string => {
    return `"${value.replace(/"/g, '""')}"`;
  };

  const exportVisibleActivities = () => {
    if (filteredActivities.length === 0) return;

    const rows = filteredActivities.map((item) => [
      item.date,
      item.time,
      item.action,
      item.file,
      item.user,
    ]);

    const header = ["Date", "Time", "Action", "Description", "User"];
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => escapeCsvCell(String(cell ?? ""))).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    anchor.download = `activity-export-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

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

      const normalized = normalizeActivityAction(item.action, item.file);

      if (activeFilter === "Uploads") return normalized === "upload";
      if (activeFilter === "Downloads") return normalized === "download";
      if (activeFilter === "Shares") return normalized === "share";
      if (activeFilter === "Edits") return normalized === "edit";
      if (activeFilter === "Deletes") return normalized === "delete";
      if (activeFilter === "Login") return normalized === "login";
      if (activeFilter === "Trash") return normalized === "trash";
      if (activeFilter === "Move") return normalized === "move";


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
    <div className="flex-1 overflow-y-auto p-6" style={{ background: activityColors.pageBg }}>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: activityColors.title }}>Activity</h1>
          <p className="text-xs mt-0.5" style={{ color: activityColors.muted2 }}>Complete audit log of all file activity</p>

        </div>
        <button
          type="button"
          onClick={exportVisibleActivities}
          disabled={filteredActivities.length === 0}
          aria-label="Export visible activity rows as CSV"
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs"
          style={{
            background: activityColors.panelBg,
            border: `1px solid ${activityColors.border}`,
            color: activityColors.text,
            opacity: filteredActivities.length === 0 ? 0.5 : 1,
            cursor: filteredActivities.length === 0 ? "not-allowed" : "pointer",
          }}
        >
          <Download size={13} /> Export Log
        </button>
      </div>

      {/* Stats row */}
      {loading ? (

        <div className="grid grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="rounded-xl p-4"
              style={{ background: activityColors.cardBg, border: `1px solid ${activityColors.border}`, opacity: 0.6 }}
            >
              <div className="text-2xl font-bold mb-1" style={{ color: activityColors.muted2 }}>—</div>
              <div className="text-xs" style={{ color: activityColors.muted }}>Memuat...</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {activityStats.map((s) => (
              <div key={s.label} className="rounded-xl p-4" style={{ background: activityColors.cardBg, border: `1px solid ${activityColors.border}` }}>

              <div className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs" style={{ color: activityColors.muted }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}


      {/* Filters + Search */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: activityColors.muted }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity..."
            className="pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: activityColors.inputBg, border: `1px solid ${activityColors.border}`, color: activityColors.text, width: "200px" }}
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: activityColors.panelBg, border: `1px solid ${activityColors.border}` }}>
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="px-3 py-1 rounded-md text-xs transition-all"
              style={{
                background: activeFilter === f ? activityColors.border : "transparent",
                color: activeFilter === f ? activityColors.title : activityColors.muted,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <ActivityErrorMessage
          message={error}
          textColor={activityColors.text}
          backgroundColor={activityColors.cardBg}
          borderColor="rgba(248,113,113,0.4)"
          role="alert"
          ariaLive="assertive"
        />
      ) : loading ? (
        <ActivityLoadingState
          title="Memuat aktivitas..."
          textColor={activityColors.text}
          mutedColor={activityColors.muted}
          backgroundColor={activityColors.cardBg}
          borderColor={activityColors.border}
        />
      ) : filteredActivities.length > 0 && (

        <div
          className="mb-4 flex flex-col gap-3 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: activityColors.panelBg, border: `1px solid ${activityColors.border}` }}
        >

          <label className="flex items-center gap-3 text-xs" style={{ color: activityColors.text }}>
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
              className="h-4 w-4 rounded"
              style={{ borderColor: activityColors.border, backgroundColor: activityColors.inputBg, accentColor: "#ef4444" }}
              aria-label="Pilih semua activity"
            />
            <span>
              <span style={{ color: activityColors.title, fontWeight: 700 }}>
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
                  color: "#ffffff",
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
                  background: activityColors.panelBg,
                  border: `1px solid ${activityColors.border}`,
                  color: activityColors.text,
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
            className="w-full max-w-md rounded-2xl p-6"
            style={{ background: activityColors.modalBg, border: `1px solid ${activityColors.border}`, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="activity-bulk-delete-title"
                  className="text-sm font-semibold"
                  style={{ color: activityColors.title }}
                >
                  Hapus activity?
                </h2>
                <p className="mt-2 text-xs" style={{ color: activityColors.text }}>
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
                  background: activityColors.panelBg,
                  border: `1px solid ${activityColors.border}`,
                  color: activityColors.text,
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
                style={{ color: "#06b6d4" }}
                role="status"
              >
                Menghapus activity...
              </div>
            )}

            {bulkDeleteResult ? (
              <>
                <div
                  className="rounded-xl border p-4"
                  role="status"
                  style={{ background: activityColors.panelBg, border: `1px solid ${activityColors.border}` }}
                >
                  <div className="text-xs" style={{ color: activityColors.text }}>
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
                      background: activityColors.panelBg,
                      border: `1px solid ${activityColors.border}`,
                      color: activityColors.text,
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
                    color: "#ffffff",
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
      {!loading && !error && filteredActivities.length === 0 && (
        <ActivityEmptyState
          title="Activity masih kosong"
          description="Belum ada aktivitas untuk filter pencarian yang dipilih."
          textColor={activityColors.title}
          mutedColor={activityColors.muted}
          backgroundColor={activityColors.cardBg}
          borderColor={activityColors.border}
          accentColor="rgba(168, 85, 247, 0.4)"
        />
      )}

      <div className="space-y-6">

        {Object.entries(groupedActivity).map(([date, items]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: activityColors.muted }}>{date}</span>
              <div className="flex-1 h-px" style={{ background: activityColors.border }} />
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: activityColors.cardBg, border: `1px solid ${activityColors.border}` }}>
              {items.map((item, i) => {
                const ActionIcon = item.icon;
                const FileIcon = item.fileIcon;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 px-4 py-3 transition-colors"
                    style={{
                      borderBottom: i < items.length - 1 ? `1px solid ${activityColors.borderSoft}` : "none",
                      background: selectedActivityIds.has(item.id)
                        ? "rgba(168, 85, 247, 0.08)"
                        : "transparent",
                      backgroundColor: selectedActivityIds.has(item.id)
                        ? "rgba(168, 85, 247, 0.08)"
                        : activityColors.cardBg,
                      borderLeft: selectedActivityIds.has(item.id)
                        ? "3px solid rgba(168, 85, 247, 0.3)"
                        : "3px solid transparent",
                      paddingLeft: selectedActivityIds.has(item.id) ? "calc(1rem - 3px)" : "1rem",
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedActivityIds.has(item.id)) {
                        e.currentTarget.style.backgroundColor = activityColors.rowHover;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedActivityIds.has(item.id)) {
                        e.currentTarget.style.backgroundColor = activityColors.cardBg;
                      }
                    }}
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
                      className="h-4 w-4 rounded shrink-0"
                      style={{ borderColor: activityColors.border, backgroundColor: activityColors.inputBg, accentColor: "#ef4444" }}
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
                        <span className="text-xs" style={{ color: activityColors.text }}>
                          {item.file}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: "linear-gradient(135deg, #3b82f6, #22d3ee)", color: "#fff" }}>
                          {item.user[0]}
                        </div>
                        <span className="text-[10px]" style={{ color: activityColors.muted }}>{item.user}</span>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Clock size={10} style={{ color: activityColors.muted }} />
                      <span className="text-[10px]" style={{ color: activityColors.muted }}>{item.time}</span>
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
