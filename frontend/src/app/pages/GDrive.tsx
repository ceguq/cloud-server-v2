import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent,
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
  Copy,
  Database,
  Download,
  Edit3,
  Eye,
  FileText,
  Film,
  Folder,
  Grid2X2 as GridIcon,
  HardDrive,
  Image,
  List as ListIcon,
  Maximize2,
  Minimize2,
  Minus,
  MoreVertical,
  Music,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Star,
  Trash2,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";



import { GDriveIcon } from "../components/GDriveIcon";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { FilesEmptyState } from "./gdrive/components/FilesEmptyState";
import { InlineErrorMessage } from "./gdrive/components/InlineErrorMessage";
import { LoadingStateMessage } from "./gdrive/components/LoadingStateMessage";
import { NoAccountsState } from "./gdrive/components/NoAccountsState";
import { StatusBadge } from "./gdrive/components/StatusBadge";
import {
  formatBytes,
  formatDate,
  formatRelativeTime,
  getAccountInitials,
  getAccountName,
  getQuotaDisplay,
  parseByteValue,
} from "./gdrive/gDriveFormatters";
import {
  disconnectGDriveAccount,
  downloadGDriveFile,
  getGDriveAccountFiles,
  getGDriveAccounts,
  getGDriveConnectUrl,
  getGDriveFileBlob,
  getTrashedGDriveFiles,
  renameGDriveFile,
  restoreGDriveFile,
  trashGDriveFile,
  uploadGDriveFile,
  createGDriveFolder,
  updateGDriveFileVisibility,
  deleteGDriveFilePermanently,
  type GDriveAccount,
  type GDriveFile,
} from "../../services/gdriveService";

type AppearanceTheme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";
type TabKey = "all" | "files" | "starred" | "shared" | "recent";
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

type GDriveFolderCrumb = {
  id: string;
  name: string;
};

const GOOGLE_DRIVE_ACCOUNT_NOT_FOUND_MESSAGE = "Google Drive account not found.";
const GOOGLE_DRIVE_ACCOUNT_DISCONNECTED_MESSAGE = "Google Drive account is disconnected.";
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
    message === GOOGLE_DRIVE_ACCOUNT_DISCONNECTED_MESSAGE ||
    message.includes("No query results for model [App\\Models\\GDriveAccount]") ||
    status === 404 ||
    status === 422
  );
}

function getErrorResponseCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;

  const errorCode = (error as { response?: { data?: { error_code?: unknown } } }).response?.data?.error_code;
  return typeof errorCode === "string" && errorCode.trim().length > 0 ? errorCode : undefined;
}

function isReconnectRequiredError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const reconnectRequired = (error as { response?: { data?: { reconnect_required?: unknown } } }).response?.data?.reconnect_required;
  return reconnectRequired === true || getErrorResponseCode(error) === "gdrive_insufficient_scope";
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

function renderFileIcon(file: GDriveFileUI, colorsParam?: { panelBg?: string; border?: string }) {
  const { Icon, color, bg, border } = getFileVisual(file.mime);

  const wrapperBg = colorsParam?.panelBg ?? bg;
  const wrapperBorder = colorsParam?.border ?? border;

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{ background: wrapperBg, border: `1px solid ${wrapperBorder}` }}
    >
      <Icon size={15} strokeWidth={2} style={{ color }} />
    </div>
  );
}

const PREVIEW_IMAGE_MIN_SCALE = 0.5;
const PREVIEW_IMAGE_MAX_SCALE = 4;
const PREVIEW_IMAGE_ZOOM_STEP = 0.1;

