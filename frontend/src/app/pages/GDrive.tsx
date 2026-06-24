import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import {
  Archive,
  CheckCircle2,
  Database,
  Download,
  Eye,
  FileText,
  Film,
  Folder,
  HardDrive,
  Image,
  Music,
  Plus,
  Search,
  Share2,
  Star,
  Trash2,
  Users,
} from "lucide-react";

import { GDriveIcon } from "../components/GDriveIcon";
import { LoadingSpinner } from "../components/LoadingSpinner";
import {
  disconnectGDriveAccount,
  downloadGDriveFile,
  getGDriveAccountFiles,
  getGDriveAccounts,
  getGDriveConnectUrl,
  getGDriveFileBlob,
  getTrashedGDriveFiles,
  restoreGDriveFile,
  trashGDriveFile,
  uploadGDriveFile,
  deleteGDriveFilePermanently,
  type GDriveAccount,
  type GDriveFile,
} from "../../services/gdriveService";

type AppearanceTheme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";
type TabKey = "all" | "starred" | "shared" | "recent";
type IconComponent = typeof FileText;

type GDriveFileUI = {
  id: string;
  rowKey: string;
  accountId: string;
  name: string;
  mime: string;
  starred: boolean;
  shared: boolean;
  recentAt: string;
  sizeBytes: number | null;
  owner: string;
  webViewLink: string;
  webContentLink: string;
};

const GOOGLE_DRIVE_ACCOUNT_NOT_FOUND_MESSAGE = "Google Drive account not found.";
const ACCOUNT_UNAVAILABLE_FILES_ERROR_MESSAGE =
  "Selected Google Drive account is not available for this user. Please reconnect or choose another account.";
const GENERIC_FILES_ERROR_MESSAGE = "Failed to load Google Drive files.";

function normalizeAccountId(accountId: unknown): string {
  if (accountId === null || accountId === undefined) return "";
  return String(accountId);
}

function getErrorResponseMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "";

  const responseMessage = (error as { response?: { data?: { message?: unknown } } })
    .response?.data?.message;
  if (typeof responseMessage === "string") return responseMessage;

  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : "";
}

function isAccountUnavailableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const message = getErrorResponseMessage(error).trim();
  const status = (error as { response?: { status?: unknown } }).response?.status;

  return (
    message === GOOGLE_DRIVE_ACCOUNT_NOT_FOUND_MESSAGE ||
    message.includes("No query results for model [App\\Models\\GDriveAccount]") ||
    status === 404
  );
}

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

function parseByteValue(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

function formatBytes(bytes: number | null | undefined, fallback = "-"): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) {
    return fallback;
  }
  if (bytes <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / Math.pow(1024, index);
  const fixed = value >= 10 ? 1 : 2;
  return `${value.toFixed(fixed)} ${units[index]}`;
}

function formatDate(iso: string): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeTime(iso?: string | null): string {
  if (!iso) return "not synced yet";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "not synced yet";

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60 * 1000) return "just now";

  const minutes = Math.floor(diffMs / (60 * 1000));
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  return formatDate(iso);
}

function getAccountName(account: GDriveAccount): string {
  return account.label || account.email || "Google Drive";
}

function getAccountInitials(account: GDriveAccount): string {
  const label = getAccountName(account).trim();
  const words = label.split(/[\s._-]+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return "GD";
}

function getQuotaDisplay(account: GDriveAccount) {
  const quota = account.storage_quota ?? null;
  const usage =
    parseByteValue(quota?.usage_in_drive) ?? parseByteValue(quota?.usage);
  const limit = parseByteValue(quota?.limit);

  if (usage !== null && limit !== null && limit > 0) {
    const percent = Math.min(100, Math.max(0, Math.round((usage / limit) * 100)));
    return {
      label: `${formatBytes(usage, "0 B")} of ${formatBytes(limit, "0 B")} used`,
      value: `${percent}%`,
      percent,
      hasQuota: true,
    };
  }

  if (usage !== null) {
    return {
      label: `${formatBytes(usage, "0 B")} used`,
      value: "",
      percent: 0,
      hasQuota: false,
    };
  }

  return {
    label: "Storage unavailable",
    value: "",
    percent: 0,
    hasQuota: false,
  };
}

function getAvatarColor(index: number, active: boolean, accentColor: string) {
  if (active) return accentColor;
  const palette = ["#3b82f6", "#22c55e", "#a855f7", "#f59e0b", "#14b8a6"];
  return palette[index % palette.length];
}

function getFileVisual(mime: string): {
  Icon: IconComponent;
  color: string;
  bg: string;
  border: string;
} {
  const m = (mime || "").toLowerCase();

  if (m.includes("folder")) {
    return {
      Icon: Folder,
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.12)",
      border: "rgba(245,158,11,0.20)",
    };
  }

  if (m.includes("image")) {
    return {
      Icon: Image,
      color: "#22c55e",
      bg: "rgba(34,197,94,0.12)",
      border: "rgba(34,197,94,0.20)",
    };
  }

  if (m.includes("video")) {
    return {
      Icon: Film,
      color: "#a855f7",
      bg: "rgba(168,85,247,0.12)",
      border: "rgba(168,85,247,0.20)",
    };
  }

  if (m.includes("audio")) {
    return {
      Icon: Music,
      color: "#06b6d4",
      bg: "rgba(6,182,212,0.12)",
      border: "rgba(6,182,212,0.20)",
    };
  }

  if (m.includes("spreadsheet")) {
    return {
      Icon: Database,
      color: "#10b981",
      bg: "rgba(16,185,129,0.12)",
      border: "rgba(16,185,129,0.20)",
    };
  }

  if (m.includes("presentation")) {
    return {
      Icon: Users,
      color: "#f97316",
      bg: "rgba(249,115,22,0.12)",
      border: "rgba(249,115,22,0.20)",
    };
  }

  if (m.includes("pdf")) {
    return {
      Icon: FileText,
      color: "#ef4444",
      bg: "rgba(239,68,68,0.12)",
      border: "rgba(239,68,68,0.20)",
    };
  }

  if (m.includes("zip") || m.includes("compressed") || m.includes("tar")) {
    return {
      Icon: Archive,
      color: "#64748b",
      bg: "rgba(100,116,139,0.12)",
      border: "rgba(100,116,139,0.20)",
    };
  }

  return {
    Icon: FileText,
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.20)",
  };
}

function renderFileIcon(file: GDriveFileUI) {
  const { Icon, color, bg, border } = getFileVisual(file.mime);

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <Icon size={15} strokeWidth={2} style={{ color }} />
    </div>
  );
}

