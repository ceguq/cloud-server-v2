import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  Activity,
  AlertCircle,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Trash2,
  User,
  Wifi,
} from "lucide-react";
import { getActivityLogs } from "../services/activityLogService";
import type { ActivityLogItem } from "../types/activityLog";
import { LoadingSpinner } from "../app/components/LoadingSpinner";

const PER_PAGE = 20;
const DELETED_ACTIVITY_LOG_STORAGE_KEY = "nimbus_deleted_activity_log_keys";

function readDeletedActivityLogKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_ACTIVITY_LOG_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeDeletedActivityLogKeys(keys: Set<string>) {
  try {
    localStorage.setItem(
      DELETED_ACTIVITY_LOG_STORAGE_KEY,
      JSON.stringify([...keys]),
    );
  } catch {
    // ignore storage failures; current session state still updates
  }
}

const ACTIVITY_ACTIONS = [
  "auth.login",
  "file.upload",
  "folder.create",
  "file.rename",
  "folder.rename",
  "file.trash",
  "folder.trash",
  "file.restore",
  "folder.restore",
  "file.force_delete",
  "folder.force_delete",
  "share.create",
  "share.delete",
  "file.download",
] as const;

type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];
type ActivityActionFilter = "all" | ActivityAction;

type ActivityLogRow = ActivityLogItem & {
  action?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  description?: string | null;
  event?: string | null;
  ip?: string | null;
  ip_address?: string | null;
  ipAddress?: string | null;
  message?: string | null;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
  causer?: {
    name?: string | null;
    email?: string | null;
  } | null;
  actor?: {
    name?: string | null;
    email?: string | null;
  } | null;
  user_name?: string | null;
  username?: string | null;
  actor_name?: string | null;
};

type NormalizedActivityLogResponse = {
  logs: ActivityLogRow[];
  lastPage: number;
};

const ACTION_LABELS: Record<ActivityAction, string> = {
  "auth.login": "Masuk",
  "file.upload": "Unggah file",
  "folder.create": "Buat folder",
  "file.rename": "Ubah nama file",
  "folder.rename": "Ubah nama folder",
  "file.trash": "File ke sampah",
  "folder.trash": "Folder ke sampah",
  "file.restore": "Pulihkan file",
  "folder.restore": "Pulihkan folder",
  "file.force_delete": "Hapus file permanen",
  "folder.force_delete": "Hapus folder permanen",
  "share.create": "Buat berbagi",
  "share.delete": "Hapus berbagi",
  "file.download": "Unduh file",
};

