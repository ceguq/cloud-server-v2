import {
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  PREVIEW_IMAGE_ZOOM_STEP,
  clampPreviewImageScale,
  getPreviewContentTypeFromFileName,
} from "./my-files/myFilesPreviewUtils";
import {
  type AppearanceTheme,
  type ResolvedTheme,
  resolveAppearanceTheme,
  safeReadAccentColor,
  safeReadAppearanceTheme,
} from "./my-files/myFilesThemeUtils";
import type {
  DetailsItem,
  DragMoveItem,
  FileActionFeedback,
  MenuCoordinate,
  MoveItemType,
  MyFilesProps,
  PreviewModalMode,
  ShareMode,
  ViewMode,
} from "./my-files/types";
import folderService, {
  type Folder as FolderModel,
} from "../../services/folderService";
import fileService, { type FileModel } from "../../services/fileService";
import { useUploadManager } from "../upload/UploadManagerContext";
import {
  copyTextToClipboard,
  isInteractiveItemTarget,
} from "./my-files/myFilesDomUtils";
import { getMenuItemStyle } from "./my-files/myFilesMenuUtils";
import { calculateActionMenuPosition } from "./my-files/myFilesMenuPositioning";
import { applyVisibleSelection, toggleSetValue } from "./my-files/myFilesSelectionUtils";
import { calculatePreviewImageZoomState } from "./my-files/myFilesPreviewZoomUtils";
import { getExistingFileShareLink } from "./my-files/myFilesShareUtils";
import { FileTypeIcon } from "../components/FileTypeIcon";
import {
  formatBytes,
  getTypeLabel,
  type FileTypeFilterValue,
} from "./my-files/myFilesFormatters";
import { fileMatchesTypeFilter } from "./my-files/myFilesFilters";
import {
  sortFiles,
  sortFolders,
  type SortBy,
  type SortDirection,
} from "./my-files/myFilesSorting";
import { MoreVertical, X } from "lucide-react";
import { MyFilesBreadcrumbs } from "./my-files/components/MyFilesBreadcrumbs";
import { MyFilesHeaderActions } from "./my-files/components/MyFilesHeaderActions";
import { MyFilesToolbar } from "./my-files/components/MyFilesToolbar";
import { MyFilesSelectionModeButton } from "./my-files/components/MyFilesSelectionModeButton";
import { ViewModeToggle } from "./my-files/components/ViewModeToggle";
import { MyFilesFolderSection } from "./my-files/components/MyFilesFolderSection";
import { MyFilesFolderListItem } from "./my-files/components/MyFilesFolderListItem";
import { MyFilesFolderGridItem } from "./my-files/components/MyFilesFolderGridItem";
import { MyFilesFileListItem } from "./my-files/components/MyFilesFileListItem";
import { MyFilesFileGridItem } from "./my-files/components/MyFilesFileGridItem";
import { MyFilesFolderActionMenu } from "./my-files/components/MyFilesFolderActionMenu";
import { MyFilesDetailsModal } from "./my-files/components/MyFilesDetailsModal";
import { MyFilesFolderModal } from "./my-files/components/MyFilesFolderModal";
import { MyFilesFileRenameModal } from "./my-files/components/MyFilesFileRenameModal";
import { MyFilesBulkFolderDeleteModal } from "./my-files/components/MyFilesBulkFolderDeleteModal";
import { MyFilesFolderDeleteModal } from "./my-files/components/MyFilesFolderDeleteModal";
import { MyFilesFileDeleteModal } from "./my-files/components/MyFilesFileDeleteModal";
import { MyFilesBulkFileDeleteModal } from "./my-files/components/MyFilesBulkFileDeleteModal";
import { MyFilesBulkDownloadResultModal } from "./my-files/components/MyFilesBulkDownloadResultModal";
import { MyFilesFileSection } from "./my-files/components/MyFilesFileSection";
import { PreviewMinimizedWidget } from "./my-files/components/PreviewMinimizedWidget";
import { PreviewHeaderTitle } from "./my-files/components/PreviewHeaderTitle";
import { PreviewHeaderActions } from "./my-files/components/PreviewHeaderActions";
import { PreviewPdfFrame } from "./my-files/components/PreviewPdfFrame";
import { PreviewFallbackFrame } from "./my-files/components/PreviewFallbackFrame";
import { PreviewAudioPlayerFrame } from "./my-files/components/PreviewAudioPlayerFrame";
import { PreviewVideoFrame } from "./my-files/components/PreviewVideoFrame";
import { PreviewTextFrame } from "./my-files/components/PreviewTextFrame";
import { MyFilesPreviewModal } from "./my-files/components/MyFilesPreviewModal";
import { MyFilesMoveModal } from "./my-files/components/MyFilesMoveModal";
import { MyFilesShareModal } from "./my-files/components/MyFilesShareModal";
import { MyFilesFileActionMenu } from "./my-files/components/MyFilesFileActionMenu";
import { PageHeaderSummary } from "./my-files/components/PageHeaderSummary";
import {
  getPublicShareUrl,
  createShareLink,
  deleteShareLink,
  getShareLinks,
  type ShareLink,
} from "../../services/shareService";