export function GDrive() {
  const [accentColor, setAccentColor] = useState<string>(safeReadAccentColor);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveAppearanceTheme(safeReadAppearanceTheme()),
  );

  const [connectSuccessMessage, setConnectSuccessMessage] = useState<string>("");

  const syncThemeFromStorage = () => {
    const nextTheme = safeReadAppearanceTheme();
    setAccentColor(safeReadAccentColor());
    setResolvedTheme(resolveAppearanceTheme(nextTheme));
  };

  useEffect(() => {
    syncThemeFromStorage();

    if (typeof window === "undefined") return;

    window.addEventListener("nimbus-appearance-change", syncThemeFromStorage);
    window.addEventListener("storage", syncThemeFromStorage);
    window.addEventListener("focus", syncThemeFromStorage);

    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia?.("(prefers-color-scheme: dark)") ?? null;
      mq?.addEventListener?.("change", syncThemeFromStorage);
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener("nimbus-appearance-change", syncThemeFromStorage);
      window.removeEventListener("storage", syncThemeFromStorage);
      window.removeEventListener("focus", syncThemeFromStorage);
      mq?.removeEventListener?.("change", syncThemeFromStorage);
    };
  }, []);

  const colors = useMemo(() => {
    if (resolvedTheme === "light") {
      return {
        shellBg: "#f8fafc",
        sidebarBg: "#ffffff",
        surfaceBg: "#ffffff",
        panelBg: "#f8fafc",
        softBg: "#f1f5f9",
        border: "#edf2f7",
        borderStrong: "#dbeafe",
        title: "#111827",
        text: "#334155",
        muted: "#64748b",
        muted2: "#94a3b8",
        header: "#8793a8",
        rowHover: "#f8fbff",
        shadow: "0 18px 45px rgba(15, 23, 42, 0.04)",
        inputBg: "#ffffff",
      };
    }

    return {
      shellBg: "#111827",
      sidebarBg: "#0f172a",
      surfaceBg: "#111c2f",
      panelBg: "#0b1324",
      softBg: "#1f2937",
      border: "#1f2a44",
      borderStrong: "rgba(96,165,250,0.45)",
      title: "#e5e7eb",
      text: "#cbd5e1",
      muted: "#94a3b8",
      muted2: "#64748b",
      header: "#718096",
      rowHover: "#162238",
      shadow: "0 22px 60px rgba(0, 0, 0, 0.28)",
      inputBg: "#0b1324",
    };
  }, [resolvedTheme]);

  const [gdriveAccounts, setGdriveAccounts] = useState<GDriveAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [accountsError, setAccountsError] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<string>("");

  const [gdriveFiles, setGdriveFiles] = useState<GDriveFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState(false);
  const [filesErrorMessage, setFilesErrorMessage] = useState<string>("");
  const [disconnectingAccountId, setDisconnectingAccountId] = useState<string>("");
  const [connectingAccount, setConnectingAccount] = useState(false);
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState<string>("");
  const [refreshTick, setRefreshTick] = useState<number>(0);

  const [driveListMode, setDriveListMode] = useState<"files" | "trash">("files");

  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [copiedFileId, setCopiedFileId] = useState<string>("");
  const [downloadingFileId, setDownloadingFileId] = useState<string>("");
  const [detailsFile, setDetailsFile] = useState<GDriveFileUI | null>(null);
  const [openActionFileId, setOpenActionFileId] = useState<string | null>(null);

  const [previewFile, setPreviewFile] = useState<GDriveFileUI | null>(null);
  const TEXT_PREVIEW_MAX_BYTES = 1024 * 1024;

  const previewRequestIdRef = useRef(0);

  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewContentType, setPreviewContentType] = useState<string>("");
  const [previewTextContent, setPreviewTextContent] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string>("");

  const [trashingFileId, setTrashingFileId] = useState<string | null>(null);
  const [trashError, setTrashError] = useState<string | null>(null);

  const [restoringFileId, setRestoringFileId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const [permanentDeleteError, setPermanentDeleteError] = useState<string | null>(null);
  const [deletingPermanentFileId, setDeletingPermanentFileId] = useState<string | null>(null);

  const ACTION_MENU_WIDTH = 176;

  const hasValidGDriveFileId = (file: GDriveFileUI): boolean => {
    return Boolean(file.id && file.id.trim());
  };

  const getGDriveFileExtension = (fileName: string): string => {
    const safe = (fileName || "").trim();
    if (!safe) return "";

    const idx = safe.lastIndexOf(".");
    if (idx < 0) return "";
    return safe.slice(idx + 1).toLowerCase();
  };

  const getGDriveFileTypeInfo = (file: GDriveFileUI): {
    label: string;
    detail: string;
  } => {
    const mime = (file.mime || "").toLowerCase();
    const name = file.name || "";

    const extension = getGDriveFileExtension(name);

    if (mime === "application/vnd.google-apps.document") {
      return { label: "Google Docs", detail: "Workspace file (Docs)" };
    }
    if (mime === "application/vnd.google-apps.spreadsheet") {
      return { label: "Google Sheets", detail: "Workspace file (Sheets)" };
    }
    if (mime === "application/vnd.google-apps.presentation") {
      return { label: "Google Slides", detail: "Workspace file (Slides)" };
    }
    if (mime === "application/vnd.google-apps.drawing") {
      return { label: "Google Drawing", detail: "Google Drive folder" };
    }

    if (mime.includes("application/vnd.google-apps.folder") || mime === "application/vnd.google-apps.folder") {
      return { label: "Folder", detail: "Google Drive folder" };
    }

    if (mime.includes("folder")) {
      return { label: "Folder", detail: "Google Drive folder" };
    }

    const archiveExt = ["zip", "rar", "7z", "tar", "gz", "gzip", "tgz"];
    if (
      mime.includes("zip") ||
      mime.includes("rar") ||
      mime.includes("7z") ||
      mime.includes("tar") ||
      mime.includes("gzip") ||
      archiveExt.includes(extension)
    ) {
      return { label: "Archive", detail: `.${extension || "archive"}` };
    }

    if (mime === "application/pdf" || mime.includes("pdf")) {
      return { label: "PDF", detail: `application/pdf` };
    }

    if (mime.startsWith("image/")) {
      return {
        label: "Image",
        detail:
          mime ? mime.split("/")[1]?.toUpperCase?.() || mime : "Image file",
      };
    }

    if (mime.startsWith("video/")) {
      return {
        label: "Video",
        detail:
          mime ? mime.split("/")[1]?.toUpperCase?.() || mime : "Video file",
      };
    }

    if (mime.startsWith("audio/")) {
      return {
        label: "Audio",
        detail:
          mime ? mime.split("/")[1]?.toUpperCase?.() || mime : "Audio file",
      };
    }

    const isTextMime =
      mime.startsWith("text/") ||
      [
        "csv",
        "md",
        "markdown",
        "json",
        "xml",
        "js",
        "ts",
        "css",
        "html",
        "log",
        "txt",
      ].includes(extension);

    if (isTextMime || mime.includes("text")) {
      const short = extension ? extension.toUpperCase() : "TEXT";
      return { label: "Text", detail: short };
    }

    if (extension) {
      if (["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(extension)) {
        return { label: "Image", detail: extension.toUpperCase() };
      }
      if (["mp4", "mov", "mkv", "webm", "avi", "mpeg"].includes(extension)) {
        return { label: "Video", detail: extension.toUpperCase() };
      }
      if (["mp3", "wav", "ogg", "flac", "aac"].includes(extension)) {
        return { label: "Audio", detail: extension.toUpperCase() };
      }
      if (["pdf"].includes(extension)) {
        return { label: "PDF", detail: extension.toUpperCase() };
      }
      if (archiveExt.includes(extension)) {
        return { label: "Archive", detail: extension.toUpperCase() };
      }
      if (["txt", "md", "csv", "json", "xml", "js", "ts", "css", "html"].includes(extension)) {
        return { label: "Text", detail: extension.toUpperCase() };
      }
    }

    return { label: "File", detail: mime ? mime.slice(0, 48) : "" };
  };

  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const actionButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [actionMenuPosition, setActionMenuPosition] = useState<
    { top: number; left: number } | null
  >(null);

  useEffect(() => {
    if (!openActionFileId) return;

    const handleScrollClose = () => {
      if (openActionFileId !== null) {
        closeActionMenu();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (openActionFileId === null) return;

      const target = event.target;
      if (!(target instanceof Node)) {
        closeActionMenu();
        return;
      }

      const menuEl = actionMenuRef.current;
      if (menuEl?.contains(target)) return;

      const buttonEl =
        openActionFileId !== null ? actionButtonRefs.current[openActionFileId] ?? null : null;

      if (buttonEl?.contains(target)) return;

      closeActionMenu();
    };

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        closeActionMenu();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", handleScrollClose, true);
    document.addEventListener("wheel", handleScrollClose, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", handleScrollClose, true);
      document.removeEventListener("wheel", handleScrollClose, true);
    };
  }, [openActionFileId]);

  const connectedAccountIdsKey = useMemo(
    () =>
      gdriveAccounts
        .filter((account) => account.is_connected)
        .map((account) => normalizeAccountId(account.id))
        .filter(Boolean)
        .join("|"),
    [gdriveAccounts],
  );

  const [didInitialAutoSwitch, setDidInitialAutoSwitch] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gdrive") === "connected") {
      setConnectSuccessMessage("Google Drive connected successfully.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setAccountsLoading(true);
      setAccountsLoaded(false);
      setAccountsError(false);
      try {
        const res = await getGDriveAccounts();
        if (cancelled) return;

        const list = res?.data ?? [];
        setGdriveAccounts(list);
        setActiveAccountId((prev) => {
          if (prev) return prev;
          return normalizeAccountId(list.find((account) => account.is_connected)?.id);
        });
      } catch {
        if (cancelled) return;
        setGdriveAccounts([]);
        setActiveAccountId("");
        setAccountsError(true);
      } finally {
        if (!cancelled) {
          setAccountsLoaded(true);
          setAccountsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleConnectAccount = async () => {
    if (connectingAccount) return;

    setConnectingAccount(true);
    try {
      const url = await getGDriveConnectUrl();
      window.location.href = url;
    } catch {
      setAccountsError(true);
      window.alert("Failed to start Google Drive connect.");
    } finally {
      setConnectingAccount(false);
    }
  };

  const handleDisconnectAccount = async (accountId: string) => {
    if (!accountId || disconnectingAccountId) return;

    const confirmed = window.confirm("Disconnect this Google Drive account?");
    if (!confirmed) return;

    setDisconnectingAccountId(accountId);

    try {
      await disconnectGDriveAccount(accountId);

      const res = await getGDriveAccounts();
      const list = res?.data ?? [];
      setGdriveAccounts(list);
      setActiveAccountId((prev) => {
        if (prev && prev !== accountId) return prev;
        return normalizeAccountId(list.find((account) => account.is_connected)?.id);
      });

      if (activeAccountId === accountId) {
        setGdriveFiles([]);
      }

      setFilesError(false);
      setFilesErrorMessage("");
    } catch {
      setAccountsError(true);
      window.alert("Failed to disconnect Google Drive account.");
    } finally {
      setDisconnectingAccountId("");
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadFiles = async () => {
      const accountId = activeAccountId;
      const connectedAccountIds = connectedAccountIdsKey
        ? connectedAccountIdsKey.split("|").filter(Boolean)
        : [];
      const firstConnectedAccountId = connectedAccountIds[0] ?? "";
      const activeAccountIsValid = !!accountId && connectedAccountIds.includes(accountId);

      if (!accountsLoaded) {
        setFilesError(false);
        setFilesErrorMessage("");
        setGdriveFiles([]);
        setFilesLoading(false);
        return;
      }

      setFilesError(false);
      setFilesErrorMessage("");

      if (!accountId) {
        setGdriveFiles([]);
        setFilesLoading(false);

        if (!didInitialAutoSwitch && firstConnectedAccountId) {
          setDidInitialAutoSwitch(true);
          setActiveAccountId(firstConnectedAccountId);
        }

        return;
      }

      if (!activeAccountIsValid) {
        setGdriveFiles([]);
        setFilesLoading(false);
        setFilesError(true);
        setFilesErrorMessage(ACCOUNT_UNAVAILABLE_FILES_ERROR_MESSAGE);
        return;
      }

      setFilesLoading(true);

      try {
        const res =
          driveListMode === "files"
            ? await getGDriveAccountFiles(accountId, { page_size: 50 })
            : await getTrashedGDriveFiles(accountId, { page_size: 50 });

        if (cancelled) return;

        const list = res?.data ?? [];
        setGdriveFiles(list);
        setFilesErrorMessage("");

        const syncedAccountIds = new Set(
          list
            .map((file) => file.account_id)
            .filter((id): id is string => typeof id === "string" && id.length > 0),
        );

        setGdriveAccounts((prev) =>
          prev.map((account) => {
            const currentAccountId = normalizeAccountId(account.id);
            const wasSynced =
              syncedAccountIds.has(currentAccountId) ||
              (syncedAccountIds.size === 0 && currentAccountId === accountId);

            return wasSynced
              ? { ...account, last_synced_at: new Date().toISOString() }
              : account;
          }),
        );
      } catch (error) {
        if (cancelled) return;

        setGdriveFiles([]);
        setFilesError(true);

        const message = getErrorResponseMessage(error).trim();
        if (message === GOOGLE_DRIVE_ACCOUNT_NOT_FOUND_MESSAGE) {
          setFilesErrorMessage(GOOGLE_DRIVE_ACCOUNT_NOT_FOUND_MESSAGE);
        } else if (isAccountUnavailableError(error)) {
          setFilesErrorMessage(ACCOUNT_UNAVAILABLE_FILES_ERROR_MESSAGE);
        } else {
          setFilesErrorMessage(GENERIC_FILES_ERROR_MESSAGE);
        }
      } finally {
        if (!cancelled) setFilesLoading(false);
      }
    };

    void loadFiles();

    return () => {
      cancelled = true;
    };
  }, [accountsLoaded, activeAccountId, connectedAccountIdsKey, refreshTick, driveListMode]);

  const gdriveAllFiles = useMemo((): GDriveFileUI[] => {
    return (gdriveFiles ?? []).map((file): GDriveFileUI => {
      const driveFileId = String(file.id ?? "").trim();
      const rowKey =
        driveFileId ||
        `${String(file.account_id ?? "account")}-${String(file.name ?? "untitled")}-${String(
          file.modified_time ?? "",
        )}`;

      return {
        id: driveFileId,
        rowKey,
        accountId: file.account_id,
        name: file.name || "Untitled",
        mime: file.mime_type || "",
        recentAt: file.modified_time || "",
        sizeBytes: parseByteValue(file.size),
        owner: (file.owner_email || file.owner_name || file.account_email || "") as string,
        shared: !!file.shared,
        starred: !!file.starred,
        webViewLink: file.web_view_link || "",
        webContentLink: file.web_content_link || "",
      };
    });
  }, [gdriveFiles]);

  const filteredFiles = useMemo(() => {
    const query = search.trim().toLowerCase();
    let base = [...gdriveAllFiles];

    if (tab === "starred") base = base.filter((file) => file.starred);
    if (tab === "shared") base = base.filter((file) => file.shared);
    if (tab === "recent") {
      base = [...base]
        .sort((a, b) => (b.recentAt || "").localeCompare(a.recentAt || ""))
        .slice(0, 10);
    }

    if (query) {
      base = base.filter((file) => file.name.toLowerCase().includes(query));
    }

    return base;
  }, [gdriveAllFiles, tab, search]);

  const isGDriveFolder = (file: GDriveFileUI): boolean => {
    return file.mime === "application/vnd.google-apps.folder";
  };

  const folderItems = useMemo(
    () => filteredFiles.filter(isGDriveFolder),
    [filteredFiles],
  );

  const regularFileItems = useMemo(
    () => filteredFiles.filter((file) => !isGDriveFolder(file)),
    [filteredFiles],
  );

  const activeAccount =

    gdriveAccounts.find((account) => normalizeAccountId(account.id) === activeAccountId) ?? null;
  const anyFiles = filteredFiles.length > 0;

  const tabs: Array<{ key: TabKey; label: string; Icon?: IconComponent }> = [
    { key: "all", label: "All Files" },
    { key: "starred", label: "Starred", Icon: Star },
    { key: "shared", label: "Shared", Icon: Share2 },
    { key: "recent", label: "Recent", Icon: HardDrive },
  ];

  const tableGridTemplate = "minmax(0, 1fr) 140px 170px 112px 132px 44px";

  const selectAccount = (account: GDriveAccount) => {
    if (!account.is_connected) return;

    const nextActiveAccountId = normalizeAccountId(account.id);
    setActiveAccountId(nextActiveAccountId);
    setFilesError(false);
    setFilesErrorMessage("");
    setGdriveFiles([]);
  };

  const handleAccountKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    account: GDriveAccount,
  ) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    selectAccount(account);
  };

  const openFile = (file: GDriveFileUI) => {
    const url = file.webViewLink || file.webContentLink;
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const downloadFile = async (file: GDriveFileUI) => {
    if (downloadingFileId) return;
    if (!file.accountId || !file.id) return;
    if (!file.id.trim()) return;

    setDownloadingFileId(file.rowKey);
    try {
      await downloadGDriveFile(file.accountId, file.id, file.name);
    } catch {
      window.alert("Failed to download Google Drive file.");
    } finally {
      setDownloadingFileId("");
    }
  };

  const setDetailsFileAndReset = (file: GDriveFileUI | null) => {
    setDetailsFile(file);
  };

  const formatOptionalString = (v: string | null | undefined) => {
    if (!v) return "-";
    return v;
  };

  const formatOptionalBytes = (v: number | null | undefined) => {
    if (v === null || v === undefined) return "-";
    return formatBytes(v);
  };

  const formatOptionalDate = (iso: string | null | undefined) => {
    if (!iso) return "-";
    return formatDate(iso);
  };

  const copyFileLink = async (file: GDriveFileUI) => {
    const url = file.webViewLink || file.webContentLink;
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedFileId(file.id);
      window.setTimeout(() => setCopiedFileId(""), 1400);
    } catch {
      window.prompt("Copy Google Drive link", url);
    }
  };

  const renderAccountCard = (account: GDriveAccount, index: number) => {
    const accountId = normalizeAccountId(account.id);
    const isActive = accountId === activeAccountId;
    const avatarColor = getAvatarColor(index, isActive, accentColor);
    const statusColor = account.is_connected ? "#22c55e" : "#ef4444";
    const quota = getQuotaDisplay(account);
    const cardBg =
      resolvedTheme === "light"
        ? isActive
          ? "#f8fbff"
          : "#ffffff"
        : isActive
          ? "rgba(37,99,235,0.10)"
          : colors.panelBg;

    return (
      <div
        key={account.id}
        role="button"
        tabIndex={account.is_connected ? 0 : -1}
        onClick={() => selectAccount(account)}
        onKeyDown={(event) => handleAccountKeyDown(event, account)}
        className="rounded-2xl border p-4 transition-colors"
        style={{
          background: cardBg,
          borderColor: isActive ? accentColor : colors.border,
          cursor: account.is_connected ? "pointer" : "default",
          boxShadow: isActive ? "0 10px 24px rgba(37, 99, 235, 0.08)" : "none",
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-sm font-semibold text-white"
            style={{ background: avatarColor }}
          >
            <span>{getAccountInitials(account)}</span>
            {account.avatar_url ? (
              <img
                src={account.avatar_url}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <div
                className="truncate text-sm font-semibold"
                style={{ color: colors.title }}
                title={getAccountName(account)}
              >
                {getAccountName(account)}
              </div>
              <CheckCircle2 size={13} style={{ color: statusColor }} />
              <span className="text-[10px]" style={{ color: colors.muted }}>
                {account.is_connected ? "Connected" : "Revoked"}
              </span>
            </div>

            <div
              className="mt-1 truncate text-[11px]"
              style={{ color: colors.text }}
              title={account.email}
            >
              {account.email}
            </div>

            <div className="mt-1 text-[10px]" style={{ color: colors.muted2 }}>
              Last sync: {formatRelativeTime(account.last_synced_at ?? account.connected_at)}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="truncate text-[10px]" style={{ color: colors.muted }}>
              {quota.label}
            </span>
            <span className="shrink-0 text-[10px] font-semibold" style={{ color: colors.title }}>
              {quota.value}
            </span>
          </div>

          <div
            className="h-1.5 overflow-hidden rounded-full"
            style={{ background: resolvedTheme === "light" ? "#e5eaf1" : "#263244" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${quota.percent}%`,
                background: quota.hasQuota ? avatarColor : colors.muted2,
                opacity: quota.hasQuota ? 1 : 0.35,
              }}
            />
          </div>
        </div>

        {isActive && account.is_connected ? (
          <div
            className="mt-4 flex items-center justify-between border-t pt-3"
            style={{ borderColor: colors.border }}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: accentColor }}>
              <Folder size={12} />
              Browsing files
            </div>

            <button
              type="button"
              disabled={disconnectingAccountId === account.id}
              onClick={(event) => {
                event.stopPropagation();
                void handleDisconnectAccount(account.id);
              }}
              className="rounded-md px-1.5 py-1 text-[10px] font-semibold"
              style={{
                color: "#ef4444",
                background: "transparent",
                opacity: disconnectingAccountId === account.id ? 0.55 : 1,
              }}
            >
              {disconnectingAccountId === account.id ? "Disconnecting" : "Disconnect"}
            </button>
          </div>
        ) : null}
      </div>
    );
  };

  const closeActionMenu = () => {
    setOpenActionFileId(null);
    setActionMenuPosition(null);
  };

  const handleFileContextMenu = (
    event: React.MouseEvent<HTMLElement>,
    file: GDriveFileUI,
  ) => {
    // Preserve clicks on internal controls (⋯ button, menu items, links, etc.)
    const target = event.target as HTMLElement | null;
    if (target) {
      const tag = target.tagName?.toLowerCase?.() ?? "";
      if (
        tag === "button" ||
        tag === "a" ||
        target.getAttribute?.("role") === "menuitem" ||
        target.closest?.("[data-gdrive-action-menu='true']")
      ) {
        return;
      }
    }

    event.preventDefault();

    closeActionMenu();
    setOpenActionFileId(file.rowKey);

    const menuWidth = ACTION_MENU_WIDTH;
    const approxMenuHeight = 220;
    const minPos = 8;

    const left = Math.max(
      minPos,
      Math.min(window.innerWidth - menuWidth - 8, event.clientX),
    );

    const top = Math.max(
      minPos,
      Math.min(window.innerHeight - approxMenuHeight - 8, event.clientY),
    );

    setActionMenuPosition({ top, left });
  };


  const getSelectedUploadAccountId = (): string => {
    return activeAccountId || "";
  };

  const handleUploadButtonClick = () => {
    setUploadError("");
    setUploadSuccess("");

    if (driveListMode === "trash") {
      setUploadError("Switch to Files before uploading.");
      return;
    }

    const accountId = getSelectedUploadAccountId();
    if (!accountId) {
      setUploadError("Select a Google Drive account before uploading.");
      return;
    }

    uploadInputRef.current?.click();
  };

  const handleUploadFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (driveListMode === "trash") {
      setUploadError("Switch to Files before uploading.");
      setUploadSuccess("");
      if (uploadInputRef.current) uploadInputRef.current.value = "";
      return;
    }

    const accountId = getSelectedUploadAccountId();
    if (!accountId) {
      setUploadError("Select a Google Drive account before uploading.");
      setUploadSuccess("");
      if (uploadInputRef.current) uploadInputRef.current.value = "";
      return;
    }

    setUploadingFile(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      await uploadGDriveFile(accountId, file);
      setUploadSuccess("File uploaded to Google Drive.");
      setRefreshTick((v) => v + 1);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to upload file to Google Drive.";

      setUploadError(
        typeof message === "string" && message.trim().length > 0
          ? message
          : "Failed to upload file to Google Drive.",
      );
    } finally {
      setUploadingFile(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  const getGDriveFileExtensionFromFile = (file: GDriveFileUI): string => {
    const safe = (file?.name || "").trim();
    if (!safe) return "";
    const idx = safe.lastIndexOf(".");
    if (idx < 0) return "";
    return safe.slice(idx + 1).toLowerCase();
  };

  const isGDriveBinaryExtensionPreviewable = (ext: string): boolean => {
    return (
      ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext) ||
      ["mp4", "webm", "mov", "m4v"].includes(ext) ||
      ["mp3", "wav", "ogg", "m4a"].includes(ext) ||
      ext === "pdf"
    );
  };

  const resolvePreviewContentKind = (
    file: GDriveFileUI,
    contentType: string,
  ):
    | "image"
    | "pdf"
    | "video"
    | "audio"
    | "text"
    | "unknown" => {
    const resolvedType = (contentType || "").trim().toLowerCase();

    const workspaceMime = (file.mime || "").toLowerCase();
    if (workspaceMime.startsWith("application/vnd.google-apps.")) return "unknown";

    if (previewTextContent !== null) return "text";
    if (isGDriveTextPreviewable(file)) return "text";

    if (resolvedType.startsWith("image/")) return "image";
    if (resolvedType === "application/pdf") return "pdf";
    if (resolvedType.startsWith("video/")) return "video";
    if (resolvedType.startsWith("audio/")) return "audio";

    const ext = getGDriveFileExtensionFromFile(file);
    if (!resolvedType || resolvedType === "application/octet-stream") {
      if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
      if (ext === "pdf") return "pdf";
      if (["mp4", "webm", "mov", "m4v"].includes(ext)) return "video";
      if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return "audio";
    }

    return "unknown";
  };

  const getBinaryFallbackContentTypeFromFile = (file: GDriveFileUI): string => {
    const ext = getGDriveFileExtensionFromFile(file);
    switch (ext) {
      case "jpg":
      case "jpeg":
        return "image/jpeg";
      case "png":
        return "image/png";
      case "gif":
        return "image/gif";
      case "webp":
        return "image/webp";
      case "bmp":
        return "image/bmp";
      case "svg":
        return "image/svg+xml";
      case "pdf":
        return "application/pdf";
      case "mp4":
        return "video/mp4";
      case "webm":
        return "video/webm";
      case "mov":
        return "video/quicktime";
      case "m4v":
        return "video/mp4";
      case "mp3":
        return "audio/mpeg";
      case "wav":
        return "audio/wav";
      case "ogg":
        return "audio/ogg";
      case "m4a":
        return "audio/mp4";
      default:
        return "";
    }
  };

  const isGDriveTextPreviewable = (file: GDriveFileUI): boolean => {
    const mime = (file.mime || "").toLowerCase();
    const name = (file.name || "").toLowerCase();

    if (mime.startsWith("application/vnd.google-apps.")) return false;
    if (mime.startsWith("text/")) return true;
    if (mime === "application/json") return true;

    const idx = name.lastIndexOf(".");
    const ext = idx < 0 ? "" : name.slice(idx + 1).toLowerCase();

    return ["md", "markdown", "txt", "json", "csv", "log"].includes(ext);
  };

  const isGDrivePreviewable = (file: GDriveFileUI): boolean => {
    const mime = (file.mime || "").toLowerCase();

    if (mime.startsWith("application/vnd.google-apps.")) return false;

    if (mime.startsWith("image/")) return true;
    if (mime.startsWith("video/")) return true;
    if (mime.startsWith("audio/")) return true;
    if (mime === "application/pdf") return true;
    if (mime.includes("pdf")) return true;

    if (isGDriveTextPreviewable(file)) return true;

    const ext = getGDriveFileExtensionFromFile(file);
    return isGDriveBinaryExtensionPreviewable(ext);
  };

  const closePreviewModal = () => {
    previewRequestIdRef.current += 1;

    if (previewUrl) {
      try {
        window.URL.revokeObjectURL(previewUrl);
      } catch {
        // ignore
      }
    }

    setPreviewFile(null);
    setPreviewUrl("");
    setPreviewContentType("");
    setPreviewTextContent(null);
    setPreviewLoading(false);
    setPreviewError("");
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        try {
          window.URL.revokeObjectURL(previewUrl);
        } catch {
          // ignore
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  const handlePreviewFile = async (file: GDriveFileUI) => {
    if (!activeAccountId) return;

    if (!file?.id?.trim()) {
      setPreviewFile(file);
      setPreviewUrl("");
      setPreviewTextContent(null);
      setPreviewContentType("");
      setPreviewError("Preview unavailable because this file has no Google Drive file id.");
      setPreviewLoading(false);
      closeActionMenu();
      return;
    }

    const requestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = requestId;

    if (previewUrl) {
      try {
        window.URL.revokeObjectURL(previewUrl);
      } catch {
        // ignore
      }
    }

    setPreviewUrl("");
    setPreviewTextContent(null);
    setPreviewContentType("");
    setPreviewError("");
    setPreviewLoading(true);
    setPreviewFile(file);

    const accountId = file.accountId;
    if (!accountId) {
      setPreviewLoading(false);
      setPreviewError("Preview unavailable because this file has no Google Drive account id.");
      return;
    }

    if (!isGDrivePreviewable(file)) {
      setPreviewLoading(false);
      setPreviewError("");
      return;
    }

    closeActionMenu();

    try {
      if (isGDriveTextPreviewable(file)) {
        const knownSize = file.sizeBytes;
        if (
          typeof knownSize === "number" &&
          Number.isFinite(knownSize) &&
          knownSize > TEXT_PREVIEW_MAX_BYTES
        ) {
          if (previewRequestIdRef.current !== requestId) return;
          setPreviewTextContent(null);
          setPreviewUrl("");
          setPreviewContentType("");
          setPreviewError("Text preview is limited to 1 MB. Use Download or Open instead.");
          setPreviewLoading(false);
          return;
        }

        const { blob } = await getGDriveFileBlob(accountId, file.id);
        if (previewRequestIdRef.current !== requestId) return;

        if (blob.size > TEXT_PREVIEW_MAX_BYTES) {
          setPreviewTextContent(null);
          setPreviewUrl("");
          setPreviewContentType("");
          setPreviewError("Text preview is limited to 1 MB. Use Download or Open instead.");
          setPreviewLoading(false);
          return;
        }

        const text = await blob.text();
        if (previewRequestIdRef.current !== requestId) return;

        setPreviewTextContent(text);
        setPreviewUrl("");
        const resolvedContentType = blob.type || file.mime || "text/plain";
        setPreviewContentType(resolvedContentType || "text/plain");
        setPreviewError("");
        setPreviewLoading(false);
        return;
      }

      const { blob, contentType } = await getGDriveFileBlob(accountId, file.id);
      if (previewRequestIdRef.current !== requestId) return;

      setPreviewTextContent(null);

      const resolvedContentTypeRaw = contentType || blob.type || file.mime || "";
      const resolvedContentType =
        resolvedContentTypeRaw && resolvedContentTypeRaw !== "application/octet-stream"
          ? resolvedContentTypeRaw
          : getBinaryFallbackContentTypeFromFile(file);

      const objectUrl = window.URL.createObjectURL(blob);

      setPreviewUrl(objectUrl);
      setPreviewContentType(
        resolvedContentType || blob.type || contentType || file.mime || "",
      );
      setPreviewError("");
      setPreviewLoading(false);
    } catch {
      if (previewRequestIdRef.current !== requestId) return;

      setPreviewTextContent(null);
      setPreviewUrl("");
      setPreviewContentType("");
      setPreviewError("Failed to load preview.");
      setPreviewLoading(false);
    } finally {
      if (previewRequestIdRef.current === requestId) {
        setPreviewLoading(false);
      }
    }
  };

  const handleTrashFile = async (file: GDriveFileUI) => {
    if (!activeAccountId) return;
    if (!file?.id?.trim()) {
      setTrashError("Action unavailable because this file has no Google Drive file id.");
      return;
    }

    setTrashingFileId(file.rowKey);
    setTrashError(null);

    try {
      await trashGDriveFile(activeAccountId, file.id);
      closeActionMenu();
      setRefreshTick((value) => value + 1);
    } catch {
      setTrashError("Failed to move file to trash.");
    } finally {
      setTrashingFileId(null);
    }
  };

  const handleRestoreFile = async (file: GDriveFileUI) => {
    if (!activeAccountId) return;
    if (!file?.id?.trim()) {
      setRestoreError("Action unavailable because this file has no Google Drive file id.");
      return;
    }

    setRestoringFileId(file.rowKey);
    setRestoreError(null);

    try {
      await restoreGDriveFile(activeAccountId, file.id);
      closeActionMenu();
      setRefreshTick((value) => value + 1);
    } catch {
      setRestoreError("Failed to restore file.");
    } finally {
      setRestoringFileId(null);
    }
  };

  const handleDeletePermanentlyFile = async (file: GDriveFileUI) => {
    if (driveListMode !== "trash") return;

    if (!file.id?.trim()) {
      setPermanentDeleteError("Action unavailable because this file has no Google Drive file id.");
      return;
    }

    if (!file.accountId) {
      setPermanentDeleteError("Permanent delete unavailable because this file has no Google Drive account id.");
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete "${file.name}" from Google Drive? This cannot be undone.`,
    );

    if (!confirmed) return;

    setPermanentDeleteError(null);
    setDeletingPermanentFileId(file.rowKey);

    try {
      await deleteGDriveFilePermanently(file.accountId, file.id);
      setRefreshTick((value) => value + 1);
      closeActionMenu();
    } catch (error: any) {
      const message = error?.response?.data?.message;
      setPermanentDeleteError(
        typeof message === "string" && message.trim().length > 0
          ? message
          : "Failed to permanently delete Google Drive file.",
      );
    } finally {
      setDeletingPermanentFileId(null);
    }
  };

const renderFileActions = (file: GDriveFileUI) => {

    const hasOpenUrl = !!(file.webViewLink || file.webContentLink);
    const isGDriveFileIdValid = hasValidGDriveFileId(file);

    const isOpen = openActionFileId === file.rowKey;



const actionBase: CSSProperties = {
      width: 32,
      height: 32,
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: `1px solid transparent`,
      background: "transparent",
      color: colors.muted,
    };



    const downloadTitle =
      file.mime === "application/vnd.google-apps.document"
        ? "Export as PDF"
        : file.mime === "application/vnd.google-apps.spreadsheet"
          ? "Export as XLSX"
          : file.mime === "application/vnd.google-apps.presentation"
            ? "Export as PDF"
            : file.mime === "application/vnd.google-apps.drawing"
              ? "Export as PNG"
              : "Download";

    return (
      <div className="relative flex items-center justify-end" data-gdrive-action-menu="true">
        <button
          type="button"
          title="More actions"
                  ref={(el) => {
            actionButtonRefs.current[file.rowKey] = el;
          }}

          onClick={(e) => {
            e.stopPropagation();

            const nextOpen =
              openActionFileId === file.rowKey ? null : file.rowKey;


            if (!nextOpen) {
              closeActionMenu();
              return;
            }

            closeActionMenu();

            setOpenActionFileId(file.rowKey);



            const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();

            const menuWidth = ACTION_MENU_WIDTH;
            const left = Math.min(
              window.innerWidth - menuWidth - 12,
              Math.max(12, rect.right - menuWidth),
            );
            const top = Math.min(window.innerHeight - 220, rect.bottom + 6);

            setActionMenuPosition({ top, left });

          }}

          style={{
            ...actionBase,
            cursor: "pointer",
            color: colors.muted,
            borderColor: isOpen ? `${accentColor}33` : "transparent",
            background: isOpen ? `${accentColor}12` : "transparent",
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1, transform: "translateY(-1px)" }}>⋯</span>
        </button>

                {isOpen ? (
          <div
            ref={actionMenuRef}
            role="menu"

            aria-label="File actions"
            data-gdrive-action-menu="true"
            style={{

              position: "fixed",
              top: actionMenuPosition?.top,
              left: actionMenuPosition?.left,
              width: ACTION_MENU_WIDTH,
              zIndex: 99999,

              background: colors.panelBg,
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              padding: 6,
              boxShadow: colors.shadow,
            }}
          >

            {driveListMode !== "trash" && isGDriveFileIdValid && isGDrivePreviewable(file) ? (
              <button

                type="button"
                role="menuitem"
                aria-label="Preview"
                title="Preview"
                className="w-full rounded-lg px-2 py-1 text-left text-xs font-semibold"
                disabled={previewLoading}
                style={{
                  opacity: previewLoading ? 0.65 : 1,
                  cursor: previewLoading ? "not-allowed" : "pointer",
                  color: colors.text,
                  background: "transparent",
                }}
                onClick={() => {
                  closeActionMenu();
                  void handlePreviewFile(file);
                }}
              >

                <div className="flex items-center gap-2">
                  <Eye size={14} />
                  <span>Preview</span>
                </div>
              </button>
            ) : null}


            {driveListMode !== "trash" ? (
              <button
                type="button"
                role="menuitem"
                aria-label="Open"
                title="Open"
                className="w-full rounded-lg px-2 py-1 text-left text-xs font-semibold"
                disabled={!hasOpenUrl}
                style={{
                  opacity: hasOpenUrl ? 1 : 0.45,
                  cursor: hasOpenUrl ? "pointer" : "not-allowed",
                  color: colors.text,
                  background: "transparent",
                }}
                onClick={() => {
                  closeActionMenu();
                  openFile(file);
                }}
              >
                <div className="flex items-center gap-2">
                  <Eye size={14} />
                  <span>Open</span>
                </div>
              </button>
            ) : null}





            {driveListMode !== "trash" ? (
              <button
                type="button"
                role="menuitem"
                aria-label="Details"
                title="Details"
                className="w-full rounded-lg px-2 py-1 text-left text-xs font-semibold"
                disabled={!file.id}
                style={{
                  marginTop: 4,
                  opacity: file.id ? 1 : 0.45,
                  cursor: file.id ? "pointer" : "not-allowed",
                  color: colors.text,
                  background: "transparent",
                }}
                onClick={() => {
                  closeActionMenu();
                  setDetailsFileAndReset(file);
                }}
              >
                <div className="flex items-center gap-2">
                  <FileText size={14} />
                  <span>Details</span>
                </div>
              </button>
            ) : null}





            {driveListMode !== "trash" ? (
              <>
                {isGDriveFolder(file) ? null : (
              <button
                    type="button"
                    role="menuitem"
                    aria-label="Download"
                    title={downloadTitle}
                    className="w-full rounded-lg px-2 py-1 text-left text-xs font-semibold"
                    disabled={
                      downloadingFileId === file.rowKey || !file.accountId || !file.id
                    }

                    style={{
                    marginTop: 4,
                      opacity:
                      downloadingFileId === file.rowKey || !file.accountId || !file.id
                        ? 0.45
                        : 1,

                    cursor:
                          downloadingFileId === file.rowKey || !file.accountId || !file.id
                        ? "not-allowed"
                        : "pointer",

                    color: colors.text,
                    background: "transparent",
                  }}
                  onClick={() => {
                    closeActionMenu();
                    void downloadFile(file);
                  }}

                >
                  <div className="flex items-center gap-2">
                    <Download size={14} />
                    <span>Download</span>
                  </div>
                </button>
)}

                <button
                  type="button"
                  role="menuitem"
                  aria-label="Copy link"
                  title="Copy link"
                  className="w-full rounded-lg px-2 py-1 text-left text-xs font-semibold"
                  disabled={!hasOpenUrl}
                  style={{
                    marginTop: 4,
                    opacity: hasOpenUrl ? 1 : 0.45,
                    cursor: hasOpenUrl ? "pointer" : "not-allowed",
                    color: colors.text,
                    background: "transparent",
                  }}
                  onClick={() => {
                    closeActionMenu();
                    void copyFileLink(file);
                  }}

                >
                  <div className="flex items-center gap-2">
                    <Share2 size={14} />
                    <span>Copy link</span>
                  </div>
                </button>
              </>
            ) : null}

                {driveListMode === "trash" && isGDriveFileIdValid ? (
              <>
                <button

                  type="button"
                  role="menuitem"
                  aria-label="Restore"
                  title="Restore"
                  className="w-full rounded-lg px-2 py-1 text-left text-xs font-semibold"
                      disabled={!activeAccountId || restoringFileId === file.rowKey}

                  style={{
                    marginTop: 4,
                    opacity: !activeAccountId
                      ? 0.45
                      : restoringFileId === file.id
                        ? 0.65
                        : 1,
                    cursor:
                      !activeAccountId
                        ? "not-allowed"
                        : restoringFileId === file.id
                          ? "not-allowed"
                          : "pointer",
                    color: "#22c55e",
                    background: "transparent",
                  }}
                  onClick={() => {
                    void handleRestoreFile(file);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Trash2
                      size={14}
                      style={{ transform: "rotate(180deg)" }}
                    />
                  <span>
                      {restoringFileId === file.rowKey ? "Restoring..." : "Restore"}
                     </span>

                  </div>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  aria-label="Delete Permanently"
                  title="Delete Permanently"
                  className="w-full rounded-lg px-2 py-1 text-left text-xs font-semibold"
                  disabled={deletingPermanentFileId === file.rowKey}

                  style={{
                    marginTop: 4,
                    opacity:
                      deletingPermanentFileId === file.rowKey ? 0.65 : 1,
                    cursor:
                      deletingPermanentFileId === file.rowKey
                        ? "not-allowed"
                        : "pointer",

                    color: "#ef4444",
                    background: "transparent",
                  }}
                  onClick={() => {
                    void handleDeletePermanentlyFile(file);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Trash2 size={14} />
                    <span>
                      {deletingPermanentFileId === file.rowKey
                        ? "Deleting..."
                        : "Delete Permanently"}
                    </span>

                  </div>
                </button>
              </>
            ) : null}


            {driveListMode !== "trash" && driveListMode === "files" && isGDriveFileIdValid ? (
              <button

                type="button"
                role="menuitem"
                aria-label="Trash"
                title="Trash"
                className="w-full rounded-lg px-2 py-1 text-left text-xs font-semibold"
                disabled={!activeAccountId || trashingFileId === file.rowKey}

                style={{
                  marginTop: 4,
                    opacity: !activeAccountId
                      ? 0.45
                      : trashingFileId === file.rowKey
                        ? 0.65
                        : 1,
                  cursor:
                    !activeAccountId
                      ? "not-allowed"
                      : trashingFileId === file.rowKey
                        ? "not-allowed"
                        : "pointer",

                  color: "#ef4444",
                  background: "transparent",
                }}
                onClick={() => {
                  void handleTrashFile(file);
                }}
              >
                <div className="flex items-center gap-2">
                  <Trash2 size={14} />
                  <span>{trashingFileId === file.rowKey ? "Trashing..." : "Trash"}</span>

                </div>
              </button>
            ) : null}


            {trashError && driveListMode !== "trash" && openActionFileId === file.rowKey ? (

              <div
                className="mt-2 w-full rounded-lg px-2 py-1 text-[10px] font-semibold"
                style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444" }}
                role="alert"
              >
                {trashError}
              </div>
            ) : null}

            {restoreError && driveListMode === "trash" && openActionFileId === file.rowKey ? (

              <div
                className="mt-2 w-full rounded-lg px-2 py-1 text-[10px] font-semibold"
                style={{ background: "rgba(34,197,94,0.10)", color: "#22c55e" }}
                role="alert"
              >
                {restoreError}
              </div>
            ) : null}

            {permanentDeleteError &&
            driveListMode === "trash" &&
            openActionFileId === file.rowKey ? (

              <div
                className="mt-2 w-full rounded-lg px-2 py-1 text-[10px] font-semibold"
                style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444" }}
                role="alert"
              >
                {permanentDeleteError}
              </div>
            ) : null}

          </div>
        ) : null}

      </div>
    );
  };

  return (
    <div className="flex-1 overflow-hidden" style={{ background: colors.shellBg }}>

      {/* Hidden file input for Upload */}

      <input
        ref={uploadInputRef}
        type="file"
        onChange={handleUploadFileChange}
        style={{ display: "none" }}
      />


      {previewFile ? (

        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
          style={{ background: resolvedTheme === "light" ? "rgba(15,23,42,0.35)" : "rgba(0,0,0,0.45)" }}
          onClick={closePreviewModal}
        >
          <div
            className="w-full max-w-xl rounded-2xl border p-4"
            style={{ background: colors.surfaceBg, borderColor: colors.border, boxShadow: colors.shadow }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold" style={{ color: colors.title }}>
                  Preview
                </div>
                <div
                  className="mt-1 truncate text-xs"
                  style={{ color: colors.text }}
                  title={previewFile.name}
                >
                  {previewFile.name}
                </div>
              </div>

              <button
                type="button"
                onClick={closePreviewModal}
                className="rounded-lg px-2 py-1 text-xs font-semibold"
                style={{
                  color: accentColor,
                  background: `${accentColor}14`,
                  border: `1px solid ${accentColor}33`,
                }}
              >
                Close
              </button>
            </div>

            <div className="mt-4">
              {previewLoading ? (
                <div className="flex items-center gap-2" style={{ color: colors.muted }}>
                  <LoadingSpinner size={14} color={accentColor} />
                  Loading preview...
                </div>
              ) : previewError ? (
                <div
                  className="rounded-lg px-3 py-2 text-xs font-semibold"
                  style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444" }}
                  role="alert"
                >
                  {previewError}
                </div>
              ) : null}

              {!previewLoading && !previewError ? (
                <div
                  className="mt-3 overflow-hidden rounded-xl border"
                  style={{ borderColor: colors.border, background: resolvedTheme === "light" ? "#fff" : colors.softBg }}
                >
                  {(() => {
                    const kind = previewFile
                      ? resolvePreviewContentKind(
                          previewFile,
                          previewContentType || "",
                        )
                      : "unknown";

                    if (previewLoading) return null;

                    if (previewTextContent !== null && kind === "text") {
                      return (
                        <pre
                          key={previewFile?.id}
                          style={{
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            overflow: "auto",
                            fontFamily: "monospace",
                            margin: 0,
                            padding: 12,
                            fontSize: 12,
                            color: colors.text,
                            background:
                              resolvedTheme === "light" ? "#fff" : colors.softBg,
                            minHeight: 520,
                          }}
                        >
                          {previewTextContent}
                        </pre>
                      );
                    }

                    if (previewUrl && kind === "image") {
                      return (
                        <img
                          key={previewUrl || previewFile?.id}
                          src={previewUrl}
                          alt={previewFile.name}
                          className="block max-h-[520px] w-full object-contain"
                        />
                      );
                    }

                    if (previewUrl && kind === "pdf") {
                      return (
                        <div key={previewUrl || previewFile?.id} style={{ height: 520 }}>
                          <iframe
                            title="PDF preview"
                            src={previewUrl}
                            className="h-full w-full"
                          />
                        </div>
                      );
                    }

                    if (previewUrl && kind === "video") {
                      return (
                        <div key={previewUrl || previewFile?.id} className="p-2">
                          <video controls src={previewUrl} className="block w-full" />
                        </div>
                      );
                    }

                    if (previewUrl && kind === "audio") {
                      return (
                        <div key={previewUrl || previewFile?.id} className="p-3">
                          <audio controls src={previewUrl} className="w-full" />
                        </div>
                      );
                    }

                    return (
                      <div
                        className="p-4 text-xs font-semibold"
                        style={{ color: colors.muted }}
                      >
                        Preview unavailable. Use Download or Open instead.
                      </div>
                    );
                  })()}


                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {detailsFile ? (

        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
          style={{ background: resolvedTheme === "light" ? "rgba(15,23,42,0.35)" : "rgba(0,0,0,0.45)" }}
          onClick={() => setDetailsFileAndReset(null)}
        >

          <div
            className="w-full max-w-xl rounded-2xl border p-4"
            style={{ background: colors.surfaceBg, borderColor: colors.border, boxShadow: colors.shadow }}
            onClick={(e) => e.stopPropagation()}
          >

            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold" style={{ color: colors.title }}>
                  Details
                </div>
                <div className="mt-1 truncate text-xs" style={{ color: colors.text }} title={detailsFile.name}>
                  {detailsFile.name}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailsFileAndReset(null)}
                className="rounded-lg px-2 py-1 text-xs font-semibold"
                style={{ color: accentColor, background: `${accentColor}14`, border: `1px solid ${accentColor}33` }}
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">

              <div>
                <div className="text-[11px] font-semibold" style={{ color: colors.muted }}>
                  Name
                </div>
                <div className="mt-1 text-xs" style={{ color: colors.text }}>
                  {formatOptionalString(detailsFile.name)}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold" style={{ color: colors.muted }}>
                  MIME
                </div>
                <div className="mt-1 text-xs" style={{ color: colors.text }}>
                  {formatOptionalString(detailsFile.mime)}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold" style={{ color: colors.muted }}>
                  Owner
                </div>
                <div className="mt-1 text-xs" style={{ color: colors.text }}>
                  {formatOptionalString(detailsFile.owner)}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold" style={{ color: colors.muted }}>
                  Account ID
                </div>
                <div className="mt-1 text-xs" style={{ color: colors.text }}>
                  {formatOptionalString(detailsFile.accountId)}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold" style={{ color: colors.muted }}>
                  Size
                </div>
                <div className="mt-1 text-xs" style={{ color: colors.text }}>
                  {formatOptionalBytes(detailsFile.sizeBytes)}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold" style={{ color: colors.muted }}>
                  Modified
                </div>
                <div className="mt-1 text-xs" style={{ color: colors.text }}>
                  {formatOptionalString(detailsFile.recentAt)}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold" style={{ color: colors.muted }}>
                  Shared
                </div>
                <div className="mt-1 text-xs" style={{ color: colors.text }}>
                  {detailsFile.shared ? "Shared" : "Private"}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold" style={{ color: colors.muted }}>
                  Starred
                </div>
                <div className="mt-1 text-xs" style={{ color: colors.text }}>
                  {detailsFile.starred ? "Starred" : "Not starred"}
                </div>
              </div>

              <div className="sm:col-span-2">
                <div className="text-[11px] font-semibold" style={{ color: colors.muted }}>
                  Google Link
                </div>
                <div className="mt-1 break-all text-xs" style={{ color: colors.text }}>
                  {detailsFile.webViewLink ? detailsFile.webViewLink : detailsFile.webContentLink ? detailsFile.webContentLink : "-"}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside
          className="min-h-0 overflow-y-auto border-r p-3 nimbus-scrollbar"
          style={{ background: colors.sidebarBg, borderColor: colors.border }}
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <div className="min-w-0">
              <div className="text-sm font-semibold" style={{ color: colors.title }}>
                Google Drive
              </div>
              <div className="text-[11px]" style={{ color: colors.muted2 }}>
                {accountsLoading
                  ? "Loading accounts"
                  : `${gdriveAccounts.filter((account) => account.is_connected).length} connected`}
              </div>
            </div>

            <button
              type="button"
              title="Connect Google Drive"
              disabled={connectingAccount}
              onClick={handleConnectAccount}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-opacity"
              style={{
                background: `${accentColor}12`,
                border: `1px solid ${accentColor}33`,
                color: accentColor,
                cursor: connectingAccount ? "not-allowed" : "pointer",
                opacity: connectingAccount ? 0.65 : 1,
              }}
            >
              {connectingAccount ? <LoadingSpinner size={12} color={accentColor} /> : <Plus size={15} />}
            </button>
          </div>

          {accountsLoading ? (
            <div
              className="rounded-xl border px-3 py-4 text-xs"
              style={{ background: colors.panelBg, borderColor: colors.border, color: colors.muted }}
            >
              <div className="flex items-center gap-2">
                <LoadingSpinner size={12} color={accentColor} />
                Loading Drive accounts...
              </div>
            </div>
          ) : accountsError ? (
            <div
              className="rounded-xl border px-3 py-4 text-xs"
              style={{
                background: "rgba(239,68,68,0.08)",
                borderColor: "rgba(239,68,68,0.24)",
                color: "#ef4444",
              }}
            >
              Failed to load Google Drive accounts.
            </div>
          ) : gdriveAccounts.length === 0 ? (
            <div
              className="rounded-xl border px-3 py-5 text-xs"
              style={{ background: colors.panelBg, borderColor: colors.border, color: colors.muted }}
            >
              No connected accounts yet.
            </div>
          ) : (
            <div className="space-y-2">
              {gdriveAccounts.map((account, index) => renderAccountCard(account, index))}
            </div>
          )}
        </aside>

        <main className="min-h-0 min-w-0 overflow-hidden" style={{ background: colors.shellBg }}>
          <div className="flex h-full min-h-0 flex-col">
            {connectSuccessMessage ? (
              <div
                className="mb-3 rounded-xl border px-4 py-3 text-xs font-semibold"
                style={{
                  background: `${accentColor}14`,
                  borderColor: `${accentColor}33`,
                  color: colors.title,
                }}
              >
                {connectSuccessMessage}
              </div>
            ) : null}

            <div
              className="flex shrink-0 flex-col gap-3 border-b px-5 py-3 md:flex-row md:items-center md:justify-between"
              style={{ background: colors.surfaceBg, borderColor: colors.border }}
            >
              <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
                {tabs.map((item) => {
                  const isActive = tab === item.key;
                  const Icon = item.Icon;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setTab(item.key)}
                      className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{
                        background: isActive ? `${accentColor}14` : "transparent",
                        color: isActive ? accentColor : colors.muted,
                        border: `1px solid ${isActive ? `${accentColor}22` : "transparent"}`,
                      }}
                    >
                      {Icon ? <Icon size={12} fill={item.key === "starred" ? "currentColor" : "none"} /> : null}
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex min-w-0 items-center gap-3">
                <div className="relative w-full min-w-[180px] max-w-xs">
                  <Search
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: colors.muted2 }}
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search Drive"
                    className="h-9 w-full rounded-full pl-8 pr-3 text-xs outline-none"
                    style={{
                      background: colors.inputBg,
                      border: `1px solid ${colors.border}`,
                      color: colors.text,
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    title="Files"
                    onClick={() => {
                      setDriveListMode("files");
                      closeActionMenu();
                      setFilesError(false);
                      setFilesErrorMessage("");
                    }}
                    className="flex h-9 items-center justify-center rounded-full border px-3 text-xs font-semibold"
                    style={{
                      background: driveListMode === "files" ? `${accentColor}14` : "transparent",
                      borderColor:
                        driveListMode === "files" ? `${accentColor}22` : colors.border,
                      color:
                        driveListMode === "files" ? accentColor : colors.muted,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Files
                  </button>

                  <button
                    type="button"
                    title="Trash"
                    onClick={() => {
                      setDriveListMode("trash");
                      closeActionMenu();
                      setFilesError(false);
                      setFilesErrorMessage("");
                    }}
                    className="flex h-9 items-center justify-center rounded-full border px-3 text-xs font-semibold"
                    style={{
                      background: driveListMode === "trash" ? `${accentColor}14` : "transparent",
                      borderColor:
                        driveListMode === "trash" ? `${accentColor}22` : colors.border,
                      color:
                        driveListMode === "trash" ? "#ef4444" : colors.muted,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Trash
                  </button>

                  <button
                    type="button"
                    title="Refresh files"
                    disabled={!activeAccountId || filesLoading}
                    onClick={() => setRefreshTick((value) => value + 1)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
                    style={{
                      background: colors.inputBg,
                      borderColor: colors.border,
                      color: !activeAccountId || filesLoading ? colors.muted2 : colors.muted,
                      cursor: !activeAccountId || filesLoading ? "not-allowed" : "pointer",
                      opacity: !activeAccountId || filesLoading ? 0.6 : 1,
                    }}
                  >
                    ↻
                  </button>

                  <button
                    type="button"
                    title="Upload"
                    disabled={uploadingFile || driveListMode === "trash"}
                    onClick={handleUploadButtonClick}
                    className="flex h-9 items-center justify-center rounded-full border px-3 text-xs font-semibold"
                    style={{
                      background:
                        uploadingFile || driveListMode === "trash"
                          ? "transparent"
                          : `${accentColor}14`,
                      borderColor:
                        uploadingFile || driveListMode === "trash"
                          ? colors.border
                          : `${accentColor}22`,
                      color:
                        uploadingFile || driveListMode === "trash"
                          ? colors.muted2
                          : accentColor,
                      cursor:
                        uploadingFile || driveListMode === "trash"
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        uploadingFile || driveListMode === "trash" ? 0.65 : 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {uploadingFile ? "Uploading..." : "Upload"}
                  </button>

                </div>


                <div className="hidden shrink-0 text-[11px] md:block" style={{ color: colors.muted2 }}>
                  {activeAccount || anyFiles ? `${filteredFiles.length} item(s)` : ""}
                </div>

                {(uploadError || uploadSuccess) ? (
                  <div className="shrink-0 text-[11px] font-semibold" style={{ color: uploadError ? "#ef4444" : "#22c55e" }} role="status">
                    {uploadError ? uploadError : uploadSuccess}
                  </div>
                ) : null}

              </div>

            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 nimbus-scrollbar">
              <div
                className="overflow-hidden rounded-2xl border"
                style={{
                  background: colors.surfaceBg,
                  borderColor: colors.border,
                  boxShadow: colors.shadow,
                }}
              >
                {filesLoading ? (
                  <div className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: colors.muted }}>
                    <LoadingSpinner size={14} color={accentColor} />
                    Loading Google Drive files...
                  </div>
                ) : filesError ? (
                  <div className="flex items-center justify-center py-16 text-sm" style={{ color: "#ef4444" }}>
                    {filesErrorMessage || GENERIC_FILES_ERROR_MESSAGE}
                  </div>
                ) : !activeAccount && !anyFiles ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}24` }}
                    >
                      <GDriveIcon size={22} />
                    </div>
                    <div className="mt-3 text-sm font-semibold" style={{ color: colors.title }}>
                      Connect a Drive account
                    </div>
                    <div className="mt-1 text-xs" style={{ color: colors.muted }}>
                      Add an account to browse Google Drive files.
                    </div>
                  </div>
                ) : !anyFiles ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-2xl"
                      style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}24` }}
                    >
                      <Folder size={21} style={{ color: accentColor }} />
                    </div>
                    <div className="mt-3 text-sm font-semibold" style={{ color: colors.title }}>
                      {search.trim()
                        ? "No matching Drive files"
                        : "No Drive files found."}
                    </div>
                    <div className="mt-1 text-xs" style={{ color: colors.muted }}>
                      {search.trim()
                        ? "Try a different keyword or clear the search."
                        : "Try another tab or search query."}
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div style={{ minWidth: 820 }}>
                      {folderItems.length > 0 ? (
                        <div>
                          <div
                            className="px-3 py-2 text-xs font-semibold"
                            style={{ color: colors.header, background: colors.rowHover, borderBottom: `1px solid ${colors.border}` }}
                          >
                            Folders
                          </div>

                          <div
                            className="grid items-center px-3 py-2 text-[11px] font-semibold"
                            style={{
                              gridTemplateColumns: tableGridTemplate,
                              color: colors.header,
                              background: colors.rowHover,
                              borderBottom: `1px solid ${colors.border}`,
                            }}
                          >
                            <span>Name</span>
                            <span>Type</span>
                            <span>Visibility</span>
                            <span>Modified</span>
                            <span>Size</span>
                            <span />
                          </div>

                          {folderItems.map((file) => (
                            <div
                              key={file.rowKey}
                              className="group grid items-center px-3 py-2 transition-colors"
                              style={{
                                gridTemplateColumns: tableGridTemplate,
                                background: colors.surfaceBg,
                                borderBottom: `1px solid ${colors.border}`,
                                color: colors.text,
                              }}
                              onContextMenu={(event) => handleFileContextMenu(event, file)}
                              onMouseEnter={(event) => {
                                event.currentTarget.style.background = colors.rowHover;
                              }}
                              onMouseLeave={(event) => {
                                event.currentTarget.style.background = colors.surfaceBg;
                              }}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                {renderFileIcon(file)}
                                <div className="min-w-0">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span
                                      className="truncate text-xs font-medium"
                                      style={{ color: colors.title }}
                                      title={file.name}
                                    >
                                      {file.name}
                                    </span>
                                    {file.starred ? (
                                      <Star size={13} fill="#f59e0b" style={{ color: "#f59e0b" }} />
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              <div className="min-w-0">
                                <div className="truncate text-[11px] font-semibold" style={{ color: colors.title }}>
                                  {getGDriveFileTypeInfo(file).label}
                                </div>
                                <div
                                  className="mt-1 truncate text-[10px]"
                                  style={{ color: colors.muted2 }}
                                  title={getGDriveFileTypeInfo(file).detail}
                                >
                                  {getGDriveFileTypeInfo(file).detail}
                                </div>
                              </div>

                              <div>
                                {file.shared ? (
                                  <span
                                    className="rounded-full px-2 py-1 text-[10px] font-semibold"
                                    style={{
                                      background: `${accentColor}12`,
                                      color: accentColor,
                                    }}
                                  >
                                    Shared
                                  </span>
                                ) : (
                                  <span className="text-[11px]" style={{ color: colors.muted2 }}>
                                    Private
                                  </span>
                                )}
                              </div>

                              <div className="text-xs" style={{ color: colors.muted }}>
                                {formatDate(file.recentAt)}
                              </div>

                              <div className="text-xs" style={{ color: colors.muted }}>
                                {formatBytes(file.sizeBytes)}
                              </div>

                              {renderFileActions(file)}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {regularFileItems.length > 0 ? (
                        <div>
                          <div
                            className="px-3 py-2 text-xs font-semibold"
                            style={{ color: colors.header, background: colors.rowHover, borderBottom: `1px solid ${colors.border}` }}
                          >
                            Files
                          </div>

                          <div
                            className="grid items-center px-3 py-2 text-[11px] font-semibold"
                            style={{
                              gridTemplateColumns: tableGridTemplate,
                              color: colors.header,
                              background: colors.rowHover,
                              borderBottom: `1px solid ${colors.border}`,
                            }}
                          >
                            <span>Name</span>
                            <span>Type</span>
                            <span>Visibility</span>
                            <span>Modified</span>
                            <span>Size</span>
                            <span />
                          </div>

                          {regularFileItems.map((file) => (
                            <div
                              key={file.rowKey}
                              className="group grid items-center px-3 py-2 transition-colors"
                              style={{
                                gridTemplateColumns: tableGridTemplate,
                                background: colors.surfaceBg,
                                borderBottom: `1px solid ${colors.border}`,
                                color: colors.text,
                              }}
                              onContextMenu={(event) => handleFileContextMenu(event, file)}
                              onMouseEnter={(event) => {
                                event.currentTarget.style.background = colors.rowHover;
                              }}
                              onMouseLeave={(event) => {
                                event.currentTarget.style.background = colors.surfaceBg;
                              }}
                            >
                              <div className="flex min-w-0 items-center gap-3">
                                {renderFileIcon(file)}
                                <div className="min-w-0">
                                  <div className="flex min-w-0 items-center gap-2">
                                    <span
                                      className="truncate text-xs font-medium"
                                      style={{ color: colors.title }}
                                      title={file.name}
                                    >
                                      {file.name}
                                    </span>
                                    {file.starred ? (
                                      <Star size={13} fill="#f59e0b" style={{ color: "#f59e0b" }} />
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              <div className="min-w-0">
                                <div className="truncate text-[11px] font-semibold" style={{ color: colors.title }}>
                                  {getGDriveFileTypeInfo(file).label}
                                </div>
                                <div
                                  className="mt-1 truncate text-[10px]"
                                  style={{ color: colors.muted2 }}
                                  title={getGDriveFileTypeInfo(file).detail}
                                >
                                  {getGDriveFileTypeInfo(file).detail}
                                </div>
                              </div>

                              <div>
                                {file.shared ? (
                                  <span
                                    className="rounded-full px-2 py-1 text-[10px] font-semibold"
                                    style={{
                                      background: `${accentColor}12`,
                                      color: accentColor,
                                    }}
                                  >
                                    Shared
                                  </span>
                                ) : (
                                  <span className="text-[11px]" style={{ color: colors.muted2 }}>
                                    Private
                                  </span>
                                )}
                              </div>

                              <div className="text-xs" style={{ color: colors.muted }}>
                                {formatDate(file.recentAt)}
                              </div>

                              <div className="text-xs" style={{ color: colors.muted }}>
                                {formatBytes(file.sizeBytes)}
                              </div>

                              {renderFileActions(file)}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
