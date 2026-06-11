import { useEffect, useMemo, useState } from "react";

import {
  Folder,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  FileCode,
  MoreHorizontal,
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

export function MyFiles() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [openFolderActionId, setOpenFolderActionId] = useState<string | null>(
    null,
  );
  const [openFileActionId, setOpenFileActionId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

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
  // TODO: bulk selection akan dibuat di step lain
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Files state

  const [files, setFiles] = useState<FileModel[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileError, setFileError] = useState<string>("");

  const [selectedFileForAction, setSelectedFileForAction] =
    useState<FileModel | null>(null);
  const [isFileRenameModalOpen, setIsFileRenameModalOpen] = useState(false);
  const [fileRenameName, setFileRenameName] = useState("");
  const [fileActionLoading, setFileActionLoading] = useState(false);
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

  const [isFileDeleteModalOpen, setIsFileDeleteModalOpen] = useState(false);

  const [selectedFileForDelete, setSelectedFileForDelete] =
    useState<FileModel | null>(null);
  const [deleteFileLoading, setDeleteFileLoading] = useState(false);
  const [deleteFileError, setDeleteFileError] = useState("");

  const loadFiles = async (folderId: string | null) => {
    try {
      setLoadingFiles(true);
      setFileError("");
      const res = await fileService.getFiles(folderId);
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

  const loadFolders = async (parentId: string | null) => {
    try {
      setLoadingFolders(true);
      setFolderError("");
      const res = await folderService.getFolders(parentId);
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

  useEffect(() => {
    loadFolders(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenFolder = async (folder: FolderModel) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => {
      const idx = prev.findIndex((b) => b.id === folder.id);
      if (idx >= 0) return prev.slice(0, idx + 1);
      return [...prev, folder];
    });
    await loadFolders(folder.id);
  };

  const handleBackToRoot = async () => {
    setCurrentFolderId(null);
    setBreadcrumbs([]);
    await loadFolders(null);
  };

  const handleBreadcrumbClick = async (id: string) => {
    const next = breadcrumbs.findIndex((b) => b.id === id);
    if (next < 0) return;

    const slice = breadcrumbs.slice(0, next + 1);
    setBreadcrumbs(slice);
    setCurrentFolderId(id);
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
    setSelectedFolderForAction(null);
    setFolderModalError("");
    setIsFolderModalOpen(true);
  };

  const openRenameFolderModal = (folder: FolderModel) => {
    setFolderModalMode("rename");
    setFolderModalName(folder.name);
    setSelectedFolderForAction(folder);
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

  useEffect(() => {
    loadFiles(currentFolderId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId]);

  const [uploadingFile, setUploadingFile] = useState(false);
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

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      style={{ background: "#080d1a" }}
    >
      {/* Breadcrumb */}
      {breadcrumbs.length > 0 ? (
        <div className="flex items-center gap-1.5 mb-4" aria-label="Breadcrumb">
          <button
            type="button"
            onClick={handleBackToRoot}
            className="flex items-center gap-1 text-xs hover:opacity-80"
            style={{ color: "#3b82f6" }}
            aria-label="Breadcrumb My Files (root)"
          >
            <Home size={12} />
            My Files
          </button>

          {breadcrumbs.map((b, idx) => (
            <div key={b.id} className="flex items-center gap-1.5">
              <ChevronRight size={12} style={{ color: "#334155" }} />
              {idx === breadcrumbs.length - 1 ? (
                <span className="text-xs" style={{ color: "#64748b" }}>
                  {b.name}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleBreadcrumbClick(b.id)}
                  className="text-xs"
                  style={{ color: "#64748b" }}
                  aria-label={`Breadcrumb ${b.name}`}
                >
                  {b.name}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : null}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#e2e8f0" }}>
            My Files
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
            {folders.length + files.length} items
          </p>
        </div>
        <div className="flex items-center gap-2">
          {uploadError && (
            <div
              className="text-xs px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10"
              style={{ color: "#f87171" }}
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
              background: "#0d1829",
              border: "1px solid #1a2540",
              color: "#94a3b8",
            }}
          >
            <FolderPlus size={13} /> New Folder
          </button>

          <input
            ref={uploadInputRef as any}
            type="file"
            multiple={false}
            style={{ display: "none" }}
            aria-label="Upload file"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;

              setUploadError("");
              const selectedFiles = e.target.files;
              const f = selectedFiles?.[0];
              if (!f) return;

              try {
                setUploadingFile(true);
                setFileError("");

                await fileService.uploadFile(file, currentFolderId ?? null);
                await loadFiles(currentFolderId);
              } catch (err: any) {
                const status = err?.response?.status;
                const respMsg =
                  err?.response?.data?.message ||
                  err?.response?.data?.errors?.file?.[0] ||
                  "Gagal upload file.";

                const msg =
                  status === 413 ||
                  (typeof respMsg === "string" &&
                    respMsg.toLowerCase().includes("terlalu besar"))
                    ? "File terlalu besar untuk konfigurasi server/PHP. Cek upload_max_filesize dan post_max_size."
                    : respMsg;
                setUploadError(msg);
                setFileError("");
              } finally {
                setUploadingFile(false);
                // reset input supaya file yang sama bisa di-upload lagi
                e.currentTarget.value = "";
              }
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
            disabled={uploadingFile}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #22d3ee)",
              color: "#fff",
              opacity: uploadingFile ? 0.7 : 1,
            }}
            title="Upload Files"
          >
            <Upload size={13} />{" "}
            {uploadingFile ? "Uploading..." : "Upload Files"}
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "#475569" }}
          />
          <input
            placeholder="Search files..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
            style={{
              background: "#0d1829",
              border: "1px solid #1a2540",
              color: "#94a3b8",
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
              background: "#0d1829",
              border: "1px solid #1a2540",
              color: "#64748b",
            }}
          >
            <Filter size={12} /> Filter: {fileTypeFilterLabel(fileTypeFilter)}
          </button>

          {filterMenuOpen && (
            <div
              className="absolute right-0 top-full mt-2 rounded-lg shadow-2xl"
              style={{
                zIndex: 50,
                background: "#0f1729",
                border: "1px solid #1a2540",
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
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="menuitem"
                  aria-label={`Filter ${label}`}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[#1a2540] transition-colors"
                  style={{ color: "#94a3b8" }}
                  onClick={() => {
                    setFileTypeFilter(value);
                    setFilterMenuOpen(false);
                  }}
                >
                  <span>{label}</span>
                  {fileTypeFilter === value ? (
                    <span style={{ color: "#60a5fa", fontWeight: 600 }}>✓</span>
                  ) : (
                    <span />
                  )}
                </button>
              ))}

              <div style={{ padding: "0 12px 10px" }}>
                <div className="text-[10px]" style={{ color: "#64748b" }}>
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
              background: "#0d1829",
              border: "1px solid #1a2540",
              color: "#64748b",
            }}
          >
            <SortAsc size={12} /> Sort
          </button>

          {sortMenuOpen && (
            <div
              className="absolute right-0 top-full mt-2 rounded-lg shadow-2xl"
              style={{
                zIndex: 50,
                background: "#0f1729",
                border: "1px solid #1a2540",
                minWidth: 220,
              }}
              role="menu"
              aria-label="Sort menu"
            >
              <button
                type="button"
                role="menuitem"
                aria-label="Name A-Z"
                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[#1a2540] transition-colors"
                style={{ color: "#94a3b8" }}
                onClick={() => {
                  setSortBy("name");
                  setSortDirection("asc");
                  setSortMenuOpen(false);
                }}
              >
                Name A-Z
              </button>

              <button
                type="button"
                role="menuitem"
                aria-label="Name Z-A"
                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[#1a2540] transition-colors"
                style={{ color: "#94a3b8" }}
                onClick={() => {
                  setSortBy("name");
                  setSortDirection("desc");
                  setSortMenuOpen(false);
                }}
              >
                Name Z-A
              </button>

              <button
                type="button"
                role="menuitem"
                aria-label="Newest first"
                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[#1a2540] transition-colors"
                style={{ color: "#94a3b8" }}
                onClick={() => {
                  setSortBy("date");
                  setSortDirection("desc");
                  setSortMenuOpen(false);
                }}
              >
                Newest first
              </button>

              <button
                type="button"
                role="menuitem"
                aria-label="Oldest first"
                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[#1a2540] transition-colors"
                style={{ color: "#94a3b8" }}
                onClick={() => {
                  setSortBy("date");
                  setSortDirection("asc");
                  setSortMenuOpen(false);
                }}
              >
                Oldest first
              </button>

              <button
                type="button"
                role="menuitem"
                aria-label="Size smallest"
                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[#1a2540] transition-colors"
                style={{ color: "#94a3b8" }}
                onClick={() => {
                  setSortBy("size");
                  setSortDirection("asc");
                  setSortMenuOpen(false);
                }}
              >
                Size smallest
              </button>

              <button
                type="button"
                role="menuitem"
                aria-label="Size largest"
                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[#1a2540] transition-colors"
                style={{ color: "#94a3b8" }}
                onClick={() => {
                  setSortBy("size");
                  setSortDirection("desc");
                  setSortMenuOpen(false);
                }}
              >
                Size largest
              </button>

              <button
                type="button"
                role="menuitem"
                aria-label="Type A-Z"
                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-[#1a2540] transition-colors"
                style={{ color: "#94a3b8" }}
                onClick={() => {
                  setSortBy("type");
                  setSortDirection("asc");
                  setSortMenuOpen(false);
                }}
              >
                Type A-Z
              </button>
            </div>
          )}
        </div>

        <div
          className="flex items-center rounded-lg overflow-hidden ml-auto"
          style={{ border: "1px solid #1a2540" }}
        >
          {(["list", "grid"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="w-8 h-8 flex items-center justify-center transition-colors"
              style={{
                background: viewMode === mode ? "#1a2540" : "#0d1829",
                color: viewMode === mode ? "#e2e8f0" : "#475569",
              }}
            >
              {mode === "list" ? <List size={14} /> : <Grid size={14} />}
            </button>
          ))}
        </div>
      </div>

      {/* Folders */}
      <div className="mb-6">
        {showEmptySearchState && (
          <div className="text-xs" style={{ color: "#64748b" }}>
            Tidak ada item untuk filter ini.
          </div>
        )}

        <h3
          className="text-xs font-semibold mb-3 uppercase tracking-wider"
          style={{ color: "#334155" }}
        >
          Folders
        </h3>

        {loadingFolders && (
          <div className="text-xs" style={{ color: "#64748b" }}>
            Loading folders...
          </div>
        )}
        {folderError && (
          <div className="text-xs" style={{ color: "#f87171" }}>
            {folderError}
          </div>
        )}
        {!loadingFolders && !folderError && folderList.length === 0 && (
          <div className="text-xs" style={{ color: "#64748b" }}>
            Belum ada folder.
          </div>
        )}

        <div className="grid grid-cols-6 gap-3">
          {sortedFolders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => handleOpenFolder(folder)}
              className="rounded-xl p-3 cursor-pointer hover:scale-[1.03] transition-all group"
              style={{ background: "#0f1729", border: "1px solid #1a2540" }}
            >
              <div className="flex items-start justify-between mb-2">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: "#3b82f618" }}
                >
                  <Folder size={18} style={{ color: "#3b82f6" }} />
                </div>

                <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="relative">
                    <button
                      type="button"
                      aria-label={`Open actions for ${folder.name}`}
                      title="Folder actions"
                      className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-[#1a2540] transition-colors z-50 opacity-100 pointer-events-auto"
                      style={{ color: "#64748b" }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setOpenFolderActionId((current) =>
                          current === folder.id ? null : folder.id,
                        );
                      }}
                    >
                      <MoreHorizontal size={13} />
                    </button>

                    {openFolderActionId === folder.id && (
                      <div
                        className="absolute right-0 top-full mt-2 w-28 rounded-lg shadow-2xl z-50 overflow-visible pointer-events-auto"
                        style={{
                          background: "#0f1729",
                          border: "1px solid #1a2540",
                        }}
                        role="menu"
                        aria-label={`Folder menu ${folder.name}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[#1a2540] transition-colors"
                          style={{ color: "#94a3b8" }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenFolderActionId(null);
                            setSelectedFolderForAction(folder);
                            openRenameFolderModal(folder);
                          }}
                          aria-label={`Rename ${folder.name}`}
                        >
                          <Edit3 size={12} /> Rename
                        </button>

                        <button
                          type="button"
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[#1a2540] transition-colors"
                          style={{ color: "#f87171" }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setOpenFolderActionId(null);
                            setSelectedFolderForDelete(folder);
                            openDeleteFolderModal(folder);
                          }}
                          aria-label={`Delete ${folder.name}`}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="text-xs font-medium truncate"
                style={{ color: "#e2e8f0" }}
              >
                {folder.name}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: "#475569" }}>
                —
              </div>
              <div className="text-[10px]" style={{ color: "#334155" }}>
                —
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Folder/Create/Rename Modal */}
      {isFolderModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#1a2540] bg-[#0f1729] p-6"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
          >
            <div className="mb-4">
              <h2
                className="text-sm font-semibold"
                style={{ color: "#e2e8f0" }}
              >
                {folderModalMode === "create" ? "New Folder" : "Rename Folder"}
              </h2>
              <p className="text-xs mt-1" style={{ color: "#64748b" }}>
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
                <label className="text-xs" style={{ color: "#94a3b8" }}>
                  Folder name
                </label>
                <input
                  autoFocus
                  type="text"
                  className="mt-1 w-full rounded-xl border border-[#1a2540] bg-[#0d1829] px-4 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="Nama folder"
                  value={folderModalName}
                  onChange={(e) => {
                    setFolderModalName(e.target.value);
                    if (folderModalError) setFolderModalError("");
                  }}
                  aria-label="Nama folder"
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
                    background: "#0d1829",
                    border: "1px solid #1a2540",
                    color: "#94a3b8",
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
                    background: "linear-gradient(135deg, #3b82f6, #22d3ee)",
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

      {/* Rename File Modal */}
      {isFileRenameModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#1a2540] bg-[#0f1729] p-6"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
          >
            <div className="mb-4">
              <h2
                className="text-sm font-semibold"
                style={{ color: "#e2e8f0" }}
              >
                Rename File
              </h2>
              <p className="text-xs mt-1" style={{ color: "#64748b" }}>
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
                <label className="text-xs" style={{ color: "#94a3b8" }}>
                  New name
                </label>
                <input
                  autoFocus
                  type="text"
                  className="mt-1 w-full rounded-xl border border-[#1a2540] bg-[#0d1829] px-4 py-2 text-sm outline-none focus:border-blue-500"
                  value={fileRenameName}
                  onChange={(e) => {
                    setFileRenameName(e.target.value);
                    if (fileModalError) setFileModalError("");
                  }}
                  aria-label="Rename file input"
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
                    background: "#0d1829",
                    border: "1px solid #1a2540",
                    color: "#94a3b8",
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
                    background: "linear-gradient(135deg, #3b82f6, #22d3ee)",
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
            className="w-full max-w-md rounded-2xl border border-[#1a2540] bg-[#0f1729] p-6"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
          >
            <div className="mb-3">
              <h2
                className="text-sm font-semibold"
                style={{ color: "#e2e8f0" }}
              >
                Share File
              </h2>
              <p className="text-xs mt-2" style={{ color: "#64748b" }}>
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
                <div className="text-xs" style={{ color: "#94a3b8" }}>
                  Creating share link...
                </div>
              )}

              {!shareLoading && activeShareLink && (
                <>
                  <label className="text-xs" style={{ color: "#94a3b8" }}>
                    Public share URL
                  </label>
                  <div className="mt-2">
                    <input
                      type="text"
                      readOnly
                      value={getPublicShareUrl(activeShareLink.token)}
                      className="w-full rounded-xl border border-[#1a2540] bg-[#0d1829] px-4 py-2 text-sm outline-none text-[#cbd5e1]"
                      aria-label="Public share URL"
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
                    : "linear-gradient(135deg, #3b82f6, #22d3ee)",
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
                  background: "#0d1829",
                  border: "1px solid #1a2540",
                  color: "#94a3b8",
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

      {/* Delete Folder Modal */}
      {isDeleteModalOpen && selectedFolderForDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#1a2540] bg-[#0f1729] p-6"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
          >
            <div className="mb-3">
              <h2
                className="text-sm font-semibold"
                style={{ color: "#e2e8f0" }}
              >
                Delete Folder?
              </h2>
              <p className="text-xs mt-2" style={{ color: "#64748b" }}>
                Apakah kamu yakin ingin menghapus "
                {selectedFolderForDelete.name}"?
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
                  background: "#0d1829",
                  border: "1px solid #1a2540",
                  color: "#94a3b8",
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
                  border: "1px solid rgba(248,113,113,0.4)",
                  color: "#0b1121",
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
            className="w-full max-w-md rounded-2xl border border-[#1a2540] bg-[#0f1729] p-6"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-3">
              <h2
                className="text-sm font-semibold"
                style={{ color: "#e2e8f0" }}
              >
                Delete File?
              </h2>
              <p className="text-xs mt-2" style={{ color: "#64748b" }}>
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
                  background: "#0d1829",
                  border: "1px solid #1a2540",
                  color: "#94a3b8",
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
                  border: "1px solid rgba(248,113,113,0.4)",
                  color: "#0b1121",
                  opacity: deleteFileLoading ? 0.75 : 1,
                }}
              >
                {deleteFileLoading ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Files */}

      <div>
        <h3
          className="text-xs font-semibold mb-3 uppercase tracking-wider"
          style={{ color: "#334155" }}
        >
          Recent Files
        </h3>
        <div
          className="rounded-xl"
          style={{ background: "#0f1729", border: "1px solid #1a2540" }}
        >
          <div
            className="grid px-4 py-2.5"
            style={{
              gridTemplateColumns: "28px 1fr 80px 120px 80px 60px 36px",
              borderBottom: "1px solid #1a2540",
            }}
          >
            {["", "Name", "Type", "Modified", "Size", "Status", ""].map(
              (h, i) => (
                <span
                  key={i}
                  className="text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: "#334155" }}
                >
                  {h}
                </span>
              ),
            )}
          </div>

          {showEmptySearchState && (
            <div className="text-xs px-4 py-6" style={{ color: "#64748b" }}>
              Tidak ada hasil untuk “{searchQuery.trim()}”.
            </div>
          )}
          {!showEmptySearchState &&
            typedFiles.map((file, i) => {
              const typeLabel = getTypeLabel(file.mime_type ?? null);

              return (
                <div
                  key={file.id}
                  onClick={() => {}}
                  className="grid px-4 py-2.5 items-center cursor-pointer hover:bg-[#0d1829] transition-colors group relative"
                  style={{
                    gridTemplateColumns: "28px 1fr 80px 120px 80px 60px 36px",
                    borderBottom: "1px solid #0a1020",
                    background: undefined,
                  }}
                >
                  <div className="w-4 h-4" />

                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center"
                      style={{ background: "rgba(59,130,246,0.12)" }}
                    >
                      <FileText size={14} style={{ color: "#60a5fa" }} />
                    </div>
                    <span className="text-sm" style={{ color: "#cbd5e1" }}>
                      {file.original_name}
                    </span>
                  </div>

                  <span
                    className="text-[10px] px-2 py-0.5 rounded font-medium w-fit"
                    style={{
                      background: "rgba(59,130,246,0.12)",
                      color: "#60a5fa",
                    }}
                  >
                    {typeLabel}
                  </span>

                  <span className="text-xs" style={{ color: "#475569" }}>
                    {file.created_at
                      ? new Date(file.created_at).toLocaleDateString()
                      : "—"}
                  </span>

                  <span className="text-xs" style={{ color: "#475569" }}>
                    {formatBytes(file.size)}
                  </span>

                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded w-fit"
                    style={{
                      background: "rgba(71,85,105,0.1)",
                      color: "#94a3b8",
                    }}
                  >
                    Private
                  </span>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === i ? null : i);
                      }}
                      className="w-7 h-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#1e2d45] z-50"
                      aria-label={`File actions for ${file.original_name}`}
                      title="File actions"
                    >
                      <MoreHorizontal size={14} style={{ color: "#64748b" }} />
                    </button>

                    {menuOpen === i && (
                      <div
                        className="absolute right-0 top-full mt-2 w-44 rounded-lg shadow-2xl z-50 overflow-hidden"
                        style={{
                          background: "#0f1729",
                          border: "1px solid #1a2540",
                        }}
                      >
                        <button
                          type="button"
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[#1a2540] transition-colors"
                          style={{ color: "#94a3b8" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            fileService.downloadFile(
                              file.id,
                              file.original_name,
                            );
                            setMenuOpen(null);
                          }}
                          aria-label={`Download ${file.original_name}`}
                          title={`Download ${file.original_name}`}
                        >
                          <Download size={12} /> Download
                        </button>

                        <button
                          type="button"
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[#1a2540] transition-colors"
                          style={{ color: "#94a3b8" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFileForShare(file);
                            setShareError("");
                            setCopySuccess("");
                            setActiveShareLink(null);
                            setIsShareModalOpen(true);
                            setMenuOpen(null);

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
                          <Share2 size={12} /> Share
                        </button>

                        <button
                          type="button"
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[#1a2540] transition-colors"
                          style={{ color: "#94a3b8" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFileForAction(file);
                            setFileRenameName(file.original_name);
                            setFileModalError("");
                            setIsFileRenameModalOpen(true);
                            setMenuOpen(null);
                          }}
                          aria-label={`Rename ${file.original_name}`}
                          title={`Rename ${file.original_name}`}
                        >
                          <Edit3 size={12} /> Rename
                        </button>

                        <button
                          type="button"
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[#1a2540] transition-colors"
                          style={{ color: "#f87171" }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedFileForDelete(file);
                            setDeleteFileError("");
                            setIsFileDeleteModalOpen(true);
                            setOpenFileActionId(null);
                            setMenuOpen(null);
                          }}
                          aria-label={`Delete ${file.original_name}`}
                          title={`Delete ${file.original_name}`}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
