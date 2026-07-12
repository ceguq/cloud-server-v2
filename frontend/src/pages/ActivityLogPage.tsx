import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  Activity,
  AlertCircle,
  ChevronDown,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Trash2,
  User,
  Wifi,
} from "lucide-react";
import { getAdminActivityLogs } from "../services/activityLogService";

import type { ActivityLogItem } from "../types/activityLog";
import { LoadingSpinner } from "../app/components/LoadingSpinner";

const PER_PAGE = 20;
const DELETED_ACTIVITY_LOG_STORAGE_KEY = "nimbus_deleted_activity_log_keys";

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
  if (typeof window === "undefined") return "#a78bfa";

  try {
    const raw = window.localStorage.getItem("nimbus_accent_color");
    if (typeof raw === "string" && raw.trim().length > 0) return raw;
  } catch {
    // ignore
  }

  return "#a78bfa";
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

function withAlpha(color: string, alphaHex: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alphaHex}` : color;
}

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

const ACTION_COLORS: Record<ActivityAction, string> = {
  "auth.login": "#06b6d4",
  "file.upload": "#10b981",
  "folder.create": "#f59e0b",
  "file.rename": "#0ea5e9",
  "folder.rename": "#0ea5e9",
  "file.trash": "#f43f5e",
  "folder.trash": "#f43f5e",
  "file.restore": "#8b5cf6",
  "folder.restore": "#8b5cf6",
  "file.force_delete": "#ef4444",
  "folder.force_delete": "#ef4444",
  "share.create": "#6366f1",
  "share.delete": "#6366f1",
  "file.download": "#14b8a6",
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

function getActionColor(action: string | null): string {
  if (!action) return "#64748b";
  return ACTION_COLORS[action as ActivityAction] ?? "#64748b";
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

function ActionBadge({
  action,
  isDark,
}: {
  action: string | null;
  isDark: boolean;
}) {
  const actionColor = getActionColor(action);

  return (
    <span
      className="inline-flex w-fit items-center rounded-md border px-2.5 py-1 text-xs font-semibold"
      style={{
        backgroundColor: withAlpha(actionColor, isDark ? "24" : "14"),
        borderColor: withAlpha(actionColor, isDark ? "66" : "4d"),
        color: actionColor,
      }}
    >
      {getActionLabel(action)}
    </span>
  );
}

function LoadingState({ color }: { color: string }) {
  return (
    <div className="space-y-3 p-4 sm:p-6">
      <div className="flex items-center gap-2 text-xs" style={{ color }}>
        <LoadingSpinner size={12} />
        Memuat Activity Log...
      </div>
    </div>
  );
}

export default function ActivityLogPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [accentColor, setAccentColor] = useState<string>(() =>
    safeReadAccentColor(),
  );
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveAppearanceTheme(safeReadAppearanceTheme()),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncThemeFromStorage = () => {
      const nextTheme = safeReadAppearanceTheme();
      setAccentColor(safeReadAccentColor());
      setResolvedTheme(resolveAppearanceTheme(nextTheme));
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key === "nimbus_appearance_theme" ||
        event.key === "nimbus_accent_color"
      ) {
        syncThemeFromStorage();
      }
    };

    syncThemeFromStorage();
    window.addEventListener("nimbus-appearance-change", syncThemeFromStorage);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", syncThemeFromStorage);

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", syncThemeFromStorage);

    return () => {
      window.removeEventListener(
        "nimbus-appearance-change",
        syncThemeFromStorage,
      );
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", syncThemeFromStorage);
      mq?.removeEventListener?.("change", syncThemeFromStorage);
    };
  }, []);

  const activityLogColors = useMemo(() => {
    if (resolvedTheme === "light") {
      return {
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
        buttonSoftBg: "#f1f5f9",
        rowHoverBg: "#f8fafc",
      };
    }

    return {
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
      buttonSoftBg: "#1a2540",
      rowHoverBg: "#111c2f",
    };
  }, [resolvedTheme]);

  const isActivityLogDark = resolvedTheme === "dark";

  const activityLogShellColors = useMemo(() => {
    if (isActivityLogDark) {
      return {
        pageBg: "#111c2f",
        text: "#94a3b8",
        title: "#e2e8f0",
        muted: "#94a3b8",
        mutedSoft: "#64748b",
        border: "#1a2540",
        borderSoft: "#24324f",
        panelBg: "#0f1729",
        panelSoftBg: "#0d1829",
        inputBg: "#0d1829",
        tableHeadBg: "#0d1829",
        rowHover: "rgba(13, 24, 41, 0.72)",
        selectedBg: withAlpha(accentColor, "18"),
        selectedBorder: withAlpha(accentColor, "73"),
        overlay: "rgba(0, 0, 0, 0.70)",
        iconSoftBg: "#0d1829",
        shadow: "0 22px 60px rgba(0, 0, 0, 0.32)",
        accent: accentColor,
        accentSoftBg: withAlpha(accentColor, "1f"),
        accentBorder: withAlpha(accentColor, "59"),
        danger: "#ef4444",
        dangerText: "#fecaca",
        dangerSoftBg: "rgba(239, 68, 68, 0.14)",
        dangerBorder: "rgba(248, 113, 113, 0.32)",
        successText: "#86efac",
        successSoftBg: "rgba(34, 197, 94, 0.12)",
        successBorder: "rgba(74, 222, 128, 0.34)",
      };
    }

    return {
      pageBg: "#f8fafc",
      text: "#334155",
      title: "#0f172a",
      muted: "#64748b",
      mutedSoft: "#94a3b8",
      border: "#dbe3ef",
      borderSoft: "#e5eaf1",
      panelBg: "#ffffff",
      panelSoftBg: "#f8fafc",
      inputBg: "#ffffff",
      tableHeadBg: "#f1f5f9",
      rowHover: "#f8fafc",
      selectedBg: withAlpha(accentColor, "12"),
      selectedBorder: withAlpha(accentColor, "66"),
      overlay: "rgba(15, 23, 42, 0.45)",
      iconSoftBg: "#f1f5f9",
      shadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
      accent: accentColor,
      accentSoftBg: withAlpha(accentColor, "12"),
      accentBorder: withAlpha(accentColor, "4d"),
      danger: "#dc2626",
      dangerText: "#991b1b",
      dangerSoftBg: "rgba(239, 68, 68, 0.10)",
      dangerBorder: "rgba(220, 38, 38, 0.28)",
      successText: "#047857",
      successSoftBg: "rgba(16, 185, 129, 0.10)",
      successBorder: "rgba(5, 150, 105, 0.28)",
    };
  }, [accentColor, isActivityLogDark]);


  const [selectedAction, setSelectedAction] =
    useState<ActivityActionFilter>("all");

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const [logsLoading, setLogsLoading] = useState(false);
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
    return getActionLabel(selectedAction);
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
    // admin-only guard: prevent fetching activity logs for non-admin users
    try {
      const raw = localStorage.getItem("nimbus_user");
      const parsed = raw ? JSON.parse(raw) : null;
      const role = parsed?.role;

      // isAdmin: null = belum cek, true = admin, false = non-admin
      setIsAdmin(role === "admin");
    } catch {
      setIsAdmin(false);
    }
  }, []);


  useEffect(() => {
    // jangan fetch jika belum tahu role atau non-admin
    if (isAdmin !== true) return;


    let ignore = false;


    async function fetchInitial() {
      const requestVersion = requestVersionRef.current + 1;
      requestVersionRef.current = requestVersion;

      setLogsLoading(true);
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
        const response = await getAdminActivityLogs(params);
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
          setLogsLoading(false);
        }
      }
    }

    fetchInitial();

    return () => {
      ignore = true;
    };
  }, [clearSelection, isAdmin, selectedAction, reloadKey]);

  const fetchNextPage = useCallback(async () => {
    if (isAdmin !== true || logsLoading || loadingNext || fetchNextInFlightRef.current) return;
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

        const response = await getAdminActivityLogs(params);

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
  }, [isAdmin, lastPage, logsLoading, loadingNext, page, selectedAction]);

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
      className="flex-1 min-h-0 w-full overflow-y-auto nimbus-scrollbar px-4 py-5 sm:px-6 lg:px-8"
      ref={scrollContainerRef}
      style={{
        backgroundColor: activityLogShellColors.pageBg,
        color: activityLogShellColors.text,
      }}
    >
      <div className="flex w-full flex-col gap-5">
        <header
          className="flex flex-col gap-4 pb-5 md:flex-row md:items-end md:justify-between"
          style={{
            borderBottom: `1px solid ${activityLogShellColors.border}`,
            color: activityLogShellColors.title,
          }}
        >
          <div className="space-y-2">
            <div
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ color: activityLogShellColors.accent }}
            >
              <Activity className="h-4 w-4" aria-hidden="true" />
              <span>NimbusDrive</span>
            </div>
            <div>
              <h1
                className="text-2xl font-semibold tracking-normal sm:text-3xl"
                style={{ color: activityLogShellColors.title }}
              >
                Activity Log
              </h1>
              <p
                className="mt-1 text-sm"
                style={{ color: activityLogShellColors.muted }}
              >
                Riwayat aktivitas terbaru di workspace.
              </p>
            </div>
          </div>

          <label
            className="flex w-full flex-col gap-2 text-sm font-medium sm:w-72"
            style={{ color: activityLogShellColors.muted }}
          >
            <span>Filter aksi</span>
            <span
              className="relative"
              style={{
                background: activityLogShellColors.panelBg,
                border: `1px solid ${activityLogShellColors.border}`,
                borderRadius: "0.5rem",
                padding: "0.25rem",
              }}
            >
              <Filter
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: activityLogShellColors.muted }}
                aria-hidden="true"
              />
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2"
                style={{ color: activityLogShellColors.muted }}
                aria-hidden="true"
              />
              <select
                className="h-11 w-full appearance-none rounded-lg px-10 text-sm outline-none transition focus:ring-2 focus:ring-cyan-400/20"
                style={{
                  backgroundColor: activityLogShellColors.inputBg,
                  color: activityLogShellColors.text,
                  border: `1px solid ${activityLogShellColors.border}`,
                }}
                onChange={handleFilterChange}
                value={selectedAction}
              >
                <option value="all">Semua</option>
                {ACTIVITY_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {getActionLabel(action)}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </header>

        <section
          className="rounded-lg border"
          style={{
            borderColor: activityLogShellColors.border,
            backgroundColor: activityLogShellColors.panelBg,
            boxShadow: activityLogShellColors.shadow,
          }}
        >

          <div
            className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            style={{ borderBottomColor: activityLogShellColors.border }}
          >
            <div>
              <p
                className="text-sm font-semibold"
                style={{ color: activityLogShellColors.title }}
              >
                Log aktivitas
              </p>
              <p
                className="mt-1 text-xs"
                style={{ color: activityLogShellColors.muted }}
              >
                Filter aktif: {filterLabel}
              </p>
            </div>
            <div
              className="flex items-center gap-2 text-xs"
              style={{ color: activityLogShellColors.muted }}
            >
              <Clock className="h-4 w-4" aria-hidden="true" />
              <span>Per halaman {PER_PAGE}</span>
            </div>
          </div>

          {isAdmin === true && !logsLoading && !error && logs.length > 0 ? (
            <div
              className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              style={{ borderBottomColor: activityLogShellColors.border }}
            >
              <label
                className="flex items-center gap-3 text-sm"
                style={{ color: activityLogShellColors.text }}
              >
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
                  className="h-4 w-4 rounded"
                  style={{ accentColor: activityLogShellColors.danger }}
                  aria-label="Pilih semua activity log yang dimuat"
                />
                <span>
                  <span
                    className="font-semibold"
                    style={{ color: activityLogShellColors.title }}
                  >
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
                    className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:opacity-90 disabled:opacity-60"
                    style={{
                      backgroundColor: activityLogShellColors.dangerSoftBg,
                      borderColor: activityLogShellColors.dangerBorder,
                      color: activityLogShellColors.dangerText,
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Hapus Log
                  </button>

                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={bulkDeleteLoading}
                    className="rounded-lg border px-3 py-2 text-xs font-medium transition hover:opacity-85 disabled:opacity-60"
                    style={{
                      backgroundColor: activityLogShellColors.panelSoftBg,
                      borderColor: activityLogShellColors.border,
                      color: activityLogShellColors.text,
                    }}
                  >
                    Batalkan pilihan
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}

          {isAdmin === true && isBulkDeleteModalOpen ? (
            <div
              className="fixed inset-0 z-[120] flex items-center justify-center px-4"
              style={{ backgroundColor: activityLogShellColors.overlay }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="activity-log-bulk-delete-title"
            >
              <div
                className="w-full max-w-md rounded-2xl border p-6"
                style={{
                  backgroundColor: activityLogShellColors.panelBg,
                  borderColor: activityLogShellColors.border,
                  boxShadow: activityLogShellColors.shadow,
                }}
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <h2
                      id="activity-log-bulk-delete-title"
                      className="text-sm font-semibold"
                      style={{ color: activityLogShellColors.title }}
                    >
                      Hapus activity log?
                    </h2>
                    <p
                      className="mt-2 text-xs"
                      style={{ color: activityLogShellColors.muted }}
                    >
                      {bulkDeleteKeys.length} activity log terpilih akan dihapus
                      dari tampilan Activity Log.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={closeBulkDeleteModal}
                    disabled={bulkDeleteLoading}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border text-sm disabled:opacity-60"
                    style={{
                      backgroundColor: activityLogShellColors.panelSoftBg,
                      borderColor: activityLogShellColors.border,
                      color: activityLogShellColors.text,
                    }}
                    aria-label="Tutup modal hapus activity log"
                  >
                    x
                  </button>
                </div>

                {bulkDeleteLoading ? (
                  <div
                    className="mb-4 rounded-xl border px-3 py-2 text-xs"
                    style={{
                      backgroundColor: activityLogShellColors.accentSoftBg,
                      borderColor: activityLogShellColors.accentBorder,
                      color: activityLogShellColors.accent,
                    }}
                    role="status"
                  >
                    Menghapus activity log...
                  </div>
                ) : null}

                {bulkDeleteResult ? (
                  <>
                    <div
                      className="rounded-xl border p-4"
                      style={{
                        backgroundColor: activityLogShellColors.panelSoftBg,
                        borderColor: activityLogShellColors.border,
                      }}
                      role="status"
                    >
                      <div
                        className="text-xs"
                        style={{ color: activityLogShellColors.muted }}
                      >
                        Hasil proses
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div
                          className="rounded-xl border px-3 py-2"
                          style={{
                            backgroundColor:
                              activityLogShellColors.successSoftBg,
                            borderColor: activityLogShellColors.successBorder,
                            color: activityLogShellColors.successText,
                          }}
                        >
                          <div className="text-lg font-semibold">
                            {bulkDeleteResult.okCount}
                          </div>
                          <div className="text-[11px]">berhasil</div>
                        </div>
                        <div
                          className="rounded-xl border px-3 py-2"
                          style={{
                            backgroundColor:
                              activityLogShellColors.dangerSoftBg,
                            borderColor: activityLogShellColors.dangerBorder,
                            color: activityLogShellColors.dangerText,
                          }}
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
                        className="rounded-xl border px-3 py-2 text-xs font-medium"
                        style={{
                          backgroundColor: activityLogShellColors.panelSoftBg,
                          borderColor: activityLogShellColors.border,
                          color: activityLogShellColors.text,
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
                      className="rounded-xl border px-3 py-2 text-xs font-medium disabled:opacity-60"
                      style={{
                        backgroundColor: activityLogShellColors.panelSoftBg,
                        borderColor: activityLogShellColors.border,
                        color: activityLogShellColors.text,
                      }}
                    >
                      Batal
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmBulkDelete}
                      disabled={bulkDeleteLoading}
                      className="rounded-xl border px-3 py-2 text-xs font-semibold disabled:opacity-70"
                      style={{
                        backgroundColor: activityLogShellColors.danger,
                        borderColor: activityLogShellColors.dangerBorder,
                        color: "#ffffff",
                      }}
                    >
                      {bulkDeleteLoading ? "Menghapus..." : "Hapus Log"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {isAdmin === null ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
              <div
                className="flex items-center gap-2 text-sm"
                style={{ color: activityLogShellColors.muted }}
              >
                <LoadingSpinner size={12} />
                Memeriksa akses admin...
              </div>
            </div>
          ) : isAdmin === false ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-lg border"
                style={{
                  backgroundColor: activityLogShellColors.dangerSoftBg,
                  borderColor: activityLogShellColors.dangerBorder,
                  color: activityLogShellColors.dangerText,
                }}
              >
                <AlertCircle className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <p
                  className="font-semibold"
                  style={{ color: activityLogShellColors.title }}
                >
                  Akses ditolak. Activity Log hanya untuk admin.
                </p>
              </div>
            </div>
          ) : logsLoading ? (
            <LoadingState color={activityLogShellColors.muted} />
          ) : error ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-lg border"
                style={{
                  backgroundColor: activityLogShellColors.dangerSoftBg,
                  borderColor: activityLogShellColors.dangerBorder,
                  color: activityLogShellColors.dangerText,
                }}
              >
                <AlertCircle className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <p
                  className="font-semibold"
                  style={{ color: activityLogShellColors.title }}
                >
                  Activity log gagal dimuat
                </p>
                <p
                  className="max-w-md text-sm"
                  style={{ color: activityLogShellColors.muted }}
                >
                  {error}
                </p>
              </div>
              <button
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
                style={{
                  backgroundColor: activityLogShellColors.accentSoftBg,
                  borderColor: activityLogShellColors.accentBorder,
                  color: activityLogShellColors.accent,
                }}
                onClick={handleRetry}
                type="button"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Coba lagi
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-4 py-12 text-center">
              <span
                className="flex h-12 w-12 items-center justify-center rounded-lg border"
                style={{
                  backgroundColor: activityLogShellColors.iconSoftBg,
                  borderColor: activityLogShellColors.border,
                  color: activityLogShellColors.muted,
                }}
              >
                <Search className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <p
                  className="font-semibold"
                  style={{ color: activityLogShellColors.title }}
                >
                  Activity log masih kosong
                </p>
                <p
                  className="max-w-md text-sm"
                  style={{ color: activityLogShellColors.muted }}
                >
                  Belum ada aktivitas untuk filter yang dipilih.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table
                  className="min-w-full"
                  style={{ borderColor: activityLogShellColors.border }}
                >
                  <thead
                    style={{
                      backgroundColor: activityLogShellColors.tableHeadBg,
                    }}
                  >
                    <tr>
                      <th
                        className="w-12 px-5 py-3 text-left text-xs font-semibold uppercase"
                        style={{ color: activityLogShellColors.muted }}
                      >
                        <span className="sr-only">Pilih</span>
                      </th>
                      <th
                        className="px-5 py-3 text-left text-xs font-semibold uppercase"
                        style={{ color: activityLogShellColors.muted }}
                      >
                        Deskripsi
                      </th>
                      <th
                        className="px-5 py-3 text-left text-xs font-semibold uppercase"
                        style={{ color: activityLogShellColors.muted }}
                      >
                        Aksi
                      </th>
                      <th
                        className="px-5 py-3 text-left text-xs font-semibold uppercase"
                        style={{ color: activityLogShellColors.muted }}
                      >
                        User
                      </th>
                      <th
                        className="px-5 py-3 text-left text-xs font-semibold uppercase"
                        style={{ color: activityLogShellColors.muted }}
                      >
                        IP
                      </th>
                      <th
                        className="px-5 py-3 text-left text-xs font-semibold uppercase"
                        style={{ color: activityLogShellColors.muted }}
                      >
                        Waktu
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, index) => {
                      const action = getAction(log);
                      const ipAddress = getIpAddress(log);
                      const logKey = getLogKey(log, index);
                      const isSelected = selectedLogKeys.has(logKey);
                      return (
                        <tr
                          className="transition"
                          key={logKey}
                          style={{
                            background: isSelected
                              ? activityLogShellColors.selectedBg
                              : "transparent",
                            borderLeft: isSelected
                              ? `3px solid ${activityLogShellColors.selectedBorder}`
                              : "3px solid transparent",
                            borderBottom: `1px solid ${activityLogShellColors.border}`,
                          }}
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
                              className="h-4 w-4 rounded"
                              style={{
                                accentColor: activityLogShellColors.danger,
                              }}
                              aria-label={`Pilih activity log ${getDescription(log)}`}
                            />
                          </td>
                          <td
                            className="max-w-lg px-5 py-4 text-sm"
                            style={{ color: activityLogShellColors.title }}
                          >
                            {getDescription(log)}
                          </td>
                          <td className="px-5 py-4">
                            <ActionBadge
                              action={action}
                              isDark={isActivityLogDark}
                            />
                          </td>
                          <td
                            className="px-5 py-4 text-sm"
                            style={{ color: activityLogShellColors.text }}
                          >
                            <span className="inline-flex items-center gap-2">
                              <User
                                className="h-4 w-4"
                                style={{
                                  color: activityLogShellColors.mutedSoft,
                                }}
                                aria-hidden="true"
                              />
                              {getUserName(log)}
                            </span>
                          </td>
                          <td
                            className="px-5 py-4 text-sm"
                            style={{ color: activityLogShellColors.text }}
                          >
                            {ipAddress ? (
                              <span className="inline-flex items-center gap-2">
                                <Wifi
                                  className="h-4 w-4"
                                  style={{
                                    color: activityLogShellColors.mutedSoft,
                                  }}
                                  aria-hidden="true"
                                />
                                {ipAddress}
                              </span>
                            ) : (
                              <span
                                style={{
                                  color: activityLogShellColors.mutedSoft,
                                }}
                              >
                                -
                              </span>
                            )}
                          </td>
                          <td
                            className="whitespace-nowrap px-5 py-4 text-sm"
                            style={{ color: activityLogShellColors.text }}
                          >
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
                      className="rounded-lg border p-4"
                      key={logKey}
                      style={{
                        background: isSelected
                          ? activityLogShellColors.selectedBg
                          : activityLogShellColors.panelSoftBg,
                        borderColor: activityLogShellColors.border,
                        borderLeft: isSelected
                          ? `3px solid ${activityLogShellColors.selectedBorder}`
                          : `1px solid ${activityLogShellColors.border}`,
                        paddingLeft: isSelected ? "calc(1rem - 3px)" : "1rem",
                      }}
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
                            className="h-4 w-4 rounded"
                            style={{
                              accentColor: activityLogShellColors.danger,
                            }}
                            aria-label={`Pilih activity log ${getDescription(log)}`}
                          />
                          <ActionBadge
                            action={action}
                            isDark={isActivityLogDark}
                          />
                        </div>
                        <span
                          className="text-right text-xs"
                          style={{ color: activityLogShellColors.mutedSoft }}
                        >
                          {getCreatedAt(log)}
                        </span>
                      </div>
                      <p
                        className="mt-3 text-sm font-medium"
                        style={{ color: activityLogShellColors.title }}
                      >
                        {getDescription(log)}
                      </p>
                      <div
                        className="mt-4 grid gap-2 text-sm"
                        style={{ color: activityLogShellColors.text }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <User
                            className="h-4 w-4"
                            style={{
                              color: activityLogShellColors.mutedSoft,
                            }}
                            aria-hidden="true"
                          />
                          {getUserName(log)}
                        </span>
                        {ipAddress ? (
                          <span className="inline-flex items-center gap-2">
                            <Wifi
                              className="h-4 w-4"
                              style={{
                                color: activityLogShellColors.mutedSoft,
                              }}
                              aria-hidden="true"
                            />
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
                  style={{ color: activityLogShellColors.muted }}
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