function clampPreviewImageScale(scale: number): number {
  return Math.min(
    PREVIEW_IMAGE_MAX_SCALE,
    Math.max(PREVIEW_IMAGE_MIN_SCALE, Number(scale.toFixed(2))),
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
        pageBg: "#f8fafc",
        shellBg: "#f8fafc",
        sidebarBg: "#ffffff",
        surfaceBg: "#ffffff",
        cardBg: "#ffffff",
        panelBg: "#f8fafc",
        softBg: "#f1f5f9",
        buttonSoftBg: "#f1f5f9",
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
        inputBorder: "#dbe3ef",
        menuBg: "#ffffff",
        menuHoverBg: "#f8fafc",
      };
    }

    return {
      pageBg: "#0b1121",
      shellBg: "#111827",
      sidebarBg: "#0f172a",
      surfaceBg: "#111c2f",
      cardBg: "#0f1729",
      panelBg: "#0b1324",
      softBg: "#1f2937",
      buttonSoftBg: "#1a2540",
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
      inputBorder: "#1a2540",
      menuBg: "#0f1729",
      menuHoverBg: "#111c2f",
    };
  }, [resolvedTheme]);

  const [gdriveAccounts, setGdriveAccounts] = useState<GDriveAccount[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(false);
  const [accountsLoaded, setAccountsLoaded] = useState(false);
  const [accountsError, setAccountsError] = useState(false);
  const [activeAccountId, setActiveAccountId] = useState<string>("");
  const [gdriveFolderPath, setGdriveFolderPath] = useState<GDriveFolderCrumb[]>([]);

  const [gdriveFiles, setGdriveFiles] = useState<GDriveFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState(false);
  const [filesErrorMessage, setFilesErrorMessage] = useState<string>("");
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreErrorMessage, setLoadMoreErrorMessage] = useState<string>("");
  const [disconnectingAccountId, setDisconnectingAccountId] = useState<string>("");
  const [connectingAccount, setConnectingAccount] = useState(false);
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState<string>("");
  const [refreshTick, setRefreshTick] = useState<number>(0);

  const [driveListMode, setDriveListMode] = useState<"files" | "trash">("files");

  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const currentFolderId =
    gdriveFolderPath.length > 0
      ? gdriveFolderPath[gdriveFolderPath.length - 1].id
      : null;

  const pageRequestContext = `${activeAccountId}|${driveListMode}|${currentFolderId ?? ""}|${refreshTick}`;
  const fileListRequestContextRef = useRef<string>(pageRequestContext);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [copiedFileId, setCopiedFileId] = useState<string>("");
  const [downloadingFileId, setDownloadingFileId] = useState<string>("");
  const [detailsFile, setDetailsFile] = useState<GDriveFileUI | null>(null);
  const [openActionFileId, setOpenActionFileId] = useState<string | null>(null);
  const [openSharePanelFileId, setOpenSharePanelFileId] = useState<string | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [selectedFileForRename, setSelectedFileForRename] = useState<GDriveFileUI | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [renameError, setRenameError] = useState<string>("");
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [selectedFileForTrash, setSelectedFileForTrash] = useState<GDriveFileUI | null>(null);
  const [isChecklistMode, setIsChecklistMode] = useState(false);
  const [checkedRowKeys, setCheckedRowKeys] = useState<string[]>([]);
  const [bulkDownloadLoading, setBulkDownloadLoading] = useState(false);
  const [bulkDownloadMessage, setBulkDownloadMessage] = useState<string>("");
  const [isBulkTrashModalOpen, setIsBulkTrashModalOpen] = useState(false);
  const [bulkTrashLoading, setBulkTrashLoading] = useState(false);

  const [previewFile, setPreviewFile] = useState<GDriveFileUI | null>(null);
  const [previewModalMode, setPreviewModalMode] = useState<
    "normal" | "maximized" | "minimized"
  >("normal");

  const [previewImageScale, setPreviewImageScale] = useState(1);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderModalName, setFolderModalName] = useState("");
  const [folderModalError, setFolderModalError] = useState("");
  const [folderActionLoading, setFolderActionLoading] = useState(false);
  const [previewImageFitSize, setPreviewImageFitSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [previewImageOffset, setPreviewImageOffset] = useState({ x: 0, y: 0 });
  const [isPreviewImageDragging, setIsPreviewImageDragging] = useState(false);

  const previewImageViewportRef = useRef<HTMLDivElement | null>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);
  const previewImageDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const updatePreviewImageFitSize = () => {
    const viewport = previewImageViewportRef.current;
    const image = previewImageRef.current;

    if (!viewport || !image || !image.naturalWidth || !image.naturalHeight) {
      return;
    }

    const padding = 24;
    const availableWidth = Math.max(0, viewport.clientWidth - padding);
    const availableHeight = Math.max(0, viewport.clientHeight - padding);

    if (!availableWidth || !availableHeight) {
      return;
    }

    const scale = Math.min(
      availableWidth / image.naturalWidth,
      availableHeight / image.naturalHeight,
      1,
    );

    setPreviewImageFitSize({
      width: image.naturalWidth * scale,
      height: image.naturalHeight * scale,
    });
    setPreviewImageOffset({ x: 0, y: 0 });
  };

  const setPreviewImageScaleFromAnchor = (
    nextScaleValue: number,
    anchorPoint?: { clientX: number; clientY: number },
  ) => {
    const oldScale = previewImageScale;
    const nextScale = clampPreviewImageScale(nextScaleValue);

    if (nextScale === oldScale) {
      return;
    }

    const viewport = previewImageViewportRef.current;
    const image = previewImageRef.current;
    const imageRect = image?.getBoundingClientRect();
    const viewportRect = viewport?.getBoundingClientRect();
    const point =
      anchorPoint ??
      (viewportRect
        ? {
            clientX: viewportRect.left + viewportRect.width / 2,
            clientY: viewportRect.top + viewportRect.height / 2,
          }
        : undefined);

    if (!imageRect || !point || imageRect.width <= 0 || imageRect.height <= 0) {
      setPreviewImageScale(nextScale);
      if (nextScale <= 1) setPreviewImageOffset({ x: 0, y: 0 });
      return;
    }

    const anchorX = Math.min(
      1,
      Math.max(0, (point.clientX - imageRect.left) / imageRect.width),
    );
    const anchorY = Math.min(
      1,
      Math.max(0, (point.clientY - imageRect.top) / imageRect.height),
    );
    const scaleRatio = nextScale / oldScale;
    const nextWidth = imageRect.width * scaleRatio;
    const nextHeight = imageRect.height * scaleRatio;
    const currentCenterX = imageRect.left + imageRect.width / 2;
    const currentCenterY = imageRect.top + imageRect.height / 2;
    const nextCenterX = point.clientX - anchorX * nextWidth + nextWidth / 2;
    const nextCenterY = point.clientY - anchorY * nextHeight + nextHeight / 2;

    setPreviewImageScale(nextScale);
    setPreviewImageOffset(
      nextScale <= 1
        ? { x: 0, y: 0 }
        : {
            x: previewImageOffset.x + nextCenterX - currentCenterX,
            y: previewImageOffset.y + nextCenterY - currentCenterY,
          },
    );
  };

  const resetPreviewImageZoom = () => {
    previewImageDragRef.current = null;
    setIsPreviewImageDragging(false);
    setPreviewImageScale(1);
    setPreviewImageOffset({ x: 0, y: 0 });
  };

  const handlePreviewImageWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.stopPropagation();

    if (event.deltaY === 0) {
      return;
    }

    setPreviewImageScaleFromAnchor(
      previewImageScale +
        (event.deltaY < 0 ? PREVIEW_IMAGE_ZOOM_STEP : -PREVIEW_IMAGE_ZOOM_STEP),
      { clientX: event.clientX, clientY: event.clientY },
    );
  };

  const handlePreviewImageDoubleClick = (event: React.MouseEvent<HTMLImageElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (previewImageScale > 1) {
      resetPreviewImageZoom();
      return;
    }

    setPreviewImageScaleFromAnchor(2, {
      clientX: event.clientX,
      clientY: event.clientY,
    });
  };

  const handlePreviewImagePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (previewImageScale <= 1) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const viewport = previewImageViewportRef.current;
    if (!viewport) return;

    previewImageDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: previewImageOffset.x,
      offsetY: previewImageOffset.y,
    };
    setIsPreviewImageDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePreviewImagePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const drag = previewImageDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setPreviewImageOffset({
      x: drag.offsetX + event.clientX - drag.startX,
      y: drag.offsetY + event.clientY - drag.startY,
    });
    event.preventDefault();
  };

  const finishPreviewImageDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = previewImageDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(drag.pointerId)) {
      event.currentTarget.releasePointerCapture(drag.pointerId);
    }

    previewImageDragRef.current = null;
    setIsPreviewImageDragging(false);
  };

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
  const [sharingFileId, setSharingFileId] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);

  const ACTION_MENU_WIDTH = 260;

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

  const connectedAccounts = useMemo(
    () => gdriveAccounts.filter((account) => account.is_connected),
    [gdriveAccounts],
  );

  const disconnectedAccounts = useMemo(
    () => gdriveAccounts.filter((account) => !account.is_connected),
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
          const connectedIds = list
            .filter((account) => account.is_connected)
            .map((account) => normalizeAccountId(account.id))
            .filter(Boolean);

          if (prev && connectedIds.includes(normalizeAccountId(prev))) {
            return prev;
          }

          return connectedIds[0] ?? "";
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

  const handleReconnectAccount = async () => {
    await handleConnectAccount();
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
        setGdriveFolderPath([]);
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

      fileListRequestContextRef.current = pageRequestContext;
      setFilesError(false);
      setFilesErrorMessage("");
      setNextPageToken(null);
      setLoadMoreErrorMessage("");
      setIsLoadingMore(false);

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
            ? await getGDriveAccountFiles(accountId, {
                page_size: 50,
                folder_id: currentFolderId,
              })
            : await getTrashedGDriveFiles(accountId, { page_size: 50 });

        if (cancelled) return;

        const list = res?.data ?? [];
        setGdriveFiles(list);
        setNextPageToken(res?.meta?.next_page_token ?? null);
        setLoadMoreErrorMessage("");
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
        } else if (isReconnectRequiredError(error)) {
          setFilesErrorMessage("Google Drive authorization needs to be updated.");
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
  }, [accountsLoaded, activeAccountId, connectedAccountIdsKey, refreshTick, driveListMode, currentFolderId]);

  const loadMoreGDriveFiles = async () => {
    const accountId = activeAccountId;
    if (!accountId || !nextPageToken || filesLoading || isLoadingMore) {
      return;
    }

    const requestContext = pageRequestContext;
    setIsLoadingMore(true);
    setLoadMoreErrorMessage("");

    try {
      const res =
        driveListMode === "files"
          ? await getGDriveAccountFiles(accountId, {
              page_size: 50,
              page_token: nextPageToken,
              folder_id: currentFolderId,
            })
          : await getTrashedGDriveFiles(accountId, {
              page_size: 50,
              page_token: nextPageToken,
            });

      if (fileListRequestContextRef.current !== requestContext) {
        return;
      }

      const nextFiles = res?.data ?? [];
      setGdriveFiles((prev) => {
        const existingIds = new Set(prev.map((file) => String(file.id ?? "")));
        const appended = nextFiles.filter((file) => {
          const fileId = String(file.id ?? "");
          return fileId !== "" && !existingIds.has(fileId);
        });
        return prev.concat(appended);
      });
      setNextPageToken(res?.meta?.next_page_token ?? null);
    } catch (error) {
      const message = getErrorResponseMessage(error).trim();
      setLoadMoreErrorMessage(message || "Failed to load more Drive files.");
    } finally {
      setIsLoadingMore(false);
    }
  };

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

    if (tab === "files") {
      base = base.filter(
        (file) => file.mime !== "application/vnd.google-apps.folder",
      );
    }
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
    { key: "files", label: "Files" },
    { key: "starred", label: "Starred", Icon: Star },
    { key: "shared", label: "Shared", Icon: Share2 },
    { key: "recent", label: "Recent", Icon: HardDrive },
  ];

  const tableGridTemplate = "minmax(0, 1fr) 140px 170px 112px 132px 44px";
  const effectiveTableGridTemplate = isChecklistMode
    ? `40px ${tableGridTemplate}`
    : tableGridTemplate;

  const selectAccount = (account: GDriveAccount) => {
    if (!account.is_connected) return;

    const nextActiveAccountId = normalizeAccountId(account.id);
    setActiveAccountId(nextActiveAccountId);
    setGdriveFolderPath([]);
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

  const handleBulkDownload = async () => {
    if (bulkDownloadLoading) return;
    // Clear prior message
    setBulkDownloadMessage("");

    // Build selection from visible files but exclude folders
    const all = folderItems.concat(regularFileItems);
    const selected = checkedRowKeys
      .map((key) => all.find((f) => f.rowKey === key))
      .filter(Boolean) as GDriveFileUI[];

    // Exclude folder items explicitly
    const selectedFiles = selected.filter((f) => !isGDriveFolder(f));

    if (selectedFiles.length === 0) {
      setBulkDownloadMessage("No downloadable files selected.");
      return;
    }

    setBulkDownloadLoading(true);
    try {
      let success = 0;
      let failed = 0;
      for (const file of selectedFiles) {
        if (!file.accountId || !file.id) {
          failed += 1;
          continue;
        }
        try {
          // eslint-disable-next-line no-await-in-loop
          await downloadGDriveFile(file.accountId, file.id, file.name);
          success += 1;
        } catch {
          failed += 1;
          // continue with remaining files
        }
      }

      const total = selectedFiles.length;
      if (failed === 0) {
        // keep quiet on full success (preserve current behavior)
        setBulkDownloadMessage("");
      } else if (success === 0) {
        setBulkDownloadMessage("Downloads failed for all selected files.");
      } else {
        setBulkDownloadMessage(`${failed} of ${total} files could not be downloaded.`);
      }
    } finally {
      setBulkDownloadLoading(false);
    }
  };

  const handleConfirmBulkTrash = async () => {
    if (bulkTrashLoading) return;
    const all = folderItems.concat(regularFileItems);
    const selectedFiles = checkedRowKeys
      .map((key) => all.find((f) => f.rowKey === key))
      .filter(Boolean) as GDriveFileUI[];
    if (selectedFiles.length === 0) return;

    setBulkTrashLoading(true);
    try {
      for (const file of selectedFiles) {
        if (!file.accountId || !file.id) continue;
        // eslint-disable-next-line no-await-in-loop
        await trashGDriveFile(file.accountId, file.id);
      }

      setIsBulkTrashModalOpen(false);
      setCheckedRowKeys([]);
      setIsChecklistMode(false);
      setRefreshTick((v) => v + 1);
    } catch {
      setTrashError("Failed to move some files to trash.");
    } finally {
      setBulkTrashLoading(false);
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

  const applyUpdatedGDriveFile = (updatedFile: GDriveFile) => {
    const updatedId = String(updatedFile.id ?? "");
    const updatedAccountId = String(updatedFile.account_id ?? "");

    setGdriveFiles((prev) =>
      prev.map((file) => {
        const sameFile =
          String(file.id ?? "") === updatedId &&
          String(file.account_id ?? "") === updatedAccountId;

        return sameFile ? { ...file, ...updatedFile } : file;
      }),
    );

    setDetailsFile((prev) => {
      if (!prev || prev.id !== updatedId || prev.accountId !== updatedAccountId) {
        return prev;
      }

      return {
        ...prev,
        shared: !!updatedFile.shared,
        webViewLink: updatedFile.web_view_link || prev.webViewLink,
        webContentLink: updatedFile.web_content_link || prev.webContentLink,
      };
    });
  };

  const handleUpdateFileVisibility = async (
    file: GDriveFileUI,
    visibility: "public" | "private",
  ) => {
    if (!file.accountId || !file.id?.trim()) {
      setShareError("Action unavailable because this item has no Google Drive file id.");
      return;
    }

    setShareError(null);
    setSharingFileId(file.rowKey);

    try {
      const res = await updateGDriveFileVisibility(file.accountId, file.id, visibility);
      if (res?.data) {
        applyUpdatedGDriveFile(res.data);
      }
    } catch (error: any) {
      const message = error?.response?.data?.message;
      setShareError(
        typeof message === "string" && message.trim().length > 0
          ? message
          : "Failed to update Google Drive sharing.",
      );
    } finally {
      setSharingFileId(null);
    }
  };

  const handleRenameFile = async () => {
    if (!selectedFileForRename || !renameValue.trim()) {
      setRenameError("Please enter a file name.");
      return;
    }

    if (!selectedFileForRename.accountId || !selectedFileForRename.id?.trim()) {
      setRenameError("Action unavailable because this item has no Google Drive file id.");
      return;
    }

    setRenameError("");
    setRenamingFileId(selectedFileForRename.rowKey);

    try {
      const res = await renameGDriveFile(
        selectedFileForRename.accountId,
        selectedFileForRename.id,
        renameValue.trim()
      );
      if (res?.data) {
        const updatedFile = {
          ...res.data,
          account_id: res.data.account_id ?? selectedFileForRename.accountId,
        };
        applyUpdatedGDriveFile(updatedFile);
      }
      setIsRenameModalOpen(false);
      setSelectedFileForRename(null);
      setRenameValue("");
    } catch (error: any) {
      const message = error?.response?.data?.message;
      setRenameError(
        typeof message === "string" && message.trim().length > 0
          ? message
          : "Failed to rename Google Drive file.",
      );
    } finally {
      setRenamingFileId(null);
    }
  };

  const renderAccountCard = (account: GDriveAccount, index: number) => {
    const accountId = normalizeAccountId(account.id);
    const isActive = account.is_connected && accountId === activeAccountId;
    const avatarColor = getAvatarColor(index, isActive, accentColor);
    const statusColor = account.is_connected ? "#22c55e" : "#ef4444";
    const quota = getQuotaDisplay(account);
    const cardBg =
      resolvedTheme === "light"
        ? isActive
          ? "#eff6ff"
          : colors.cardBg
        : isActive
          ? "rgba(37,99,235,0.10)"
          : colors.cardBg;

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

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={connectingAccount}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleReconnectAccount();
                }}
                className="rounded-md border px-1.5 py-1 text-[10px] font-semibold"
                style={{
                  color: accentColor,
                  background: colors.buttonSoftBg,
                  borderColor: colors.border,
                  opacity: connectingAccount ? 0.55 : 1,
                }}
              >
                {connectingAccount ? "Connecting" : "Reconnect"}
              </button>
              <button
                type="button"
                disabled={disconnectingAccountId === account.id}
                onClick={(event) => {
                  event.stopPropagation();
                  void handleDisconnectAccount(account.id);
                }}
                className="rounded-md border px-1.5 py-1 text-[10px] font-semibold"
                style={{
                  color: "#ef4444",
                  background: colors.buttonSoftBg,
                  borderColor: colors.border,
                  opacity: disconnectingAccountId === account.id ? 0.55 : 1,
                }}
              >
                {disconnectingAccountId === account.id ? "Disconnecting" : "Disconnect"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const closeActionMenu = () => {
    setOpenActionFileId(null);
    setActionMenuPosition(null);
    setShareError(null);
  };

  const isGDriveInteractiveClickTarget = (target: EventTarget | null): boolean => {
    const element = target as HTMLElement | null;
    if (!element) return false;

    const tag = element.tagName?.toLowerCase?.() ?? "";
    return (
      tag === "button" ||
      tag === "a" ||
      element.getAttribute?.("role") === "menuitem" ||
      element.closest?.("[data-gdrive-action-menu='true']") !== null
    );
  };

  const openGDriveFolder = (file: GDriveFileUI) => {
    if (!isGDriveFolder(file) || !file.id || driveListMode === "trash") return;

    closeActionMenu();
    setDriveListMode("files");
    setFilesError(false);
    setFilesErrorMessage("");
    setGdriveFiles([]);
    setGdriveFolderPath((prev) => {
      const existingIndex = prev.findIndex((crumb) => crumb.id === file.id);
      if (existingIndex >= 0) return prev.slice(0, existingIndex + 1);
      return [...prev, { id: file.id, name: file.name || "Untitled" }];
    });
  };

  const navigateToGDriveFolder = (index: number) => {
    closeActionMenu();
    setDriveListMode("files");
    setFilesError(false);
    setFilesErrorMessage("");
    setGdriveFiles([]);
    setGdriveFolderPath((prev) => (index < 0 ? [] : prev.slice(0, index + 1)));
  };

  const handleFileContextMenu = (
    event: React.MouseEvent<HTMLElement>,
    file: GDriveFileUI,
  ) => {
    // Preserve clicks on internal controls (more actions button, menu items, links, etc.)
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

  const openCreateFolderModal = () => {
    setFolderModalName("");
    setFolderModalError("");
    setIsFolderModalOpen(true);
  };

  const closeFolderModal = () => {
    if (folderActionLoading) return;
    setIsFolderModalOpen(false);
  };

  const submitFolderModal = async () => {
    if (folderActionLoading) return;

    if (!activeAccountId) {
      setFolderModalError("Select a Google Drive account before creating a folder.");
      return;
    }

    if (driveListMode === "trash") {
      setFolderModalError("Switch to Files before creating a folder.");
      return;
    }

    const name = folderModalName.trim();
    if (!name) {
      setFolderModalError("Nama folder tidak boleh kosong.");
      return;
    }

    try {
      setFolderActionLoading(true);
      setFolderModalError("");

      await createGDriveFolder(activeAccountId, name, currentFolderId);
      setRefreshTick((value) => value + 1);
      setIsFolderModalOpen(false);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || error?.message || "Gagal membuat folder.";
      setFolderModalError(
        typeof message === "string" && message.trim().length > 0
          ? message
          : "Gagal membuat folder.",
      );
    } finally {
      setFolderActionLoading(false);
    }
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

    if (previewTextContent !== null) return "text";

    if (resolvedType.startsWith("image/")) return "image";
    if (resolvedType === "application/pdf") return "pdf";
    if (resolvedType.startsWith("video/")) return "video";
    if (resolvedType.startsWith("audio/")) return "audio";

    const workspaceMime = (file.mime || "").toLowerCase();
    if (workspaceMime.startsWith("application/vnd.google-apps.")) return "unknown";
    if (isGDriveTextPreviewable(file)) return "text";

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

  useEffect(() => {
    if (!previewFile || !previewUrl) return;
    if (resolvePreviewContentKind(previewFile, previewContentType || "") !== "image") {
      return;
    }

    const handleResize = () => {
      updatePreviewImageFitSize();
    };

    const frameId = window.requestAnimationFrame(handleResize);
    window.addEventListener("resize", handleResize);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [previewFile, previewUrl, previewContentType, previewModalMode, previewTextContent]);

  const closePreviewModal = () => {
    setPreviewModalMode("normal");
    setPreviewImageScale(1);
    setPreviewImageFitSize(null);
    setPreviewImageOffset({ x: 0, y: 0 });
    previewImageDragRef.current = null;
    setIsPreviewImageDragging(false);

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
    setPreviewModalMode("normal");
    setPreviewImageScale(1);
    setPreviewImageFitSize(null);
    setPreviewImageOffset({ x: 0, y: 0 });
    previewImageDragRef.current = null;
    setIsPreviewImageDragging(false);

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
      setPreviewError("Preview unavailable. Use Download instead.");
      closeActionMenu();
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
          setPreviewError("Text preview is limited to 1 MB. Use Download instead.");
          setPreviewLoading(false);
          return;
        }

        const { blob } = await getGDriveFileBlob(accountId, file.id);
        if (previewRequestIdRef.current !== requestId) return;

        if (blob.size > TEXT_PREVIEW_MAX_BYTES) {
          setPreviewTextContent(null);
          setPreviewUrl("");
          setPreviewContentType("");
          setPreviewError("Text preview is limited to 1 MB. Use Download instead.");
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

  const handleConfirmTrashFile = async () => {
    const file = selectedFileForTrash;
    if (!activeAccountId) return;
    if (!file?.id?.trim()) {
      setTrashError("Action unavailable because this file has no Google Drive file id.");
      return;
    }

    setTrashingFileId(file.rowKey);
    setTrashError(null);

    try {
      await trashGDriveFile(activeAccountId, file.id);
      setIsTrashModalOpen(false);
      setSelectedFileForTrash(null);
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

    const hasOpenUrl = !!(file.shared && (file.webViewLink || file.webContentLink));
    const isGDriveFileIdValid = hasValidGDriveFileId(file);
    const canPreview = !isGDriveFolder(file) && isGDriveFileIdValid;

    const isOpen = openActionFileId === file.rowKey;

    const menuItemStyle = (
      danger = false,
      disabled = false,
    ): CSSProperties => ({
      marginTop: 4,
      opacity: disabled ? 0.45 : 1,
      cursor: disabled ? "not-allowed" : "pointer",
      color: disabled ? colors.muted2 : danger ? "#ef4444" : colors.text,
      background: "transparent",
      display: "block",
      textAlign: "left",
    });

    const renderMenuItem = ({
      label,
      icon,
      onClick,
      disabled = false,
      danger = false,
      title,
      ariaLabel,
    }: {
      label: string;
      icon: React.ReactNode;
      onClick: () => void;
      disabled?: boolean;
      danger?: boolean;
      title?: string;
      ariaLabel?: string;
    }) => (
      <button
        type="button"
        role="menuitem"
        aria-label={ariaLabel ?? label}
        title={title ?? label}
        className="w-full rounded-lg px-2 py-1 text-left text-xs font-semibold"
        disabled={disabled}
        style={menuItemStyle(danger, disabled)}
        onMouseEnter={(event) => {
          if (disabled) return;
          event.currentTarget.style.background = danger
            ? "rgba(239,68,68,0.12)"
            : colors.menuHoverBg ?? colors.rowHover;
          event.currentTarget.style.color = colors.title;
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = "transparent";
          event.currentTarget.style.color = disabled
            ? colors.muted2
            : danger
            ? "#ef4444"
            : colors.text;
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (disabled) return;
          onClick();
        }}
      >
        <div className="flex items-center gap-2">
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              color: disabled ? colors.muted2 : danger ? "#ef4444" : ([("Open"), ("Download"), ("Copy"), ("Restore"), ("Preview")].includes(label) ? accentColor : colors.muted),
            }}
          >
            {icon}
          </span>
          <span style={{ color: disabled ? colors.muted2 : undefined }}>{label}</span>
        </div>
      </button>
    );

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
      <div className="relative">
        <button
          type="button"
          aria-label={`More actions for ${file.name}`}
          title="More actions"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();

            if (openActionFileId === file.rowKey) {
              closeActionMenu();
              return;
            }

            closeActionMenu();
            setOpenActionFileId(file.rowKey);

            const rect = (event.currentTarget as HTMLButtonElement).getBoundingClientRect();
            const menuWidth = ACTION_MENU_WIDTH;
            const left = Math.min(
              window.innerWidth - menuWidth - 12,
              Math.max(12, rect.right - menuWidth),
            );
            const top = Math.min(window.innerHeight - 300, rect.bottom + 6);

            setActionMenuPosition({ top, left });
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
          style={{
            background: isOpen ? `${accentColor}12` : "transparent",
            border: `1px solid ${isOpen ? `${accentColor}33` : "transparent"}`,
            color: isOpen ? colors.text : colors.muted,
          }}
        >
          <MoreVertical size={16} />
        </button>

        {isOpen ? (
          <div
            ref={actionMenuRef}
            role="menu"
            aria-label={`File actions ${file.name}`}
            onMouseDown={(event) => event.stopPropagation()}
            style={{
              position: "fixed",
              top: actionMenuPosition?.top,
              left: actionMenuPosition?.left,
              width: ACTION_MENU_WIDTH,
              zIndex: 9999,
              background: colors.menuBg ?? colors.cardBg,
              border: `1px solid ${colors.border}`,
              borderRadius: 10,
              padding: 6,
              boxShadow: colors.shadow,
            }}
          >

            {driveListMode !== "trash" && !isGDriveFolder(file) ? (
              renderMenuItem({
                label: previewLoading ? "Opening..." : "Preview",
                icon: <Eye size={14} />,
                disabled: !canPreview || previewLoading,
                ariaLabel: `Preview ${file.name}`,
                onClick: () => {
                  closeActionMenu();
                  void handlePreviewFile(file);
                },
              })
            ) : null}


            {driveListMode !== "trash" ? (
              renderMenuItem({
                label: "Details",
                icon: <FileText size={14} />,
                disabled: !file.id,
                ariaLabel: `Details ${file.name}`,
                onClick: () => {
                  closeActionMenu();
                  setDetailsFileAndReset(file);
                },
              })
            ) : null}





            {driveListMode !== "trash" ? (
              <>
                {isGDriveFolder(file) ? null : renderMenuItem({
                  label: "Download",
                  icon: <Download size={14} />,
                  disabled:
                    downloadingFileId === file.rowKey || !file.accountId || !file.id,
                  ariaLabel: `Download ${file.name}`,
                  title: downloadTitle,
                  onClick: () => {
                    closeActionMenu();
                    void downloadFile(file);
                  },
                })}

                {renderMenuItem({
                  label: openSharePanelFileId === file.rowKey ? "Share" : "Share",
                  icon: <Share2 size={14} />,
                  disabled: !hasOpenUrl,
                  ariaLabel: `Share ${file.name}`,
                  onClick: () => {
                    setOpenSharePanelFileId(
                      openSharePanelFileId === file.rowKey ? null : file.rowKey
                    );
                  },
                })}

                {openSharePanelFileId === file.rowKey ? (
                  <div
                    className="mt-2 rounded-lg border p-2"
                    style={{
                      borderColor: colors.border,
                      background: colors.panelBg,
                    }}
                  >
                    <div
                      className="mb-1 text-[10px] font-semibold"
                      style={{ color: colors.muted2 }}
                    >
                      Link
                    </div>

                    <div className="flex min-w-0 items-center gap-1.5">
                      <div
                        className="min-w-0 flex-1 truncate rounded-md border px-2 py-1 text-[10px]"
                        style={{
                          borderColor: colors.border,
                          color: hasOpenUrl ? colors.text : colors.muted2,
                          background: colors.panelBg,
                        }}
                        title={file.webViewLink || file.webContentLink || "No link available"}
                      >
                        {hasOpenUrl ? (file.webViewLink || file.webContentLink) : "No link"}
                      </div>
                      <button
                        type="button"
                        aria-label={`Copy link ${file.name}`}
                        title="Copy link"
                        disabled={!hasOpenUrl}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                        style={{
                          opacity: !hasOpenUrl ? 0.45 : 1,
                          cursor: !hasOpenUrl ? "not-allowed" : "pointer",
                          border: `1px solid ${colors.border}`,
                          color: hasOpenUrl ? accentColor : colors.muted2,
                          background: colors.panelBg,
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (!hasOpenUrl) return;
                          void copyFileLink(file);
                          setCopiedFileId(file.id);
                          window.setTimeout(() => setCopiedFileId(""), 1400);
                        }}
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  </div>
                ) : null}

                <div
                  className="mt-2 border-t pt-2"
                  style={{ borderColor: colors.border }}
                >
                  <div
                    className="mb-1 text-[10px] font-semibold"
                    style={{ color: colors.muted2 }}
                  >
                    Status
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      role="menuitem"
                      aria-label={`Set private ${file.name}`}
                      title="Private"
                      className="rounded-lg px-2 py-1 text-left text-[11px] font-semibold"
                      disabled={!isGDriveFileIdValid || sharingFileId === file.rowKey}
                      style={{
                        opacity: !isGDriveFileIdValid || sharingFileId === file.rowKey ? 0.45 : 1,
                        cursor:
                          !isGDriveFileIdValid || sharingFileId === file.rowKey
                            ? "not-allowed"
                            : "pointer",
                        color: !file.shared ? accentColor : colors.text,
                        background: !file.shared ? `${accentColor}12` : "transparent",
                        border: `1px solid ${
                          !file.shared ? `${accentColor}33` : "transparent"
                        }`,
                      }}
                      onClick={() => {
                        void handleUpdateFileVisibility(file, "private");
                      }}
                    >
                      Private
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      aria-label={`Set shared ${file.name}`}
                      title="Shared"
                      className="rounded-lg px-2 py-1 text-left text-[11px] font-semibold"
                      disabled={!isGDriveFileIdValid || sharingFileId === file.rowKey}
                      style={{
                        opacity: !isGDriveFileIdValid || sharingFileId === file.rowKey ? 0.45 : 1,
                        cursor:
                          !isGDriveFileIdValid || sharingFileId === file.rowKey
                            ? "not-allowed"
                            : "pointer",
                        color: file.shared ? accentColor : colors.text,
                        background: file.shared ? `${accentColor}12` : "transparent",
                        border: `1px solid ${
                          file.shared ? `${accentColor}33` : "transparent"
                        }`,
                      }}
                      onClick={() => {
                        void handleUpdateFileVisibility(file, "public");
                      }}
                    >
                      Shared
                    </button>
                  </div>
                </div>
              </>
            ) : null}

                <div
                  className="mt-2 border-t pt-2"
                  style={{ borderColor: colors.border }}
                >
                  {renderMenuItem({
                    label: "Rename",
                    icon: <Edit3 size={14} />,
                    disabled: !isGDriveFileIdValid || driveListMode === "trash",
                    ariaLabel: `Rename ${file.name}`,
                    title: driveListMode === "trash" ? "Cannot rename files in trash" : "Rename",
                    onClick: () => {
                      closeActionMenu();
                      setSelectedFileForRename(file);
                      setRenameValue(file.name);
                      setRenameError("");
                      setIsRenameModalOpen(true);
                    },
                  })}
                </div>

                {driveListMode === "trash" && isGDriveFileIdValid ? (
              <>
                {renderMenuItem({
                  label: restoringFileId === file.rowKey ? "Restoring..." : "Restore",
                  icon: (
                    <Trash2
                      size={14}
                      style={{ transform: "rotate(180deg)" }}
                    />
                  ),
                  disabled: !activeAccountId || restoringFileId === file.rowKey,
                  ariaLabel: `Restore ${file.name}`,
                  onClick: () => {
                    void handleRestoreFile(file);
                  },
                })}

                {renderMenuItem({
                  label: deletingPermanentFileId === file.rowKey
                    ? "Deleting..."
                    : "Delete Permanently",
                  icon: <Trash2 size={14} />,
                  disabled: deletingPermanentFileId === file.rowKey,
                  danger: true,
                  ariaLabel: `Delete permanently ${file.name}`,
                  onClick: () => {
                    void handleDeletePermanentlyFile(file);
                  },
                })}
              </>
            ) : null}


            {driveListMode !== "trash" && driveListMode === "files" && isGDriveFileIdValid ? (
              renderMenuItem({
                label: trashingFileId === file.rowKey ? "Trashing..." : "Trash",
                icon: <Trash2 size={14} />,
                disabled: !activeAccountId || trashingFileId === file.rowKey,
                danger: true,
                ariaLabel: `Trash ${file.name}`,
                  onClick: () => {
                    setSelectedFileForTrash(file);
                    setTrashError("");
                    closeActionMenu();
                    setIsTrashModalOpen(true);
                  },
              })
            ) : null}


            {(shareError ||
              trashError ||
              restoreError ||
              permanentDeleteError) &&
            openActionFileId === file.rowKey ? (
              <div
                className="mt-2 w-full rounded-lg px-2 py-1 text-[10px] font-semibold"
                style={{
                  background:
                    restoreError ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)",
                  color: restoreError ? "#22c55e" : "#ef4444",
                }}
                role="alert"
              >
                {shareError || trashError || permanentDeleteError || restoreError}
              </div>
            ) : null}

          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-hidden" style={{ background: colors.pageBg }}>

      {/* Hidden file input for Upload */}

      <input
        ref={uploadInputRef}
        type="file"
        onChange={handleUploadFileChange}
        style={{ display: "none" }}
      />


      {previewFile && previewModalMode === "minimized" ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed bottom-4 right-4 z-50"
          style={{
            background: colors.surfaceBg,
            border: `1px solid ${colors.border}`,
            borderRadius: 12,
            boxShadow: colors.shadow,
            width: 320,
            maxWidth: "calc(100vw - 32px)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center justify-between gap-3 px-3 py-2"
            style={{ borderBottom: `1px solid ${colors.border}` }}
          >
            <div className="min-w-0">
              <div className="truncate text-xs font-semibold" style={{ color: colors.title }}>
                {previewFile.name}
              </div>
              <div className="mt-0.5 text-[10px]" style={{ color: colors.muted2 }}>
                Preview minimized
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewModalMode("normal")}
                className="flex h-8 items-center justify-center rounded-lg px-2 text-xs font-semibold"
                style={{
                  background: `${accentColor}14`,
                  border: `1px solid ${accentColor}33`,
                  color: accentColor,
                }}
                aria-label="Restore preview"
                title="Restore preview"
              >
                Restore
              </button>

              <button
                type="button"
                onClick={closePreviewModal}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg font-bold"
                style={{
                  color: colors.muted2,
                  background: colors.panelBg,
                  border: `1px solid ${colors.border}`,
                }}
                aria-label="Close preview"
                title="Close preview"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {previewFile && previewModalMode !== "minimized" ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
          style={{
            background: resolvedTheme === "light" ? "rgba(15,23,42,0.35)" : "rgba(0,0,0,0.55)",
          }}
          onClick={closePreviewModal}
        >
          <div
            className="flex flex-col overflow-hidden rounded-xl border"
            style={{
              background: colors.surfaceBg,
              borderColor: colors.border,
              boxShadow: colors.shadow,
              width:
                previewModalMode === "maximized"
                  ? "calc(100vw - 8px)"
                  : "min(1120px, calc(100vw - 48px))",
              height:
                previewModalMode === "maximized"
                  ? "calc(100vh - 8px)"
                  : "min(82vh, 760px)",
              maxWidth: "none",
              maxHeight: "none",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Viewer-style header/top menu bar (preview only) */}
            <div className="flex flex-col" style={{ borderBottom: `1px solid ${colors.border}` }}>
              {/* Top menu bar */}
              <div
                className="flex items-start justify-between gap-3 px-3"
                style={{ paddingTop: 6, paddingBottom: 8 }}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="min-w-0">
                    <div
                      className="truncate text-sm font-semibold"
                      style={{ color: colors.title }}
                      title={previewFile.name}
                    >
                      {previewFile.name}
                    </div>
                  </div>
                </div>

                <div className="hidden" />
              </div>

              {/* Action toolbar bar */}
              <div
                className="flex items-center justify-between gap-3 px-3"
                style={{ paddingTop: 4, paddingBottom: 0 }}
              >
                <div className="min-w-0">
                  <div
                    className="truncate text-xs font-semibold"
                    style={{ color: colors.muted2 }}
                  >
                    Preview
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!previewFile) return;
                      void downloadFile(previewFile);
                    }}
                    disabled={
                      downloadingFileId === previewFile?.rowKey ||
                      !previewFile?.accountId ||
                      !previewFile?.id
                    }
                    className="flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold"
                    style={{
                      background: `${accentColor}14`,
                      border: `1px solid ${accentColor}33`,
                      color: accentColor,
                      opacity:
                        downloadingFileId === previewFile?.rowKey ||
                        !previewFile?.accountId ||
                        !previewFile?.id
                          ? 0.65
                          : 1,
                      cursor:
                        downloadingFileId === previewFile?.rowKey ||
                        !previewFile?.accountId ||
                        !previewFile?.id
                          ? "not-allowed"
                          : "pointer",
                    }}
                    title="Download"
                    aria-label="Download preview file"
                  >
                    <Download size={14} />
                  </button>

                  {/* Image-only zoom controls (body render unchanged) */}
                  {(() => {
                    const previewHeaderKind = previewFile
                      ? resolvePreviewContentKind(
                          previewFile,
                          previewContentType || "",
                        )
                      : "unsupported";
                    const isPreviewImage = previewHeaderKind === "image";

                    if (!isPreviewImage) {
                      return null;
                    }

                    const canZoomOut = previewImageScale > PREVIEW_IMAGE_MIN_SCALE;
                    const canZoomIn = previewImageScale < PREVIEW_IMAGE_MAX_SCALE;
                    const canReset = Math.abs(previewImageScale - 1) > 0.001;
                    const zoomLabel = `${Math.round(previewImageScale * 100)}%`;

                    return (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImageScaleFromAnchor(
                              previewImageScale - PREVIEW_IMAGE_ZOOM_STEP,
                            )
                          }
                          disabled={!canZoomOut}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
                          style={{
                            color: colors.muted2,
                            background: colors.panelBg,
                            border: `1px solid ${colors.border}`,
                            opacity: canZoomOut ? 1 : 0.5,
                            cursor: canZoomOut ? "pointer" : "not-allowed",
                          }}
                          aria-label="Zoom out"
                          title="Zoom out"
                        >
                          <ZoomOut size={15} />
                        </button>

                        <button
                          type="button"
                          onClick={resetPreviewImageZoom}
                          disabled={!canReset}
                          className="flex h-8 w-[76px] items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold"
                          style={{
                            color: colors.muted2,
                            background: colors.panelBg,
                            border: `1px solid ${colors.border}`,
                            opacity: canReset ? 1 : 0.5,
                            cursor: canReset ? "pointer" : "not-allowed",
                          }}
                          aria-label="Reset zoom"
                          title="Reset zoom"
                        >
                          <RotateCcw size={13} />
                          <span>{zoomLabel}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImageScaleFromAnchor(
                              previewImageScale + PREVIEW_IMAGE_ZOOM_STEP,
                            )
                          }
                          disabled={!canZoomIn}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
                          style={{
                            color: colors.muted2,
                            background: colors.panelBg,
                            border: `1px solid ${colors.border}`,
                            opacity: canZoomIn ? 1 : 0.5,
                            cursor: canZoomIn ? "pointer" : "not-allowed",
                          }}
                          aria-label="Zoom in"
                          title="Zoom in"
                        >
                          <ZoomIn size={15} />
                        </button>
                      </>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => setPreviewModalMode("minimized")}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
                    style={{
                      color: colors.muted2,
                      background: colors.panelBg,
                      border: `1px solid ${colors.border}`,
                    }}
                    aria-label="Minimize preview"
                    title="Minimize preview"
                  >
                    <Minus size={15} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setPreviewModalMode((mode) =>
                        mode === "maximized" ? "normal" : "maximized",
                      )
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
                    style={{
                      color: colors.muted2,
                      background: colors.panelBg,
                      border: `1px solid ${colors.border}`,
                    }}
                    aria-label={
                      previewModalMode === "maximized"
                        ? "Restore preview size"
                        : "Maximize preview"
                    }
                    title={
                      previewModalMode === "maximized"
                        ? "Restore preview size"
                        : "Maximize preview"
                    }
                  >
                    {previewModalMode === "maximized" ? (
                      <Minimize2 size={15} />
                    ) : (
                      <Maximize2 size={15} />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={closePreviewModal}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
                    style={{
                      color: colors.muted2,
                      background: colors.panelBg,
                      border: `1px solid ${colors.border}`,
                    }}
                    aria-label="Close preview"
                    title="Close preview"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3">
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
                  className="flex min-h-0 flex-1 overflow-hidden rounded-xl border"
                  style={{
                    borderColor: colors.border,
                    background: resolvedTheme === "light" ? "#fff" : colors.softBg,
                  }}
                >
                  <div className="min-h-0 w-full flex-1 overflow-auto">
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
                          <div
                            ref={previewImageViewportRef}
                            className="h-full w-full overflow-hidden"
                            style={{
                              minHeight: 520,
                              cursor: isPreviewImageDragging
                                ? "grabbing"
                                : previewImageScale > 1
                                  ? "grab"
                                  : "zoom-in",
                              overscrollBehavior: "contain",
                              position: "relative",
                              touchAction: "none",
                              userSelect: "none",
                            }}
                            onWheel={handlePreviewImageWheel}
                            onPointerDown={handlePreviewImagePointerDown}
                            onPointerMove={handlePreviewImagePointerMove}
                            onPointerUp={finishPreviewImageDrag}
                            onPointerCancel={finishPreviewImageDrag}
                            onLostPointerCapture={finishPreviewImageDrag}
                          >
                            <div className="flex min-h-full min-w-full items-center justify-center p-3">
                              <img
                                key={previewUrl || previewFile?.id}
                                ref={previewImageRef}
                                src={previewUrl}
                                alt={previewFile?.name ?? "Preview"}
                                onLoad={updatePreviewImageFitSize}
                                onDoubleClick={handlePreviewImageDoubleClick}
                                draggable={false}
                                className="block object-contain"
                                style={{
                                  width: previewImageFitSize
                                    ? `${previewImageFitSize.width}px`
                                    : "auto",
                                  height: previewImageFitSize
                                    ? `${previewImageFitSize.height}px`
                                    : "auto",
                                  maxWidth: "none",
                                  maxHeight: "none",
                                  transform: `translate3d(${previewImageOffset.x}px, ${previewImageOffset.y}px, 0) scale(${previewImageScale})`,
                                  transformOrigin: "center center",
                                  willChange: "transform",
                                }}
                              />
                            </div>
                          </div>
                        );
                      }


                      if (previewUrl && kind === "pdf") {
                        return (
                          <div key={previewUrl || previewFile?.id} className="h-full min-h-0">
                            <iframe
                              title="PDF preview"
                              src={`${previewUrl}#toolbar=1&navpanes=0&scrollbar=1`}
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
                          Preview unavailable. Use Download instead.
                        </div>
                      );
                    })()}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Trash Confirmation Modal */}
      {isTrashModalOpen && selectedFileForTrash && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gdrive-trash-confirm-title"
          onClick={() => {
            setIsTrashModalOpen(false);
            setSelectedFileForTrash(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border bg-[#0f1729] p-6"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="gdrive-trash-confirm-title"
                  className="text-sm font-semibold"
                  style={{ color: "#e2e8f0" }}
                >
                  Pindahkan file ke Trash?
                </h2>
                <p className="mt-2 text-xs" style={{ color: "#94a3b8" }}>
                  File "{selectedFileForTrash.name}" akan dipindahkan ke Trash.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsTrashModalOpen(false);
                  setSelectedFileForTrash(null);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                style={{
                  background: "#0d1829",
                  border: "1px solid #1a2540",
                  color: "#94a3b8",
                }}
                aria-label="Tutup modal trash"
              >
                &times;
              </button>
            </div>

            {trashingFileId === selectedFileForTrash.rowKey && (
              <div
                className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs flex items-center gap-2"
                style={{ color: "#67e8f9" }}
                role="status"
              >
                <LoadingSpinner size={12} />
                Memindahkan file ke Trash...
              </div>
            )}

            {trashError && (
              <div className="mb-3 text-xs" style={{ color: "#ef4444" }} role="alert">
                {trashError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={trashingFileId === selectedFileForTrash.rowKey}
                onClick={() => {
                  setIsTrashModalOpen(false);
                  setSelectedFileForTrash(null);
                }}
                className="px-3 py-2 rounded-xl text-xs font-medium"
                style={{
                  background: "#0f1729",
                  color: "#e2e8f0",
                  border: `1px solid ${colors.border}`,
                  opacity: trashingFileId === selectedFileForTrash.rowKey ? 0.6 : 1,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={trashingFileId === selectedFileForTrash.rowKey}
                onClick={() => void handleConfirmTrashFile()}
                className="px-3 py-2 rounded-xl text-xs font-semibold"
                style={{
                  background: "#f87171",
                  border: `1px solid rgba(248,113,113,0.4)`,
                  color: "#fff",
                  opacity: trashingFileId === selectedFileForTrash.rowKey ? 0.75 : 1,
                }}
              >
                {trashingFileId === selectedFileForTrash.rowKey ? "Trashing..." : "Move to Trash"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isBulkTrashModalOpen && checkedRowKeys.length > 0 && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gdrive-bulk-trash-confirm-title"
          onClick={() => setIsBulkTrashModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border bg-[#0f1729] p-6"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="gdrive-bulk-trash-confirm-title"
                  className="text-sm font-semibold"
                  style={{ color: "#e2e8f0" }}
                >
                  Pindahkan file terpilih ke Trash?
                </h2>
                <p className="mt-2 text-xs" style={{ color: "#94a3b8" }}>
                  {checkedRowKeys.length} file akan dipindahkan ke Trash.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsBulkTrashModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                style={{
                  background: "#0d1829",
                  border: "1px solid #1a2540",
                  color: "#94a3b8",
                }}
                aria-label="Tutup modal bulk trash"
              >
                &times;
              </button>
            </div>

            {bulkTrashLoading && (
              <div
                className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs flex items-center gap-2"
                style={{ color: "#67e8f9" }}
                role="status"
              >
                <LoadingSpinner size={12} />
                Memindahkan file ke Trash...
              </div>
            )}

            {trashError && (
              <div className="mb-3 text-xs" style={{ color: "#ef4444" }} role="alert">
                {trashError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={bulkTrashLoading}
                onClick={() => setIsBulkTrashModalOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-medium"
                style={{
                  background: "#0f1729",
                  color: "#e2e8f0",
                  border: `1px solid ${colors.border}`,
                  opacity: bulkTrashLoading ? 0.6 : 1,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={bulkTrashLoading}
                onClick={() => void handleConfirmBulkTrash()}
                className="px-3 py-2 rounded-xl text-xs font-semibold"
                style={{
                  background: "#f87171",
                  border: `1px solid rgba(248,113,113,0.4)`,
                  color: "#fff",
                  opacity: bulkTrashLoading ? 0.75 : 1,
                }}
              >
                {bulkTrashLoading ? "Trashing..." : "Move to Trash"}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {isRenameModalOpen && selectedFileForRename ? (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: "rgba(0, 0, 0, 0.5)", zIndex: 99999 }}
          onClick={() => setIsRenameModalOpen(false)}
        >
          <div
            className="rounded-2xl border p-6 w-full max-w-sm"
            style={{
              background: colors.panelBg,
              borderColor: colors.border,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <div className="text-base font-semibold" style={{ color: colors.title }}>
                Rename File
              </div>
              <div className="mt-1 text-xs" style={{ color: colors.muted }}>
                {selectedFileForRename.name}
              </div>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleRenameFile();
              }}
            >
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Enter new file name"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{
                  borderColor: renameError ? "#ef4444" : colors.border,
                  background: colors.inputBg,
                  color: colors.text,
                }}
                autoFocus
                disabled={renamingFileId !== null}
              />

              {renameError && (
                <div className="mt-2 text-xs" style={{ color: "#ef4444" }}>
                  {renameError}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsRenameModalOpen(false)}
                  disabled={renamingFileId !== null}
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold"
                  style={{
                    background: colors.panelBg,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                    cursor: renamingFileId !== null ? "not-allowed" : "pointer",
                    opacity: renamingFileId !== null ? 0.5 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameValue.trim() || renamingFileId !== null}
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold"
                  style={{
                    background: accentColor,
                    color: "#ffffff",
                    cursor: !renameValue.trim() || renamingFileId !== null ? "not-allowed" : "pointer",
                    opacity: !renameValue.trim() || renamingFileId !== null ? 0.5 : 1,
                  }}
                >
                  {renamingFileId ? "Renaming..." : "Rename"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isFolderModalOpen ? (
        <div
          className="fixed inset-0 flex items-center justify-center"
          style={{ background: "rgba(0, 0, 0, 0.5)", zIndex: 99999 }}
          onClick={closeFolderModal}
        >
          <div
            className="rounded-2xl border p-6 w-full max-w-sm"
            style={{
              background: colors.panelBg,
              borderColor: colors.border,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <div className="text-base font-semibold" style={{ color: colors.title }}>
                New Folder
              </div>
              <div className="mt-1 text-xs" style={{ color: colors.muted }}>
                Create a new folder in the current Google Drive folder.
              </div>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void submitFolderModal();
              }}
            >
              <input
                type="text"
                value={folderModalName}
                onChange={(e) => {
                  setFolderModalName(e.target.value);
                  if (folderModalError) setFolderModalError("");
                }}
                placeholder="Folder name"
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                style={{
                  borderColor: folderModalError ? "#ef4444" : colors.border,
                  background: colors.inputBg,
                  color: colors.text,
                }}
                autoFocus
                disabled={folderActionLoading}
              />

              {folderModalError && (
                <div className="mt-2 text-xs" style={{ color: "#ef4444" }}>
                  {folderModalError}
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={closeFolderModal}
                  disabled={folderActionLoading}
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold"
                  style={{
                    background: colors.panelBg,
                    border: `1px solid ${colors.border}`,
                    color: colors.text,
                    cursor: folderActionLoading ? "not-allowed" : "pointer",
                    opacity: folderActionLoading ? 0.5 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!folderModalName.trim() || folderActionLoading}
                  className="flex-1 rounded-lg px-3 py-2 text-sm font-semibold"
                  style={{
                    background: accentColor,
                    color: "#ffffff",
                    cursor: !folderModalName.trim() || folderActionLoading ? "not-allowed" : "pointer",
                    opacity: !folderModalName.trim() || folderActionLoading ? 0.5 : 1,
                  }}
                >
                  {folderActionLoading ? "Creating..." : "Create Folder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside
          className="min-h-0 overflow-y-auto border-r p-3 nimbus-scrollbar"
          style={{ background: colors.sidebarBg, borderColor: colors.border }}
        >
          <div className="mb-3 flex items-center justify-between rounded-2xl border px-3 py-3" style={{ background: colors.cardBg, borderColor: colors.border }}>
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
                background: connectingAccount ? `${accentColor}12` : colors.buttonSoftBg,
                border: `1px solid ${colors.border}`,
                color: accentColor,
                cursor: connectingAccount ? "not-allowed" : "pointer",
                opacity: connectingAccount ? 0.65 : 1,
              }}
            >
              {connectingAccount ? <LoadingSpinner size={12} color={accentColor} /> : <Plus size={15} />}
            </button>
          </div>

          {accountsLoading ? (
            <LoadingStateMessage
              message="Loading Drive accounts..."
              textColor={colors.muted}
              spinnerColor={accentColor}
              backgroundColor={colors.panelBg}
              borderColor={colors.border}
            />
          ) : accountsError ? (
            <InlineErrorMessage message="Failed to load Google Drive accounts." />
          ) : gdriveAccounts.length === 0 ? (
            <NoAccountsState
              title="No connected accounts yet."
              textColor={colors.muted}
              mutedColor={colors.muted2}
              backgroundColor={colors.panelBg}
              borderColor={colors.border}
            />
          ) : (
            <div className="space-y-2">
            <div className="space-y-2">
              {connectedAccounts.map((account, index) => renderAccountCard(account, index))}
            </div>

            {disconnectedAccounts.length > 0 ? (
              <div className="space-y-2 pt-3">
                <div className="text-[11px] font-semibold" style={{ color: colors.muted }}>
                  Disconnected accounts
                </div>
                <div className="space-y-2">
                  {disconnectedAccounts.map((account, index) => renderAccountCard(account, index))}
                </div>
                <div className="text-[10px]" style={{ color: colors.muted2 }}>
                  Revoked accounts cannot be used.
                </div>
              </div>
            ) : null}
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
              className="flex w-full shrink-0 flex-col gap-3 border-b px-5 py-3"
              style={{ background: colors.cardBg, borderColor: colors.border }}
            >
              {/* Row 1: search + controls (icon toggle, files/trash, refresh, upload, item count) */}
              <div className="flex w-full min-w-0 items-center gap-3">
                {/* Left: Search */}
                <div
                  className="flex min-w-0 items-center gap-3"
                  style={{ flex: "0 1 360px", maxWidth: 360, minWidth: 220 }}
                >
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
                        border: `1px solid ${colors.inputBorder}`,
                        color: colors.text,
                        caretColor: accentColor,
                      }}
                    />
                  </div>
                </div>

                <div style={{ flex: 1, minWidth: 0 }} />

                {/* Right: Controls */}
                <div
                  className="flex min-w-0 items-center gap-2 flex-shrink-0"
                  style={{
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                  }}
                >
                  <div
                    className="flex items-center rounded-lg overflow-hidden"
                    style={{
                      border: `1px solid ${colors.border}`,
                      background: colors.panelBg,
                    }}
                  >
                    <button
                      type="button"
                      title="List view"
                      aria-label="List view"
                      onClick={() => setViewMode("list")}
                      className="flex h-9 items-center justify-center px-3"
                      style={{
                        background:
                          viewMode === "list"
                            ? `linear-gradient(135deg, ${accentColor}, #22d3ee)`
                            : "transparent",
                        color: viewMode === "list" ? "#ffffff" : colors.muted,
                        boxShadow:
                          viewMode === "list" ? `0 8px 18px ${accentColor}22` : "none",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        borderRight:
                          viewMode === "list" ? `1px solid transparent` : `1px solid ${colors.border}`,
                      }}
                    >
                      <ListIcon size={14} />
                    </button>

                    <button
                      type="button"
                      title="Grid view"
                      aria-label="Grid view"
                      onClick={() => setViewMode("grid")}
                      className="flex h-9 items-center justify-center px-3"
                      style={{
                        background:
                          viewMode === "grid"
                            ? `linear-gradient(135deg, ${accentColor}, #22d3ee)`
                            : "transparent",
                        color: viewMode === "grid" ? "#ffffff" : colors.muted,
                        boxShadow:
                          viewMode === "grid" ? `0 8px 18px ${accentColor}22` : "none",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        borderLeft:
                          viewMode === "grid" ? `1px solid transparent` : `1px solid ${colors.border}`,
                      }}
                    >
                      <GridIcon size={14} />
                    </button>
                  </div>

                  <button
                    type="button"
                    title="Files"
                    onClick={() => {
                      setDriveListMode("files");
                      setGdriveFolderPath([]);
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
                      setGdriveFolderPath([]);
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
                    title="Tambah Folder"
                    disabled={driveListMode === "trash" || !activeAccountId}
                    onClick={openCreateFolderModal}
                    className="flex h-9 items-center justify-center rounded-full border px-3 text-xs font-semibold"
                    style={{
                      background:
                        driveListMode === "trash" || !activeAccountId
                          ? "transparent"
                          : `${accentColor}14`,
                      borderColor:
                        driveListMode === "trash" || !activeAccountId
                          ? colors.border
                          : `${accentColor}22`,
                      color:
                        driveListMode === "trash" || !activeAccountId
                          ? colors.muted2
                          : accentColor,
                      cursor:
                        driveListMode === "trash" || !activeAccountId
                          ? "not-allowed"
                          : "pointer",
                      opacity:
                        driveListMode === "trash" || !activeAccountId ? 0.65 : 1,
                      whiteSpace: "nowrap",
                      marginLeft: 0,
                    }}
                  >
                    <Plus size={13} className="mr-1" />
                    New Folder
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

                  <button
                    type="button"
                    title={isChecklistMode ? "Exit select mode" : "Enter select mode"}
                    onClick={() => {
                      const next = !isChecklistMode;
                      setIsChecklistMode(next);
                      if (!next) setCheckedRowKeys([]);
                    }}
                    className="flex h-9 items-center justify-center rounded-full border px-3 text-xs font-semibold"
                    style={{
                      background: isChecklistMode ? `${accentColor}14` : "transparent",
                      borderColor: isChecklistMode ? `${accentColor}22` : colors.border,
                      color: isChecklistMode ? accentColor : colors.muted,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      marginLeft: 8,
                    }}
                  >
                    {isChecklistMode ? "Selecting" : "Select"}
                  </button>

                </div>

              {checkedRowKeys.length > 0 ? (
                <div
                  className="mb-3 px-4 py-3 rounded-xl"
                  style={{ background: colors.panelBg, border: `1px solid ${colors.border}` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs" style={{ color: colors.muted }}>
                      <span style={{ color: colors.title, fontWeight: 700 }}>{checkedRowKeys.length}</span> file dipilih
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="px-3 py-2 rounded-lg text-xs font-semibold"
                        style={{
                          background: `linear-gradient(135deg, ${accentColor}, #22d3ee)`,
                          color: "#fff",
                          border: `1px solid ${accentColor}55`,
                        }}
                        disabled={bulkDownloadLoading}
                        onClick={() => void handleBulkDownload()}
                      >
                        {bulkDownloadLoading ? (
                          <>
                            <LoadingSpinner size={12} /> Memproses...
                          </>
                        ) : (
                          "Download"
                        )}
                      </button>

                      <button
                        type="button"
                        className="px-3 py-2 rounded-lg text-xs font-semibold"
                        style={{
                          background: "#f87171",
                          color: "#fff",
                          border: `1px solid rgba(248,113,113,0.4)`,
                        }}
                        disabled={bulkTrashLoading}
                        onClick={() => setIsBulkTrashModalOpen(true)}
                      >
                        {bulkTrashLoading ? "Trashing..." : "Move to Trash"}
                      </button>

                      <button
                        type="button"
                        className="px-3 py-2 rounded-lg text-xs font-medium"
                        style={{
                          background: colors.inputBg,
                          border: `1px solid ${colors.border}`,
                          color: colors.text,
                        }}
                        onClick={() => {
                          setCheckedRowKeys([]);
                          setIsChecklistMode(false);
                        }}
                      >
                        Clear
                      </button>
                      {bulkDownloadMessage ? (
                        <div className="mt-2 text-sm" style={{ color: "#ef4444" }}>
                          {bulkDownloadMessage}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

                  <div className="hidden shrink-0 text-[11px] md:block" style={{ color: colors.muted2, flexShrink: 0, whiteSpace: "nowrap" }}>
                    {activeAccount || anyFiles ? `${filteredFiles.length} item(s)` : ""}
                  </div>

                  {(uploadError || uploadSuccess) ? (
                    <StatusBadge
                      message={uploadError ? uploadError : uploadSuccess}
                      tone={uploadError ? "error" : "success"}
                      role="status"
                      ariaLive="polite"
                    />
                  ) : null}

              </div>

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
                        border: `1px solid ${
                          isActive ? `${accentColor}22` : "transparent"
                        }`,
                      }}
                    >
                      {Icon ? (
                        <Icon
                          size={12}
                          fill={item.key === "starred" ? "currentColor" : "none"}
                        />
                      ) : null}
                      {item.label}
                    </button>
                  );
                })}
              </div>

              {driveListMode === "files" && gdriveFolderPath.length > 0 ? (
                <div className="flex min-w-0 items-center gap-1 overflow-x-auto text-[9px] leading-none">
                  <button
                    type="button"
                    onClick={() => navigateToGDriveFolder(-1)}
                    className="shrink-0 px-0 py-0 font-medium"
                    style={{
                      background: "transparent",
                      color: accentColor,
                      border: "none",
                      lineHeight: 1,
                    }}
                  >
                    My Drive
                  </button>
                  {gdriveFolderPath.map((crumb, index) => {
                    const isLast = index === gdriveFolderPath.length - 1;

                    return (
                      <div key={crumb.id} className="flex min-w-0 items-center gap-1">
                        <span className="shrink-0" style={{ color: colors.muted2 }}>
                          /
                        </span>
                        <button
                          type="button"
                          onClick={() => navigateToGDriveFolder(index)}
                          disabled={isLast}
                          className="max-w-[120px] truncate px-0 py-0 font-medium"
                          style={{
                            background: "transparent",
                            color: isLast ? colors.title : colors.muted,
                            border: "none",
                            cursor: isLast ? "default" : "pointer",
                            lineHeight: 1,
                          }}
                          title={crumb.name}
                        >
                          {crumb.name}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}

            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 nimbus-scrollbar">
              <div
                className="overflow-hidden rounded-2xl border"
                style={{
                  background: colors.cardBg,
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
                  <FilesEmptyState
                    title={search.trim() ? "No matching Drive files" : "No Drive files found."}
                    description={search.trim()
                      ? "Try a different keyword or clear the search."
                      : "Try another tab or search query."}
                    textColor={colors.title}
                    mutedColor={colors.muted}
                    accentColor={accentColor}
                  />
                ) : (
                  viewMode === "list" ? (
                    <>
                      <div className="overflow-x-auto">
                        <div style={{ minWidth: 820 }}>
                          {folderItems.length > 0 ? (
                            <div>
                              <div
                                className="px-3 py-2 text-xs font-semibold"
                                style={{
                                  color: colors.header,
                                  background: colors.panelBg,
                                  borderBottom: `1px solid ${colors.border}`,
                                }}
                              >
                                Folders
                              </div>

                              <div
                                className="grid items-center px-3 py-2 text-[11px] font-semibold"
                                style={{
                                  gridTemplateColumns: effectiveTableGridTemplate,
                                  color: colors.header,
                                  background: colors.panelBg,
                                  borderBottom: `1px solid ${colors.border}`,
                                }}
                              >
                                {isChecklistMode ? (
                                  <span>
                                    <input
                                      type="checkbox"
                                      aria-label="Select all visible files"
                                      checked={
                                        folderItems.concat(regularFileItems).length > 0 &&
                                        checkedRowKeys.length ===
                                          folderItems.concat(regularFileItems).length
                                      }
                                      onChange={() => {
                                        const all = folderItems.concat(regularFileItems).map((f) => f.rowKey);
                                        if (checkedRowKeys.length === all.length) {
                                          setCheckedRowKeys([]);
                                        } else {
                                          setCheckedRowKeys(all);
                                        }
                                      }}
                                    />
                                  </span>
                                ) : null}

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
                                  role="button"
                                  tabIndex={0}
                                  className="group grid items-center px-3 py-2 transition-colors"
                                  style={{
                                      gridTemplateColumns: effectiveTableGridTemplate,
                                      background: colors.cardBg,
                                      borderBottom: `1px solid ${colors.border}`,
                                      color: colors.text,
                                      cursor: "pointer",
                                    }}
                                  onContextMenu={(event) => handleFileContextMenu(event, file)}
                                  onClick={(event) => {
                                    if (isGDriveInteractiveClickTarget(event.target)) return;
                                    openGDriveFolder(file);
                                  }}
                                  onKeyDown={(event) => {
                                    if (isGDriveInteractiveClickTarget(event.target)) return;
                                    if (event.key !== "Enter" && event.key !== " ") return;
                                    event.preventDefault();
                                    openGDriveFolder(file);
                                  }}
                                  onMouseEnter={(event) => {
                                    event.currentTarget.style.background = colors.rowHover;
                                  }}
                                  onMouseLeave={(event) => {
                                    event.currentTarget.style.background = colors.cardBg;
                                  }}
                                >
                                  {isChecklistMode ? (
                                    <div>
                                      <input
                                        type="checkbox"
                                        checked={checkedRowKeys.includes(file.rowKey)}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          const next = checkedRowKeys.includes(file.rowKey)
                                            ? checkedRowKeys.filter((k) => k !== file.rowKey)
                                            : [...checkedRowKeys, file.rowKey];
                                          setCheckedRowKeys(next);
                                        }}
                                      />
                                    </div>
                                  ) : null}
                                  <div className="flex min-w-0 items-center gap-3">
                                    {renderFileIcon(file, colors)}
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
                                    <div
                                      className="truncate text-[11px] font-semibold"
                                      style={{ color: colors.title }}
                                    >
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
                                  style={{
                                    color: colors.header,
                                    background: colors.panelBg,
                                    borderBottom: `1px solid ${colors.border}`,
                                  }}
                                >
                                  Files
                                </div>

                              <div
                                className="grid items-center px-3 py-2 text-[11px] font-semibold"
                                style={{
                                  gridTemplateColumns: effectiveTableGridTemplate,
                                  color: colors.header,
                                  background: colors.panelBg,
                                  borderBottom: `1px solid ${colors.border}`,
                                }}
                              >
                                {isChecklistMode ? (
                                  <span>
                                    <input
                                      type="checkbox"
                                      aria-label="Select all visible files"
                                      checked={
                                        folderItems.concat(regularFileItems).length > 0 &&
                                        checkedRowKeys.length ===
                                          folderItems.concat(regularFileItems).length
                                      }
                                      onChange={() => {
                                        const all = folderItems.concat(regularFileItems).map((f) => f.rowKey);
                                        if (checkedRowKeys.length === all.length) {
                                          setCheckedRowKeys([]);
                                        } else {
                                          setCheckedRowKeys(all);
                                        }
                                      }}
                                    />
                                  </span>
                                ) : null}

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
                                    gridTemplateColumns: effectiveTableGridTemplate,
                                    background: colors.cardBg,
                                    borderBottom: `1px solid ${colors.border}`,
                                    color: colors.text,
                                  }}
                                  onContextMenu={(event) => handleFileContextMenu(event, file)}
                                  onMouseEnter={(event) => {
                                    event.currentTarget.style.background = colors.rowHover;
                                  }}
                                  onMouseLeave={(event) => {
                                    event.currentTarget.style.background = colors.cardBg;
                                  }}
                                >
                                  {isChecklistMode ? (
                                    <div>
                                      <input
                                        type="checkbox"
                                        checked={checkedRowKeys.includes(file.rowKey)}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          const next = checkedRowKeys.includes(file.rowKey)
                                            ? checkedRowKeys.filter((k) => k !== file.rowKey)
                                            : [...checkedRowKeys, file.rowKey];
                                          setCheckedRowKeys(next);
                                        }}
                                      />
                                    </div>
                                  ) : null}
                                  <div className="flex min-w-0 items-center gap-3">
                                    {renderFileIcon(file, colors)}
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
                                    <div
                                      className="truncate text-[11px] font-semibold"
                                      style={{ color: colors.title }}
                                    >
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
                    </>
                  ) : viewMode === "grid" ? (
                    <>
                      {folderItems.length > 0 ? (
                        <div>
                          <div
                            className="px-3 py-2 text-xs font-semibold"
                            style={{
                              color: colors.header,
                              background: colors.panelBg,
                              borderBottom: `1px solid ${colors.border}`,
                            }}
                          >
                            Folders
                          </div>

                          <div
                            style={{
                              padding: 12,
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fill, minmax(180px, 1fr))",
                              gap: 12,
                            }}
                          >
                            {folderItems.map((file) => (
                              <div
                                key={file.rowKey}
                                role="button"
                                tabIndex={0}
                                className="group relative rounded-xl border"
                                style={{
                                  background: colors.cardBg,
                                  borderColor: colors.border,
                                  padding: 12,
                                  color: colors.text,
                                  cursor: "pointer",
                                }}
                                onContextMenu={(event) => handleFileContextMenu(event, file)}
                                onClick={(event) => {
                                  if (isGDriveInteractiveClickTarget(event.target)) return;
                                  openGDriveFolder(file);
                                }}
                                onKeyDown={(event) => {
                                  if (isGDriveInteractiveClickTarget(event.target)) return;
                                  if (event.key !== "Enter" && event.key !== " ") return;
                                  event.preventDefault();
                                  openGDriveFolder(file);
                                }}
                              >
                                {isChecklistMode ? (
                                  <div style={{ position: "absolute", left: 8, top: 8 }}>
                                    <input
                                      type="checkbox"
                                      checked={checkedRowKeys.includes(file.rowKey)}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        const next = checkedRowKeys.includes(file.rowKey)
                                          ? checkedRowKeys.filter((k) => k !== file.rowKey)
                                          : [...checkedRowKeys, file.rowKey];
                                        setCheckedRowKeys(next);
                                      }}
                                    />
                                  </div>
                                ) : null}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex min-w-0 items-center gap-3">
                                    {renderFileIcon(file, colors)}
                                    <div className="min-w-0">
                                      <div
                                        className="flex min-w-0 items-center gap-2"
                                        style={{ color: colors.title }}
                                      >
                                        <span
                                          className="truncate text-xs font-medium"
                                          title={file.name}
                                        >
                                          {file.name}
                                        </span>
                                        {file.starred ? (
                                          <Star size={13} fill="#f59e0b" style={{ color: "#f59e0b" }} />
                                        ) : null}
                                      </div>
                                      <div
                                        className="mt-1 truncate text-[10px] font-semibold"
                                        style={{ color: colors.muted2 }}
                                        title={getGDriveFileTypeInfo(file).detail}
                                      >
                                        {getGDriveFileTypeInfo(file).label}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="shrink-0">
                                    {renderFileActions(file)}
                                  </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div
                                      className="truncate text-[10px] font-semibold"
                                      style={{ color: colors.muted2 }}
                                    >
                                      {file.shared ? "Shared" : "Private"}
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-[10px]" style={{ color: colors.muted }}>
                                    {formatDate(file.recentAt)}
                                  </div>
                                </div>

                                <div className="mt-1 text-[10px]" style={{ color: colors.muted }}>
                                  {formatBytes(file.sizeBytes)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      {regularFileItems.length > 0 ? (
                        <div>
                          <div
                            className="px-3 py-2 text-xs font-semibold"
                            style={{
                              color: colors.header,
                              background: colors.panelBg,
                              borderBottom: `1px solid ${colors.border}`,
                            }}
                          >
                            Files
                          </div>

                          <div
                            style={{
                              padding: 12,
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fill, minmax(180px, 1fr))",
                              gap: 12,
                            }}
                          >
                            {regularFileItems.map((file) => (
                              <div
                                key={file.rowKey}
                                className="group relative rounded-xl border"
                                style={{
                                  background: colors.cardBg,
                                  borderColor: colors.border,
                                  padding: 12,
                                  color: colors.text,
                                }}
                                onContextMenu={(event) => handleFileContextMenu(event, file)}
                              >
                                {isChecklistMode ? (
                                  <div style={{ position: "absolute", left: 8, top: 8 }}>
                                    <input
                                      type="checkbox"
                                      checked={checkedRowKeys.includes(file.rowKey)}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        const next = checkedRowKeys.includes(file.rowKey)
                                          ? checkedRowKeys.filter((k) => k !== file.rowKey)
                                          : [...checkedRowKeys, file.rowKey];
                                        setCheckedRowKeys(next);
                                      }}
                                    />
                                  </div>
                                ) : null}
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex min-w-0 items-center gap-3">
                                    {renderFileIcon(file, colors)}
                                    <div className="min-w-0">
                                      <div
                                        className="flex min-w-0 items-center gap-2"
                                        style={{ color: colors.title }}
                                      >
                                        <span
                                          className="truncate text-xs font-medium"
                                          title={file.name}
                                        >
                                          {file.name}
                                        </span>
                                        {file.starred ? (
                                          <Star size={13} fill="#f59e0b" style={{ color: "#f59e0b" }} />
                                        ) : null}
                                      </div>
                                      <div
                                        className="mt-1 truncate text-[10px] font-semibold"
                                        style={{ color: colors.muted2 }}
                                        title={getGDriveFileTypeInfo(file).detail}
                                      >
                                        {getGDriveFileTypeInfo(file).label}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="shrink-0">
                                    {renderFileActions(file)}
                                  </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <div
                                      className="truncate text-[10px] font-semibold"
                                      style={{ color: colors.muted2 }}
                                    >
                                      {file.shared ? "Shared" : "Private"}
                                    </div>
                                  </div>
                                  <div className="shrink-0 text-[10px]" style={{ color: colors.muted }}>
                                    {formatDate(file.recentAt)}
                                  </div>
                                </div>

                                <div className="mt-1 text-[10px]" style={{ color: colors.muted }}>
                                  {formatBytes(file.sizeBytes)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </>
                  ) : null
                )}

                {(nextPageToken && !filesLoading && !filesError && gdriveFiles.length > 0) ? (
                  <div className="border-t px-4 py-4" style={{ borderColor: colors.border }}>
                    {loadMoreErrorMessage ? (
                      <div className="mb-3 text-sm" style={{ color: "#ef4444" }}>
                        {loadMoreErrorMessage}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      onClick={loadMoreGDriveFiles}
                      disabled={isLoadingMore}
                      className="rounded-full border px-4 py-2 text-sm font-semibold"
                      style={{
                        background: isLoadingMore ? colors.rowHover : colors.buttonSoftBg,
                        color: colors.text,
                        borderColor: colors.border,
                      }}
                    >
                      {isLoadingMore ? "Loading…" : "Load More"}
                    </button>
                  </div>
                ) : null}


              </div>

            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
