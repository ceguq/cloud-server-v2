import {
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";



type AppearanceTheme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

const PREVIEW_IMAGE_MIN_SCALE = 0.5;
const PREVIEW_IMAGE_MAX_SCALE = 4;
const PREVIEW_IMAGE_ZOOM_STEP = 0.1;

function clampPreviewImageScale(scale: number): number {
  return Math.min(
    PREVIEW_IMAGE_MAX_SCALE,
    Math.max(PREVIEW_IMAGE_MIN_SCALE, Number(scale.toFixed(2))),
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
  try {
    if (theme === "light" || theme === "dark") return theme;
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    return mq?.matches ? "dark" : "light";
  } catch {
    return "dark";
  }
}


function formatTime(seconds?: number | null): string {
  const s =
    typeof seconds === "number" && Number.isFinite(seconds) ? seconds : 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, "0")}`;
}

type AudioPreviewPlayerProps = {
  src: string | undefined;
  onError: (message: string) => void;
};

function AudioPreviewPlayer({ src, onError }: AudioPreviewPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Reset player state when src changes
  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    const el = audioRef.current;
    if (!el) return;

    el.pause();
    el.currentTime = 0;
  }, [src]);

  const togglePlayPause = async () => {
    const el = audioRef.current;
    if (!el) return;

    try {
      if (el.paused) {
        const p = el.play();
        if (p && typeof (p as Promise<void>).then === "function") {
          await p;
        }
        setIsPlaying(true);
      } else {
        el.pause();
        setIsPlaying(false);
      }
    } catch {
      onError("Gagal memuat preview audio.");
      setIsPlaying(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        borderRadius: "1rem",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.10)",
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <audio
          ref={audioRef}
          src={src ?? undefined}
          preload="metadata"
          className="hidden"
          onLoadedMetadata={() => {
            const el = audioRef.current;
            if (!el) return;
            setDuration(Number.isFinite(el.duration) ? el.duration : 0);
          }}
          onTimeUpdate={() => {
            const el = audioRef.current;
            if (!el) return;
            setCurrentTime(el.currentTime || 0);
          }}
          onEnded={() => {
            const el = audioRef.current;
            if (el) {
              el.currentTime = 0;
            }
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          onError={() => {
            onError("Gagal memuat preview audio.");
            setIsPlaying(false);
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Play button + decorative equalizer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              paddingTop: 2,
              paddingBottom: 2,
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: "rgba(59,130,246,0.14)",
                border: "1px solid rgba(59,130,246,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#60a5fa",
                flex: "0 0 auto",
                fontSize: 18,
              }}
              aria-hidden="true"
            >
              {"\u266A"}
            </div>

            <button
              type="button"
              onClick={() => void togglePlayPause()}
              style={{
                width: 54,
                height: 54,
                borderRadius: 999,
                border: "1px solid rgba(59,130,246,0.35)",
                background:
                  "linear-gradient(135deg, rgba(59,130,246,0.35), rgba(34,211,238,0.15))",
                color: "#e2e8f0",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              {isPlaying ? "\u23F8" : "\u25B6"}
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 4,
                height: 24,
                width: 120,
                opacity: isPlaying ? 1 : 0.6,
              }}
            >
              {Array.from({ length: 10 }).map((_, idx) => {
                const base = 6 + (idx % 5) * 3;
                const h = isPlaying ? base + (idx % 3) * 2 : base;
                const animate = isPlaying ? "pulse" : "none";
                const delay = `${idx * 60}ms`;
                return (
                  <div
                    key={idx}
                    style={{
                      width: 6,
                      height: h,
                      borderRadius: 999,
                      background: "rgba(96,165,250,0.75)",
                      animation: isPlaying
                        ? "bb-audio-eq 1.05s infinite ease-in-out"
                        : undefined,
                      animationDelay: isPlaying ? delay : undefined,
                      transition: "height 160ms ease",
                    }}
                    aria-hidden="true"
                  />
                );
              })}
            </div>
          </div>

          {/* Seek + time */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                color: "#94a3b8",
                fontSize: 12,
                width: 44,
                textAlign: "left",
              }}
            >
              {formatTime(currentTime)}
            </div>

            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={(e) => {
                const el = audioRef.current;
                if (!el) return;
                const v = Number(e.target.value);
                el.currentTime = Number.isFinite(v) ? v : 0;
                setCurrentTime(el.currentTime || 0);
              }}
              style={{ width: "100%" }}
              aria-label="Seek audio"
            />

            <div
              style={{
                color: "#94a3b8",
                fontSize: 12,
                width: 44,
                textAlign: "right",
              }}
            >
              {formatTime(duration)}
            </div>
          </div>
          </div>
      </div>

      <style>{`
        @keyframes bb-audio-eq {
          0% { transform: scaleY(0.75); opacity: 0.75; }
          50% { transform: scaleY(1.25); opacity: 1; }
          100% { transform: scaleY(0.85); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}

import {
  Folder,

  Upload,
  FolderPlus,
  Grid,
  List,
  Search,
  Filter,
  SortAsc,
  Eye,
  Download,
  Share2,
  Copy,
  FileText,
  Edit3,
  Trash2,
  Minus,
  Maximize2,
  Minimize2,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
  ChevronRight,
  Home,
  Star,
  Clock,
  MoreHorizontal,
  MoreVertical,
} from "lucide-react";
import folderService, {
  type Folder as FolderModel,
} from "../../services/folderService";
import fileService, { type FileModel } from "../../services/fileService";
import { useUploadManager } from "../upload/UploadManagerContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { FileTypeIcon } from "../components/FileTypeIcon";

import {
  getPublicShareUrl,
  createShareLink,
  deleteShareLink,
  getShareLinks,
  type ShareLink,
} from "../../services/shareService";

function formatBytes(bytes?: number | null): string {
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

function getTypeLabel(mime?: string | null): string {
  if (!mime) return "FILE";

  const normalized = String(mime).trim().toLowerCase();

  // Office (prefer explicit MIME when available)
  if (
    normalized === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalized === "application/msword" ||
    normalized.includes("wordprocessingml") ||
    normalized.includes("msword") ||
    normalized.includes("/word")
  ) {
    return "DOCX";
  }

  if (
    normalized === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    normalized === "application/vnd.ms-excel" ||
    normalized.includes("spreadsheetml") ||
    normalized.includes("/excel")
  ) {
    return "XLSX";
  }

  if (
    normalized === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    normalized === "application/vnd.ms-powerpoint" ||
    normalized.includes("presentationml") ||
    normalized.includes("/powerpoint")
  ) {
    return "PPTX";
  }

  // PDF
  if (
    normalized === "application/pdf" ||
    normalized.endsWith("/pdf") ||
    normalized.includes("+pdf")
  ) {
    return "PDF";
  }

  // Images
  if (
    normalized === "image/jpeg" ||
    normalized === "image/jpg" ||
    normalized.endsWith("/jpeg") ||
    normalized.endsWith("/jpg")
  ) {
    return "JPG";
  }

  if (normalized === "image/png" || normalized.endsWith("/png")) return "PNG";
  if (normalized === "image/webp" || normalized.endsWith("/webp")) return "WEBP";
  if (normalized === "image/gif" || normalized.endsWith("/gif")) return "GIF";
  if (normalized.startsWith("image/")) return "IMAGE";

  // Video
  if (normalized.startsWith("video/")) return "VIDEO";

  // Audio
  if (normalized.startsWith("audio/")) return "AUDIO";

  // Archives
  if (
    normalized === "application/zip" ||
    normalized.includes("/zip") ||
    normalized.includes("zip")
  ) {
    return "ZIP";
  }

  // Text / CSV / JSON / XML
  if (
    normalized.startsWith("text/") ||
    normalized.includes("json") ||
    normalized.includes("xml") ||
    normalized.includes("csv")
  ) {
    return "TXT";
  }

  return "FILE";
}


function fileTypeFilterLabel(
  value:
    | "all"
    | "folders"
    | "images"
    | "pdf"
    | "documents"
    | "videos"
    | "audio"
    | "archives"
    | "others",
): string {
  switch (value) {
    case "all":
      return "All";
    case "folders":
      return "Folders";
    case "images":
      return "Images";
    case "pdf":
      return "PDF";
    case "documents":
      return "Documents";
    case "videos":
      return "Videos";
    case "audio":
      return "Audio";
    case "archives":
      return "Archives";
    case "others":
      return "Others";
    default:
      return "All";
  }
}

export function MyFiles({
  filesRefreshKey,
  onStorageChanged,
}: {
  filesRefreshKey?: number;
  onStorageChanged?: () => void;
}) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const checklistVisibilityStyle = {
    visibility: isSelectionMode ? "visible" : "hidden",
    pointerEvents: isSelectionMode ? "auto" : "none",
  } as const;

  const [appearanceTheme, setAppearanceTheme] = useState<AppearanceTheme>(safeReadAppearanceTheme);

  const [accentColor, setAccentColor] = useState<string>(safeReadAccentColor);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
    resolveAppearanceTheme(safeReadAppearanceTheme()),
  );



  // filesRefreshKey changes should only refresh currentFolderId list
  // without changing active folder or causing request loops.

  const [openFolderActionId, setOpenFolderActionId] = useState<string | null>(
    null,
  );
  const [openFileActionId, setOpenFileActionId] = useState<string | null>(null);

  const [fileActionMenuPosition, setFileActionMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [folderActionMenuPosition, setFolderActionMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);


  // folder action menu helpers
  function openFolderMenuAtCursor(
    event: React.MouseEvent,
    folderId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();

    setOpenFileActionId(null);
    setFileActionMenuPosition(null);
    setFileActionFeedback(null);

    const menuWidth = 180;

    const menuHeight = 180;
    const rawX = event.clientX;
    const rawY = event.clientY;

    const x =
      typeof window !== "undefined"
        ? Math.min(rawX, window.innerWidth - menuWidth)
        : rawX;

    const y =
      typeof window !== "undefined"
        ? Math.min(rawY, window.innerHeight - menuHeight)
        : rawY;

    setOpenFolderActionId(folderId);
    setFolderActionMenuPosition({
      x: Math.max(8, x),
      y: Math.max(8, y),
    });
  }




  // click-outside untuk menu aksi file
  const fileMenuWrapRef = useRef<HTMLDivElement | null>(null);

  // click-outside untuk menu aksi folder (global)
  const folderMenuWrapRef = useRef<HTMLDivElement | null>(null);





  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchFocused, setSearchFocused] = useState<boolean>(false);

  const trimmedSearchQuery = searchQuery.trim();
  const isSearchActive = searchFocused || trimmedSearchQuery.length > 0;




  const [filterMenuOpen, setFilterMenuOpen] = useState<boolean>(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  const [fileTypeFilter, setFileTypeFilter] = useState<

    | "all"
    | "folders"
    | "images"
    | "pdf"
    | "documents"
    | "videos"
    | "audio"
    | "archives"
    | "others"
  >("all");

  const [sortMenuOpen, setSortMenuOpen] = useState<boolean>(false);

  const [sortBy, setSortBy] = useState<"name" | "date" | "size" | "type">(
    "name",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [moveDragDropEnabled, setMoveDragDropEnabled] = useState(true);
  const [dragMoveItem, setDragMoveItem] = useState<{
    type: "file" | "folder";
    id: string;
    name: string;
    fileIds?: string[];
    folderIds?: string[];
  } | null>(null);

  // Multi-select files (bulk actions)

  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(
    new Set(),
  );


  const clearSelection = () => setSelectedFileIds(new Set());

  // Multi-select folders (UI-only for now)
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(
    new Set(),
  );

  const clearFolderSelection = () => setSelectedFolderIds(new Set());

  const handleToggleSelectionMode = () => {
    setIsSelectionMode((current) => {
      if (current) {
        clearSelection();
        clearFolderSelection();
      }

      return !current;
    });
  };


  const toggleFolderSelection = (folderId: string) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) next.delete(fileId);
      else next.add(fileId);
      return next;
    });
  };

  // Files state

  const [files, setFiles] = useState<FileModel[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileError, setFileError] = useState<string>("");

  const [selectedFileForAction, setSelectedFileForAction] =
    useState<FileModel | null>(null);
  const [isFileRenameModalOpen, setIsFileRenameModalOpen] = useState(false);
  const [fileRenameName, setFileRenameName] = useState("");
  const [fileActionLoading, setFileActionLoading] = useState(false);
  const [previewingFileId, setPreviewingFileId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileModel | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewFileName, setPreviewFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);
  const [previewContentType, setPreviewContentType] = useState("");
  const [previewImageScale, setPreviewImageScale] = useState(1);
  const [previewImageOffset, setPreviewImageOffset] = useState({ x: 0, y: 0 });
  const [previewModalMode, setPreviewModalMode] = useState<
    "normal" | "maximized" | "minimized"
  >("normal");
  const previewImageViewportRef = useRef<HTMLDivElement | null>(null);
  const previewImageRef = useRef<HTMLImageElement | null>(null);

  // Text preview modal state
  const [previewText, setPreviewText] = useState<string>("");
  const [previewTextLoading, setPreviewTextLoading] = useState(false);
  const [previewTextError, setPreviewTextError] = useState<string>("");
  const [previewIsTextTooLarge, setPreviewIsTextTooLarge] = useState(false);

  const [fileModalError, setFileModalError] = useState("");

  // Share modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedFileForShare, setSelectedFileForShare] =
    useState<FileModel | null>(null);
  const [activeShareLink, setActiveShareLink] = useState<ShareLink | null>(
    null,
  );
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState("");
  const [copySuccess, setCopySuccess] = useState("");
  const [openSharePanelFileId, setOpenSharePanelFileId] = useState<string | null>(
    null,
  );
  const [fileShareLinksByFileId, setFileShareLinksByFileId] = useState<
    Record<string, ShareLink | null>
  >({});
  const [fileSharingActionId, setFileSharingActionId] = useState<string | null>(
    null,
  );
  const [fileActionFeedback, setFileActionFeedback] = useState<{
    fileId: string;
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [detailsItem, setDetailsItem] = useState<
    | { type: "file"; item: FileModel }
    | { type: "folder"; item: FolderModel }
    | null
  >(null);

  // Move modal state
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveItemType, setMoveItemType] = useState<"file" | "folder" | null>(
    null,
  );
  const [moveItemId, setMoveItemId] = useState<string | null>(null);
  const [moveItemName, setMoveItemName] = useState("");
  // Bulk move files (used only when moveItemType === "file")
  const [moveFileIds, setMoveFileIds] = useState<string[]>([]);
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(
    null,
  );
  const [moveLoading, setMoveLoading] = useState(false);
  const [moveError, setMoveError] = useState("");

  const [isFileDeleteModalOpen, setIsFileDeleteModalOpen] = useState(false);


  const [selectedFileForDelete, setSelectedFileForDelete] =
    useState<FileModel | null>(null);
  const [deleteFileLoading, setDeleteFileLoading] = useState(false);
  const [deleteFileError, setDeleteFileError] = useState("");
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteFileIds, setBulkDeleteFileIds] = useState<string[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteResult, setBulkDeleteResult] = useState<{
    okCount: number;
    failCount: number;
  } | null>(null);

  // Multi-select folders (bulk delete)
  const [isBulkFolderDeleteModalOpen, setIsBulkFolderDeleteModalOpen] =
    useState(false);
  const [bulkFolderDeleteIds, setBulkFolderDeleteIds] = useState<string[]>([]);
  const [bulkFolderDeleteLoading, setBulkFolderDeleteLoading] = useState(false);
  const [bulkFolderDeleteResult, setBulkFolderDeleteResult] = useState<{
    okCount: number;
    failCount: number;
  } | null>(null);

  const [bulkDownloadLoading, setBulkDownloadLoading] = useState(false);
  const [bulkDownloadResult, setBulkDownloadResult] = useState<{
    okCount: number;
    failCount: number;
  } | null>(null);

  const loadFiles = async (folderId: string | null, search?: string | null) => {
    try {
      setLoadingFiles(true);
      setFileError("");

      const keyword = search?.trim() ?? "";

      // If keyword exists, backend search disregards folderId.
      // If keyword empty, keep old behavior.
      const res = keyword
        ? await fileService.getFiles(null, keyword)
        : await fileService.getFiles(folderId);

      setFiles(res ?? []);
    } catch (e: any) {
      console.error(e);
      setFileError(
        e?.response?.data?.message || e?.message || "Gagal memuat files",
      );
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };


  const [folders, setFolders] = useState<FolderModel[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<FolderModel[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [folderError, setFolderError] = useState<string>("");
  const isSearchLoading =
    trimmedSearchQuery.length > 0 && (loadingFiles || loadingFolders);

  const loadFolders = async (
    parentId: string | null,
    search?: string | null,
  ) => {
    try {
      setLoadingFolders(true);
      setFolderError("");

      const keyword = search?.trim() ?? "";

      const res = keyword
        ? await folderService.getFolders(null, keyword)
        : await folderService.getFolders(parentId);

      setFolders(res ?? []);
    } catch (e: any) {
      console.error(e);
      setFolderError(
        e?.response?.data?.message || e?.message || "Gagal memuat folder",
      );
      setFolders([]);
    } finally {
      setLoadingFolders(false);
    }
  };

  const handleOpenFolder = async (folder: FolderModel) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => {
      const idx = prev.findIndex((b) => b.id === folder.id);
      if (idx >= 0) return prev.slice(0, idx + 1);
      return [...prev, folder];
    });

    // Selection harus dibersihkan saat folder berubah
    clearSelection();
    clearFolderSelection();

    await loadFolders(folder.id);
  };

  const handleBackToRoot = async () => {
    setCurrentFolderId(null);
    setBreadcrumbs([]);

    // Selection harus dibersihkan saat folder berubah
    clearSelection();
    clearFolderSelection();

    await loadFolders(null);
  };

  const handleBreadcrumbClick = async (id: string) => {
    const next = breadcrumbs.findIndex((b) => b.id === id);
    if (next < 0) return;

    const slice = breadcrumbs.slice(0, next + 1);
    setBreadcrumbs(slice);
    setCurrentFolderId(id);

    // Selection harus dibersihkan saat folder berubah
    clearSelection();
    clearFolderSelection();

    await loadFolders(id);
  };

  // Folder modal state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderModalMode, setFolderModalMode] = useState<"create" | "rename">(
    "create",
  );
  const [folderModalName, setFolderModalName] = useState("");
  const [selectedFolderForAction, setSelectedFolderForAction] =
    useState<FolderModel | null>(null);
  const [folderActionLoading, setFolderActionLoading] = useState(false);
  const [folderModalError, setFolderModalError] = useState("");

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedFolderForDelete, setSelectedFolderForDelete] =
    useState<FolderModel | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleConfirmDeleteFolder = async () => {
    if (!selectedFolderForDelete) return;

    try {
      setDeleteLoading(true);
      setDeleteError("");
      await folderService.deleteFolder(selectedFolderForDelete.id);
      await loadFolders(currentFolderId ?? null);
      await loadFiles(currentFolderId ?? null);
      setIsDeleteModalOpen(false);
      setSelectedFolderForDelete(null);
      setOpenFolderActionId(null);
    } catch (err: any) {
      setDeleteError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.folder?.[0] ||
          "Gagal menghapus folder.",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const openCreateFolderModal = () => {
    setFolderModalMode("create");
    setFolderModalName("");
    setFolderModalError("");
    setIsFolderModalOpen(true);
  };

  const openRenameFolderModal = (folder: FolderModel) => {
    setFolderModalMode("rename");
    setFolderModalName(folder.name);
    setFolderModalError("");
    setIsFolderModalOpen(true);
  };

  const openDeleteFolderModal = (folder: FolderModel) => {
    setSelectedFolderForDelete(folder);
    setDeleteError("");
    setIsDeleteModalOpen(true);
  };

  const closeFolderModal = () => {
    if (folderActionLoading) return;
    setIsFolderModalOpen(false);
  };

  const closeDeleteModal = () => {
    if (deleteLoading) return;
    setIsDeleteModalOpen(false);
  };

  const submitFolderModal = async () => {
    if (folderActionLoading) return;

    const name = folderModalName.trim();
    if (!name) {
      setFolderModalError("Nama folder tidak boleh kosong.");
      return;
    }

    try {
      setFolderActionLoading(true);
      setFolderModalError("");

      if (folderModalMode === "create") {
        await folderService.createFolder(name, currentFolderId ?? null);
      } else {
        if (!selectedFolderForAction) return;
        await folderService.renameFolder(selectedFolderForAction.id, name);
      }

      await loadFolders(currentFolderId ?? null);
      setIsFolderModalOpen(false);
    } catch (e: any) {
      console.error(e);
      setFolderModalError(
        e?.response?.data?.message || e?.message || "Gagal memproses folder",
      );
    } finally {
      setFolderActionLoading(false);
    }
  };

  const submitDeleteModal = async () => {
    if (deleteLoading) return;

    if (!selectedFolderForDelete) return;

    try {
      setDeleteLoading(true);
      setDeleteError("");
      await folderService.deleteFolder(selectedFolderForDelete.id);
      await loadFolders(currentFolderId ?? null);
      setIsDeleteModalOpen(false);
    } catch (e: any) {
      console.error(e);
      setDeleteError(
        e?.response?.data?.message || e?.message || "Gagal menghapus folder",
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  const closePreviewModal = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
    }

    setPreviewModalOpen(false);
    setPreviewFile(null);
    setPreviewModalMode("normal");
    setPreviewImageScale(1);
    setPreviewImageOffset({ x: 0, y: 0 });
    setPreviewUrl(undefined);
    setPreviewFileName("");
    setPreviewContentType("");
    setPreviewFile(null);

    // text preview cleanup
    setPreviewText("");
    setPreviewTextLoading(false);
    setPreviewTextError("");
    setPreviewIsTextTooLarge(false);
  };

  const handleDownloadFile = async (file: FileModel | null) => {
    if (!file) return;
    try {
      await fileService.downloadFile(file.id, file.original_name);
    } catch {
      setFileError("Gagal mendownload file.");
    }
  };

  const setPreviewImageScaleFromAnchor = (
    nextScaleValue: number,
    anchorPoint?: { clientX: number; clientY: number },
  ) => {
    const oldScale = previewImageScale;
    const nextScale = clampPreviewImageScale(nextScaleValue);

    if (nextScale === oldScale) return;

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
    setPreviewImageScale(1);
    setPreviewImageOffset({ x: 0, y: 0 });
  };

  const handlePreviewImageWheel = (
    event: ReactWheelEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (event.deltaY === 0) return;

    setPreviewImageScaleFromAnchor(
      previewImageScale +
        (event.deltaY < 0 ? PREVIEW_IMAGE_ZOOM_STEP : -PREVIEW_IMAGE_ZOOM_STEP),
      { clientX: event.clientX, clientY: event.clientY },
    );
  };

  const getPreviewContentTypeFromFileName = (
    fileName: string,
    contentType?: string,
  ) => {
    const normalized = (contentType || "").toLowerCase();
    if (normalized && normalized !== "application/octet-stream") {
      return normalized;
    }

    const ext = fileName.toLowerCase().split(".").pop() ?? "";
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
      case "txt":
      case "log":
      case "md":
      case "markdown":
        return "text/plain";
      case "json":
        return "application/json";
      case "xml":
        return "application/xml";
      case "js":
        return "application/javascript";
      case "ts":
        return "application/typescript";
      case "css":
        return "text/css";
      case "html":
        return "text/html";
      case "csv":
        return "text/csv";
      default:
        return normalized || "application/octet-stream";
    }
  };

  const handlePreviewFile = async (file: FileModel) => {
    try {
      setPreviewFile(file);
      setPreviewingFileId(file.id);
      setFileError("");

      const { blob, contentType } = await fileService.getFilePreviewBlob(
        file.id,
      );

      const resolvedContentType = getPreviewContentTypeFromFileName(
        file.original_name,
        contentType,
      );
      const normalizedContentType = resolvedContentType.toLowerCase();

      // Text preview (no object URL)
      const isTextType =
        normalizedContentType.startsWith("text/") ||
        normalizedContentType === "application/json" ||
        normalizedContentType === "application/xml" ||
        normalizedContentType === "application/javascript" ||
        normalizedContentType === "application/x-javascript" ||
        normalizedContentType === "application/typescript";

      if (isTextType) {
        try {
          setPreviewTextLoading(true);
          setPreviewTextError("");
          setPreviewIsTextTooLarge(false);
          setFileError("");

          if (blob.size > 1_000_000) {
            setPreviewIsTextTooLarge(true);
            setPreviewTextError(
              "Preview text terlalu besar. Silakan download file untuk melihat isinya.",
            );
            setPreviewText("");
          } else {
            const text = await blob.text();
            setPreviewText(text);
          }

          setPreviewFileName(file.original_name);
          setPreviewContentType(resolvedContentType);
          setPreviewUrl(undefined);
          setPreviewModalMode("normal");
          setPreviewImageScale(1);
          setPreviewImageOffset({ x: 0, y: 0 });
          setPreviewModalOpen(true);
          return;
        } catch {
          setPreviewTextError("Gagal memuat preview text.");
          setPreviewText("");
          setPreviewIsTextTooLarge(false);
          setPreviewFileName(file.original_name);
          setPreviewContentType(resolvedContentType);
          setPreviewUrl(undefined);
          setPreviewModalMode("normal");
          setPreviewImageScale(1);
          setPreviewImageOffset({ x: 0, y: 0 });
          setPreviewModalOpen(true);
          return;
        } finally {
          setPreviewTextLoading(false);
        }
      }

      const url = window.URL.createObjectURL(blob);

      if (
        normalizedContentType.startsWith("image/") ||
        normalizedContentType === "application/pdf" ||
        normalizedContentType.startsWith("video/") ||
        normalizedContentType.startsWith("audio/")
      ) {
        setPreviewModalMode("normal");
        setPreviewImageScale(1);
        setPreviewImageOffset({ x: 0, y: 0 });

        if (previewUrl) {
          window.URL.revokeObjectURL(previewUrl);
        }

        setPreviewUrl(url);
        setPreviewContentType(resolvedContentType);
        setPreviewFileName(file.original_name);
        setPreviewModalOpen(true);
        return;
      }

      setPreviewModalMode("normal");
      setPreviewImageScale(1);
      setPreviewImageOffset({ x: 0, y: 0 });

      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(url);
      setPreviewContentType(resolvedContentType);
      setPreviewFileName(file.original_name);
      setPreviewModalOpen(true);
    } catch (err) {
      const responseMessage = (err as any)?.response?.data?.message;
      const errorMessage =
        typeof responseMessage === "string"
          ? responseMessage
          : err instanceof Error
            ? err.message
            : "Gagal membuka preview file.";

      setFileError(errorMessage);
    } finally {
      setPreviewingFileId(null);
    }
  };

  // Rename file
  const handleSubmitFileRename = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!selectedFileForAction) return;

    const name = fileRenameName.trim();
    if (!name) {
      setFileModalError("Nama file tidak boleh kosong.");
      return;
    }

    try {
      setFileActionLoading(true);
      setFileModalError("");

      await fileService.renameFile(selectedFileForAction.id, name);
      await loadFiles(currentFolderId);

      setIsFileRenameModalOpen(false);
      setSelectedFileForAction(null);
      setFileRenameName("");
    } catch (err: any) {
      setFileModalError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.original_name?.[0] ||
          "Gagal rename file.",
      );
    } finally {
      setFileActionLoading(false);
    }
  };

  // Delete file
  const handleConfirmDeleteFile = async () => {
    if (!selectedFileForDelete) return;

    const deletingFileId = selectedFileForDelete.id;

    try {
      setDeleteFileLoading(true);
      setDeleteFileError("");

      // 1) call backend
      await fileService.deleteFile(deletingFileId);

      // 2) update local state cepat agar file hilang dari UI
      setFiles((currentFiles) =>
        currentFiles.filter((f) => f.id !== deletingFileId),
      );

      // 3) reload list dari backend untuk konsistensi
      await loadFiles(currentFolderId);

      // reset modal setelah request sukses
      setIsFileDeleteModalOpen(false);
      setSelectedFileForDelete(null);
    } catch (err: any) {
      setDeleteFileError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.file?.[0] ||
          "Gagal memindahkan file ke Trash.",
      );
    } finally {
      setDeleteFileLoading(false);
    }
  };

  const openBulkDeleteModal = () => {
    const ids = Array.from(selectedFileIds);
    if (ids.length === 0) return;

    setBulkDeleteFileIds(ids);
    setBulkDeleteResult(null);
    setIsBulkDeleteModalOpen(true);
  };

  const closeBulkDeleteModal = () => {
    if (bulkDeleteLoading) return;

    setIsBulkDeleteModalOpen(false);
    setBulkDeleteFileIds([]);
    setBulkDeleteResult(null);
  };

  const openBulkFolderDeleteModal = () => {
    const ids = Array.from(selectedFolderIds);
    if (ids.length === 0) return;

    setBulkFolderDeleteIds(ids);
    setBulkFolderDeleteResult(null);
    setIsBulkFolderDeleteModalOpen(true);
  };

  const closeBulkFolderDeleteModal = () => {
    if (bulkFolderDeleteLoading) return;

    setIsBulkFolderDeleteModalOpen(false);
    setBulkFolderDeleteIds([]);
    setBulkFolderDeleteResult(null);
  };

  const handleConfirmBulkFolderDelete = async () => {
    if (bulkFolderDeleteLoading || bulkFolderDeleteIds.length === 0) return;

    setBulkFolderDeleteLoading(true);
    setBulkFolderDeleteResult(null);

    let okCount = 0;
    let failCount = 0;

    for (const id of bulkFolderDeleteIds) {
      try {
        await folderService.deleteFolder(id);
        okCount++;
      } catch {
        failCount++;
      }
    }

    await Promise.all([
      loadFolders(currentFolderId ?? null),
      loadFiles(currentFolderId ?? null),
    ]);

    if (okCount > 0) {
      onStorageChanged?.();
    }

    clearFolderSelection();

    setBulkFolderDeleteResult({ okCount, failCount });
    setBulkFolderDeleteLoading(false);
  };

  const handleConfirmBulkDelete = async () => {
    if (bulkDeleteLoading || bulkDeleteFileIds.length === 0) return;

    setBulkDeleteLoading(true);
    setBulkDeleteResult(null);

    let okCount = 0;
    let failCount = 0;

    for (const id of bulkDeleteFileIds) {
      try {
        await fileService.deleteFile(id);
        okCount++;
      } catch {
        failCount++;
      }
    }

    // refresh daftar file
    await loadFiles(currentFolderId);

    // refresh Storage Used hanya jika minimal satu delete berhasil
    if (okCount > 0) {
      onStorageChanged?.();
    }

    // kosongkan selection setelah selesai
    clearSelection();

    setBulkDeleteResult({ okCount, failCount });
    setBulkDeleteLoading(false);
  };

  const closeBulkDownloadResult = () => {
    if (bulkDownloadLoading) return;

    setBulkDownloadResult(null);
  };

  const handleBulkDownload = async () => {
    if (bulkDownloadLoading) return;

    const ids = Array.from(selectedFileIds);
    if (ids.length === 0) return;

    setBulkDownloadLoading(true);
    setBulkDownloadResult(null);

    let okCount = 0;
    let failCount = 0;

    for (const id of ids) {
      const file = files.find((f) => f.id === id);
      try {
        if (file) {
          await fileService.downloadFile(file.id, file.original_name);
          okCount++;
        } else {
          failCount++;
        }
      } catch {
        failCount++;
      }
    }

    setBulkDownloadResult({ okCount, failCount });
    setBulkDownloadLoading(false);
  };

  const closeFileActionMenu = () => {
    setOpenFileActionId(null);
    setFileActionMenuPosition(null);
    setFileActionFeedback(null);
    setOpenSharePanelFileId(null);
  };

  const closeFolderActionMenu = () => {
    setOpenFolderActionId(null);
    setFolderActionMenuPosition(null);
  };

  const copyTextToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch {
      // Fallback below.
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    textarea.style.top = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      const ok = document.execCommand("copy");
      if (!ok) throw new Error("Copy command failed");
    } finally {
      textarea.remove();
    }
  };

  const getExistingFileShareLink = async (file: FileModel) => {
    const links = await getShareLinks();
    return links.find((link) => link.file?.id === file.id) ?? null;
  };

  const getOrCreateFileShareLink = async (file: FileModel) => {
    const existing = await getExistingFileShareLink(file);
    if (existing) {
      setFileShareLinksByFileId((prev) => ({
        ...prev,
        [file.id]: existing,
      }));
      return existing;
    }

    const created = await createShareLink(file.id);
    setFileShareLinksByFileId((prev) => ({
      ...prev,
      [file.id]: created,
    }));
    return created;
  };

  const loadFileSharePanel = async (file: FileModel) => {
    if (openSharePanelFileId === file.id) {
      setOpenSharePanelFileId(null);
      return;
    }

    setOpenSharePanelFileId(file.id);
    setFileActionFeedback(null);
    setFileSharingActionId(file.id);

    try {
      const existing = await getExistingFileShareLink(file);
      setFileShareLinksByFileId((prev) => ({
        ...prev,
        [file.id]: existing,
      }));
    } catch (error: any) {
      setFileActionFeedback({
        fileId: file.id,
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Gagal memuat status share.",
      });
    } finally {
      setFileSharingActionId(null);
    }
  };

  const handleCopyFileLink = async (file: FileModel) => {
    if (fileSharingActionId) return;

    setFileActionFeedback(null);

    try {
      const shareLink =
        fileShareLinksByFileId[file.id] ?? (await getExistingFileShareLink(file));

      if (!shareLink) {
        setFileActionFeedback({
          fileId: file.id,
          type: "error",
          message: "Pilih status Shared dulu untuk membuat link.",
        });
        return;
      }

      await copyTextToClipboard(getPublicShareUrl(shareLink.token));
      setFileActionFeedback({
        fileId: file.id,
        type: "success",
        message: "Link disalin.",
      });
    } catch (error: any) {
      setFileActionFeedback({
        fileId: file.id,
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Gagal copy link.",
      });
    }
  };

  const handleSetFilePublic = async (file: FileModel) => {
    if (fileSharingActionId) return;

    setFileSharingActionId(file.id);
    setFileActionFeedback(null);

    try {
      const shareLink = await getOrCreateFileShareLink(file);
      setFileActionFeedback({
        fileId: file.id,
        type: "success",
        message: "Status diubah ke Shared.",
      });
      setFileShareLinksByFileId((prev) => ({
        ...prev,
        [file.id]: shareLink,
      }));
    } catch (error: any) {
      setFileActionFeedback({
        fileId: file.id,
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Gagal membuat share link.",
      });
    } finally {
      setFileSharingActionId(null);
    }
  };

  const handleSetFilePrivate = async (file: FileModel) => {
    if (fileSharingActionId) return;

    setFileSharingActionId(file.id);
    setFileActionFeedback(null);

    try {
      const links = await getShareLinks();
      const fileLinks = links.filter((link) => link.file?.id === file.id);

      await Promise.all(fileLinks.map((link) => deleteShareLink(link.id)));
      setFileShareLinksByFileId((prev) => ({
        ...prev,
        [file.id]: null,
      }));
      setFileActionFeedback({
        fileId: file.id,
        type: "success",
        message: "Status diubah ke Private.",
      });
    } catch (error: any) {
      setFileActionFeedback({
        fileId: file.id,
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Gagal mengubah file menjadi private.",
      });
    } finally {
      setFileSharingActionId(null);
    }
  };

  // file action menu helpers
  function openFileMenuAtCursor(
    event: React.MouseEvent,
    fileId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setOpenFolderActionId(null);
    setFolderActionMenuPosition(null);
    setFileActionFeedback(null);

    if (openFileActionId === fileId) {
      closeFileActionMenu();
      return;
    }

    const menuWidth = 260;
    const menuHeight = 430;
    const rawX = event.clientX;
    const rawY = event.clientY;

    const x =
      typeof window !== "undefined"
        ? Math.min(rawX, window.innerWidth - menuWidth)
        : rawX;

    const y =
      typeof window !== "undefined"
        ? Math.min(rawY, window.innerHeight - menuHeight)
        : rawY;

    setOpenFileActionId(fileId);
    setFileActionMenuPosition({
      x: Math.max(8, x),
      y: Math.max(8, y),
    });
  }

  // Move modal helpers
  const closeMoveModal = () => {

    if (moveLoading) return;
    setMoveModalOpen(false);
    setMoveItemType(null);
    setMoveItemId(null);
    setMoveItemName("");
    setMoveFileIds([]);
    setMoveTargetFolderId(null);
    setMoveError("");
  };

  const openMoveFileModal = (file: FileModel) => {
    setOpenFileActionId(null);

    const isBulkEligible =
      selectedFileIds.size > 1 && selectedFileIds.has(file.id);

    setMoveItemType("file");
    setMoveItemId(file.id);
    setMoveFileIds(isBulkEligible ? Array.from(selectedFileIds) : [file.id]);
    setMoveItemName(
      isBulkEligible
        ? `${selectedFileIds.size} files selected`
        : file.original_name ?? "Untitled file",
    );
    setMoveTargetFolderId(null);
    setMoveError("");
    setMoveModalOpen(true);
  };

  const openMoveFolderModal = (folder: FolderModel) => {
    setOpenFolderActionId(null);
    setMoveItemType("folder");
    setMoveItemId(folder.id);
    setMoveItemName(folder.name ?? "Untitled folder");
    setMoveFileIds([]);
    setMoveTargetFolderId(null);
    setMoveError("");
    setMoveModalOpen(true);
  };

  const submitMove = async () => {
    if (!moveItemType || moveLoading) return;

    setMoveLoading(true);
    setMoveError("");

    try {
      if (moveItemType === "file") {
        // Bulk move (selection-aware)
        if (moveFileIds.length > 1) {
          let okCount = 0;
          let failCount = 0;

          for (const id of moveFileIds) {
            try {
              await fileService.moveFile(id, moveTargetFolderId);
              okCount++;
            } catch {
              failCount++;
            }
          }

          // after bulk move, just refresh + clear selection
          await Promise.all([loadFolders(currentFolderId), loadFiles(currentFolderId)]);
          if (okCount > 0) {
            // keep storage refreshed behavior consistent with delete
            onStorageChanged?.();
          }

          clearSelection();
        } else {
          // Single file move (keep existing behavior)
          const singleId = moveFileIds.length === 1 ? moveFileIds[0] : moveItemId;
          if (singleId) {
            await fileService.moveFile(singleId, moveTargetFolderId);
            setSelectedFileIds((prev) => {
              const next = new Set(prev);
              next.delete(singleId);
              return next;
            });
          }

          await Promise.all([loadFolders(currentFolderId), loadFiles(currentFolderId)]);
        }
      }

      if (moveItemType === "folder") {
        if (!moveItemId) return;
        await folderService.moveFolder(moveItemId, moveTargetFolderId);
        setSelectedFolderIds((prev) => {
          const next = new Set(prev);
          next.delete(moveItemId);
          return next;
        });

        await Promise.all([loadFolders(currentFolderId), loadFiles(currentFolderId)]);
      }

      setMoveModalOpen(false);
      setMoveItemType(null);
      setMoveItemId(null);
      setMoveFileIds([]);
      setMoveItemName("");
      setMoveTargetFolderId(null);
      setMoveError("");
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (
          error as { response?: { data?: { message?: unknown } } }
        ).response?.data?.message === "string"
          ? (error as { response: { data: { message: string } } }).response.data
              .message
          : "Gagal memindahkan item.";

      setMoveError(message);
    } finally {
      setMoveLoading(false);
    }
  };

  const startFileDragMove = (file: FileModel) => {
    if (!moveDragDropEnabled) return;

    const isFileSelected = selectedFileIds.has(file.id);
    const fileIds = isFileSelected ? Array.from(selectedFileIds) : [file.id];
    const folderIds = isFileSelected ? Array.from(selectedFolderIds) : [];

    setDragMoveItem({
      type: "file",
      id: file.id,
      name: file.original_name ?? "Untitled file",
      fileIds,
      folderIds,
    });
  };

  const startFolderDragMove = (folder: FolderModel) => {
    if (!moveDragDropEnabled) return;

    const isFolderSelected = selectedFolderIds.has(folder.id);
    const fileIds = isFolderSelected ? Array.from(selectedFileIds) : [];
    const folderIds = isFolderSelected ? Array.from(selectedFolderIds) : [folder.id];

    setDragMoveItem({
      type: "folder",
      id: folder.id,
      name: folder.name ?? "Untitled folder",
      fileIds,
      folderIds,
    });
  };

  const clearDragMoveItem = () => {
    setDragMoveItem(null);
  };

  const setCompactDragImage = (
    event: React.DragEvent<HTMLElement>,
    label: string,
    type: "file" | "folder",
  ) => {
    const dragPreview = document.createElement("div");
    const icon = type === "folder" ? "\uD83D\uDCC1" : "\uD83D\uDCC4";

    dragPreview.textContent = `${icon} ${label}`;
    dragPreview.style.position = "fixed";
    dragPreview.style.top = "-1000px";
    dragPreview.style.left = "-1000px";
    dragPreview.style.maxWidth = "220px";
    dragPreview.style.padding = "8px 12px";
    dragPreview.style.borderRadius = "999px";
    dragPreview.style.background = "rgba(15, 23, 42, 0.96)";
    dragPreview.style.border = "1px solid rgba(59, 130, 246, 0.7)";
    dragPreview.style.boxShadow = "0 12px 30px rgba(0, 0, 0, 0.35)";
    dragPreview.style.color = "#e2e8f0";
    dragPreview.style.fontSize = "12px";
    dragPreview.style.fontWeight = "700";
    dragPreview.style.whiteSpace = "nowrap";
    dragPreview.style.overflow = "hidden";
    dragPreview.style.textOverflow = "ellipsis";
    dragPreview.style.pointerEvents = "none";
    dragPreview.style.zIndex = "9999";

    document.body.appendChild(dragPreview);
    event.dataTransfer.setDragImage(dragPreview, 20, 18);

    window.setTimeout(() => {
      document.body.removeChild(dragPreview);
    }, 0);
  };

  const moveDraggedItemToFolder = async (targetFolderId: string | null) => {
    if (!moveDragDropEnabled || !dragMoveItem) return;

    const fileIds = dragMoveItem.fileIds?.length
      ? Array.from(new Set(dragMoveItem.fileIds))
      : dragMoveItem.type === "file"
        ? [dragMoveItem.id]
        : [];

    const folderIds = dragMoveItem.folderIds?.length
      ? Array.from(new Set(dragMoveItem.folderIds))
      : dragMoveItem.type === "folder"
        ? [dragMoveItem.id]
        : [];

    const safeFolderIds =
      targetFolderId === null
        ? folderIds
        : folderIds.filter((folderId) => folderId !== targetFolderId);

    if (fileIds.length === 0 && safeFolderIds.length === 0) {
      clearDragMoveItem();
      return;
    }

    try {
      await Promise.all([
        ...fileIds.map((fileId) =>
          fileService.moveFile(fileId, targetFolderId),
        ),
        ...safeFolderIds.map((folderId) =>
          folderService.moveFolder(folderId, targetFolderId),
        ),
      ]);

      setSelectedFileIds((prev) => {
        const next = new Set(prev);
        fileIds.forEach((fileId) => next.delete(fileId));
        return next;
      });

      setSelectedFolderIds((prev) => {
        const next = new Set(prev);
        safeFolderIds.forEach((folderId) => next.delete(folderId));
        return next;
      });

      await Promise.all([loadFolders(currentFolderId), loadFiles(currentFolderId)]);
    } catch (error) {
      console.error(
        "Gagal memindahkan item dengan drag-and-drop:",
        error,
      );
    } finally {
      clearDragMoveItem();
    }
  };

  const { addFiles, hasActiveUploads } = useUploadManager();





  // Stabil refresh function untuk fetch both folders dan files
  const refreshCurrentFolder = useCallback(async () => {
    const keyword = searchQuery.trim();
    const keywordOrNull = keyword || null;

    await Promise.all([
      loadFolders(currentFolderId, keywordOrNull),
      loadFiles(currentFolderId, keywordOrNull),
    ]);
  }, [currentFolderId, searchQuery]);


  const syncThemeFromStorage = () => {
    const nextTheme = safeReadAppearanceTheme();
    const nextAccent = safeReadAccentColor();
    setAppearanceTheme(nextTheme);
    setAccentColor(nextAccent);
    setResolvedTheme(resolveAppearanceTheme(nextTheme));
  };

  useEffect(() => {
    // Initialize
    try {
      syncThemeFromStorage();
    } catch {
      // ignore
    }

    if (typeof window === "undefined") return;

    const onNimbusAppearanceChange = () => syncThemeFromStorage();
    window.addEventListener("nimbus-appearance-change", onNimbusAppearanceChange);
    window.addEventListener("storage", onNimbusAppearanceChange);
    window.addEventListener("focus", onNimbusAppearanceChange);

    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia?.("(prefers-color-scheme: dark)") ?? null;
      const onMqChange = () => {
        // Only affects when stored theme is system, but safe to resolve anyway
        syncThemeFromStorage();
      };
      mq?.addEventListener?.("change", onMqChange);
      return () => {
        mq?.removeEventListener?.("change", onMqChange);
        window.removeEventListener("nimbus-appearance-change", onNimbusAppearanceChange);
        window.removeEventListener("storage", onNimbusAppearanceChange);
        window.removeEventListener("focus", onNimbusAppearanceChange);
      };
    } catch {
      return () => {
        window.removeEventListener("nimbus-appearance-change", onNimbusAppearanceChange);
        window.removeEventListener("storage", onNimbusAppearanceChange);
        window.removeEventListener("focus", onNimbusAppearanceChange);
      };
    }
  }, []);

  // Main effect: fetch saat mount, folder berubah, filesRefreshKey berubah, atau search berubah
  useEffect(() => {
    refreshCurrentFolder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId, filesRefreshKey, searchQuery]);


  // Clear selection agar bulk action tidak nyasar saat keyword search berubah
  useEffect(() => {
    clearSelection();
    clearFolderSelection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Click-outside handler untuk menu aksi file & folder
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;

      // File menu
      if (openFileActionId !== null) {
        const wrap = fileMenuWrapRef.current;
        if (!wrap) {
          setOpenFileActionId(null);
          setFileActionMenuPosition(null);
        } else if (!wrap.contains(target)) {
          setOpenFileActionId(null);
          setFileActionMenuPosition(null);
        }
      }

      // Folder menu
      if (openFolderActionId !== null) {
        const wrap = folderMenuWrapRef.current;
        if (!wrap) {
          setOpenFolderActionId(null);
          setFolderActionMenuPosition(null);
        } else if (!wrap.contains(target)) {
          setOpenFolderActionId(null);
          setFolderActionMenuPosition(null);
        }
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openFileActionId, openFolderActionId]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (
        filterMenuOpen &&
        filterMenuRef.current &&
        !filterMenuRef.current.contains(target)
      ) {
        setFilterMenuOpen(false);
      }

      if (
        sortMenuOpen &&
        sortMenuRef.current &&
        !sortMenuRef.current.contains(target)
      ) {
        setSortMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFilterMenuOpen(false);
        setSortMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [filterMenuOpen, sortMenuOpen]);




  const uploadInputRef = useMemo(
    () => ({ current: null as HTMLInputElement | null }),
    [],
  );

  const [uploadError, setUploadError] = useState("");


  const folderList = loadingFolders ? [] : folders;

  const filteredFolders = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    const base = folderList;
    if (!keyword) return base;
    return base.filter((folder) =>
      (folder.name ?? "").toLowerCase().includes(keyword),
    );
  }, [folderList, searchQuery]);

  const filteredFiles = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    const base = files;
    if (!keyword) return base;
    return base.filter((file) =>
      (file.original_name ?? "").toLowerCase().includes(keyword),
    );
  }, [files, searchQuery]);

  const fileMatchesTypeFilter = (
    file: FileModel,
    filter: typeof fileTypeFilter,
  ): boolean => {
    if (filter === "all") return true;

    const mime = (file.mime_type ?? "").toLowerCase();
    const nameLower = (file.original_name ?? "").toLowerCase();
    const ext = nameLower.includes(".")
      ? (nameLower.split(".").pop() ?? "")
      : "";

    const isImage =
      mime.startsWith("image/") ||
      ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext);

    const isPdf = mime === "application/pdf" || ext === "pdf";

    const isDocument =
      ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"].includes(
        ext,
      ) ||
      mime.includes("word") ||
      mime.includes("officedocument") ||
      mime.includes("presentation") ||
      mime.includes("spreadsheet");

    const isVideo =
      mime.startsWith("video/") ||
      ["mp4", "mkv", "avi", "mov", "webm"].includes(ext);

    const isAudio =
      mime.startsWith("audio/") || ["mp3", "wav", "ogg", "m4a"].includes(ext);

    const isArchive =
      ["zip", "rar", "7z", "tar", "gz"].includes(ext) ||
      mime.includes("zip") ||
      mime.includes("compressed") ||
      mime.includes("tar");

    const isOthers = !(
      isImage ||
      isPdf ||
      isDocument ||
      isVideo ||
      isAudio ||
      isArchive
    );

    switch (filter) {
      case "images":
        return isImage;
      case "pdf":
        return isPdf;
      case "documents":
        return isDocument;
      case "videos":
        return isVideo;
      case "audio":
        return isAudio;
      case "archives":
        return isArchive;
      case "others":
        return isOthers;
      case "folders":
        return false;
      default:
        return true;
    }
  };

  // filtered & typed folders (filter diterapkan setelah search)
  const typedFolders = useMemo(() => {
    if (fileTypeFilter === "all" || fileTypeFilter === "folders")
      return filteredFolders;
    return [];
  }, [filteredFolders, fileTypeFilter]);

  const typedFiles = useMemo(() => {
    if (fileTypeFilter === "all") return filteredFiles;
    if (fileTypeFilter === "folders") return [];
    return filteredFiles.filter((f) =>
      fileMatchesTypeFilter(f, fileTypeFilter),
    );
  }, [filteredFiles, fileTypeFilter]);

  const getFolderDateValue = (folder: FolderModel): number => {
    const created = folder.created_at
      ? new Date(folder.created_at).getTime()
      : 0;
    const updated = folder.updated_at
      ? new Date(folder.updated_at).getTime()
      : 0;
    return created || updated || 0;
  };

  const getFileDateValue = (file: FileModel): number => {
    const created = file.created_at ? new Date(file.created_at).getTime() : 0;
    const updated = file.updated_at ? new Date(file.updated_at).getTime() : 0;
    return created || updated || 0;
  };

  const getFileTypeValue = (file: FileModel): string => {
    const mime = (file.mime_type ?? "").toLowerCase();
    if (mime) {
      if (mime.includes("pdf")) return "pdf";
      if (mime.includes("presentation")) return "pptx";
      if (mime.includes("image")) return "image";
      if (mime.includes("zip")) return "zip";
      if (mime.includes("audio")) return "audio";
      if (mime.includes("video")) return "video";
      if (mime.includes("spreadsheet")) return "xlsx";
      const ext = mime.split("/")[1];
      return ext ?? mime;
    }
    // fallback to extension from original name
    const parts = (file.original_name ?? "").split(".");
    return (parts[parts.length - 1] ?? "").toLowerCase();
  };

  const sortedFolders = useMemo(() => {
    const arr = [...typedFolders];
    arr.sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;

      if (sortBy === "name") {
        const an = (a.name ?? "").toLowerCase();
        const bn = (b.name ?? "").toLowerCase();
        return an.localeCompare(bn) * dir;
      }

      if (sortBy === "date") {
        return (getFolderDateValue(a) - getFolderDateValue(b)) * dir;
      }

      // folders: size = 0, type = "folder" (semua sama, jadi urutan tetap)
      if (sortBy === "size") return 0;
      if (sortBy === "type") return 0;

      return 0;
    });
    return arr;
  }, [typedFolders, sortBy, sortDirection]);

  const sortedFiles = useMemo(() => {
    const arr = [...filteredFiles];
    arr.sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;

      if (sortBy === "name") {
        const an = (a.original_name ?? "").toLowerCase();
        const bn = (b.original_name ?? "").toLowerCase();
        return an.localeCompare(bn) * dir;
      }

      if (sortBy === "date") {
        return (getFileDateValue(a) - getFileDateValue(b)) * dir;
      }

      if (sortBy === "size") {
        const as = typeof a.size === "number" ? a.size : 0;
        const bs = typeof b.size === "number" ? b.size : 0;
        return (as - bs) * dir;
      }

      if (sortBy === "type") {
        const at = getFileTypeValue(a);
        const bt = getFileTypeValue(b);
        return at.localeCompare(bt) * dir;
      }

      return 0;
    });
    return arr;
  }, [filteredFiles, sortBy, sortDirection]);

  const hasSearch = searchQuery.trim().length > 0;
  const showEmptySearchState =
    hasSearch &&
    !loadingFolders &&
    !loadingFiles &&
    typedFolders.length === 0 &&
    typedFiles.length === 0;

  const myFilesColors =
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
          buttonSoftBg: "#f1f5f9",
        }
      : {
          pageBg: "#111c2f",
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
        };

  const activeFolderAction = useMemo(
    () => folders.find((folder) => folder.id === openFolderActionId) ?? null,
    [folders, openFolderActionId],
  );
  const showFileMetadata = true;
  const showFolderMetadata = false;
  const fullItemListColumnTemplate =
    "28px minmax(0, 1fr) 96px 132px 92px 76px 44px";
  const compactItemListColumnTemplate = "28px minmax(0, 1fr) 44px";
  const folderListColumnTemplate = compactItemListColumnTemplate;
  const fileListColumnTemplate =
    showFileMetadata ? fullItemListColumnTemplate : compactItemListColumnTemplate;
  const isInteractiveItemTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return target.closest("button,input,a,textarea,select,[role='menu']") !== null;
  };

  const renderFileActionMenu = (file: FileModel) => {
    const isOpen = openFileActionId === file.id && fileActionMenuPosition;
    const canPreview = fileService.canPreviewFile(file);
    const isSharing = fileSharingActionId === file.id;
    const isSharePanelOpen = openSharePanelFileId === file.id;
    const shareLink = fileShareLinksByFileId[file.id] ?? null;
    const shareUrl = shareLink ? getPublicShareUrl(shareLink.token) : "";
    const feedback =
      fileActionFeedback?.fileId === file.id ? fileActionFeedback : null;

    const menuItemStyle = (
      danger = false,
      disabled = false,
    ): React.CSSProperties => ({
      marginTop: 4,
      opacity: disabled ? 0.45 : 1,
      cursor: disabled ? "not-allowed" : "pointer",
      color: danger ? "#ef4444" : myFilesColors.text,
      background: "transparent",
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
            : `${accentColor}10`;
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.background = "transparent";
        }}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (disabled) return;
          onClick();
        }}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span>{label}</span>
        </div>
      </button>
    );

    return (
      <div className="relative">
        <div ref={openFileActionId === file.id ? fileMenuWrapRef : null}>
          <button
            type="button"
            aria-label={`More actions for ${file.original_name}`}
            title="More actions"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();

              setOpenFolderActionId(null);
              setFolderActionMenuPosition(null);
              setFileActionFeedback(null);

              if (openFileActionId === file.id) {
                closeFileActionMenu();
                return;
              }

              const rect = event.currentTarget.getBoundingClientRect();
              const menuWidth = 260;
              const left =
                typeof window !== "undefined"
                  ? Math.min(
                      window.innerWidth - menuWidth - 12,
                      Math.max(12, rect.right - menuWidth),
                    )
                  : rect.right - menuWidth;
              const top =
                typeof window !== "undefined"
                  ? Math.min(window.innerHeight - 430, rect.bottom + 6)
                  : rect.bottom + 6;

              setOpenFileActionId(file.id);
              setFileActionMenuPosition({
                x: Math.max(8, left),
                y: Math.max(8, top),
              });
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{
              background: isOpen ? `${accentColor}12` : "transparent",
              border: `1px solid ${isOpen ? `${accentColor}33` : "transparent"}`,
              color: isOpen ? myFilesColors.text : myFilesColors.muted,
            }}
          >
            <MoreVertical size={16} />
          </button>

          {isOpen ? (
            <div
              style={{
                position: "fixed",
                top: fileActionMenuPosition.y,
                left: fileActionMenuPosition.x,
                width: 260,
                zIndex: 9999,
                background: myFilesColors.panelBg,
                border: `1px solid ${myFilesColors.border}`,
                borderRadius: 10,
                padding: 6,
                boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              }}
              role="menu"
              aria-label={`File actions ${file.original_name}`}
              onMouseDown={(event) => event.stopPropagation()}
            >
              {renderMenuItem({
                label:
                  previewingFileId === file.id ? "Opening..." : "Preview",
                icon: <Eye size={14} />,
                disabled: !canPreview || previewingFileId === file.id,
                ariaLabel: `Preview ${file.original_name}`,
                onClick: () => {
                  closeFileActionMenu();
                  void handlePreviewFile(file);
                },
              })}

              {renderMenuItem({
                label: "Details",
                icon: <FileText size={14} />,
                ariaLabel: `Details ${file.original_name}`,
                onClick: () => {
                  closeFileActionMenu();
                  setDetailsItem({ type: "file", item: file });
                },
              })}

              {renderMenuItem({
                label: "Download",
                icon: <Download size={14} />,
                ariaLabel: `Download ${file.original_name}`,
                onClick: () => {
                  closeFileActionMenu();
                  void fileService.downloadFile(file.id, file.original_name);
                },
              })}

              {renderMenuItem({
                label: isSharePanelOpen ? "Share" : "Share",
                icon: <Share2 size={14} />,
                disabled: isSharing,
                ariaLabel: `Share ${file.original_name}`,
                onClick: () => {
                  void loadFileSharePanel(file);
                },
              })}

              {isSharePanelOpen ? (
                <div
                  className="mt-2 rounded-lg border p-2"
                  style={{
                    borderColor: myFilesColors.border,
                    background:
                      resolvedTheme === "light"
                        ? "#ffffff"
                        : "rgba(15,23,42,0.55)",
                  }}
                >
                  <div
                    className="mb-1 text-[10px] font-semibold"
                    style={{ color: myFilesColors.muted2 }}
                  >
                    Link
                  </div>

                  <div className="flex min-w-0 items-center gap-1.5">
                    <div
                      className="min-w-0 flex-1 truncate rounded-md border px-2 py-1 text-[10px]"
                      style={{
                        borderColor: myFilesColors.border,
                        color: shareUrl ? myFilesColors.text : myFilesColors.muted2,
                        background: myFilesColors.cardBg,
                      }}
                      title={shareUrl || "Pilih Shared untuk membuat link"}
                    >
                      {isSharing
                        ? "Memuat link..."
                        : shareUrl || "Belum ada link"}
                    </div>
                    <button
                      type="button"
                      aria-label={`Salin link ${file.original_name}`}
                      title="Salin link"
                      disabled={!shareUrl || isSharing}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                      style={{
                        opacity: !shareUrl || isSharing ? 0.45 : 1,
                        cursor: !shareUrl || isSharing ? "not-allowed" : "pointer",
                        border: `1px solid ${myFilesColors.border}`,
                        color: shareUrl ? accentColor : myFilesColors.muted2,
                        background: myFilesColors.cardBg,
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!shareUrl || isSharing) return;
                        void handleCopyFileLink(file);
                      }}
                    >
                      <Copy size={13} />
                    </button>
                  </div>

                  <div
                    className="mt-2 text-[10px] font-semibold"
                    style={{ color: myFilesColors.muted2 }}
                  >
                    Status
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-1">
                    <button
                      type="button"
                      role="menuitem"
                      aria-label={`Set private ${file.original_name}`}
                      title="Private"
                      className="rounded-lg px-2 py-1 text-left text-[11px] font-semibold"
                      disabled={isSharing}
                      style={{
                        opacity: isSharing ? 0.45 : 1,
                        cursor: isSharing ? "not-allowed" : "pointer",
                        color: !shareLink ? accentColor : myFilesColors.text,
                        background: !shareLink ? `${accentColor}12` : "transparent",
                        border: `1px solid ${
                          !shareLink ? `${accentColor}33` : "transparent"
                        }`,
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (isSharing) return;
                        void handleSetFilePrivate(file);
                      }}
                    >
                      Private
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      aria-label={`Set shared ${file.original_name}`}
                      title="Shared"
                      className="rounded-lg px-2 py-1 text-left text-[11px] font-semibold"
                      disabled={isSharing}
                      style={{
                        opacity: isSharing ? 0.45 : 1,
                        cursor: isSharing ? "not-allowed" : "pointer",
                        color: shareLink ? accentColor : myFilesColors.text,
                        background: shareLink ? `${accentColor}12` : "transparent",
                        border: `1px solid ${
                          shareLink ? `${accentColor}33` : "transparent"
                        }`,
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (isSharing) return;
                        void handleSetFilePublic(file);
                      }}
                    >
                      Shared
                    </button>
                  </div>
                </div>
              ) : null}

              <div
                className="mt-2 border-t pt-2"
                style={{ borderColor: myFilesColors.border }}
              >
                {renderMenuItem({
                  label: "Rename",
                  icon: <Edit3 size={14} />,
                  ariaLabel: `Rename ${file.original_name}`,
                  onClick: () => {
                    closeFileActionMenu();
                    setSelectedFileForAction(file);
                    setFileRenameName(file.original_name);
                    setFileModalError("");
                    setIsFileRenameModalOpen(true);
                  },
                })}

                {renderMenuItem({
                  label: "Move to...",
                  icon: <Folder size={14} />,
                  ariaLabel: `Move ${file.original_name}`,
                  onClick: () => {
                    closeFileActionMenu();
                    openMoveFileModal(file);
                  },
                })}

                {renderMenuItem({
                  label: "Trash",
                  icon: <Trash2 size={14} />,
                  danger: true,
                  ariaLabel: `Trash ${file.original_name}`,
                  onClick: () => {
                    closeFileActionMenu();
                    setSelectedFileForDelete(file);
                    setDeleteFileError("");
                    setIsFileDeleteModalOpen(true);
                  },
                })}
              </div>

              {feedback ? (
                <div
                  className="mt-2 w-full rounded-lg px-2 py-1 text-[10px] font-semibold"
                  style={{
                    background:
                      feedback.type === "error"
                        ? "rgba(239,68,68,0.10)"
                        : `${accentColor}14`,
                    color:
                      feedback.type === "error" ? "#ef4444" : accentColor,
                  }}
                  role="alert"
                >
                  {feedback.message}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      style={{ background: myFilesColors.pageBg }}
    >
      {/* Breadcrumb */}

      {breadcrumbs.length > 0 ? (
        <div className="flex items-center gap-1.5 mb-4" aria-label="Breadcrumb">
          <button
            type="button"
            onClick={handleBackToRoot}
            className="flex items-center gap-1 text-xs hover:opacity-80"
            style={{ color: accentColor }}
            aria-label="Breadcrumb My Files (root)"
          >
            <Home size={12} />
            My Files
          </button>

          {breadcrumbs.map((b, idx) => {
            const isActive = idx === breadcrumbs.length - 1;
            return (
              <div key={b.id} className="flex items-center gap-1.5">
                <ChevronRight size={12} style={{ color: myFilesColors.muted2 }} />
                {isActive ? (
                  <span className="text-xs" style={{ color: myFilesColors.text }}>
                    {b.name}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleBreadcrumbClick(b.id)}
                    className="text-xs"
                    style={{ color: resolvedTheme === "light" ? myFilesColors.text : myFilesColors.muted }}
                    aria-label={`Breadcrumb ${b.name}`}
                  >
                    {b.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: myFilesColors.title }}>
            My Files
          </h1>
          <p className="text-xs mt-0.5" style={{ color: myFilesColors.muted }}>
            {folders.length + files.length} items
          </p>
        </div>
        <div className="flex items-center gap-2">
          {uploadError && (
            <div
              className="text-xs px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10"
              style={{
                borderColor: "rgba(248,113,113,0.35)",
                background: resolvedTheme === "light"
                  ? "rgba(248,113,113,0.08)"
                  : "rgba(248,113,113,0.12)",
                color: "#f87171",
              }}
              role="alert"
            >
              {uploadError}
            </div>
          )}

          <button
            type="button"
            onClick={openCreateFolderModal}
            aria-label="Create new folder"
            title="Create new folder"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{
              background: "linear-gradient(135deg, " + accentColor + ", #22d3ee)",
              border: `1px solid ${myFilesColors.border}`,
              color: "#fff",
            }}
          >
            <FolderPlus size={13} /> New Folder
          </button>

          <input
            ref={uploadInputRef as any}
            type="file"
            multiple={true}
            style={{ display: "none" }}
            aria-label="Upload files"
            onChange={(e) => {
              const list = e.target.files;
              if (!list || list.length === 0) return;

              const fileArray = Array.from(list);
              const folderId = currentFolderId ?? null;

              setUploadError("");

              // Push to global queue (no local upload loop)
              addFiles(fileArray, folderId);

              // reset input supaya file yang sama bisa di-upload lagi
              e.currentTarget.value = "";
            }}
          />

          <button
            type="button"
            onClick={() => {
              const el = uploadInputRef as any;
              const input = el?.current as HTMLInputElement | null;
              input?.click();
            }}
            aria-label="Upload Files"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{
              background: "linear-gradient(135deg, " + accentColor + ", #22d3ee)",
              color: "#fff",
              opacity: hasActiveUploads ? 0.9 : 1,
            }}
            title="Upload Files"
          >
            <Upload size={13} />{" "}
            {hasActiveUploads ? "Tambah ke Queue" : "Upload Files"}
          </button>

          {uploadError && (
              <div
                className="text-xs px-3 py-2 rounded-lg border"
                style={{
                  borderColor: "rgba(248,113,113,0.35)",
                  background: resolvedTheme === "light"
                    ? "rgba(248,113,113,0.08)"
                    : "rgba(248,113,113,0.12)",
                  color: "#f87171",
                }}
                role="status"
                aria-live="polite"
              >
                {uploadError}
              </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bb-myfiles-search-shimmer {
          0% { transform: translateX(-60%); opacity: 0.0; }
          15% { opacity: 1; }
          100% { transform: translateX(60%); opacity: 0.0; }
        }

        @keyframes bb-myfiles-search-pulse {
          0% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.08) rotate(-8deg); }
          100% { transform: scale(1) rotate(0deg); }
        }

        @keyframes bb-myfiles-search-dot {
          0%, 100% { transform: translateY(0); opacity: 0.55; }
          50% { transform: translateY(-3px); opacity: 1; }
        }

        @keyframes bb-myfiles-search-glow {
          0% { box-shadow: 0 0 0 rgba(0,0,0,0), 0 0 0 rgba(0,0,0,0); }
          50% { box-shadow: 0 0 0 rgba(0,0,0,0), 0 0 18px rgba(59,130,246,0.25); }
          100% { box-shadow: 0 0 0 rgba(0,0,0,0), 0 0 0 rgba(0,0,0,0); }
        }
      `}</style>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className={"relative flex-1 max-w-xs " + (isSearchActive ? "max-w-sm" : "")}
          style={{
            transition: "max-width 220ms ease",
          }}
        >
          {/* Search icon */}
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 transition-transform"
            style={{
              color: myFilesColors.muted,
              transform:
                isSearchLoading && !isSearchActive
                  ? undefined
                  : isSearchActive
                    ? "scale(1.08) rotate(-8deg)"
                    : undefined,
              animation:
                isSearchLoading && trimmedSearchQuery.length > 0
                  ? "bb-myfiles-search-pulse 1.15s infinite ease-in-out"
                  : undefined,
              transformOrigin: "center",
            }}
            aria-hidden="true"
          />

          {/* Input wrapper: no layout shift */}
          <div
            className="relative"
            style={{
              borderRadius: 10,
            }}
          >
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 10,
                pointerEvents: "none",
                opacity: isSearchActive ? 1 : 0,
                transition: "opacity 160ms ease",
                background:
                  resolvedTheme === "light"
                    ? `${accentColor}10`
                    : `${accentColor}22`,
                filter: "saturate(1.05)",
              }}
            />

            {/* Scanner shimmer */}
            {isSearchActive && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: "12%",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "22%",
                  height: "68%",
                  pointerEvents: "none",
                  borderRadius: 999,
                  background:
                    resolvedTheme === "light"
                      ? "linear-gradient(90deg, transparent, rgba(59,130,246,0.35), transparent)"
                      : "linear-gradient(90deg, transparent, rgba(56,189,248,0.28), transparent)",
                  animation: "bb-myfiles-search-shimmer 1.35s infinite ease-in-out",
                  mixBlendMode: resolvedTheme === "light" ? "multiply" : "screen",
                }}
              />
            )}

            <input
              placeholder="Search files..."
              className="w-full pl-8 py-1.5 rounded-lg text-xs outline-none transition-[border-color,box-shadow,background]"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                background: myFilesColors.inputBg,
                border: `1px solid ${isSearchActive ? `${accentColor}77` : myFilesColors.inputBorder}`,
                color: myFilesColors.inputText,
                caretColor: accentColor,
                paddingRight: isSearchLoading ? 34 : 46,
                boxShadow:
                  isSearchActive
                    ? `0 0 0 3px ${accentColor}18`
                    : "none",
                transition:
                  "box-shadow 180ms ease, border-color 180ms ease, transform 180ms ease",
                transform: isSearchActive ? "translateY(-0.5px)" : undefined,
                animation:
                  isSearchActive && !isSearchLoading
                    ? "bb-myfiles-search-glow 1.8s infinite ease-in-out"
                    : undefined,
              }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Loader dots */}
            {isSearchLoading && trimmedSearchQuery.length > 0 && (
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  gap: 4,
                  alignItems: "center",
                  pointerEvents: "none",
                }}
              >
                {Array.from({ length: 3 }).map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 999,
                      background: accentColor,
                      opacity: 0.7,
                      animation: `bb-myfiles-search-dot 0.9s infinite ease-in-out`,
                      animationDelay: `${i * 120}ms`,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Clear button */}
            {!isSearchLoading && trimmedSearchQuery.length > 0 && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full"
                style={{
                  width: 22,
                  height: 22,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: myFilesColors.muted,
                  background: resolvedTheme === "light" ? "#f1f5f9" : "rgba(148,163,184,0.15)",
                  border: `1px solid ${myFilesColors.border}`,
                  transition: "transform 160ms ease, background 160ms ease, color 160ms ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.color = myFilesColors.text;
                  e.currentTarget.style.background = `${accentColor}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.color = myFilesColors.muted;
                  e.currentTarget.style.background = resolvedTheme === "light" ? "#f1f5f9" : "rgba(148,163,184,0.15)";
                }}
              >
                &times;
              </button>
            )}
          </div>

          {/* Searching helper text */}
          {trimmedSearchQuery.length > 0 && (
            <div
              className="mt-2 text-[11px] leading-tight"
              style={{
                color: myFilesColors.muted,
                fontStyle: "normal",
              }}
            >
              <span style={{ color: myFilesColors.muted2 }}>
                Searching for:
              </span>{" "}
              <span style={{ color: accentColor }}>"{trimmedSearchQuery}"</span>
            </div>
          )}
        </div>

        <div ref={filterMenuRef} className="relative">
          <button
            type="button"
            aria-label="Filter"
            onClick={() => setFilterMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: myFilesColors.buttonSoftBg,
              border: `1px solid ${myFilesColors.border}`,
              color: myFilesColors.text,
            }}
          >
            <Filter size={12} /> Filter: {fileTypeFilterLabel(fileTypeFilter)}
          </button>

          {filterMenuOpen && (
            <div
              className="absolute right-0 top-full mt-2 rounded-lg shadow-2xl"
              style={{
                zIndex: 50,
                background: myFilesColors.cardBg,
                border: `1px solid ${myFilesColors.border}`,
                minWidth: 240,
              }}
              role="menu"
              aria-label="Filter menu"
            >
              {(
                [
                  ["all", "All"],
                  ["folders", "Folders"],
                  ["images", "Images"],
                  ["pdf", "PDF"],
                  ["documents", "Documents"],
                  ["videos", "Videos"],
                  ["audio", "Audio"],
                  ["archives", "Archives"],
                  ["others", "Others"],
                ] as const
              ).map(([value, label]) => {
                const isActive = fileTypeFilter === value;
                const activeBg = `${accentColor}12`;
                const activeBorder = `1px solid ${accentColor}55`;
                return (
                  <button
                    key={value}
                    type="button"
                    role="menuitem"
                    aria-label={`Filter ${label}`}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors"
                    style={{
                      color: isActive ? accentColor : myFilesColors.muted,
                      background: isActive ? activeBg : "transparent",
                      border: isActive ? activeBorder : "1px solid transparent",
                      borderRadius: 8,
                    }}
                    onMouseEnter={(e) => {
                      const el = e.currentTarget;
                      el.style.background = isActive
                        ? activeBg
                        : `${accentColor}10`;
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget;
                      el.style.background = isActive ? activeBg : "transparent";
                    }}
                    onClick={() => {
                      setFileTypeFilter(value);
                      setFilterMenuOpen(false);
                    }}
                  >
                    <span style={{ color: isActive ? accentColor : myFilesColors.text }}>
                      {label}
                    </span>
                    {isActive ? (
                      <span style={{ color: accentColor, fontWeight: 600 }}>{"\u2713"}</span>
                    ) : (
                      <span style={{ color: myFilesColors.muted }}> </span>
                    )}
                  </button>
                );
              })}

              <div style={{ padding: "0 12px 10px" }}>
                <div className="text-[10px]" style={{ color: myFilesColors.muted }}>
                  Filter diterapkan setelah Search & sebelum Sort.
                </div>
              </div>
            </div>
          )}
        </div>
        <div ref={sortMenuRef} className="relative">
          <button
            type="button"
            aria-label="Sort"
            onClick={() => setSortMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: myFilesColors.buttonSoftBg,
              border: `1px solid ${myFilesColors.border}`,
              color: myFilesColors.text,
            }}
          >
            <SortAsc size={12} /> Sort
          </button>

          {sortMenuOpen && (
            <div
              className="absolute right-0 top-full mt-2 rounded-lg shadow-2xl"
              style={{
                zIndex: 50,
                background: myFilesColors.cardBg,
                border: `1px solid ${myFilesColors.border}`,
                minWidth: 220,
              }}
              role="menu"
              aria-label="Sort menu"
            >
              {(() => {
                const isActive = (by: typeof sortBy, dir: typeof sortDirection) =>
                  sortBy === by && sortDirection === dir;

                const activeBg = `${accentColor}12`;
                const activeBorder = `1px solid ${accentColor}55`;

                return (
                  <>
                    <button
                      type="button"
                      role="menuitem"
                      aria-label="Name A-Z"
                      className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors"
                      style={{
                        color: isActive("name", "asc")
                          ? accentColor
                          : myFilesColors.muted,
                        background: isActive("name", "asc")
                          ? activeBg
                          : "transparent",
                        border: isActive("name", "asc")
                          ? activeBorder
                          : "1px solid transparent",
                        borderRadius: 8,
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        el.style.background = isActive("name", "asc")
                          ? activeBg
                          : `${accentColor}10`;
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        el.style.background = isActive("name", "asc")
                          ? activeBg
                          : "transparent";
                      }}
                      onClick={() => {
                        setSortBy("name");
                        setSortDirection("asc");
                        setSortMenuOpen(false);
                      }}
                    >
                      <span>Name A-Z</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      aria-label="Name Z-A"
                      className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors"
                      style={{
                        color: isActive("name", "desc")
                          ? accentColor
                          : myFilesColors.muted,
                        background: isActive("name", "desc")
                          ? activeBg
                          : "transparent",
                        border: isActive("name", "desc")
                          ? activeBorder
                          : "1px solid transparent",
                        borderRadius: 8,
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        el.style.background = isActive("name", "desc")
                          ? activeBg
                          : `${accentColor}10`;
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        el.style.background = isActive("name", "desc")
                          ? activeBg
                          : "transparent";
                      }}
                      onClick={() => {
                        setSortBy("name");
                        setSortDirection("desc");
                        setSortMenuOpen(false);
                      }}
                    >
                      <span>Name Z-A</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      aria-label="Newest first"
                      className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors"
                      style={{
                        color: isActive("date", "desc")
                          ? accentColor
                          : myFilesColors.muted,
                        background: isActive("date", "desc")
                          ? activeBg
                          : "transparent",
                        border: isActive("date", "desc")
                          ? activeBorder
                          : "1px solid transparent",
                        borderRadius: 8,
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        el.style.background = isActive("date", "desc")
                          ? activeBg
                          : `${accentColor}10`;
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        el.style.background = isActive("date", "desc")
                          ? activeBg
                          : "transparent";
                      }}
                      onClick={() => {
                        setSortBy("date");
                        setSortDirection("desc");
                        setSortMenuOpen(false);
                      }}
                    >
                      <span>Newest first</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      aria-label="Oldest first"
                      className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors"
                      style={{
                        color: isActive("date", "asc")
                          ? accentColor
                          : myFilesColors.muted,
                        background: isActive("date", "asc")
                          ? activeBg
                          : "transparent",
                        border: isActive("date", "asc")
                          ? activeBorder
                          : "1px solid transparent",
                        borderRadius: 8,
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        el.style.background = isActive("date", "asc")
                          ? activeBg
                          : `${accentColor}10`;
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        el.style.background = isActive("date", "asc")
                          ? activeBg
                          : "transparent";
                      }}
                      onClick={() => {
                        setSortBy("date");
                        setSortDirection("asc");
                        setSortMenuOpen(false);
                      }}
                    >
                      <span>Oldest first</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      aria-label="Size smallest"
                      className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors"
                      style={{
                        color: isActive("size", "asc")
                          ? accentColor
                          : myFilesColors.muted,
                        background: isActive("size", "asc")
                          ? activeBg
                          : "transparent",
                        border: isActive("size", "asc")
                          ? activeBorder
                          : "1px solid transparent",
                        borderRadius: 8,
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        el.style.background = isActive("size", "asc")
                          ? activeBg
                          : `${accentColor}10`;
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        el.style.background = isActive("size", "asc")
                          ? activeBg
                          : "transparent";
                      }}
                      onClick={() => {
                        setSortBy("size");
                        setSortDirection("asc");
                        setSortMenuOpen(false);
                      }}
                    >
                      <span>Size smallest</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      aria-label="Size largest"
                      className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors"
                      style={{
                        color: isActive("size", "desc")
                          ? accentColor
                          : myFilesColors.muted,
                        background: isActive("size", "desc")
                          ? activeBg
                          : "transparent",
                        border: isActive("size", "desc")
                          ? activeBorder
                          : "1px solid transparent",
                        borderRadius: 8,
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        el.style.background = isActive("size", "desc")
                          ? activeBg
                          : `${accentColor}10`;
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        el.style.background = isActive("size", "desc")
                          ? activeBg
                          : "transparent";
                      }}
                      onClick={() => {
                        setSortBy("size");
                        setSortDirection("desc");
                        setSortMenuOpen(false);
                      }}
                    >
                      <span>Size largest</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      aria-label="Type A-Z"
                      className="w-full flex items-center justify-between px-3 py-2 text-xs transition-colors"
                      style={{
                        color: isActive("type", "asc")
                          ? accentColor
                          : myFilesColors.muted,
                        background: isActive("type", "asc")
                          ? activeBg
                          : "transparent",
                        border: isActive("type", "asc")
                          ? activeBorder
                          : "1px solid transparent",
                        borderRadius: 8,
                      }}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        el.style.background = isActive("type", "asc")
                          ? activeBg
                          : `${accentColor}10`;
                      }}
                      onMouseLeave={(e) => {
                        const el = e.currentTarget;
                        el.style.background = isActive("type", "asc")
                          ? activeBg
                          : "transparent";
                      }}
                      onClick={() => {
                        setSortBy("type");
                        setSortDirection("asc");
                        setSortMenuOpen(false);
                      }}
                    >
                      <span>Type A-Z</span>
                    </button>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <div
          className="flex items-center rounded-lg overflow-hidden ml-auto"
          style={{
            border: `1px solid ${myFilesColors.border}`,
            background: myFilesColors.buttonSoftBg,
          }}
        >
          {(["list", "grid"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="w-8 h-8 flex items-center justify-center transition-colors"
              style={{
                background:
                  viewMode === mode
                    ? `linear-gradient(135deg, ${accentColor}, #22d3ee)`
                    : "transparent",
                color: viewMode === mode ? "#ffffff" : myFilesColors.muted,
                boxShadow:
                  viewMode === mode
                    ? `0 8px 18px ${accentColor}22`
                    : "none",
              }}
              onMouseEnter={(e) => {
                if (viewMode === mode) return;
                (e.currentTarget as HTMLButtonElement).style.background =
                  `${accentColor}10`;
                (e.currentTarget as HTMLButtonElement).style.color =
                  myFilesColors.text;
              }}
              onMouseLeave={(e) => {
                if (viewMode === mode) return;
                (e.currentTarget as HTMLButtonElement).style.background =
                  "transparent";
                (e.currentTarget as HTMLButtonElement).style.color =
                  myFilesColors.muted;
              }}
            >
              {mode === "list" ? <List size={14} /> : <Grid size={14} />}
            </button>
            ))}
          </div>

            <button
              type="button"
              onClick={() => handleToggleSelectionMode()}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
              aria-pressed={isSelectionMode}
              aria-label={isSelectionMode ? "Exit select mode" : "Enter select mode"}
              title={isSelectionMode ? "Selection aktif" : "Enter selection mode"}
              style={{
                background: isSelectionMode ? `linear-gradient(135deg, ${accentColor}, #22d3ee)` : myFilesColors.buttonSoftBg,
                border: isSelectionMode ? `1px solid ${accentColor}66` : `1px solid ${myFilesColors.border}`,
                color: isSelectionMode ? "#ffffff" : myFilesColors.text,
                boxShadow: isSelectionMode ? `0 10px 24px ${accentColor}22` : "none",
                marginLeft: 8,
              } as React.CSSProperties}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                if (isSelectionMode) return;
                el.style.background = `${accentColor}10`;
                el.style.color = myFilesColors.text;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLButtonElement;
                if (isSelectionMode) return;
                el.style.background = myFilesColors.buttonSoftBg;
                el.style.color = myFilesColors.text;
              }}
            >
              {isSelectionMode ? "Selecting" : "Select"}
            </button>

</div>


      {/* Folders */}
      <div className="mb-6">
        {showEmptySearchState && (
          <div className="text-xs" style={{ color: myFilesColors.muted }}>
            Tidak ada item untuk filter ini.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <h3
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: myFilesColors.text }}
              >
                Folders
              </h3>

              {(() => {
                const visibleFolderIds = sortedFolders.map((f) => f.id);
                const selectedVisibleCount = visibleFolderIds.reduce(
                  (acc, id) => acc + (selectedFolderIds.has(id) ? 1 : 0),
                  0,
                );
                const allVisibleChecked =
                  visibleFolderIds.length > 0 &&
                  selectedVisibleCount === visibleFolderIds.length;
                const someVisibleChecked =
                  selectedVisibleCount > 0 &&
                  selectedVisibleCount < visibleFolderIds.length;

                return visibleFolderIds.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      aria-label="Pilih semua folder yang tampil"
                      checked={allVisibleChecked}
                      ref={(el) => {
                        if (el) el.indeterminate = someVisibleChecked;
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {

                        const checked = e.target.checked;
                        if (checked) {
                          setSelectedFolderIds((prev) => {
                            const next = new Set(prev);
                            for (const id of visibleFolderIds) next.add(id);
                            return next;
                          });
                        } else {
                          setSelectedFolderIds((prev) => {
                            const next = new Set(prev);
                            for (const id of visibleFolderIds) next.delete(id);
                            return next;
                          });
                        }
                      }}
                      style={{
                        width: 14,
                        height: 14,
                        accentColor: "#ef4444",
                        ...checklistVisibilityStyle,
                      }}
                    />
                    <div
                      className="text-xs"
                      style={{
                        color: myFilesColors.muted,
                        ...checklistVisibilityStyle,
                      }}
                    >
                      Pilih semua (tampil)
                    </div>

                  </div>
                ) : null;
              })()}
            </div>
          </div>

          {(() => {
            return selectedFolderIds.size > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs" style={{ color: myFilesColors.muted }}>
                  {selectedFolderIds.size} folder dipilih
                </div>

                <button
                  type="button"
                  onClick={openBulkFolderDeleteModal}
                  disabled={bulkFolderDeleteLoading}
                  className="px-3 py-1 rounded-lg text-[11px] font-semibold"
                  style={{
                    background: "#f87171",
                    border: "1px solid rgba(248,113,113,0.4)",
                    color: "#080d1a",
                    opacity: bulkFolderDeleteLoading ? 0.75 : 1,
                  }}
                  aria-label="Pindahkan folder ke Trash"
                >
                  {bulkFolderDeleteLoading ? "Memproses..." : "Delete"}
                </button>

                <button
                  type="button"
                  onClick={() => clearFolderSelection()}
                  className="px-2 py-1 rounded-lg text-[11px] font-medium"
                  style={{
                    background: myFilesColors.buttonSoftBg,
                    border: `1px solid ${myFilesColors.border}`,
                    color: myFilesColors.muted,
                  }}
                >
                  Batalkan pilihan
                </button>
              </div>
            ) : null;
          })()}
        </div>

        {loadingFolders && (
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: myFilesColors.muted }}
          >
            <LoadingSpinner size={12} />
            Loading folders...
          </div>
        )}
        {folderError && (
          <div className="text-xs" style={{ color: "#f87171" }}>
            {folderError}
          </div>
        )}
        {!loadingFolders && !folderError && folderList.length === 0 && (
          <div className="text-xs" style={{ color: myFilesColors.muted }}>
            Belum ada folder.
          </div>
        )}

        {viewMode === "list" ? (
          <div className="flex flex-col gap-2">
            {sortedFolders.map((folder) => (
              <div
                key={folder.id}
                onContextMenu={(event) => openFolderMenuAtCursor(event, folder.id)}
                onDoubleClick={(event) => {
                  if (isInteractiveItemTarget(event.target)) return;
                  handleOpenFolder(folder);
                }}
                onClick={(event) => {
                  if (isInteractiveItemTarget(event.target)) return;
                  if (!isSelectionMode) return;
                  toggleFolderSelection(folder.id);
                }}
                onDragOver={(e) => {
                  if (!moveDragDropEnabled || !dragMoveItem) return;
                  if (dragMoveItem.type === "folder" && dragMoveItem.id === folder.id) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  if (!moveDragDropEnabled || !dragMoveItem) return;
                  if (dragMoveItem.type === "folder" && dragMoveItem.id === folder.id) {
                    clearDragMoveItem();
                    return;
                  }

                  moveDraggedItemToFolder(folder.id);
                }}
                className="grid px-4 py-2.5 items-center cursor-pointer hover:bg-[#0d1829] transition-colors group relative rounded-xl"
                style={{
                  gridTemplateColumns: folderListColumnTemplate,
                  borderBottom: "1px solid #0a1020",
                  background: myFilesColors.cardBg,
                  border: `1px solid ${myFilesColors.border}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedFolderIds.has(folder.id)}
                  onChange={() => toggleFolderSelection(folder.id)}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  style={{
                    width: 14,
                    height: 14,
                    accentColor: "#3b82f6",
                    ...checklistVisibilityStyle,
                  }}
                  aria-label={`Select folder ${folder.name}`}
                />

                <div className="flex min-w-0 items-center gap-3">
                  <Folder size={18} style={{ color: "#60a5fa", flexShrink: 0 }} />
                  <span
                    className="min-w-0 truncate"
                    style={{ color: myFilesColors.text }}
                  >
                    {folder.name}
                  </span>
                </div>

                {showFolderMetadata && (
                  <>
                <span className="text-xs font-medium" style={{ color: "#60a5fa" }}>
                  FOLDER
                </span>

                <span className="text-xs" style={{ color: "#64748b" }}>
                  {folder.updated_at || folder.created_at
                    ? new Date(folder.updated_at ?? folder.created_at ?? "").toLocaleDateString()
                    : "—"}
                </span>

                <span className="text-xs" style={{ color: "#64748b" }}>
                  —
                </span>

                <span className="text-xs" style={{ color: "#64748b" }}>
                  Private
                </span>

                  </>
                )}

                <div
                  className="relative flex items-center justify-center"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <button
                    type="button"
                    onClick={(event) => openFolderMenuAtCursor(event, folder.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[#1e2d45] z-50"
                    style={{
                      color: "#94a3b8",
                    }}
                    aria-label={`Folder actions for ${folder.name}`}
                    title="Folder actions"
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {openFolderActionId === folder.id && !folderActionMenuPosition && (
                    <div
                      className="absolute right-0 top-8 z-50 min-w-[128px] overflow-hidden rounded-lg"
                      style={{
                        background: "#0d1829",
                        border: "1px solid #1a2540",
                      }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                      }}
                    >
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-xs hover:bg-[#1e2d45]"
                        style={{ color: "#cbd5e1" }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setOpenFolderActionId(null);
                          setSelectedFolderForAction(folder);
                          openRenameFolderModal(folder);
                        }}
                        aria-label={`Rename ${folder.name}`}
                      >
                        Rename
                      </button>

                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-xs hover:bg-[#1e2d45]"
                        style={{ color: "#f87171" }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setOpenFolderActionId(null);
                          setSelectedFolderForDelete(folder);
                          openDeleteFolderModal(folder);
                        }}
                        aria-label={`Delete ${folder.name}`}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sortedFolders.map((folder) => (


                <div
                  key={folder.id}
                  draggable={moveDragDropEnabled}
                  onContextMenu={(event) => openFolderMenuAtCursor(event, folder.id)}
                  onDragStart={(e) => {

                if (!moveDragDropEnabled) {
                  e.preventDefault();
                  return;
                }

                e.dataTransfer.effectAllowed = "move";
                setCompactDragImage(e, folder.name ?? "Untitled folder", "folder");
                startFolderDragMove(folder);
              }}
              onDragEnd={clearDragMoveItem}
              onDragOver={(e) => {
                if (!moveDragDropEnabled || !dragMoveItem) return;

                if (dragMoveItem.type === "folder" && dragMoveItem.id === folder.id) {
                  return;
                }

                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();

                if (!moveDragDropEnabled || !dragMoveItem) return;

                if (dragMoveItem.type === "folder" && dragMoveItem.id === folder.id) {
                  clearDragMoveItem();
                  return;
                }

                moveDraggedItemToFolder(folder.id);
              }}
              onDoubleClick={(event) => {
                if (isInteractiveItemTarget(event.target)) return;
                handleOpenFolder(folder);
              }}
                      onClick={(event) => {
                        if (isInteractiveItemTarget(event.target)) return;
                        if (!isSelectionMode) return;
                        toggleFolderSelection(folder.id);
                      }}
              className="rounded-xl p-3 cursor-pointer transition-all group"



              style={{
                background: selectedFolderIds.has(folder.id)
                  ? "rgba(59, 130, 246, 0.08)"
                  : myFilesColors.cardBg,
                border: `1px solid ${myFilesColors.border}`,
                borderLeft: selectedFolderIds.has(folder.id)
                  ? `3px solid ${accentColor}55`
                  : "3px solid transparent",
              }}
            >
              <div className="flex items-start justify-between mb-2 relative pl-6">
                <div className="absolute left-0 top-1 z-10">
                  <input
                    type="checkbox"
                    aria-label={`Pilih folder ${folder.name}`}
                    checked={selectedFolderIds.has(folder.id)}
                    onChange={() => toggleFolderSelection(folder.id)}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  style={{
                    width: 14,
                    height: 14,
                    accentColor: "#ef4444",
                    ...checklistVisibilityStyle,
                  }}
                  />
                </div>

                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: myFilesColors.panelBg }}
                >
                  <Folder size={25} style={{ color: accentColor }} />
                </div>

                <button
                  type="button"
                  onClick={(event) => openFolderMenuAtCursor(event, folder.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                  style={{
                    color: myFilesColors.muted,
                    background: "transparent",
                    border: "1px solid transparent",
                  }}
                  onMouseEnter={(event) => {
                    const el = event.currentTarget;
                    el.style.background = `${accentColor}10`;
                    el.style.borderColor = `${accentColor}55`;
                    el.style.color = myFilesColors.text;
                  }}
                  onMouseLeave={(event) => {
                    const el = event.currentTarget;
                    el.style.background = "transparent";
                    el.style.borderColor = "transparent";
                    el.style.color = myFilesColors.muted;
                  }}
                  aria-label={`Folder actions for ${folder.name}`}
                  title="Folder actions"
                >
                  <MoreHorizontal size={16} />
                </button>
              </div>

              <div
                className="text-xs font-medium truncate"
                style={{ color: myFilesColors.text }}
              >
                {folder.name}
              </div>
              {showFolderMetadata && (
                <>
                  <div className="text-[10px] mt-0.5" style={{ color: myFilesColors.muted }}>
                    -
                  </div>
                  <div className="text-[10px]" style={{ color: myFilesColors.muted2 }}>
                    -
                  </div>
                </>
              )}
            </div>
            ))}
          </div>
        )}
      </div>

      {/* Global Folder Action Menu */}
      {activeFolderAction && folderActionMenuPosition ? (
        <div
          ref={folderMenuWrapRef}
          className="rounded-xl shadow-2xl"
          style={{
            position: "fixed",
            top: folderActionMenuPosition.y,
            left: folderActionMenuPosition.x,
            width: 176,
            zIndex: 9999,
            background: myFilesColors.panelBg,
            border: `1px solid ${myFilesColors.border}`,
            borderRadius: 10,
            padding: 6,
          }}
          role="menu"
          aria-label={`Folder menu ${activeFolderAction.name}`}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            className="w-full rounded-lg px-2 py-1 text-left text-xs font-semibold"
            style={{ color: myFilesColors.text, background: "transparent" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = `${accentColor}10`;
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "transparent";
            }}
            onClick={() => {
              closeFolderActionMenu();
              setDetailsItem({ type: "folder", item: activeFolderAction });
            }}
            aria-label={`Details ${activeFolderAction.name}`}
          >
            <div className="flex items-center gap-2">
              <FileText size={14} />
              <span>Details</span>
            </div>
          </button>

          <button
            type="button"
            role="menuitem"
            className="mt-1 w-full rounded-lg px-2 py-1 text-left text-xs font-semibold"
            style={{ color: myFilesColors.text, background: "transparent" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = `${accentColor}10`;
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "transparent";
            }}
            onClick={() => {
              closeFolderActionMenu();
              setSelectedFolderForAction(activeFolderAction);
              openRenameFolderModal(activeFolderAction);
            }}
            aria-label={`Rename ${activeFolderAction.name}`}
          >
            <div className="flex items-center gap-2">
              <Edit3 size={14} />
              <span>Rename</span>
            </div>
          </button>

          <button
            type="button"
            role="menuitem"
            className="mt-1 w-full rounded-lg px-2 py-1 text-left text-xs font-semibold"
            style={{ color: myFilesColors.text, background: "transparent" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = `${accentColor}10`;
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "transparent";
            }}
            onClick={() => {
              closeFolderActionMenu();
              openMoveFolderModal(activeFolderAction);
            }}
            aria-label={`Move ${activeFolderAction.name}`}
          >
            <div className="flex items-center gap-2">
              <Folder size={14} />
              <span>Move to...</span>
            </div>
          </button>

          <button
            type="button"
            role="menuitem"
            className="mt-1 w-full rounded-lg px-2 py-1 text-left text-xs font-semibold"
            style={{ color: "#f87171", background: "transparent" }}
            onMouseEnter={(event) => {
              event.currentTarget.style.background = "rgba(239,68,68,0.12)";
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.background = "transparent";
            }}
            onClick={() => {
              closeFolderActionMenu();
              openDeleteFolderModal(activeFolderAction);
            }}
            aria-label={`Delete ${activeFolderAction.name}`}
          >
            <div className="flex items-center gap-2">
              <Trash2 size={14} />
              <span>Trash</span>
            </div>
          </button>
        </div>
      ) : null}


      {/* Details Modal */}
      {detailsItem ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4"
          role="dialog"
          aria-modal="true"
          onMouseDown={() => setDetailsItem(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-5"
            style={{
              background: myFilesColors.cardBg,
              borderColor: myFilesColors.border,
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            {(() => {
              const item = detailsItem.item;
              const isFile = detailsItem.type === "file";
              const title = isFile
                ? (item as FileModel).original_name
                : (item as FolderModel).name;
              const typeLabel = isFile
                ? getTypeLabel((item as FileModel).mime_type ?? null)
                : "Folder";
              const modifiedAt =
                item.updated_at || item.created_at
                  ? new Date(item.updated_at ?? item.created_at ?? "").toLocaleString()
                  : "-";
              const createdAt = item.created_at
                ? new Date(item.created_at).toLocaleString()
                : "-";

              return (
                <>
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div
                        className="text-sm font-semibold"
                        style={{ color: myFilesColors.title }}
                      >
                        Details
                      </div>
                      <div
                        className="mt-1 truncate text-xs"
                        style={{ color: myFilesColors.muted }}
                        title={title}
                      >
                        {title}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDetailsItem(null)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{
                        background: myFilesColors.panelBg,
                        border: `1px solid ${myFilesColors.border}`,
                        color: myFilesColors.muted,
                      }}
                      aria-label="Close details"
                      title="Close"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="font-semibold" style={{ color: myFilesColors.muted }}>
                        Type
                      </div>
                      <div className="mt-1" style={{ color: myFilesColors.text }}>
                        {typeLabel}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold" style={{ color: myFilesColors.muted }}>
                        Status
                      </div>
                      <div className="mt-1" style={{ color: myFilesColors.text }}>
                        {isFile ? "Private" : "Folder"}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold" style={{ color: myFilesColors.muted }}>
                        Modified
                      </div>
                      <div className="mt-1" style={{ color: myFilesColors.text }}>
                        {modifiedAt}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold" style={{ color: myFilesColors.muted }}>
                        Size
                      </div>
                      <div className="mt-1" style={{ color: myFilesColors.text }}>
                        {isFile ? formatBytes((item as FileModel).size) : "-"}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="font-semibold" style={{ color: myFilesColors.muted }}>
                        Created
                      </div>
                      <div className="mt-1" style={{ color: myFilesColors.text }}>
                        {createdAt}
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}


      {/* Folder/Create/Rename Modal */}
      {isFolderModalOpen && (

        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              background: myFilesColors.cardBg,
              border: `1px solid ${myFilesColors.border}`,
            }}
          >
            <div className="mb-4">
              <h2
                className="text-sm font-semibold"
                style={{ color: myFilesColors.title }}
              >
                {folderModalMode === "create" ? "New Folder" : "Rename Folder"}
              </h2>
              <p className="text-xs mt-1" style={{ color: myFilesColors.muted }}>
                {folderModalMode === "create"
                  ? "Buat folder baru di dalam folder saat ini."
                  : "Perbarui nama folder."}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitFolderModal();
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs" style={{ color: myFilesColors.muted }}>
                  Folder name
                </label>
                <input
                  autoFocus
                  type="text"
                  className="mt-1 w-full rounded-xl border px-4 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Nama folder"
                  value={folderModalName}
                  onChange={(e) => {
                    setFolderModalName(e.target.value);
                    if (folderModalError) setFolderModalError("");
                  }}
                  aria-label="Nama folder"
                  style={{
                    background: myFilesColors.inputBg,
                    border: `1px solid ${myFilesColors.inputBorder}`,
                    color: myFilesColors.inputText,
                    caretColor: accentColor,
                  }}
                />
              </div>

              {folderModalError && (
                <div
                  className="text-xs rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2"
                  style={{ color: "#f87171" }}
                >
                  {folderModalError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeFolderModal}
                  disabled={folderActionLoading}
                  className="px-3 py-2 rounded-xl text-xs font-medium"
                  style={{
                    background: myFilesColors.buttonSoftBg,
                    border: `1px solid ${myFilesColors.border}`,
                    color: myFilesColors.text,
                    opacity: folderActionLoading ? 0.6 : 1,
                  }}
                  aria-label="Cancel"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={folderActionLoading}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}, #22d3ee)`,
                    opacity: folderActionLoading ? 0.7 : 1,
                  }}
                  aria-label={folderModalMode === "create" ? "Create" : "Save"}
                >
                  {folderActionLoading
                    ? folderModalMode === "create"
                      ? "Creating..."
                      : "Saving..."
                    : folderModalMode === "create"
                      ? "Create"
                      : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {previewModalOpen && previewModalMode === "minimized" ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed bottom-4 right-4 z-[150]"
          style={{
            background: myFilesColors.cardBg,
            border: `1px solid ${myFilesColors.border}`,
            borderRadius: 12,
            boxShadow: "0 20px 60px rgba(0,0,0,0.65)",
            width: 320,
            maxWidth: "calc(100vw - 32px)",
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center justify-between gap-3 px-3 py-2"
            style={{ borderBottom: `1px solid ${myFilesColors.border}` }}
          >
            <div className="min-w-0">
              <div
                className="truncate text-xs font-semibold"
                style={{ color: myFilesColors.title }}
                title={previewFileName}
              >
                {previewFileName}
              </div>
              <div
                className="mt-0.5 text-[10px]"
                style={{ color: myFilesColors.muted }}
              >
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
                  color: myFilesColors.muted2,
                  background: myFilesColors.panelBg,
                  border: `1px solid ${myFilesColors.border}`,
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

      {previewModalOpen && previewModalMode !== "minimized" && (
        <div
          className="fixed inset-0 z-[150] flex items-end justify-center md:items-center"
          style={{
            background:
              resolvedTheme === "light"
                ? "rgba(15,23,42,0.35)"
                : "rgba(0,0,0,0.55)",
          }}
          onMouseDown={closePreviewModal}
        >
          <div
            className="pointer-events-auto flex flex-col overflow-hidden rounded-xl border"
            style={{
              background: myFilesColors.cardBg,
              border: `1px solid ${myFilesColors.border}`,
              boxShadow: "0 20px 60px rgba(0,0,0,0.65)",
              width:
                previewModalMode === "maximized"
                  ? "calc(100vw - 8px)"
                  : previewModalMode === "normal"
                    ? "min(1120px, calc(100vw - 48px))"
                    : undefined,
              height:
                previewModalMode === "maximized"
                  ? "calc(100vh - 8px)"
                  : "min(82vh, 760px)",
              maxWidth: "none",
              maxHeight: "none",
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between gap-4 px-3 py-2"
              style={{
                borderBottom: `1px solid ${myFilesColors.border}`,
              }}
            >
              <div className="min-w-0">
                <h2
                  className="truncate text-sm font-semibold"
                  style={{ color: myFilesColors.title }}
                  title={previewFileName}
                >
                  {previewFileName}
                </h2>
                <p
                  className="truncate text-xs mt-1"
                  style={{ color: myFilesColors.muted }}
                >
                  Preview
                </p>
              </div>

              <div className="flex items-center gap-2">
                {(() => {
                  if (!previewFile) return null;

                  return (
                    <button
                      type="button"
                      onClick={() => {
                        handleDownloadFile(previewFile);
                      }}
                      className="flex h-8 items-center justify-center rounded-lg px-3 text-xs font-semibold"
                      style={{
                        background: `${accentColor}14`,
                        border: `1px solid ${accentColor}33`,
                        color: accentColor,
                      }}
                      aria-label="Download preview file"
                      title="Download"
                    >
                      <Download size={14} />
                    </button>
                  );
                })()}

                {previewContentType.startsWith("image/") && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewImageScaleFromAnchor(
                          previewImageScale - PREVIEW_IMAGE_ZOOM_STEP,
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
                      style={{
                        background: myFilesColors.panelBg,
                        border: `1px solid ${myFilesColors.border}`,
                        color: myFilesColors.muted2,
                      }}
                      aria-label="Zoom out image"
                      title="Zoom out"
                    >
                      <ZoomOut size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={resetPreviewImageZoom}
                      className="flex h-8 w-[76px] items-center justify-center gap-1 rounded-lg px-2 text-xs font-semibold"
                      style={{
                        background: myFilesColors.panelBg,
                        border: `1px solid ${myFilesColors.border}`,
                        color: myFilesColors.muted2,
                      }}
                      aria-label="Reset image zoom"
                      title="Reset zoom"
                    >
                      <RotateCcw size={13} />
                      <span>{Math.round(previewImageScale * 100)}%</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPreviewImageScaleFromAnchor(
                          previewImageScale + PREVIEW_IMAGE_ZOOM_STEP,
                        )
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
                      style={{
                        background: myFilesColors.panelBg,
                        border: `1px solid ${myFilesColors.border}`,
                        color: myFilesColors.muted2,
                      }}
                      aria-label="Zoom in image"
                      title="Zoom in"
                    >
                      <ZoomIn size={15} />
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setPreviewModalMode("minimized")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
                  style={{
                    background: myFilesColors.panelBg,
                    border: `1px solid ${myFilesColors.border}`,
                    color: myFilesColors.muted2,
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
                    background: myFilesColors.panelBg,
                    border: `1px solid ${myFilesColors.border}`,
                    color: myFilesColors.muted2,
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
                    background: myFilesColors.panelBg,
                    border: `1px solid ${myFilesColors.border}`,
                    color: myFilesColors.muted2,
                  }}
                  aria-label="Close preview"
                  title="Close preview"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div
              className="mx-3 mb-3 mt-3 flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl border"
              style={{
                background: myFilesColors.panelBg,
                border: `1px solid ${myFilesColors.border}`,
              }}
            >
              {previewContentType.startsWith("image/") ? (
                <div
                  ref={previewImageViewportRef}
                  onWheel={handlePreviewImageWheel}
                  className="flex h-full w-full items-center justify-center overflow-hidden"
                  style={{
                    touchAction: "none",
                    cursor:
                      previewImageScale > 1 ? "zoom-out" : "zoom-in",
                  }}
                >
                  <img
                    ref={previewImageRef}
                    src={previewUrl}
                    alt={previewFileName}
                    style={{
                      transform: `translate3d(${previewImageOffset.x}px, ${previewImageOffset.y}px, 0) scale(${previewImageScale})`,
                      transformOrigin: "center center",
                      maxHeight: "100%",
                      maxWidth: "100%",
                      objectFit: "contain",
                      transition: "transform 80ms ease-out",
                      userSelect: "none",
                    }}
                    draggable={false}
                  />
                </div>
              ) : previewContentType === "application/pdf" ? (
                <iframe
                  src={
                    previewUrl
                      ? `${previewUrl}#toolbar=1&navpanes=0&scrollbar=1`
                      : undefined
                  }
                  title={previewFileName}
                  className="h-full w-full rounded-xl"
                />
              ) : previewContentType.startsWith("video/") ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "#000",
                    borderRadius: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <video
                    controls
                    src={previewUrl ?? undefined}
                    style={{
                      width: "100%",
                      height: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                      background: "#000",
                    }}
                    preload="metadata"
                    onError={() => {
                      setFileError("Gagal memuat preview video.");
                    }}
                  />
                </div>
              ) : previewContentType.startsWith("audio/") ? (
                <AudioPreviewPlayer
                  src={previewUrl ?? undefined}
                  onError={() => {
                    setFileError("Gagal memuat preview audio.");
                  }}
                />
              ) : previewContentType.startsWith("text/") ||
                previewContentType === "application/json" ||
                previewContentType === "application/xml" ||
                previewContentType === "text/xml" ||
                previewContentType === "application/javascript" ||
                previewContentType === "application/x-javascript" ||
                previewContentType === "application/typescript" ||
                previewContentType === "text/css" ||
                previewContentType === "text/html" ||
                previewContentType === "text/markdown" ||
                previewContentType === "text/csv" ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {previewTextError ? (
                    <div className="text-xs" style={{ color: "#f87171" }}>
                      {previewTextError}
                    </div>
                  ) : previewIsTextTooLarge ? (
                    <div className="text-xs" style={{ color: myFilesColors.muted }}>
                      Preview text terlalu besar. Silakan download file untuk
                      melihat isinya.
                    </div>
                  ) : previewTextLoading ? (
                    <div className="text-xs" style={{ color: myFilesColors.muted }}>
                      Loading preview text...
                    </div>
                  ) : (
                    <pre
                      style={{
                        margin: 0,
                        padding: 16,
                        color: myFilesColors.text,
                        background: "transparent",
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace",
                        fontSize: 12,
                        lineHeight: 1.5,
                        whiteSpace: "pre",
                        overflow: "auto",
                        tabSize: 2,
                      }}
                    >
                      {previewText}
                    </pre>
                  )}
                </div>
              ) : previewUrl ? (
                <iframe
                  src={previewUrl}
                  title={previewFileName}
                  className="h-full w-full rounded-xl"
                />
              ) : (
                <div className="text-xs" style={{ color: myFilesColors.muted }}>
                  Preview tipe file ini belum tersedia di modal.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rename File Modal */}
      {isFileRenameModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              background: myFilesColors.cardBg,
              border: `1px solid ${myFilesColors.border}`,
            }}
          >
            <div className="mb-4">
              <h2
                className="text-sm font-semibold"
                style={{ color: myFilesColors.title }}
              >
                Rename File
              </h2>
              <p className="text-xs mt-1" style={{ color: myFilesColors.muted }}>
                Ganti nama file.
              </p>
            </div>

            {fileModalError && (
              <div
                className="text-xs rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 mb-3"
                style={{ color: "#f87171" }}
              >
                {fileModalError}
              </div>
            )}

            <form
              onSubmit={(e) => handleSubmitFileRename(e)}
              className="space-y-3"
            >
              <div>
                <label className="text-xs" style={{ color: myFilesColors.muted }}>
                  New name
                </label>
                <input
                  autoFocus
                  type="text"
                  className="mt-1 w-full rounded-xl border px-4 py-2 text-sm outline-none focus:border-blue-500"
                  value={fileRenameName}
                  onChange={(e) => {
                    setFileRenameName(e.target.value);
                    if (fileModalError) setFileModalError("");
                  }}
                  aria-label="Rename file input"
                  style={{
                    background: myFilesColors.inputBg,
                    border: `1px solid ${myFilesColors.inputBorder}`,
                    color: myFilesColors.inputText,
                    caretColor: accentColor,
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFileRenameModalOpen(false);
                    setFileModalError("");
                  }}
                  disabled={fileActionLoading}
                  className="px-3 py-2 rounded-xl text-xs font-medium"
                  style={{
                    background: myFilesColors.buttonSoftBg,
                    border: `1px solid ${myFilesColors.border}`,
                    color: myFilesColors.text,
                    opacity: fileActionLoading ? 0.6 : 1,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={fileActionLoading}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${accentColor}, #22d3ee)`,
                    opacity: fileActionLoading ? 0.7 : 1,
                  }}
                >
                  {fileActionLoading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              background: myFilesColors.cardBg,
              border: `1px solid ${myFilesColors.border}`,
            }}
          >
            <div className="mb-3">
              <h2
                className="text-sm font-semibold"
                style={{ color: myFilesColors.title }}
              >
                Share File
              </h2>
              <p className="text-xs mt-2" style={{ color: myFilesColors.muted }}>
                {selectedFileForShare?.original_name ?? "-"}
              </p>
            </div>

            {shareError && (
              <div
                className="text-xs rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 mb-3"
                style={{ color: "#f87171" }}
              >
                {shareError}
              </div>
            )}

            <div className="mb-4">
              {shareLoading && (
                <div className="text-xs" style={{ color: myFilesColors.muted2 }}>
                  Creating share link...
                </div>
              )}

              {!shareLoading && activeShareLink && (
                <>
                  <label className="text-xs" style={{ color: myFilesColors.muted }}>
                    Public share URL
                  </label>
                  <div className="mt-2">
                    <input
                      type="text"
                      readOnly
                      value={getPublicShareUrl(activeShareLink.token)}
                      className="w-full rounded-xl border px-4 py-2 text-sm outline-none"
                      aria-label="Public share URL"
                      style={{
                        background: myFilesColors.inputBg,
                        border: `1px solid ${myFilesColors.inputBorder}`,
                        color: myFilesColors.inputText,
                        caretColor: accentColor,
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            {copySuccess && (
              <div
                className="text-[11px] mb-3"
                style={{ color: "#34d399" }}
                role="status"
              >
                {copySuccess}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={async () => {
                  const link = activeShareLink
                    ? getPublicShareUrl(activeShareLink.token)
                    : "";

                  if (!link) return;

                  // 1) primary: navigator.clipboard
                  try {
                    await navigator.clipboard.writeText(link);
                    setCopySuccess("Link copied");
                    setTimeout(() => setCopySuccess(""), 1500);
                    return;
                  } catch {
                    // 2) fallback: textarea + execCommand("copy")
                  }

                  try {
                    const textarea = document.createElement("textarea");
                    textarea.value = link;
                    textarea.setAttribute("readonly", "true");
                    textarea.style.position = "absolute";
                    textarea.style.left = "-9999px";
                    document.body.appendChild(textarea);

                    textarea.select();
                    textarea.focus();
                    const ok = document.execCommand("copy");

                    document.body.removeChild(textarea);

                    if (ok) {
                      setCopySuccess("Link copied");
                      setTimeout(() => setCopySuccess(""), 1500);
                    } else {
                      setCopySuccess("Gagal copy link. Silakan copy manual.");
                      setTimeout(() => setCopySuccess(""), 2500);
                    }
                  } catch {
                    setCopySuccess("Gagal copy link. Silakan copy manual.");
                    setTimeout(() => setCopySuccess(""), 2500);
                  }
                }}
                disabled={!activeShareLink}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-white"
                style={{
                  background: !activeShareLink
                    ? "#334155"
                    : `linear-gradient(135deg, ${accentColor}, #22d3ee)`,
                  opacity: activeShareLink ? 1 : 0.7,
                }}
                aria-label="Copy Link"
              >
                Copy Link
              </button>

              <button
                type="button"
                onClick={() => {
                  if (shareLoading) return;
                  setIsShareModalOpen(false);
                  setSelectedFileForShare(null);
                  setActiveShareLink(null);
                  setShareError("");
                  setCopySuccess("");
                }}
                disabled={shareLoading}
                className="px-3 py-2 rounded-xl text-xs font-medium"
                style={{
                  background: myFilesColors.buttonSoftBg,
                  border: `1px solid ${myFilesColors.border}`,
                  color: myFilesColors.text,
                  opacity: shareLoading ? 0.6 : 1,
                }}
                aria-label="Close Share Modal"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Modal */}
      {moveModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={closeMoveModal}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-5 shadow-2xl"
            style={{
              background: myFilesColors.cardBg,
              border: `1px solid ${myFilesColors.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: myFilesColors.title }}>
                  {moveItemType === "folder" ? "Move Folder" : "Move File"}
                </h2>
                <p className="mt-1 text-sm" style={{ color: myFilesColors.muted }}>
                  Pilih folder tujuan untuk memindahkan item ini.
                </p>
              </div>

              <button
                type="button"
                className="rounded-lg px-2 py-1 text-sm transition-colors"
                style={{
                  color: myFilesColors.muted,
                  background: "transparent",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.background = `${accentColor}10`;
                  el.style.color = myFilesColors.text;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "transparent";
                  el.style.color = myFilesColors.muted;
                }}
                onClick={closeMoveModal}
                disabled={moveLoading}
                aria-label="Close move modal"
              >
                &times;
              </button>
            </div>

            <div
              className="mb-4 rounded-xl border p-3"
              style={{
                background: myFilesColors.panelBg,
                border: `1px solid ${myFilesColors.border}`,
              }}
            >
              <p className="text-xs uppercase tracking-wide" style={{ color: myFilesColors.muted }}>
                Item
              </p>
              <p className="mt-1 truncate text-sm font-medium" style={{ color: myFilesColors.text }}>
                {moveItemType === "file" && moveFileIds.length > 1
                  ? `${moveFileIds.length} files selected`
                  : moveItemName}
              </p>
            </div>

            <label className="mb-2 block text-sm font-medium" style={{ color: myFilesColors.text }}>
              Folder tujuan
            </label>

            <select
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none"
              value={moveTargetFolderId ?? "__root__"}
              onChange={(e) =>
                setMoveTargetFolderId(
                  e.target.value === "__root__" ? null : e.target.value,
                )
              }
              disabled={moveLoading}
              style={{
                background: myFilesColors.inputBg,
                border: `1px solid ${myFilesColors.inputBorder}`,
                color: myFilesColors.inputText,
                caretColor: accentColor,
              }}
            >
              <option value="__root__">Root / My Files</option>
              {folders
                .filter((folder) =>
                  moveItemType === "folder" ? folder.id !== moveItemId : true,
                )
                .map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
            </select>

            {moveError && (
              <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {moveError}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                onClick={closeMoveModal}
                disabled={moveLoading}
                style={{
                  background: myFilesColors.buttonSoftBg,
                  border: `1px solid ${myFilesColors.border}`,
                  color: myFilesColors.text,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="rounded-xl px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                onClick={submitMove}
                disabled={moveLoading || !moveItemId || !moveItemType}
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, #22d3ee)`,
                }}
              >
                {moveLoading ? "Moving..." : "Move"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Folder Modal */}
      {isBulkFolderDeleteModalOpen && (

        <div
          className="fixed inset-0 z-[130] flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-delete-folders-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#1a2540] bg-[#0f1729] p-6"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
          >
            <div className="mb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2
                    id="bulk-delete-folders-title"
                    className="text-sm font-semibold"
                    style={{ color: "#e2e8f0" }}
                  >
                    Pindahkan folder ke Trash?
                  </h2>
                  <p className="mt-2 text-xs" style={{ color: "#94a3b8" }}>
                    {bulkFolderDeleteIds.length} folder terpilih akan
                    dipindahkan ke Trash. Isi folder juga ikut masuk Trash.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeBulkFolderDeleteModal}
                  disabled={bulkFolderDeleteLoading}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                  style={{
                    background: "#0d1829",
                    border: "1px solid #1a2540",
                    color: "#94a3b8",
                    opacity: bulkFolderDeleteLoading ? 0.6 : 1,
                  }}
                  aria-label="Tutup modal bulk delete folder"
                >
                  &times;
                </button>
              </div>
            </div>

            {bulkFolderDeleteLoading && (
              <div
                className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs flex items-center gap-2"
                style={{ color: "#67e8f9" }}
                role="status"
              >
                <LoadingSpinner size={12} /> Memindahkan...
              </div>
            )}

            {bulkFolderDeleteResult ? (
              <>
                <div
                  className="rounded-xl border border-[#1a2540] bg-[#111c2f] p-4"
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
                        {bulkFolderDeleteResult.okCount}
                      </div>
                      <div className="text-[11px]">berhasil</div>
                    </div>
                    <div
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2"
                      style={{ color: "#f87171" }}
                    >
                      <div className="text-lg font-semibold">
                        {bulkFolderDeleteResult.failCount}
                      </div>
                      <div className="text-[11px]">gagal</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={closeBulkFolderDeleteModal}
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
                  onClick={closeBulkFolderDeleteModal}
                  disabled={bulkFolderDeleteLoading}
                  className="rounded-xl px-3 py-2 text-xs font-medium"
                  style={{
                    background: "#0d1829",
                    border: "1px solid #1a2540",
                    color: "#94a3b8",
                    opacity: bulkFolderDeleteLoading ? 0.6 : 1,
                  }}
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={() => void handleConfirmBulkFolderDelete()}
                  disabled={bulkFolderDeleteLoading}
                  className="rounded-xl px-3 py-2 text-xs font-semibold"
                  style={{
                    background: "#f87171",
                    border: "1px solid rgba(248,113,113,0.4)",
                    color: "#080d1a",
                    opacity: bulkFolderDeleteLoading ? 0.75 : 1,
                  }}
                >
                  {bulkFolderDeleteLoading
                    ? "Memindahkan..."
                    : "Pindahkan ke Trash"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Folder Modal */}
      {isDeleteModalOpen && selectedFolderForDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              background: myFilesColors.cardBg,
              border: `1px solid ${myFilesColors.border}`,
            }}
          >
            <div className="mb-3">
              <h2
                className="text-sm font-semibold"
                style={{ color: myFilesColors.title }}
              >
                Delete Folder?
              </h2>
              <p className="text-xs mt-2" style={{ color: myFilesColors.muted }}>
                Apakah kamu yakin ingin menghapus "
                <span
                  style={{
                    color: myFilesColors.text,
                    background: myFilesColors.panelBg,
                    border: `1px solid ${myFilesColors.border}`,
                    padding: "2px 8px",
                    borderRadius: 999,
                    display: "inline-block",
                    margin: "0 4px", /* small name box */
                  }}
                >
                  {selectedFolderForDelete.name}
                </span>
                "?
              </p>
            </div>

            {deleteError && (
              <div
                className="text-xs rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 mb-3"
                style={{ color: "#f87171" }}
              >
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedFolderForDelete(null);
                  setDeleteError("");
                  setOpenFolderActionId(null);
                }}
                disabled={deleteLoading}
                className="px-3 py-2 rounded-xl text-xs font-medium"
                style={{
                  background: myFilesColors.buttonSoftBg,
                  color: myFilesColors.text,
                  border: `1px solid ${myFilesColors.border}`,
                  opacity: deleteLoading ? 0.6 : 1,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmDeleteFolder}
                disabled={deleteLoading}
                className="px-3 py-2 rounded-xl text-xs font-semibold"
                style={{
                  background: "#f87171",
                  border: `1px solid rgba(248,113,113,0.4)`,
                  color: "#fff",
                  opacity: deleteLoading ? 0.75 : 1,
                }}
                aria-label="Delete"
              >
                {deleteLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete File Modal */}
      {isFileDeleteModalOpen && selectedFileForDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
          onMouseDown={() => {
            if (!deleteFileLoading) {
              setIsFileDeleteModalOpen(false);
              setSelectedFileForDelete(null);
              setDeleteFileError("");
            }
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              background: myFilesColors.cardBg,
              border: `1px solid ${myFilesColors.border}`,
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-3">
              <h2
                className="text-sm font-semibold"
                style={{ color: myFilesColors.title }}
              >
                Delete File?
              </h2>
              <p className="text-xs mt-2" style={{ color: myFilesColors.muted }}>
                Apakah kamu yakin ingin menghapus "
                {selectedFileForDelete.original_name}"?
                <br />
                File akan dipindahkan ke Trash.
              </p>
            </div>

            {deleteFileError && (
              <div
                className="text-xs rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 mb-3"
                style={{ color: "#f87171" }}
              >
                {deleteFileError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deleteFileLoading}
                onClick={() => {
                  setIsFileDeleteModalOpen(false);
                  setSelectedFileForDelete(null);
                  setDeleteFileError("");
                }}
                className="px-3 py-2 rounded-xl text-xs font-medium"
                style={{
                  background: myFilesColors.buttonSoftBg,
                  color: myFilesColors.text,
                  border: `1px solid ${myFilesColors.border}`,
                  opacity: deleteFileLoading ? 0.6 : 1,
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={deleteFileLoading}
                onClick={() => void handleConfirmDeleteFile()}
                className="px-3 py-2 rounded-xl text-xs font-semibold"
                style={{
                  background: "#f87171",
                  border: `1px solid rgba(248,113,113,0.4)`,
                  color: "#fff",
                  opacity: deleteFileLoading ? 0.75 : 1,
                }}
              >
                {deleteFileLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Files Modal */}
      {isBulkDeleteModalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-delete-files-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#1a2540] bg-[#0f1729] p-6"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="bulk-delete-files-title"
                  className="text-sm font-semibold"
                  style={{ color: "#e2e8f0" }}
                >
                  Pindahkan file ke Trash?
                </h2>
                <p className="mt-2 text-xs" style={{ color: "#94a3b8" }}>
                  {bulkDeleteFileIds.length} file terpilih akan dipindahkan ke
                  Trash.
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
                aria-label="Tutup modal bulk delete"
              >
                &times;
              </button>
            </div>

            {bulkDeleteLoading && (
              <div
                className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs flex items-center gap-2"
                style={{ color: "#67e8f9" }}
                role="status"
              >
                <LoadingSpinner size={12} />
                Memindahkan file ke Trash...
              </div>
            )}

            {bulkDeleteResult ? (
              <>
                <div
                  className="rounded-xl border border-[#1a2540] bg-[#111c2f] p-4"
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
                  onClick={() => void handleConfirmBulkDelete()}
                  disabled={bulkDeleteLoading}
                  className="rounded-xl px-3 py-2 text-xs font-semibold"
                  style={{
                    background: "#f87171",
                    border: "1px solid rgba(248,113,113,0.4)",
                    color: "#080d1a",
                    opacity: bulkDeleteLoading ? 0.75 : 1,
                  }}
                >
                  {bulkDeleteLoading ? (
                    <>
                      <LoadingSpinner size={12} /> Memindahkan...
                    </>
                  ) : (
                    "Pindahkan ke Trash"
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Download Result Modal */}
      {bulkDownloadResult && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-download-result-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#1a2540] bg-[#0f1729] p-6"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="bulk-download-result-title"
                  className="text-sm font-semibold"
                  style={{ color: "#e2e8f0" }}
                >
                  Download selesai
                </h2>
                <p className="mt-2 text-xs" style={{ color: "#94a3b8" }}>
                  Jika browser memblokir multiple download otomatis, beberapa
                  file mungkin perlu diunduh ulang.
                </p>
              </div>

              <button
                type="button"
                onClick={closeBulkDownloadResult}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                style={{
                  background: "#0d1829",
                  border: "1px solid #1a2540",
                  color: "#94a3b8",
                }}
                aria-label="Tutup hasil bulk download"
              >
                &times;
              </button>
            </div>

            <div
              className="rounded-xl border border-[#1a2540] bg-[#111c2f] p-4"
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
                    {bulkDownloadResult.okCount}
                  </div>
                  <div className="text-[11px]">berhasil</div>
                </div>
                <div
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2"
                  style={{ color: "#f87171" }}
                >
                  <div className="text-lg font-semibold">
                    {bulkDownloadResult.failCount}
                  </div>
                  <div className="text-[11px]">gagal</div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={closeBulkDownloadResult}
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
          </div>
        </div>
      )}

      {/* Files */}

      <div>
        {/* Bulk action bar */}
        {selectedFileIds.size > 0 && (
          <div
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 px-4 py-3 rounded-xl"
            style={{
              background: myFilesColors.cardBg,
              border: `1px solid ${myFilesColors.border}`,
              boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
            }}
          >
            <div className="text-xs" style={{ color: myFilesColors.muted }}>
              <span style={{ color: myFilesColors.text, fontWeight: 700 }}>
                {selectedFileIds.size}
              </span>{" "}
              file dipilih
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-lg text-xs font-semibold"
                style={{
                  background: `linear-gradient(135deg, ${accentColor}, #22d3ee)`,
                  color: "#fff",
                  border: `1px solid ${accentColor}55`,
                }}
                aria-label="Bulk Download"
                disabled={bulkDownloadLoading}
                onClick={() => void handleBulkDownload()}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.filter = "brightness(1.02)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.filter = "none";
                }}
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
                  background: myFilesColors.buttonSoftBg,
                  border: `1px solid ${myFilesColors.border}`,
                  color: myFilesColors.text,
                }}
                aria-label="Bulk Share"
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.background = `${accentColor}10`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.background = myFilesColors.buttonSoftBg;
                }}
                onClick={() => {
                  void (async () => {
                    const ids = Array.from(selectedFileIds);
                    if (ids.length === 0) return;

                    // Modal hasil Bulk Share (NimbusDrive dark)
                    // - dibuat inline (tanpa mengubah tombol share individual)
                    // - tidak menggunakan native alert
                    const shareResults: Array<{
                      fileName: string;
                      link: string;
                      failed: boolean;
                      error?: string;
                    }> = [];

                    const origin = window.location.origin;

                    let okCount = 0;
                    let failCount = 0;

                    // proses satu per satu, lanjut jika satu gagal
                    for (const id of ids) {
                      const file = files.find((f) => f.id === id);
                      const fileName = file?.original_name ?? id;

                      try {
                        // createShareLink existing
                        const created = await createShareLink(id);
                        okCount++;

                        // bentuk URL publik: origin + /share/{token}
                        const token = created?.token;
                        const link = token ? `${origin}/share/${token}` : "";

                        shareResults.push({
                          fileName,
                          link,
                          failed: false,
                        });
                      } catch (e: any) {
                        failCount++;
                        shareResults.push({
                          fileName,
                          link: "",
                          failed: true,
                          error:
                            e?.response?.data?.message ||
                            e?.message ||
                            "Gagal membuat share link",
                        });
                      }
                    }

                    const modalId = `bulk-share-modal-${Date.now()}`;
                    const overlay = document.createElement("div");
                    overlay.id = modalId;
                    overlay.className =
                      "fixed inset-0 z-[120] flex items-center justify-center bg-black/60";

                    // container dialog
                    const dialog = document.createElement("div");
                    // NOTE: dialog content is generated inline (DOM) for Bulk Share modal

                    dialog.className =
                      "w-full max-w-2xl rounded-2xl border border-[#1a2540] bg-[#0f1729] p-6";
                    // avoid extra ARIA role/constraints; existing UI uses role/dialog similarly
                    dialog.setAttribute("aria-modal", "true");

                    const title = document.createElement("h2");
                    title.className = "text-sm font-semibold";
                    title.style.color = "#e2e8f0";
                    title.textContent = "Share Links";

                    const summary = document.createElement("div");
                    summary.className = "text-xs mt-2";
                    summary.style.color = "#94a3b8";
                    summary.textContent = `${okCount} berhasil, ${failCount} gagal`;

                    const listWrap = document.createElement("div");
                    listWrap.className =
                      "mt-4 rounded-xl overflow-hidden border border-[#1a2540]";
                    listWrap.style.background = "#111c2f";

                    shareResults.forEach((r, idx) => {
                      const row = document.createElement("div");
                      row.className =
                        "grid grid-cols-1 sm:grid-cols-[200px_1fr_90px] gap-3 px-4 py-3";
                      row.style.borderBottom =
                        idx === shareResults.length - 1
                          ? "none"
                          : "1px solid rgba(26,37,64,1)";

                      const nameEl = document.createElement("div");
                      nameEl.className = "text-xs";
                      nameEl.style.color = "#cbd5e1";
                      nameEl.textContent = r.fileName;

                      const linkEl = document.createElement("div");
                      linkEl.className = "flex flex-col gap-2";

                      const input = document.createElement("input");
                      input.type = "text";
                      input.readOnly = true;
                      input.value = r.failed ? "Gagal membuat link" : r.link;
                      input.className =
                        "w-full rounded-xl border border-[#1a2540] bg-[#0d1829] px-3 py-2 text-xs outline-none text-[#cbd5e1]";
                      input.setAttribute(
                        "aria-label",
                        `Public share URL ${r.fileName}`,
                      );

                      linkEl.appendChild(input);

                      const copyBtn = document.createElement("button");
                      copyBtn.type = "button";
                      copyBtn.className =
                        "px-3 py-2 rounded-lg text-xs font-semibold";
                      copyBtn.textContent = "Copy";
                      copyBtn.setAttribute(
                        "aria-label",
                        `Copy share link ${r.fileName}`,
                      );
                      copyBtn.style.background =
                        r.failed || !r.link
                          ? "#334155"
                          : "linear-gradient(135deg, #3b82f6, #22d3ee)";
                      copyBtn.style.color = "#fff";
                      copyBtn.style.opacity = r.failed || !r.link ? "0.7" : "1";
                      copyBtn.disabled = r.failed || !r.link;

                      const status = document.createElement("div");
                      status.className = "text-[11px]";
                      status.style.color = "#34d399";
                      status.style.minHeight = "16px";
                      status.textContent = "";
                      status.setAttribute("role", "status");

                      copyBtn.onclick = async () => {
                        if (!r.link) {
                          // user masih bisa menekan Ctrl+C manual dari input
                          try {
                            input.focus();
                            input.select();
                          } catch {
                            // ignore
                          }
                          status.textContent =
                            "Link sudah dipilih, tekan Ctrl+C untuk menyalin.";
                          setTimeout(() => {
                            status.textContent = "";
                          }, 4000);
                          return;
                        }

                        const safeSelectInput = () => {
                          try {
                            input.focus();
                            input.select();
                          } catch {
                            // ignore
                          }
                        };

                        // 1) coba clipboard API
                        let copied = false;
                        try {
                          if (navigator?.clipboard?.writeText) {
                            await navigator.clipboard.writeText(r.link);
                            copied = true;
                          }
                        } catch {
                          copied = false;
                        }

                        // 2) fallback: execCommand("copy")
                        if (!copied) {
                          try {
                            const textarea = document.createElement("textarea");
                            textarea.value = r.link;
                            textarea.setAttribute("readonly", "true");
                            textarea.style.position = "absolute";
                            textarea.style.left = "-9999px";
                            document.body.appendChild(textarea);

                            textarea.select();
                            const ok = document.execCommand("copy");

                            document.body.removeChild(textarea);
                            if (ok) copied = true;
                          } catch {
                            copied = false;
                          }
                        }

                        if (copied) {
                          status.textContent = "Tersalin";
                        } else {
                          // 3) kedua metode gagal: pilih input supaya user tinggal Ctrl+C
                          safeSelectInput();
                          status.textContent =
                            "Link sudah dipilih, tekan Ctrl+C untuk menyalin";
                        }

                        setTimeout(() => {
                          status.textContent = "";
                        }, 2000);
                      };

                      row.appendChild(nameEl);
                      row.appendChild(linkEl);
                      const rightWrap = document.createElement("div");
                      rightWrap.className = "flex flex-col gap-2";
                      rightWrap.appendChild(copyBtn);
                      rightWrap.appendChild(status);
                      row.appendChild(rightWrap);

                      listWrap.appendChild(row);
                    });

                    const closeBtn = document.createElement("button");
                    closeBtn.type = "button";
                    closeBtn.className =
                      "px-3 py-2 rounded-xl text-xs font-medium";
                    closeBtn.textContent = "Tutup";
                    closeBtn.style.background = "#0d1829";
                    closeBtn.style.border = "1px solid #1a2540";
                    closeBtn.style.color = "#94a3b8";

                    closeBtn.onclick = () => {
                      overlay.remove();
                    };

                    dialog.appendChild(title);
                    dialog.appendChild(summary);
                    dialog.appendChild(listWrap);

                    const footer = document.createElement("div");
                    footer.className = "flex justify-end mt-5";
                    footer.appendChild(closeBtn);
                    dialog.appendChild(footer);

                    overlay.style.background = "rgba(0,0,0,0.55)";
                    overlay.style.padding = "24px";
                    overlay.appendChild(dialog);

                    document.body.appendChild(overlay);
                  })();
                }}
              >
                Share
              </button>

              <button
                type="button"
                className="px-3 py-2 rounded-lg text-xs font-semibold"
                style={{
                  background: "#f87171",
                  border: "1px solid rgba(248,113,113,0.4)",
                  color: "#080d1a",
                }}
                aria-label="Bulk Delete"
                onClick={openBulkDeleteModal}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "rgba(239,68,68,0.9)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "#f87171";
                }}
              >
                Delete
              </button>

              <button
                type="button"
                className="px-3 py-2 rounded-lg text-xs font-medium"
                style={{
                  background: myFilesColors.buttonSoftBg,
                  border: `1px solid ${myFilesColors.border}`,
                  color: myFilesColors.text,
                }}
                aria-label="Batalkan pilihan"
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.background = `${accentColor}10`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.background = myFilesColors.buttonSoftBg;
                }}
                onClick={() => {
                  clearSelection();
                }}
              >
                Batalkan pilihan
              </button>
            </div>
          </div>
        )}

        <h3
          className="text-xs font-semibold mb-3 uppercase tracking-wider"
          style={{ color: "#334155" }}
        >
          Recent Files
        </h3>
        {loadingFiles && (
          <div
            className="flex items-center gap-2 text-xs mb-4"
            style={{ color: myFilesColors.muted }}
          >
            <LoadingSpinner size={12} />
            Memuat file...
          </div>
        )}
        {fileError && (
          <div className="text-xs mb-4" style={{ color: "#f87171" }}>
            {fileError}
          </div>
        )}
        {viewMode === "list" ? (
          <div className="flex flex-col gap-2">
            <div
              className="grid items-center gap-2 rounded-xl px-3 py-2"
              style={{
                gridTemplateColumns: fileListColumnTemplate,
                background: myFilesColors.panelBg,
                border: `1px solid ${myFilesColors.border}`,
              }}
            >
            {/* Select all */}
            {(() => {
              const visibleIds = typedFiles.map((f) => f.id);
              const selectedVisibleCount = visibleIds.reduce(
                (acc, id) => acc + (selectedFileIds.has(id) ? 1 : 0),
                0,
              );
              const allChecked =
                visibleIds.length > 0 &&
                selectedVisibleCount === visibleIds.length;
              const indeterminate =
                selectedVisibleCount > 0 && !allChecked;

              return (
                <input
                  type="checkbox"
                  aria-label="Pilih semua file yang tampil"
                  checked={allChecked}
                  ref={(el) => {
                    if (el) el.indeterminate = indeterminate;
                  }}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (checked) {
                      setSelectedFileIds((prev) => {
                        const next = new Set(prev);
                        for (const id of visibleIds) next.add(id);
                        return next;
                      });
                    } else {
                      setSelectedFileIds((prev) => {
                        const next = new Set(prev);
                        for (const id of visibleIds) next.delete(id);
                        return next;
                      });
                    }
                  }}
                  style={{
                    width: 14,
                    height: 14,
                    accentColor: "#ef4444",
                    ...checklistVisibilityStyle,
                  }}
                />
              );
            })()}

            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: myFilesColors.muted, paddingLeft: 38 }}
            >
              Name
            </span>
            {showFileMetadata && (
              <>
                <span
                  className="text-[11px] font-medium uppercase tracking-wider"
                  style={{
                    color: myFilesColors.muted,
                    justifySelf: "start",
                    paddingLeft: 4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginLeft: -4,
                  }}
                >
                  Type
                </span>
                <span
                  className="text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: myFilesColors.muted }}
                >
                  Modified
                </span>
                <span
                  className="text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: myFilesColors.muted }}
                >
                  Size
                </span>
                <span
                  className="text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: myFilesColors.muted }}
                >
                  Status
                </span>
              </>
            )}
            {/* empty final header cell for action column */}
            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: myFilesColors.muted }}
            ></span>
          </div>

          {showEmptySearchState && (
            <div className="text-xs px-4 py-6" style={{ color: myFilesColors.muted }}>
              Tidak ada hasil untuk "{searchQuery.trim()}"
            </div>
          )}
          {!showEmptySearchState &&
            typedFiles.map((file, i) => {
              const typeLabel = getTypeLabel(file.mime_type ?? null);

              return (
                <div
                  key={file.id}
                  draggable={moveDragDropEnabled}
                  onContextMenu={(e) => openFileMenuAtCursor(e, file.id)}
                  onDoubleClick={(event) => {
                    if (isInteractiveItemTarget(event.target)) return;
                    void handlePreviewFile(file);
                  }}
                      onClick={(event) => {
                        if (isInteractiveItemTarget(event.target)) return;
                        if (!isSelectionMode) return;
                        toggleFileSelection(file.id);
                      }}
                  onDragStart={(e) => {
                    if (!moveDragDropEnabled) {
                      e.preventDefault();
                      return;
                    }

                    e.dataTransfer.effectAllowed = "move";
                    setCompactDragImage(e, file.original_name ?? "Untitled file", "file");
                    startFileDragMove(file);
                  }}
                  onDragEnd={clearDragMoveItem}
                  className="grid items-center gap-2 rounded-xl px-3 py-2 cursor-pointer transition-colors group relative"
                  style={{
                    gridTemplateColumns: fileListColumnTemplate,
                    border: `1px solid ${myFilesColors.border}`,
                    background: selectedFileIds.has(file.id)
                      ? "rgba(59, 130, 246, 0.08)"
                      : myFilesColors.cardBg,
                    borderLeft: selectedFileIds.has(file.id)
                      ? `3px solid ${accentColor}55`
                      : "3px solid transparent",
                  }}
                >
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      aria-label={`Pilih file ${file.original_name}`}
                      checked={selectedFileIds.has(file.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedFileIds((prev) => {
                          const next = new Set(prev);
                          if (checked) next.add(file.id);
                          else next.delete(file.id);
                          return next;
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: 14,
                        height: 14,
                        accentColor: "#ef4444",
                        ...checklistVisibilityStyle,
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileTypeIcon
                      originalName={file.original_name}
                      mimeType={file.mime_type}
                      className="w-7 h-7"
                      size={14}
                    />
                    <span
                      className="text-sm truncate"
                      style={{ color: myFilesColors.text }}
                    >
                      {file.original_name}
                    </span>
                  </div>

                  {showFileMetadata && (
                    <>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded font-medium w-fit"
                        style={{
                          background: `${myFilesColors.panelBg}`,
                          color: accentColor,
                          border: `1px solid ${myFilesColors.border}`,
                          justifySelf: "start",
                        }}
                      >
                        {typeLabel}
                      </span>

                      <span className="text-xs" style={{ color: myFilesColors.muted }}>
                        {file.created_at
                          ? new Date(file.created_at).toLocaleDateString()
                          : "-"}
                      </span>

                      <span className="text-xs" style={{ color: myFilesColors.muted }}>
                        {formatBytes(file.size)}
                      </span>

                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded w-fit"
                        style={{
                          background: myFilesColors.panelBg,
                          color: myFilesColors.muted2,
                          border: `1px solid ${myFilesColors.border}`,
                        }}
                      >
                        Private
                      </span>
                    </>
                  )}

                  {renderFileActionMenu(file)}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {showEmptySearchState && (
              <div
                className="col-span-full text-xs px-4 py-6"
                style={{ color: myFilesColors.muted }}
              >
                Tidak ada hasil untuk "{searchQuery.trim()}".
              </div>
            )}
            {!showEmptySearchState &&
              typedFiles.map((file) => {
                const typeLabel = getTypeLabel(file.mime_type ?? null);

                return (
                  <div
                    key={file.id}
                    draggable={moveDragDropEnabled}
                    onContextMenu={(e) => openFileMenuAtCursor(e, file.id)}
                    onDoubleClick={(event) => {
                      if (isInteractiveItemTarget(event.target)) return;
                      void handlePreviewFile(file);
                    }}
                      onClick={(event) => {
                        if (isInteractiveItemTarget(event.target)) return;
                        if (!isSelectionMode) return;
                        toggleFileSelection(file.id);
                      }}
                    onDragStart={(e) => {
                      if (!moveDragDropEnabled) {
                        e.preventDefault();
                        return;
                      }

                      e.dataTransfer.effectAllowed = "move";
                      setCompactDragImage(
                        e,
                        file.original_name ?? "Untitled file",
                        "file",
                      );
                      startFileDragMove(file);
                    }}
                    onDragEnd={clearDragMoveItem}
                    className="rounded-xl p-3 cursor-pointer transition-colors group relative"
                    style={{
                      border: `1px solid ${myFilesColors.border}`,
                      background: selectedFileIds.has(file.id)
                        ? "rgba(59, 130, 246, 0.08)"
                        : myFilesColors.cardBg,
                      borderLeft: selectedFileIds.has(file.id)
                        ? `3px solid ${accentColor}55`
                        : "3px solid transparent",
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          aria-label={`Pilih file ${file.original_name}`}
                          checked={selectedFileIds.has(file.id)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setSelectedFileIds((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(file.id);
                              else next.delete(file.id);
                              return next;
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                        style={{
                          width: 14,
                          height: 14,
                          accentColor: "#ef4444",
                          ...checklistVisibilityStyle,
                        }}
                        />

                        <FileTypeIcon
                          originalName={file.original_name}
                          mimeType={file.mime_type}
                          className="w-9 h-9 shrink-0"
                          size={16}
                        />
                      </div>

                      {renderFileActionMenu(file)}
                    </div>

                    <div
                      className="text-sm font-medium truncate"
                      style={{ color: myFilesColors.text }}
                    >
                      {file.original_name}
                    </div>

                    {showFileMetadata && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className="text-[10px] px-2 py-0.5 rounded font-medium w-fit"
                          style={{
                            background: `${myFilesColors.panelBg}`,
                            color: accentColor,
                            border: `1px solid ${myFilesColors.border}`,
                          }}
                        >
                          {typeLabel}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: myFilesColors.muted }}
                        >
                          {file.created_at
                            ? new Date(file.created_at).toLocaleDateString()
                            : "-"}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: myFilesColors.muted }}
                        >
                          {formatBytes(file.size)}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded w-fit"
                          style={{
                            background: myFilesColors.panelBg,
                            color: myFilesColors.muted2,
                            border: `1px solid ${myFilesColors.border}`,
                          }}
                        >
                          Private
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