const ACTION_TONES: Record<ActivityAction, string> = {
  "auth.login": "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
  "file.upload": "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  "folder.create": "border-amber-400/30 bg-amber-400/10 text-amber-200",
  "file.rename": "border-sky-400/30 bg-sky-400/10 text-sky-200",
  "folder.rename": "border-sky-400/30 bg-sky-400/10 text-sky-200",
  "file.trash": "border-rose-400/30 bg-rose-400/10 text-rose-200",
  "folder.trash": "border-rose-400/30 bg-rose-400/10 text-rose-200",
  "file.restore": "border-violet-400/30 bg-violet-400/10 text-violet-200",
  "folder.restore": "border-violet-400/30 bg-violet-400/10 text-violet-200",
  "file.force_delete": "border-red-400/30 bg-red-400/10 text-red-200",
  "folder.force_delete": "border-red-400/30 bg-red-400/10 text-red-200",
  "share.create": "border-indigo-400/30 bg-indigo-400/10 text-indigo-200",
  "share.delete": "border-indigo-400/30 bg-indigo-400/10 text-indigo-200",
  "file.download": "border-teal-400/30 bg-teal-400/10 text-teal-200",
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  hour: "2-digit",
  hour12: false,
  minute: "2-digit",
  month: "long",
  timeZone: "Asia/Jakarta",
  year: "numeric",
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(source: unknown, keys: string[]): string | null {
  if (!isRecord(source)) return null;

  for (const key of keys) {
    const value = (source as any)[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }

  return null;
}

function readNumber(source: unknown, keys: string[]): number | null {
  if (!isRecord(source)) return null;

  for (const key of keys) {
    const value = (source as any)[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return null;
}

function normalizeActivityLogs(
  payload: unknown,
): NormalizedActivityLogResponse {
  if (Array.isArray(payload)) {
    return {
      logs: payload as ActivityLogRow[],
      lastPage: 1,
    };
  }

  const root = isRecord(payload) ? payload : {};
  const rootData = (root as any).data;
  const nestedData = isRecord(rootData) ? (rootData as any).data : null;

  const logsSource = Array.isArray(rootData)
    ? rootData
    : Array.isArray(nestedData)
      ? nestedData
      : Array.isArray((root as any).logs)
        ? (root as any).logs
        : [];

  const meta = isRecord((root as any).meta)
    ? (root as any).meta
    : isRecord(rootData)
      ? rootData
      : root;

  const total = readNumber(meta, ["total", "total_items", "totalItems"]);
  const perPage = readNumber(meta, ["per_page", "perPage"]) ?? PER_PAGE;
  const lastPage =
    readNumber(meta, ["last_page", "lastPage", "total_pages", "totalPages"]) ??
    (total ? Math.ceil(total / perPage) : 1);

  return {
    logs: logsSource as ActivityLogRow[],
    lastPage: Math.max(1, lastPage),
  };
}

function getActionLabel(action: string | null): string {
  if (!action) return "Aktivitas";
  return ACTION_LABELS[action as ActivityAction] ?? action;
}

function getActionTone(action: string | null): string {
  if (!action) return "border-slate-500/30 bg-slate-500/10 text-slate-200";
  return (
    ACTION_TONES[action as ActivityAction] ??
    "border-slate-500/30 bg-slate-500/10 text-slate-200"
  );
}

function getDescription(log: ActivityLogRow): string {
  return readString(log, ["description", "message"]) ?? "Tanpa deskripsi";
}

function getAction(log: ActivityLogRow): string | null {
  return readString(log, ["action", "event"]);
}

function getUserName(log: ActivityLogRow): string {
  return (
    readString(log.user, ["name", "email"]) ??
    readString(log.causer, ["name", "email"]) ??
    readString(log.actor, ["name", "email"]) ??
    readString(log, ["user_name", "username", "actor_name"]) ??
    "Sistem"
  );
}

function getIpAddress(log: ActivityLogRow): string | null {
  return readString(log, ["ip_address", "ipAddress", "ip"]);
}

function getCreatedAt(log: ActivityLogRow): string {
  const value = readString(log, ["created_at", "createdAt"]);
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return `${dateFormatter.format(date).replace(/\s*pukul\s*/i, ", ")} WIB`;
}

function getLogKey(log: ActivityLogRow, index: number): string {
  const id =
    (log as any).id ??
    (log as any).uuid ??
    (log as any).created_at ??
    (log as any).createdAt;
  if (typeof id === "string" || typeof id === "number") return String(id);
  return `activity-log-${index}`;
}

function getErrorMessage(error: unknown): string {
  if (isRecord(error)) {
    const response = (error as any).response;
    if (isRecord(response) && isRecord((response as any).data)) {
      const message = readString((response as any).data, ["message", "error"]);
      if (message) return message;
    }

    const message = readString(error, ["message"]);
    if (message) return message;
  }

  return "Gagal memuat activity log.";
}

function ActionBadge({ action }: { action: string | null }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-md border px-2.5 py-1 text-xs font-semibold ${getActionTone(action)}`}
    >
      {getActionLabel(action)}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3 p-4 sm:p-6">
      <div
        className="flex items-center gap-2 text-xs"
        style={{ color: "#94a3b8" }}
      >
        <LoadingSpinner size={12} />
        Memuat aktivitas...
      </div>
    </div>
  );
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [selectedAction, setSelectedAction] =
    useState<ActivityActionFilter>("all");

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [loadingNext, setLoadingNext] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const [selectedLogKeys, setSelectedLogKeys] = useState<Set<string>>(
    new Set(),
  );
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteKeys, setBulkDeleteKeys] = useState<string[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteResult, setBulkDeleteResult] = useState<{
    okCount: number;
    failCount: number;
  } | null>(null);

  // Sentinel untuk infinite scroll
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  // Container scroll utama halaman, mengikuti pola My Files.
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const fetchNextInFlightRef = useRef(false);
  const requestVersionRef = useRef(0);

  const filterLabel = useMemo(() => {
    if (selectedAction === "all") return "Semua";
    return selectedAction;
  }, [selectedAction]);

  const clearSelection = useCallback(() => {
    setSelectedLogKeys(new Set());
  }, []);

  const loadedLogKeys = useMemo(
    () => logs.map((log, index) => getLogKey(log, index)),
    [logs],
  );
  const selectedVisibleCount = loadedLogKeys.reduce(
    (count, key) => count + (selectedLogKeys.has(key) ? 1 : 0),
    0,
  );
  const allVisibleSelected =
    loadedLogKeys.length > 0 && selectedVisibleCount === loadedLogKeys.length;
  const selectAllIndeterminate =
    selectedVisibleCount > 0 && !allVisibleSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectAllIndeterminate;
    }
  }, [selectAllIndeterminate]);

  useEffect(() => {
    let ignore = false;

    async function fetchInitial() {
      const requestVersion = requestVersionRef.current + 1;
      requestVersionRef.current = requestVersion;

      setLoading(true);
      setError(null);
      setLoadingNext(false);
      setLogs([]);
      clearSelection();
      setLastPage(1);
      setPage(1);
      fetchNextInFlightRef.current = false;
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "auto" });

      try {
        const params = {
          page: 1,
          per_page: PER_PAGE,
          ...(selectedAction !== "all" ? { action: selectedAction } : {}),
        };
        const response = await getActivityLogs(params);
        const normalized = normalizeActivityLogs(response);
        const deletedLogKeys = readDeletedActivityLogKeys();
        const visibleLogs = normalized.logs.filter(
          (log, index) => !deletedLogKeys.has(getLogKey(log, index)),
        );

        if (ignore || requestVersion !== requestVersionRef.current) return;

        setLogs(visibleLogs);
        setLastPage(normalized.lastPage);
        setPage(1);
      } catch (fetchError) {
        if (ignore || requestVersion !== requestVersionRef.current) return;
        setLogs([]);
        setError(getErrorMessage(fetchError));
        setLastPage(1);
        setPage(1);
      } finally {
        if (!ignore && requestVersion === requestVersionRef.current) {
          setLoading(false);
        }
      }
    }

    fetchInitial();

    return () => {
      ignore = true;
    };
  }, [clearSelection, selectedAction, reloadKey]);

  const fetchNextPage = useCallback(async () => {
    if (loading || loadingNext || fetchNextInFlightRef.current) return;
    if (page >= lastPage) return;

    const requestVersion = requestVersionRef.current;
    fetchNextInFlightRef.current = true;
    setLoadingNext(true);
    setError(null);

    try {
      const nextPage = page + 1;
      const params = {
        page: nextPage,
        per_page: PER_PAGE,
        ...(selectedAction !== "all" ? { action: selectedAction } : {}),
      };

      const response = await getActivityLogs(params);
      const normalized = normalizeActivityLogs(response);

      if (requestVersion !== requestVersionRef.current) return;

      setLogs((prev) => {
        const deletedLogKeys = readDeletedActivityLogKeys();
        const visibleLogs = normalized.logs.filter(
          (log, index) =>
            !deletedLogKeys.has(getLogKey(log, prev.length + index)),
        );
        return [...prev, ...visibleLogs];
      });
      setLastPage(normalized.lastPage);
      setPage(nextPage);
    } catch (fetchError) {
      if (requestVersion !== requestVersionRef.current) return;
      setError(getErrorMessage(fetchError));
    } finally {
      if (requestVersion === requestVersionRef.current) {
        fetchNextInFlightRef.current = false;
        setLoadingNext(false);
      }
    }
  }, [lastPage, loading, loadingNext, page, selectedAction]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    let cancelled = false;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;
        if (cancelled) return;
        fetchNextPage();
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "0px 0px 240px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(sentinel);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [fetchNextPage]);

  function handleFilterChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedAction(event.target.value as ActivityActionFilter);
  }

  function handleRetry() {
    setReloadKey((current) => current + 1);
  }

  function openBulkDeleteModal() {
    const keys = Array.from(selectedLogKeys);
    if (keys.length === 0) return;

    setBulkDeleteKeys(keys);
    setBulkDeleteResult(null);
    setIsBulkDeleteModalOpen(true);
  }

  function closeBulkDeleteModal() {
    if (bulkDeleteLoading) return;

    setIsBulkDeleteModalOpen(false);
    setBulkDeleteKeys([]);
    setBulkDeleteResult(null);
  }

  function handleConfirmBulkDelete() {
    if (bulkDeleteLoading || bulkDeleteKeys.length === 0) return;

    setBulkDeleteLoading(true);
    const deletedLogKeys = readDeletedActivityLogKeys();
    bulkDeleteKeys.forEach((key) => deletedLogKeys.add(key));
    writeDeletedActivityLogKeys(deletedLogKeys);

    setLogs((current) =>
      current.filter(
        (log, index) => !bulkDeleteKeys.includes(getLogKey(log, index)),
      ),
    );
    clearSelection();
    setBulkDeleteResult({ okCount: bulkDeleteKeys.length, failCount: 0 });
    setBulkDeleteLoading(false);
  }

  return (
    <div
      className="flex-1 min-h-0 w-full overflow-y-auto nimbus-scrollbar bg-slate-950 px-4 py-5 text-slate-100 sm:px-6 lg:px-8"
      ref={scrollContainerRef}
    >
      <div className="flex w-full flex-col gap-5">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-cyan-300">
              <Activity className="h-4 w-4" aria-hidden="true" />
              <span>NimbusDrive</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-white sm:text-3xl">
                Activity Log
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Riwayat aktivitas terbaru di workspace.
              </p>
            </div>
          </div>

          <label className="flex w-full flex-col gap-2 text-sm font-medium text-slate-300 sm:w-72">
            <span>Filter aksi</span>
            <span className="relative">
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <select
                className="h-11 w-full appearance-none rounded-lg border border-slate-700 bg-slate-900 px-10 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                onChange={handleFilterChange}
                value={selectedAction}
              >
                <option value="all">Semua</option>
                {ACTIVITY_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </header>

        <section className="rounded-lg border border-slate-800 bg-slate-900/50 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <p className="text-sm font-semibold text-white">Log aktivitas</p>
              <p className="mt-1 text-xs text-slate-400">
                Filter aktif: {filterLabel}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>Per halaman {PER_PAGE}</span>
            </div>
          </div>

          {!loading && !error && logs.length > 0 ? (
            <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelectedLogKeys(new Set(loadedLogKeys));
                    } else {
                      clearSelection();
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                  style={{ accentColor: "#22d3ee" }}
                  aria-label="Pilih semua activity log yang dimuat"
                />
                <span>
                  <span className="font-semibold text-white">
                    {selectedLogKeys.size}
                  </span>{" "}
                  activity log dipilih
                </span>
              </label>

              {selectedLogKeys.size > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={openBulkDeleteModal}
                    disabled={bulkDeleteLoading}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/15 px-3 py-2 text-xs font-semibold text-red-100 transition hover:bg-red-400/20 disabled:opacity-60"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Hapus Log
                  </button>

                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={bulkDeleteLoading}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    Batalkan pilihan
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {isBulkDeleteModalOpen ? (
            <div
              className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="activity-log-bulk-delete-title"
            >
              <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl shadow-black/60">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2
                      id="activity-log-bulk-delete-title"
                      className="text-sm font-semibold text-white"
                    >
                      Hapus activity log?
                    </h2>
                    <p className="mt-2 text-xs text-slate-400">
                      {bulkDeleteKeys.length} activity log terpilih akan dihapus
                      dari tampilan Activity Log.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeBulkDeleteModal}
                    disabled={bulkDeleteLoading}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-950 text-sm text-slate-300 disabled:opacity-60"
                    aria-label="Tutup modal hapus activity log"
                  >
                    ×
                  </button>
                </div>

                {bulkDeleteLoading ? (
                  <div
                    className="mb-4 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-100"
                    role="status"
                  >
                    Menghapus activity log...
                  </div>
                ) : null}

                {bulkDeleteResult ? (
                  <>
                    <div
                      className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"
                      role="status"
                    >
                      <div className="text-xs text-slate-400">Hasil proses</div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-emerald-200">
                          <div className="text-lg font-semibold">
                            {bulkDeleteResult.okCount}
                          </div>
                          <div className="text-[11px]">berhasil</div>
                        </div>
                        <div className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-red-200">
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
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300"
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
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-300 disabled:opacity-60"
                    >
                      Batal
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmBulkDelete}
                      disabled={bulkDeleteLoading}
                      className="rounded-xl border border-red-400/30 bg-red-400/80 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-70"
                    >
                      {bulkDeleteLoading ? "Menghapus..." : "Hapus Log"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {loading ? (
            <LoadingState />
          ) : error ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-rose-400/30 bg-rose-400/10 text-rose-200">
                <AlertCircle className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <p className="font-semibold text-white">
                  Activity log gagal dimuat
                </p>
                <p className="max-w-md text-sm text-slate-400">{error}</p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                onClick={handleRetry}
                type="button"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Coba lagi
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/70 text-slate-300">
                <Search className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <p className="font-semibold text-white">
                  Activity log masih kosong
                </p>
                <p className="max-w-md text-sm text-slate-400">
                  Belum ada aktivitas untuk filter yang dipilih.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full divide-y divide-slate-800">
                  <thead className="bg-slate-950/60">
                    <tr>
                      <th className="w-12 px-5 py-3 text-left text-xs font-semibold uppercase text-slate-400">
                        <span className="sr-only">Pilih</span>
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-400">
                        Deskripsi
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-400">
                        Aksi
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-400">
                        User
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-400">
                        IP
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-slate-400">
                        Waktu
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {logs.map((log, index) => {
                      const action = getAction(log);
                      const ipAddress = getIpAddress(log);
                      const logKey = getLogKey(log, index);
                      const isSelected = selectedLogKeys.has(logKey);
                      return (
                        <tr
                          className="transition hover:bg-slate-800/40"
                          key={logKey}
                        >
                          <td className="px-5 py-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(event) => {
                                setSelectedLogKeys((prev) => {
                                  const next = new Set(prev);
                                  if (event.target.checked) next.add(logKey);
                                  else next.delete(logKey);
                                  return next;
                                });
                              }}
                              className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                              style={{ accentColor: "#22d3ee" }}
                              aria-label={`Pilih activity log ${getDescription(log)}`}
                            />
                          </td>
                          <td className="max-w-lg px-5 py-4 text-sm text-slate-100">
                            {getDescription(log)}
                          </td>
                          <td className="px-5 py-4">
                            <ActionBadge action={action} />
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-300">
                            <span className="inline-flex items-center gap-2">
                              <User
                                className="h-4 w-4 text-slate-500"
                                aria-hidden="true"
                              />
                              {getUserName(log)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-300">
                            {ipAddress ? (
                              <span className="inline-flex items-center gap-2">
                                <Wifi
                                  className="h-4 w-4 text-slate-500"
                                  aria-hidden="true"
                                />
                                {ipAddress}
                              </span>
                            ) : (
                              <span className="text-slate-600">-</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-300">
                            {getCreatedAt(log)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-4 md:hidden">
                {logs.map((log, index) => {
                  const action = getAction(log);
                  const ipAddress = getIpAddress(log);
                  const logKey = getLogKey(log, index);
                  const isSelected = selectedLogKeys.has(logKey);

                  return (
                    <article
                      className="rounded-lg border border-slate-800 bg-slate-950/60 p-4"
                      key={logKey}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(event) => {
                              setSelectedLogKeys((prev) => {
                                const next = new Set(prev);
                                if (event.target.checked) next.add(logKey);
                                else next.delete(logKey);
                                return next;
                              });
                            }}
                            className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                            style={{ accentColor: "#22d3ee" }}
                            aria-label={`Pilih activity log ${getDescription(log)}`}
                          />
                          <ActionBadge action={action} />
                        </div>
                        <span className="text-right text-xs text-slate-500">
                          {getCreatedAt(log)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-medium text-slate-100">
                        {getDescription(log)}
                      </p>
                      <div className="mt-4 grid gap-2 text-sm text-slate-400">
                        <span className="inline-flex items-center gap-2">
                          <User className="h-4 w-4" aria-hidden="true" />
                          {getUserName(log)}
                        </span>
                        {ipAddress ? (
                          <span className="inline-flex items-center gap-2">
                            <Wifi className="h-4 w-4" aria-hidden="true" />
                            {ipAddress}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* sentinel */}
              <div ref={sentinelRef} className="h-2" />
              {loadingNext ? (
                <div
                  className="px-4 pb-6 flex items-center justify-center gap-2 text-xs"
                  style={{ color: "#94a3b8" }}
                >
                  <LoadingSpinner size={10} />
                  Memuat aktivitas berikutnya...
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