export function MyFiles({
  filesRefreshKey,
  onStorageChanged,
}: MyFilesProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");

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

  const [fileActionMenuPosition, setFileActionMenuPosition] = useState<MenuCoordinate | null>(null);

  const [folderActionMenuPosition, setFolderActionMenuPosition] = useState<MenuCoordinate | null>(null);


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

    setOpenFolderActionId(folderId);
    setFolderActionMenuPosition(
      calculateActionMenuPosition({
        clientX: event.clientX,
        clientY: event.clientY,
        menuWidth,
        menuHeight,
      }),
    );
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

  const [fileTypeFilter, setFileTypeFilter] =
    useState<FileTypeFilterValue>("all");

  const [sortMenuOpen, setSortMenuOpen] = useState<boolean>(false);

  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortDirection, setSortDirection] =
    useState<SortDirection>("asc");
  const [moveDragDropEnabled, setMoveDragDropEnabled] = useState(true);
  const [dragMoveItem, setDragMoveItem] = useState<DragMoveItem | null>(null);

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
    setSelectedFolderIds((prev) => toggleSetValue(prev, folderId));
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds((prev) => toggleSetValue(prev, fileId));
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
  const [previewModalMode, setPreviewModalMode] = useState<PreviewModalMode>("normal");
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
  const [shareMode, setShareMode] = useState<ShareMode>("shared");
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState("");
  const [copySuccess, setCopySuccess] = useState("");
  const [shareModalPassword, setShareModalPassword] = useState("");
  const [fileShareLinksByFileId, setFileShareLinksByFileId] = useState<
    Record<string, ShareLink | null>
  >({});
  const [fileSharingActionId, setFileSharingActionId] = useState<string | null>(
    null,
  );
  const [fileActionFeedback, setFileActionFeedback] = useState<FileActionFeedback | null>(null);
  const [detailsItem, setDetailsItem] = useState<DetailsItem | null>(null);

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
    const { nextScale, nextOffset } = calculatePreviewImageZoomState({
      currentScale: previewImageScale,
      currentOffset: previewImageOffset,
      nextScaleValue,
      imageRect: previewImageRef.current?.getBoundingClientRect(),
      viewportRect: previewImageViewportRef.current?.getBoundingClientRect(),
      anchorPoint,
    });

    setPreviewImageScale(nextScale);
    setPreviewImageOffset(nextOffset);
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
  };

  const closeShareModal = () => {
    setIsShareModalOpen(false);
    setSelectedFileForShare(null);
    setShareModalPassword("");
    setShareError("");
    setCopySuccess("");
  };

  useEffect(() => {
    if (!isShareModalOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeShareModal();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isShareModalOpen]);

  const closeFolderActionMenu = () => {
    setOpenFolderActionId(null);
    setFolderActionMenuPosition(null);
  };

  const getOrCreateFileShareLink = async (file: FileModel, password?: string) => {
    const existing = await getExistingFileShareLink(file);
    if (existing) {
      setFileShareLinksByFileId((prev) => ({
        ...prev,
        [file.id]: existing,
      }));
      return existing;
    }

    const passwordValue = password?.trim();
    const created = await createShareLink(
      file.id,
      passwordValue ? { password: passwordValue } : undefined,
    );
    setFileShareLinksByFileId((prev) => ({
      ...prev,
      [file.id]: created,
    }));
    return created;
  };

  const loadFileSharePanel = async (file: FileModel) => {
    closeFileActionMenu();
    setFileActionFeedback(null);
    setShareError("");
    setCopySuccess("");
    setShareModalPassword("");
    setSelectedFileForShare(file);
    setIsShareModalOpen(true);
    setShareLoading(true);

    try {
      const existing = await getExistingFileShareLink(file);
      setFileShareLinksByFileId((prev) => ({
        ...prev,
        [file.id]: existing,
      }));
      setActiveShareLink(existing);
      setShareMode(existing ? "shared" : "private");
    } catch (error: any) {
      setShareError(
        error?.response?.data?.message ||
          error?.message ||
          "Gagal memuat status share.",
      );
      setActiveShareLink(null);
      setShareMode("private");
    } finally {
      setShareLoading(false);
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

  const handleSetFilePublic = async (file: FileModel, password?: string) => {
    if (fileSharingActionId) return null;

    setFileSharingActionId(file.id);
    setFileActionFeedback(null);

    try {
      const shareLink = await getOrCreateFileShareLink(file, password);
      setFileActionFeedback({
        fileId: file.id,
        type: "success",
        message: "Status diubah ke Shared.",
      });
      setFileShareLinksByFileId((prev) => ({
        ...prev,
        [file.id]: shareLink,
      }));
      return shareLink;
    } catch (error: any) {
      setFileActionFeedback({
        fileId: file.id,
        type: "error",
        message:
          error?.response?.data?.message ||
          error?.message ||
          "Gagal membuat share link.",
      });
      return null;
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

  const handleRevokeActiveShareLink = async (file: FileModel) => {
    if (!activeShareLink?.id || fileSharingActionId) return false;

    setFileSharingActionId(file.id);
    setShareError("");
    setCopySuccess("");

    try {
      await deleteShareLink(activeShareLink.id);
      setFileShareLinksByFileId((prev) => ({
        ...prev,
        [file.id]: null,
      }));
      setActiveShareLink(null);
      setShareModalPassword("");
      setCopySuccess("Public link revoked. File is now private.");
      return true;
    } catch (error: any) {
      setShareError(
        error?.response?.data?.message ||
          error?.message ||
          "Gagal membatalkan public link.",
      );
      return false;
    } finally {
      setFileSharingActionId(null);
    }
  };

  const handleApplyShareMode = async () => {
    if (!selectedFileForShare || shareLoading) return null;

    setShareLoading(true);
    setShareError("");
    setCopySuccess("");

    const passwordValue = shareModalPassword.trim();
    const isPrivate = shareMode === "private";

    try {
      if (isPrivate) {
        if (!activeShareLink) {
          setCopySuccess("Already private.");
          return null;
        }

        await handleRevokeActiveShareLink(selectedFileForShare);
        return null;
      }

      if (activeShareLink) {
        const knownPublic = typeof activeShareLink.password !== "undefined" &&
          activeShareLink.password === null;
        const desiredPublic = passwordValue === "";

        if (knownPublic && desiredPublic) {
          setCopySuccess("Public link already active.");
          return activeShareLink;
        }

        const revoked = await handleRevokeActiveShareLink(selectedFileForShare);
        if (!revoked) return null;
      }

      const payload = passwordValue ? { password: passwordValue } : undefined;
      const created = await createShareLink(selectedFileForShare.id, payload);
      setFileShareLinksByFileId((prev) => ({
        ...prev,
        [selectedFileForShare.id]: created,
      }));
      setActiveShareLink(created);
      setShareModalPassword("");
      setCopySuccess(
        passwordValue ? "Protected link created." : "Public link created.",
      );
      return created;
    } catch (error: any) {
      setShareError(
        error?.response?.data?.message ||
          error?.message ||
          "Gagal membuat share link.",
      );
      return null;
    } finally {
      setShareLoading(false);
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

    setOpenFileActionId(fileId);
    setFileActionMenuPosition(
      calculateActionMenuPosition({
        clientX: event.clientX,
        clientY: event.clientY,
        menuWidth,
        menuHeight,
      }),
    );
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
    event: React.DragEvent<Element>,
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

  const handleUploadInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list || list.length === 0) return;

    const fileArray = Array.from(list);
    const folderId = currentFolderId ?? null;

    setUploadError("");

    // Push to global queue (no local upload loop)
    addFiles(fileArray, folderId);

    // reset input supaya file yang sama bisa di-upload lagi
    e.currentTarget.value = "";
  };

  const handleOpenUploadPicker = () => {
    const el = uploadInputRef as any;
    const input = el?.current as HTMLInputElement | null;
    input?.click();
  };


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

  const sortedFolders = useMemo(() => {
    return sortFolders(typedFolders, sortBy, sortDirection);
  }, [typedFolders, sortBy, sortDirection]);

  const sortedFiles = useMemo(() => {
    return sortFiles(filteredFiles, sortBy, sortDirection);
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

  const renderFileActionMenu = (file: FileModel) => {
    const isOpen = openFileActionId === file.id && fileActionMenuPosition;
    const canPreview = fileService.canPreviewFile(file);
    const isSharing = fileSharingActionId === file.id;
    const shareLink = fileShareLinksByFileId[file.id] ?? null;
    const feedback =
      fileActionFeedback?.fileId === file.id ? fileActionFeedback : null;

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

          <MyFilesFileActionMenu
            file={file}
            isOpen={Boolean(openFileActionId === file.id && fileActionMenuPosition)}
            position={fileActionMenuPosition}
            menuRef={openFileActionId === file.id ? fileMenuWrapRef : null}
            panelBg={myFilesColors.panelBg}
            borderColor={myFilesColors.border}
            textColor={myFilesColors.text}
            mutedColor={myFilesColors.muted}
            accentColor={accentColor}
            previewing={previewingFileId === file.id}
            sharing={isSharing}
            feedback={feedback}
            onPreview={() => {
              closeFileActionMenu();
              void handlePreviewFile(file);
            }}
            onDetails={() => {
              closeFileActionMenu();
              setDetailsItem({ type: "file", item: file });
            }}
            onDownload={() => {
              closeFileActionMenu();
              void fileService.downloadFile(file.id, file.original_name);
            }}
            onShare={() => {
              void loadFileSharePanel(file);
            }}
            onRename={() => {
              closeFileActionMenu();
              setSelectedFileForAction(file);
              setFileRenameName(file.original_name);
              setFileModalError("");
              setIsFileRenameModalOpen(true);
            }}
            onMove={() => {
              closeFileActionMenu();
              openMoveFileModal(file);
            }}
            onDelete={() => {
              closeFileActionMenu();
              setSelectedFileForDelete(file);
              setDeleteFileError("");
              setIsFileDeleteModalOpen(true);
            }}
          />
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

      <MyFilesBreadcrumbs
        breadcrumbs={breadcrumbs}
        accentColor={accentColor}
        textColor={myFilesColors.text}
        mutedColor={myFilesColors.muted2}
        onBackToRoot={handleBackToRoot}
        onBreadcrumbClick={handleBreadcrumbClick}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <PageHeaderSummary
          title="My Files"
          itemCount={folders.length + files.length}
          titleColor={myFilesColors.title}
          mutedColor={myFilesColors.muted}
        />
        <MyFilesHeaderActions
          uploadError={uploadError}
          resolvedTheme={resolvedTheme}
          accentColor={accentColor}
          borderColor={myFilesColors.border}
          hasActiveUploads={hasActiveUploads}
          uploadInputRef={uploadInputRef}
          onCreateFolder={openCreateFolderModal}
          onUploadInputChange={handleUploadInputChange}
          onOpenUploadPicker={handleOpenUploadPicker}
        />
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
        <MyFilesToolbar
          searchQuery={searchQuery}
          isSearchActive={isSearchActive}
          isSearchLoading={isSearchLoading}
          trimmedSearchQuery={trimmedSearchQuery}
          filterMenuOpen={filterMenuOpen}
          fileTypeFilter={fileTypeFilter}
          sortMenuOpen={sortMenuOpen}
          sortBy={sortBy}
          sortDirection={sortDirection}
          accentColor={accentColor}
          textColor={myFilesColors.text}
          mutedColor={myFilesColors.muted}
          muted2Color={myFilesColors.muted2}
          borderColor={myFilesColors.border}
          inputBg={myFilesColors.inputBg}
          inputBorderColor={myFilesColors.inputBorder}
          inputTextColor={myFilesColors.inputText}
          cardBg={myFilesColors.cardBg}
          buttonSoftBg={myFilesColors.buttonSoftBg}
          filterMenuRef={filterMenuRef}
          sortMenuRef={sortMenuRef}
          onSearchChange={(value) => setSearchQuery(value)}
          onSearchFocus={() => setSearchFocused(true)}
          onSearchBlur={() => setSearchFocused(false)}
          onSearchClear={() => setSearchQuery("")}
          onToggleFilterMenu={() => setFilterMenuOpen((v) => !v)}
          onSelectFilter={(value) => {
            setFileTypeFilter(value);
            setFilterMenuOpen(false);
          }}
          onToggleSortMenu={() => setSortMenuOpen((v) => !v)}
          onSelectSort={(nextSortBy, nextSortDirection) => {
            setSortBy(nextSortBy);
            setSortDirection(nextSortDirection);
            setSortMenuOpen(false);
          }}
        />

        <ViewModeToggle
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          accentColor={accentColor}
          textColor={myFilesColors.text}
          mutedColor={myFilesColors.muted}
          borderColor={myFilesColors.border}
          panelColor={myFilesColors.buttonSoftBg}
        />

        <MyFilesSelectionModeButton
          isSelectionMode={isSelectionMode}
          accentColor={accentColor}
          buttonSoftBg={myFilesColors.buttonSoftBg}
          borderColor={myFilesColors.border}
          textColor={myFilesColors.text}
          onToggleSelectionMode={handleToggleSelectionMode}
        />
      </div>


      <MyFilesFolderSection
        sortedFolders={sortedFolders}
        selectedFolderIds={selectedFolderIds}
        checklistVisibilityStyle={checklistVisibilityStyle}
        showEmptySearchState={showEmptySearchState}
        loadingFolders={loadingFolders}
        folderError={folderError}
        folderListLength={folderList.length}
        viewMode={viewMode}
        bulkFolderDeleteLoading={bulkFolderDeleteLoading}
        textColor={myFilesColors.text}
        mutedColor={myFilesColors.muted}
        borderColor={myFilesColors.border}
        buttonSoftBg={myFilesColors.buttonSoftBg}
        renderListItems={() => (
          sortedFolders.map((folder) => (
            <MyFilesFolderListItem
              key={folder.id}
              folder={folder}
              isSelected={selectedFolderIds.has(folder.id)}
              checklistVisibilityStyle={checklistVisibilityStyle}
              showFolderMetadata={showFolderMetadata}
              folderListColumnTemplate={folderListColumnTemplate}
              cardBg={myFilesColors.cardBg}
              borderColor={myFilesColors.border}
              textColor={myFilesColors.text}
              mutedColor={myFilesColors.muted}
              accentColor={accentColor}
              openFolderActionId={openFolderActionId}
              folderActionMenuPosition={folderActionMenuPosition}
              onToggleSelection={() => toggleFolderSelection(folder.id)}
              onOpenFolder={() => handleOpenFolder(folder)}
              onOpenFolderMenuAtCursor={(event) => openFolderMenuAtCursor(event, folder.id)}
              onRowContextMenu={(event) => openFolderMenuAtCursor(event, folder.id)}
              onRowClick={(event) => {
                if (isInteractiveItemTarget(event.target)) return;
                if (!isSelectionMode) return;
                toggleFolderSelection(folder.id);
              }}
              onRowDoubleClick={(event) => {
                if (isInteractiveItemTarget(event.target)) return;
                handleOpenFolder(folder);
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
              onCloseFolderAction={() => setOpenFolderActionId(null)}
              onOpenRenameFolderModal={() => {
                setSelectedFolderForAction(folder);
                openRenameFolderModal(folder);
              }}
              onOpenDeleteFolderModal={() => {
                setSelectedFolderForDelete(folder);
                openDeleteFolderModal(folder);
              }}
            />
          ))
        )}
        renderGridItems={() => (
          sortedFolders.map((folder) => (
            <MyFilesFolderGridItem
              key={folder.id}
              folder={folder}
              isSelected={selectedFolderIds.has(folder.id)}
              checklistVisibilityStyle={checklistVisibilityStyle}
              showFolderMetadata={showFolderMetadata}
              moveDragDropEnabled={moveDragDropEnabled}
              cardBg={myFilesColors.cardBg}
              panelBg={myFilesColors.panelBg}
              borderColor={myFilesColors.border}
              textColor={myFilesColors.text}
              mutedColor={myFilesColors.muted}
              muted2Color={myFilesColors.muted2}
              accentColor={accentColor}
              onToggleSelection={() => toggleFolderSelection(folder.id)}
              onOpenFolderMenuAtCursor={(event) => openFolderMenuAtCursor(event, folder.id)}
              onRowContextMenu={(event) => openFolderMenuAtCursor(event, folder.id)}
              onRowClick={(event) => {
                if (isInteractiveItemTarget(event.target)) return;
                if (!isSelectionMode) return;
                toggleFolderSelection(folder.id);
              }}
              onRowDoubleClick={(event) => {
                if (isInteractiveItemTarget(event.target)) return;
                handleOpenFolder(folder);
              }}
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
            />
          ))
        )}
        onToggleVisibleFolders={(checked, visibleFolderIds) => {
          setSelectedFolderIds((prev) =>
            applyVisibleSelection(prev, visibleFolderIds, checked),
          );
        }}
        onOpenBulkFolderDeleteModal={openBulkFolderDeleteModal}
        onClearFolderSelection={clearFolderSelection}
      />

      {/* Global Folder Action Menu */}
      <MyFilesFolderActionMenu
        folder={activeFolderAction}
        position={folderActionMenuPosition}
        menuRef={folderMenuWrapRef}
        panelBg={myFilesColors.panelBg}
        borderColor={myFilesColors.border}
        textColor={myFilesColors.text}
        accentColor={accentColor}
        onShowDetails={() => {
          if (!activeFolderAction) return;
          closeFolderActionMenu();
          setDetailsItem({ type: "folder", item: activeFolderAction });
        }}
        onRename={() => {
          if (!activeFolderAction) return;
          closeFolderActionMenu();
          setSelectedFolderForAction(activeFolderAction);
          openRenameFolderModal(activeFolderAction);
        }}
        onMove={() => {
          if (!activeFolderAction) return;
          closeFolderActionMenu();
          openMoveFolderModal(activeFolderAction);
        }}
        onDelete={() => {
          if (!activeFolderAction) return;
          closeFolderActionMenu();
          openDeleteFolderModal(activeFolderAction);
        }}
      />


      <MyFilesDetailsModal
        detailsItem={detailsItem}
        titleColor={myFilesColors.title}
        textColor={myFilesColors.text}
        mutedColor={myFilesColors.muted}
        panelBg={myFilesColors.panelBg}
        cardBg={myFilesColors.cardBg}
        borderColor={myFilesColors.border}
        onClose={() => setDetailsItem(null)}
      />


      <MyFilesFolderModal
        isOpen={isFolderModalOpen}
        mode={folderModalMode}
        folderModalName={folderModalName}
        folderModalError={folderModalError}
        folderActionLoading={folderActionLoading}
        titleColor={myFilesColors.title}
        textColor={myFilesColors.text}
        mutedColor={myFilesColors.muted}
        inputBg={myFilesColors.inputBg}
        inputBorder={myFilesColors.inputBorder}
        inputText={myFilesColors.inputText}
        accentColor={accentColor}
        buttonSoftBg={myFilesColors.buttonSoftBg}
        cardBg={myFilesColors.cardBg}
        borderColor={myFilesColors.border}
        onClose={closeFolderModal}
        onNameChange={(value) => {
          setFolderModalName(value);
          if (folderModalError) setFolderModalError("");
        }}
        onSubmit={(e) => {
          e.preventDefault();
          submitFolderModal();
        }}
      />

      {previewModalOpen && previewModalMode === "minimized" ? (
        <PreviewMinimizedWidget
          title={previewFileName}
          subtitle="Preview minimized"
          accentColor={accentColor}
          titleColor={myFilesColors.title}
          mutedColor={myFilesColors.muted}
          backgroundColor={myFilesColors.cardBg}
          borderColor={myFilesColors.border}
          onRestore={() => setPreviewModalMode("normal")}
          onClose={closePreviewModal}
        />
      ) : null}

      <MyFilesPreviewModal
        isOpen={previewModalOpen}
        mode={previewModalMode}
        resolvedTheme={resolvedTheme}
        titleColor={myFilesColors.title}
        textColor={myFilesColors.text}
        mutedColor={myFilesColors.muted}
        panelBg={myFilesColors.panelBg}
        cardBg={myFilesColors.cardBg}
        borderColor={myFilesColors.border}
        accentColor={accentColor}
        onClose={closePreviewModal}
        header={
          <>
            <PreviewHeaderTitle
              title={previewFileName}
              subtitle="Preview"
              titleColor={myFilesColors.title}
              mutedColor={myFilesColors.muted}
            />

            <PreviewHeaderActions
              previewFile={previewFile}
              previewContentType={previewContentType}
              previewModalMode={previewModalMode}
              previewImageScale={previewImageScale}
              onDownload={() => {
                handleDownloadFile(previewFile);
              }}
              onZoomOut={() =>
                setPreviewImageScaleFromAnchor(
                  previewImageScale - PREVIEW_IMAGE_ZOOM_STEP,
                )
              }
              onResetZoom={resetPreviewImageZoom}
              onZoomIn={() =>
                setPreviewImageScaleFromAnchor(
                  previewImageScale + PREVIEW_IMAGE_ZOOM_STEP,
                )
              }
              onMinimize={() => setPreviewModalMode("minimized")}
              onToggleMaximize={() =>
                setPreviewModalMode((mode) =>
                  mode === "maximized" ? "normal" : "maximized",
                )
              }
              onClose={closePreviewModal}
              textColor={myFilesColors.text}
              mutedColor={myFilesColors.muted2}
              borderColor={myFilesColors.border}
              panelColor={myFilesColors.panelBg}
              accentColor={accentColor}
            />
          </>
        }
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
          <PreviewPdfFrame
            previewUrl={previewUrl ?? null}
            previewFileName={previewFileName}
          />
        ) : previewContentType.startsWith("video/") ? (
          <PreviewVideoFrame
            previewUrl={previewUrl}
            onError={() => {
              setFileError("Gagal memuat preview video.");
            }}
          />
        ) : previewContentType.startsWith("audio/") ? (
          <PreviewAudioPlayerFrame
            previewUrl={previewUrl}
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
          <PreviewTextFrame
            previewTextError={previewTextError}
            previewIsTextTooLarge={previewIsTextTooLarge}
            previewTextLoading={previewTextLoading}
            previewText={previewText}
            textColor={myFilesColors.text}
            mutedColor={myFilesColors.muted}
          />
        ) : previewUrl ? (
          <PreviewFallbackFrame
            previewUrl={previewUrl}
            previewFileName={previewFileName}
          />
        ) : (
          <div className="text-xs" style={{ color: myFilesColors.muted }}>
            Preview tipe file ini belum tersedia di modal.
          </div>
        )}
      </MyFilesPreviewModal>

      {/* Rename File Modal */}
      <MyFilesFileRenameModal
        isOpen={isFileRenameModalOpen}
        fileRenameName={fileRenameName}
        fileModalError={fileModalError}
        fileActionLoading={fileActionLoading}
        titleColor={myFilesColors.title}
        textColor={myFilesColors.text}
        mutedColor={myFilesColors.muted}
        inputBg={myFilesColors.inputBg}
        inputBorder={myFilesColors.inputBorder}
        inputText={myFilesColors.inputText}
        accentColor={accentColor}
        buttonSoftBg={myFilesColors.buttonSoftBg}
        cardBg={myFilesColors.cardBg}
        borderColor={myFilesColors.border}
        onClose={() => {
          setIsFileRenameModalOpen(false);
          setFileModalError("");
        }}
        onNameChange={(value) => {
          setFileRenameName(value);
          if (fileModalError) setFileModalError("");
        }}
        onSubmit={(e) => handleSubmitFileRename(e)}
      />

      <MyFilesShareModal
        isOpen={isShareModalOpen}
        selectedFileName={selectedFileForShare?.original_name ?? "Untitled file"}
        shareMode={shareMode}
        activeShareLinkUrl={activeShareLink ? getPublicShareUrl(activeShareLink.token) : null}
        shareLoading={shareLoading}
        shareError={shareError}
        copySuccess={copySuccess}
        shareModalPassword={shareModalPassword}
        titleColor={myFilesColors.title}
        textColor={myFilesColors.text}
        mutedColor={myFilesColors.muted}
        muted2Color={myFilesColors.muted2}
        panelBg={myFilesColors.panelBg}
        cardBg={myFilesColors.cardBg}
        borderColor={myFilesColors.border}
        buttonSoftBg={myFilesColors.buttonSoftBg}
        inputBg={myFilesColors.inputBg}
        inputBorder={myFilesColors.inputBorder}
        inputText={myFilesColors.inputText}
        accentColor={accentColor}
        onClose={closeShareModal}
        onModeChange={(mode) => setShareMode(mode)}
        onPasswordChange={(value) => setShareModalPassword(value)}
        onCopyLink={async () => {
          if (!activeShareLink) return;

          const link = getPublicShareUrl(activeShareLink.token);

          try {
            await copyTextToClipboard(link);
            setCopySuccess("Link copied.");
            setTimeout(() => setCopySuccess(""), 1500);
          } catch {
            setCopySuccess("Gagal copy link. Silakan copy manual.");
            setTimeout(() => setCopySuccess(""), 2500);
          }
        }}
        onSubmit={handleApplyShareMode}
      />

      <MyFilesMoveModal
        isOpen={moveModalOpen}
        itemType={moveItemType}
        itemName={moveItemName}
        itemId={moveItemId}
        fileIds={moveFileIds}
        targetFolderId={moveTargetFolderId}
        error={moveError}
        loading={moveLoading}
        folders={folders}
        titleColor={myFilesColors.title}
        mutedColor={myFilesColors.muted}
        textColor={myFilesColors.text}
        inputBg={myFilesColors.inputBg}
        inputBorder={myFilesColors.inputBorder}
        inputText={myFilesColors.inputText}
        cardBg={myFilesColors.cardBg}
        borderColor={myFilesColors.border}
        buttonSoftBg={myFilesColors.buttonSoftBg}
        accentColor={accentColor}
        onClose={closeMoveModal}
        onTargetFolderChange={(folderId) => setMoveTargetFolderId(folderId)}
        onSubmit={submitMove}
        panelBg={myFilesColors.panelBg}
      />

      {/* Bulk Delete Folder Modal */}
      <MyFilesBulkFolderDeleteModal
        isOpen={isBulkFolderDeleteModalOpen}
        folderCount={bulkFolderDeleteIds.length}
        result={bulkFolderDeleteResult}
        loading={bulkFolderDeleteLoading}
        titleColor="#e2e8f0"
        textColor="#e2e8f0"
        mutedColor="#94a3b8"
        cardBg="#0f1729"
        borderColor="#1a2540"
        buttonSoftBg="#0d1829"
        accentColor={accentColor}
        onClose={closeBulkFolderDeleteModal}
        onConfirm={() => void handleConfirmBulkFolderDelete()}
      />

      <MyFilesFolderDeleteModal
        folder={selectedFolderForDelete}
        deleteLoading={deleteLoading}
        deleteError={deleteError}
        titleColor={myFilesColors.title}
        textColor={myFilesColors.text}
        mutedColor={myFilesColors.muted}
        cardBg={myFilesColors.cardBg}
        borderColor={myFilesColors.border}
        buttonSoftBg={myFilesColors.buttonSoftBg}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedFolderForDelete(null);
          setDeleteError("");
          setOpenFolderActionId(null);
        }}
        onConfirm={handleConfirmDeleteFolder}
      />

      <MyFilesFileDeleteModal
        file={selectedFileForDelete}
        deleteLoading={deleteFileLoading}
        deleteError={deleteFileError}
        titleColor={myFilesColors.title}
        textColor={myFilesColors.text}
        mutedColor={myFilesColors.muted}
        cardBg={myFilesColors.cardBg}
        borderColor={myFilesColors.border}
        buttonSoftBg={myFilesColors.buttonSoftBg}
        onClose={() => {
          if (!deleteFileLoading) {
            setIsFileDeleteModalOpen(false);
            setSelectedFileForDelete(null);
            setDeleteFileError("");
          }
        }}
        onConfirm={() => void handleConfirmDeleteFile()}
      />

      {/* Bulk Delete Files Modal */}
      <MyFilesBulkFileDeleteModal
        isOpen={isBulkDeleteModalOpen}
        fileCount={bulkDeleteFileIds.length}
        result={bulkDeleteResult}
        loading={bulkDeleteLoading}
        titleColor="#e2e8f0"
        mutedColor="#94a3b8"
        cardBg="#0f1729"
        borderColor="#1a2540"
        buttonSoftBg="#0d1829"
        accentColor={accentColor}
        onClose={closeBulkDeleteModal}
        onConfirm={() => void handleConfirmBulkDelete()}
      />

      <MyFilesBulkDownloadResultModal
        result={bulkDownloadResult}
        titleColor="#e2e8f0"
        mutedColor="#94a3b8"
        cardBg="#0f1729"
        borderColor="#1a2540"
        buttonSoftBg="#0d1829"
        onClose={closeBulkDownloadResult}
      />

      <MyFilesFileSection
        typedFiles={typedFiles}
        selectedFileIds={selectedFileIds}
        checklistVisibilityStyle={checklistVisibilityStyle}
        showEmptySearchState={showEmptySearchState}
        loadingFiles={loadingFiles}
        fileError={fileError}
        viewMode={viewMode}
        bulkDownloadLoading={bulkDownloadLoading}
        bulkDeleteLoading={bulkDeleteLoading}
        textColor={myFilesColors.text}
        mutedColor={myFilesColors.muted}
        muted2Color={myFilesColors.muted2}
        borderColor={myFilesColors.border}
        buttonSoftBg={myFilesColors.buttonSoftBg}
        accentColor={accentColor}
        renderListItems={() => (
          typedFiles.map((file) => {
            const typeLabel = getTypeLabel(file.mime_type ?? null);
            const modifiedLabel = file.created_at
              ? new Date(file.created_at).toLocaleDateString()
              : "-";
            const sizeLabel = formatBytes(file.size);
            const visibilityLabel = "Private";

            return (
              <MyFilesFileListItem
                key={file.id}
                file={file}
                isSelected={selectedFileIds.has(file.id)}
                checklistVisibilityStyle={checklistVisibilityStyle}
                showFileMetadata={showFileMetadata}
                fileListColumnTemplate={fileListColumnTemplate}
                cardBg={myFilesColors.cardBg}
                borderColor={myFilesColors.border}
                textColor={myFilesColors.text}
                mutedColor={myFilesColors.muted}
                muted2Color={myFilesColors.muted2}
                panelBg={myFilesColors.panelBg}
                accentColor={accentColor}
                actionMenuSlot={renderFileActionMenu(file)}
                draggable={moveDragDropEnabled}
                onToggleSelection={() => toggleFileSelection(file.id)}
                onRowContextMenu={(e) => openFileMenuAtCursor(e, file.id)}
                onRowClick={(event) => {
                  if (isInteractiveItemTarget(event.target)) return;
                  if (!isSelectionMode) return;
                  toggleFileSelection(file.id);
                }}
                onRowDoubleClick={(event) => {
                  if (isInteractiveItemTarget(event.target)) return;
                  void handlePreviewFile(file);
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
                typeLabel={typeLabel}
                sizeLabel={sizeLabel}
                modifiedLabel={modifiedLabel}
                visibilityLabel={visibilityLabel}
              />
            );
          })
        )}
        renderGridItems={() => (
          typedFiles.map((file) => {
            const typeLabel = getTypeLabel(file.mime_type ?? null);
            const modifiedLabel = file.created_at
              ? new Date(file.created_at).toLocaleDateString()
              : "-";
            const sizeLabel = formatBytes(file.size);
            const visibilityLabel = "Private";

            return (
              <MyFilesFileGridItem
                key={file.id}
                file={file}
                isSelected={selectedFileIds.has(file.id)}
                checklistVisibilityStyle={checklistVisibilityStyle}
                showFileMetadata={showFileMetadata}
                moveDragDropEnabled={moveDragDropEnabled}
                cardBg={myFilesColors.cardBg}
                panelBg={myFilesColors.panelBg}
                borderColor={myFilesColors.border}
                textColor={myFilesColors.text}
                mutedColor={myFilesColors.muted}
                muted2Color={myFilesColors.muted2}
                accentColor={accentColor}
                actionMenuSlot={renderFileActionMenu(file)}
                onToggleSelection={() => toggleFileSelection(file.id)}
                onRowContextMenu={(e) => openFileMenuAtCursor(e, file.id)}
                onRowClick={(event) => {
                  if (isInteractiveItemTarget(event.target)) return;
                  if (!isSelectionMode) return;
                  toggleFileSelection(file.id);
                }}
                onRowDoubleClick={(event) => {
                  if (isInteractiveItemTarget(event.target)) return;
                  void handlePreviewFile(file);
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
                typeLabel={typeLabel}
                sizeLabel={sizeLabel}
                modifiedLabel={modifiedLabel}
                visibilityLabel={visibilityLabel}
              />
            );
          })
        )}
        onToggleVisibleFiles={(checked, visibleFileIds) => {
          setSelectedFileIds((prev) =>
            applyVisibleSelection(prev, visibleFileIds, checked),
          );
        }}
        onBulkDownload={() => {
          void handleBulkDownload();
        }}
        onOpenBulkDeleteModal={openBulkDeleteModal}
        onClearFileSelection={clearSelection}
      />
    </div>
  );
}
