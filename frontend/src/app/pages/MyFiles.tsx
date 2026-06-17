import { useCallback, useEffect, useMemo, useRef, useState } from "react";



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
              ♪
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
              {isPlaying ? "❚❚" : "▶"}
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
  Edit3,
  Trash2,
  ChevronRight,
  Home,
  Star,
  Clock,
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
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("presentation")) return "PPTX";
  if (mime.includes("image")) return "JPG";
  if (mime.includes("zip")) return "ZIP";
  if (mime.includes("audio")) return "MUSIC";
  if (mime.includes("video")) return "MP4";
  if (mime.includes("spreadsheet")) return "XLSX";
  return mime.split("/")[1]?.toUpperCase() ?? "FILE";
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

  const [filterMenuOpen, setFilterMenuOpen] = useState<boolean>(false);
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
  const [moveDragDropEnabled, setMoveDragDropEnabled] = useState(false);
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

  const toggleFolderSelection = (folderId: string) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
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
  const [previewModalMode, setPreviewModalMode] = useState<
    "normal" | "maximized" | "minimized"
  >("normal");

  // Text preview modal state
  const [previewText, setPreviewText] = useState<string>("");
  const [previewTextLoading, setPreviewTextLoading] = useState(false);
  const [previewTextError, setPreviewTextError] = useState<string>("");
  const [previewIsTextTooLarge, setPreviewIsTextTooLarge] = useState(false);

  const [previewMiniOffset, setPreviewMiniOffset] = useState({ x: 0, y: 0 });
  const [fileModalError, setFileModalError] = useState("");

  const previewMiniDragRef = useRef<{

    startClientX: number;
    startClientY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

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
    setPreviewMiniOffset({ x: 0, y: 0 });
    previewMiniDragRef.current = null;
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

  const handlePreviewMiniPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (previewModalMode !== "minimized") return;

    event.preventDefault();

    previewMiniDragRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startOffsetX: previewMiniOffset.x,
      startOffsetY: previewMiniOffset.y,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dragState = previewMiniDragRef.current;
      if (!dragState) return;

      const deltaX = moveEvent.clientX - dragState.startClientX;
      const deltaY = moveEvent.clientY - dragState.startClientY;

      setPreviewMiniOffset({
        x: dragState.startOffsetX + deltaX,
        y: dragState.startOffsetY + deltaY,
      });
    };

    const handlePointerUp = () => {
      previewMiniDragRef.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handleDownloadFile = async (file: FileModel | null) => {
    if (!file) return;
    try {
      await fileService.downloadFile(file.id, file.original_name);
    } catch {
      setFileError("Gagal mendownload file.");
    }
  };

  const handlePreviewFile = async (file: FileModel) => {
    if (!fileService.canPreviewFile(file)) {
      setFileError("Preview tidak tersedia untuk tipe file ini.");
      return;
    }

    try {
      setPreviewFile(file);
      setPreviewingFileId(file.id);
      setFileError("");

      const { blob, contentType } = await fileService.getFilePreviewBlob(
        file.id,
      );

      const normalizedContentType = (contentType ?? "").toLowerCase();

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
          setPreviewContentType(contentType);
          setPreviewUrl(undefined);
          setPreviewModalMode("normal");
          setPreviewImageScale(1);
          setPreviewMiniOffset({ x: 0, y: 0 });
          setPreviewModalOpen(true);
          return;
        } catch {
          setPreviewTextError("Gagal memuat preview text.");
          setPreviewText("");
          setPreviewIsTextTooLarge(false);
          setPreviewFileName(file.original_name);
          setPreviewContentType(contentType);
          setPreviewUrl(undefined);
          setPreviewModalMode("normal");
          setPreviewImageScale(1);
          setPreviewMiniOffset({ x: 0, y: 0 });
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
        setPreviewMiniOffset({ x: 0, y: 0 });

        if (previewUrl) {
          window.URL.revokeObjectURL(previewUrl);
        }

        setPreviewUrl(url);
        setPreviewContentType(contentType);
        setPreviewFileName(file.original_name);
        setPreviewModalOpen(true);
        return;
      }

      const opened = window.open(url, "_blank");

      if (!opened) {
        window.URL.revokeObjectURL(url);
        setFileError(
          "Preview diblokir browser. Izinkan pop-up untuk membuka preview.",
        );
        return;
      }

      try {
        opened.opener = null;
      } catch {
        // ignore
      }

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 60000);
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

  // file action menu helpers
  function openFileMenuAtCursor(
    event: React.MouseEvent,
    fileId: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setOpenFolderActionId(null);

    if (openFileActionId === fileId) {
                    setOpenFileActionId(null);
                    setFileActionMenuPosition(null);
                    return;
                    }

                    const menuWidth = 180;
                    const menuHeight = 260;
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
    const icon = type === "folder" ? "📁" : "📄";

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
        };

  const activeFolderAction = useMemo(
    () => folders.find((folder) => folder.id === openFolderActionId) ?? null,
    [folders, openFolderActionId],
  );

  const renderFileActionMenu = (file: FileModel) => (
    <div className="relative">
      <div ref={openFileActionId === file.id ? fileMenuWrapRef : null}>
        {openFileActionId === file.id && fileActionMenuPosition ? (
          <div
            style={{
              position: "fixed",
              top: fileActionMenuPosition.y,
              left: fileActionMenuPosition.x,
              width: 176,
              zIndex: 9999,
              background:
                resolvedTheme === "light" ? "#ffffff" : myFilesColors.cardBg,
              border: `1px solid ${myFilesColors.border}`,
              borderRadius: 10,
              overflow: "hidden",
              backgroundClip: "padding-box",
              isolation: "isolate",
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            }}
            role="menu"
            aria-label={`File actions ${file.original_name}`}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {fileService.canPreviewFile(file) && (
              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                style={{ color: myFilesColors.text, background: "transparent" }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.background = `${accentColor}10`;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.background = "transparent";
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenFileActionId(null);
                  setFileActionMenuPosition(null);
                  void handlePreviewFile(file);
                }}
                disabled={previewingFileId === file.id}
                aria-label={`Preview ${file.original_name}`}
                title={`Preview ${file.original_name}`}
              >
                <Eye size={12} style={{ color: myFilesColors.muted }} />{" "}
                {previewingFileId === file.id ? "Opening..." : "Preview"}
              </button>
            )}

            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
              style={{ color: myFilesColors.text, background: "transparent" }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = `${accentColor}10`;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = "transparent";
              }}
              onClick={(e) => {
                e.stopPropagation();
                void fileService.downloadFile(file.id, file.original_name);
                setOpenFileActionId(null);
                setFileActionMenuPosition(null);
              }}
              aria-label={`Download ${file.original_name}`}
              title={`Download ${file.original_name}`}
            >
              <Download size={12} style={{ color: myFilesColors.muted }} /> Download
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
              style={{ color: myFilesColors.text, background: "transparent" }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = `${accentColor}10`;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = "transparent";
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFileForShare(file);
                setShareError("");
                setCopySuccess("");
                setActiveShareLink(null);
                setIsShareModalOpen(true);
                setOpenFileActionId(null);
                setFileActionMenuPosition(null);

                (async () => {
                  try {
                    setShareLoading(true);
                    const created = await createShareLink(file.id);
                    setActiveShareLink(created);
                  } catch (err: any) {
                    setShareError(
                      err?.response?.data?.message ||
                        err?.message ||
                        "Gagal membuat share link",
                    );
                  } finally {
                    setShareLoading(false);
                  }
                })();
              }}
              aria-label={`Share ${file.original_name}`}
              title={`Share ${file.original_name}`}
            >
              <Share2 size={12} style={{ color: myFilesColors.muted }} /> Share
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
              style={{ color: myFilesColors.text, background: "transparent" }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = `${accentColor}10`;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = "transparent";
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFileForAction(file);
                setFileRenameName(file.original_name);
                setFileModalError("");
                setIsFileRenameModalOpen(true);
                setOpenFileActionId(null);
                setFileActionMenuPosition(null);
              }}
              aria-label={`Rename ${file.original_name}`}
              title={`Rename ${file.original_name}`}
            >
              <Edit3 size={12} style={{ color: myFilesColors.muted }} /> Rename
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
              style={{ color: myFilesColors.text, background: "transparent" }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = `${accentColor}10`;
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = "transparent";
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpenFileActionId(null);
                setFileActionMenuPosition(null);
                openMoveFileModal(file);
              }}
              aria-label={`Move ${file.original_name}`}
            >
              <Folder size={12} style={{ color: myFilesColors.muted }} /> Move to...
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
              style={{ color: "#f87171", background: "transparent" }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = "rgba(239,68,68,0.12)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = "transparent";
              }}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedFileForDelete(file);
                setDeleteFileError("");
                setIsFileDeleteModalOpen(true);
                setOpenFileActionId(null);
                setFileActionMenuPosition(null);
              }}
              aria-label={`Delete ${file.original_name}`}
              title={`Delete ${file.original_name}`}
            >
              <Trash2 size={12} style={{ color: "#f87171" }} /> Delete
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );

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
                    style={{ color: myFilesColors.muted }}
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

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: myFilesColors.muted }}
          />
          <input
            placeholder="Search files..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
            style={{
              background: myFilesColors.inputBg,
              border: `1px solid ${myFilesColors.inputBorder}`,
              color: myFilesColors.inputText,
              caretColor: accentColor,
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="relative">
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
                      <span style={{ color: accentColor, fontWeight: 600 }}>✓</span>
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
        <div className="relative">
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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMoveDragDropEnabled((value) => !value);
          }}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all"
          aria-pressed={moveDragDropEnabled}
          aria-label="Toggle drag move"
          title={moveDragDropEnabled ? "Drag move aktif" : "Drag move mati"}
          style={{
            background: moveDragDropEnabled
              ? `linear-gradient(135deg, ${accentColor}, #22d3ee)`
              : myFilesColors.buttonSoftBg,
            border: moveDragDropEnabled
              ? `1px solid ${accentColor}66`
              : `1px solid ${myFilesColors.border}`,
            color: moveDragDropEnabled ? "#ffffff" : myFilesColors.text,
            boxShadow: moveDragDropEnabled
              ? `0 10px 24px ${accentColor}22`
              : "none",
          } as React.CSSProperties}
        >
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: moveDragDropEnabled ? "#22c55e" : myFilesColors.muted,
              boxShadow: moveDragDropEnabled
                ? "0 0 0 4px rgba(34,197,94,0.16)"
                : "none",
              opacity: moveDragDropEnabled ? 1 : 0.75,
              transition: "background 160ms ease, box-shadow 160ms ease, opacity 160ms ease",
              flex: "0 0 auto",
            }}
          />
          <span>
            Drag Move: {moveDragDropEnabled ? "ON" : "OFF"}
          </span>
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
                      style={{ width: 14, height: 14, accentColor: "#ef4444" }}
                    />
                    <div className="text-xs" style={{ color: myFilesColors.muted }}>
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
                    color: "#0b1121",
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
            {sortedFolders.map((folder) => {
              const folderDate = folder.updated_at ?? folder.created_at;

              return (
                <div
                  key={folder.id}
                  draggable={moveDragDropEnabled}
                  onDragStart={(e) => {
                    if (!moveDragDropEnabled) {
                      e.preventDefault();
                      return;
                    }

                    e.dataTransfer.effectAllowed = "move";
                    setCompactDragImage(
                      e,
                      folder.name ?? "Untitled folder",
                      "folder",
                    );
                    startFolderDragMove(folder);
                  }}
                  onDragEnd={clearDragMoveItem}
                  onDragOver={(e) => {
                    if (!moveDragDropEnabled || !dragMoveItem) return;

                    if (
                      dragMoveItem.type === "folder" &&
                      dragMoveItem.id === folder.id
                    ) {
                      return;
                    }

                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (!moveDragDropEnabled || !dragMoveItem) return;

                    if (
                      dragMoveItem.type === "folder" &&
                      dragMoveItem.id === folder.id
                    ) {
                      clearDragMoveItem();
                      return;
                    }

                    moveDraggedItemToFolder(folder.id);
                  }}
                  onClick={() => handleOpenFolder(folder)}
                  onContextMenu={(e) => openFolderMenuAtCursor(e, folder.id)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 cursor-pointer transition-all group"
                  style={{
                    background: selectedFolderIds.has(folder.id)
                      ? "rgba(168, 85, 247, 0.08)"
                      : myFilesColors.cardBg,
                    border: `1px solid ${myFilesColors.border}`,
                    borderLeft: selectedFolderIds.has(folder.id)
                      ? `3px solid ${accentColor}55`
                      : "3px solid transparent",
                  }}
                >
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
                    }}
                  />

                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: myFilesColors.panelBg }}
                  >
                    <Folder size={22} style={{ color: accentColor }} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className="text-sm font-medium truncate"
                      style={{ color: myFilesColors.text }}
                    >
                      {folder.name}
                    </div>
                    <div
                      className="text-[11px] mt-0.5"
                      style={{ color: myFilesColors.muted }}
                    >
                      {folderDate
                        ? `Modified ${new Date(folderDate).toLocaleDateString()}`
                        : "-"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {sortedFolders.map((folder) => (


                <div
                  key={folder.id}
                  draggable={moveDragDropEnabled}
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
              onClick={() => handleOpenFolder(folder)}
              onContextMenu={(e) => openFolderMenuAtCursor(e, folder.id)}
              className="rounded-xl p-3 cursor-pointer transition-all group"



              style={{
                background: selectedFolderIds.has(folder.id)
                  ? "rgba(168, 85, 247, 0.08)"
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
                    }}
                  />
                </div>

                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: myFilesColors.panelBg }}
                >
                  <Folder size={25} style={{ color: accentColor }} />
                </div>

                <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="relative">



                  </div>
                </div>
              </div>

              <div
                className="text-xs font-medium truncate"
                style={{ color: myFilesColors.text }}
              >
                {folder.name}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: myFilesColors.muted }}>
                —
              </div>
              <div className="text-[10px]" style={{ color: myFilesColors.muted2 }}>
                —
              </div>
            </div>
            ))}
          </div>
        )}
      </div>

      {/* Global Folder Action Menu */}
      {activeFolderAction && folderActionMenuPosition ? (
        <div
          ref={folderMenuWrapRef}
          className="rounded-xl shadow-2xl overflow-hidden"

          style={{
            position: "fixed",
            top: folderActionMenuPosition.y,
            left: folderActionMenuPosition.x,
            width: 176,
            zIndex: 9999,
            background:
              resolvedTheme === "light" ? "#ffffff" : myFilesColors.cardBg,
            border: `1px solid ${myFilesColors.border}`,
            backgroundClip: "padding-box",
            isolation: "isolate",
          }}
          role="menu"
          aria-label={`Folder menu ${activeFolderAction.name}`}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
            style={{ color: myFilesColors.text, background: "transparent" }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpenFolderActionId(null);
              setFolderActionMenuPosition(null);
            }}
            aria-label={`Rename ${activeFolderAction.name}`}
          >
            <Edit3 size={12} style={{ color: myFilesColors.muted }} /> Rename
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
            style={{ color: myFilesColors.text, background: "transparent" }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpenFolderActionId(null);
              setFolderActionMenuPosition(null);
            }}
            aria-label={`Move ${activeFolderAction.name}`}
          >
            <Folder size={12} style={{ color: myFilesColors.muted }} /> Move to...
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
            style={{ color: "#f87171", background: "transparent" }}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpenFolderActionId(null);
              setFolderActionMenuPosition(null);
              setSelectedFolderForDelete(activeFolderAction);
            }}
            aria-label={`Delete ${activeFolderAction.name}`}
          >
            <Trash2 size={12} style={{ color: "#f87171" }} /> Delete
          </button>
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


      {previewModalOpen && (
        <div
          className={
            previewModalMode === "minimized"
              ? "fixed inset-0 z-[150] pointer-events-none"
              : "fixed inset-0 z-[150] flex items-center justify-center bg-black/70 px-4"
          }
          onMouseDown={
            previewModalMode === "minimized" ? undefined : closePreviewModal
          }
        >
          <div
            className={`pointer-events-auto flex flex-col rounded-2xl border border-[#1a2540] bg-[#0f1729] p-4 ${
              previewModalMode === "maximized"
                ? "h-[96vh] w-[96vw] max-w-none"
                : previewModalMode === "minimized"
                  ? "fixed bottom-4 right-4 h-auto w-[360px] max-w-[90vw]"
                  : "h-[85vh] w-[90vw] max-w-5xl"
            }`}
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.65)",
              transform:
                previewModalMode === "minimized"
                  ? `translate(${previewMiniOffset.x}px, ${previewMiniOffset.y}px)`
                  : undefined,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              className="mb-3 flex items-center justify-between gap-4 rounded-xl"
              style={{
                background:
                  previewModalMode === "minimized" ? myFilesColors.cardBg : undefined,
                borderBottom: `1px solid ${myFilesColors.border}`,
                paddingBottom: 12,
              }}
            >
              <div
                className="min-w-0"
                onPointerDown={
                  previewModalMode === "minimized"
                    ? handlePreviewMiniPointerDown
                    : undefined
                }
                style={
                  previewModalMode === "minimized"
                    ? { cursor: "grab", touchAction: "none" }
                    : undefined
                }
              >
                <h2
                  className="text-sm font-semibold"
                  style={{ color: myFilesColors.title }}
                >
                  Preview
                </h2>
                <p
                  className="truncate text-xs mt-1"
                  style={{ color: myFilesColors.muted }}
                >
                  {previewFileName}
                </p>
              </div>

              <div className="flex items-center gap-2">
                    <button
                  type="button"
                  onClick={() =>
                    setPreviewModalMode((mode) =>
                      mode === "minimized" ? "normal" : "minimized",
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                  style={{
                    background: "#0d1829",
                    border: "1px solid #1a2540",
                    color: "#94a3b8",
                  }}
                  aria-label="Minimize preview"
                  title="Minimize preview"
                >
                  —
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setPreviewModalMode((mode) =>
                      mode === "maximized" ? "normal" : "maximized",
                    )
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                  style={{
                    background: "#0d1829",
                    border: "1px solid #1a2540",
                    color: "#94a3b8",
                  }}
                  aria-label="Toggle full page preview"
                  title="Full page preview"
                >
                  □
                </button>

                {(() => {
                  if (!previewFile) return null;

                  return (
                    <button
                      type="button"
                      onClick={() => {
                        handleDownloadFile(previewFile);
                      }}
                      className="px-3 h-8 flex items-center justify-center rounded-lg text-xs"
                      style={{
                        background: previewFile
                          ? `linear-gradient(135deg, ${accentColor}, #22d3ee)`
                          : myFilesColors.buttonSoftBg,
                        border: previewFile
                          ? `1px solid ${accentColor}`
                          : `1px solid ${myFilesColors.border}`,
                        color: "#fff",
                      }}
                      aria-label="Download preview file"
                      title="Download"
                    >
                      Download
                    </button>
                  );
                })()}

                {previewContentType.startsWith("image/") && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewImageScale((v) =>
                          Math.max(0.5, Number((v - 0.25).toFixed(2))),
                        )
                      }
                      className="h-8 rounded-lg px-3 text-xs"
                      style={{
                        background: myFilesColors.buttonSoftBg,
                        border: `1px solid ${myFilesColors.border}`,
                        color: myFilesColors.muted,
                      }}
                      aria-label="Zoom out image"
                      title="Zoom out"
                    >
                      -
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewImageScale(1)}
                      className="h-8 rounded-lg px-3 text-xs"
                      style={{
                        background: myFilesColors.buttonSoftBg,
                        border: `1px solid ${myFilesColors.border}`,
                        color: myFilesColors.muted,
                      }}
                      aria-label="Reset image zoom"
                      title="Reset zoom"
                    >
                      {Math.round(previewImageScale * 100)}%
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setPreviewImageScale((v) =>
                          Math.min(3, Number((v + 0.25).toFixed(2))),
                        )
                      }
                      className="h-8 rounded-lg px-3 text-xs"
                      style={{
                        background: myFilesColors.buttonSoftBg,
                        border: `1px solid ${myFilesColors.border}`,
                        color: myFilesColors.muted,
                      }}
                      aria-label="Zoom in image"
                      title="Zoom in"
                    >
                      +
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={closePreviewModal}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-lg"
                  style={{
                    background: myFilesColors.buttonSoftBg,
                    border: `1px solid ${myFilesColors.border}`,
                    color: myFilesColors.muted,
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    el.style.background = `${accentColor}10`;
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.background = myFilesColors.buttonSoftBg;
                  }}
                  aria-label="Close preview"
                  title="Close preview"
                >
                  ×
                </button>
              </div>
            </div>

            {previewModalMode !== "minimized" && (
              <div
                className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-xl border"
                style={{
                  background: myFilesColors.panelBg,
                  border: `1px solid ${myFilesColors.border}`,
                }}
              >
                {previewContentType.startsWith("image/") ? (
                  <img
                    src={previewUrl}
                    alt={previewFileName}
                    style={{
                      transform: `scale(${previewImageScale})`,
                      transformOrigin: "center center",
                      maxHeight: "100%",
                      maxWidth: "100%",
                      objectFit: "contain",
                    }}
                  />
                ) : previewContentType === "application/pdf" ? (
                  <iframe
                    src={previewUrl}
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
                ) : (
                  <div className="text-xs" style={{ color: myFilesColors.muted }}>
                    Preview tipe file ini belum tersedia di modal.
                  </div>
                )}
              </div>
            )}
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
                ✕
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
                  ×
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
                    color: "#0b1121",
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
                ×
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
                  onClick={() => void handleConfirmBulkDelete()}
                  disabled={bulkDeleteLoading}
                  className="rounded-xl px-3 py-2 text-xs font-semibold"
                  style={{
                    background: "#f87171",
                    border: "1px solid rgba(248,113,113,0.4)",
                    color: "#0b1121",
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
                ×
              </button>
            </div>

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
                    listWrap.style.background = "#0b1121";

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
                  color: "#0b1121",
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
              className="flex items-center gap-3 rounded-xl px-3 py-2"
              style={{
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
              const indeterminate = selectedVisibleCount > 0 && !allChecked;

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
                  }}
                />
              );
            })()}

            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: myFilesColors.muted }}
            >
              Name
            </span>
            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: myFilesColors.muted }}
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
            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: myFilesColors.muted }}
            ></span>
          </div>

          {showEmptySearchState && (
            <div className="text-xs px-4 py-6" style={{ color: myFilesColors.muted }}>
              Tidak ada hasil untuk “{searchQuery.trim()}”.
            </div>
          )}
          {!showEmptySearchState &&
            typedFiles.map((file, i) => {
              const typeLabel = getTypeLabel(file.mime_type ?? null);

              return (
                <div
                  key={file.id}
                  draggable={moveDragDropEnabled}
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
                  onContextMenu={(e) => openFileMenuAtCursor(e, file.id)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 cursor-pointer transition-colors group relative"
                  style={{
                    border: `1px solid ${myFilesColors.border}`,
                    background: selectedFileIds.has(file.id)
                      ? "rgba(168, 85, 247, 0.08)"
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
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
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

                  <span className="text-xs" style={{ color: myFilesColors.muted }}>
                    {file.created_at
                      ? new Date(file.created_at).toLocaleDateString()
                      : "—"}
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
                    onContextMenu={(e) => openFileMenuAtCursor(e, file.id)}
                    className="rounded-xl p-3 cursor-pointer transition-colors group relative"
                    style={{
                      border: `1px solid ${myFilesColors.border}`,
                      background: selectedFileIds.has(file.id)
                        ? "rgba(168, 85, 247, 0.08)"
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
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
