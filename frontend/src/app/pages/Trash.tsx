import { useEffect, useMemo, useState } from "react";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  FileText,
  Search,
} from "lucide-react";

import {
  getTrashFiles,
  getTrashFolders,
  forceDeleteFile,
  forceDeleteFolder,
  restoreFile,
  restoreFolder,
  type TrashFile,
  type TrashFolder,
} from "../../services/trashService";
import { LoadingSpinner } from "../components/LoadingSpinner";

function formatSize(bytes?: number | null): string {
  const b = typeof bytes === "number" ? bytes : 0;
  const units = ["B", "KB", "MB", "GB"];
  if (b < 1024) return `${b} B`;
  const i = Math.min(
    Math.floor(Math.log(b) / Math.log(1024)),
    units.length - 1,
  );
  const value = b / Math.pow(1024, i);
  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[i]}`;
}

function formatDate(d?: string | null): string {
  if (!d) return "-";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

type TrashBulkAction =
  | "restore-files"
  | "delete-files"
  | "restore-folders"
  | "delete-folders";

type TrashBulkResult = {
  okCount: number;
  failCount: number;
};

export function Trash({
  onStorageChanged,
}: {
  onStorageChanged?: () => void;
}): any {
  // Selection untuk Deleted Files harus terpisah dengan Deleted Folders

  const [trashFiles, setTrashFiles] = useState<TrashFile[]>([]);
  // onStorageChanged optional untuk refresh Storage Used di Sidebar (App)

  const [trashFolders, setTrashFolders] = useState<TrashFolder[]>([]);

  // Bulk action untuk Deleted Folders
  const [bulkFolderDeleteLoading, setBulkFolderDeleteLoading] = useState(false);

  // Multi-select Deleted Folders (bulk restore / force delete)
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(
    new Set(),
  );
  // Multi-select Deleted Files (bulk restore / force delete)
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(
    new Set(),
  );
  const clearSelection = () => setSelectedFileIds(new Set());

  const clearFolderSelection = () => setSelectedFolderIds(new Set());

  // Helper untuk memastikan selection folder tidak mengganggu files
  const clearAllSelections = () => {
    clearSelection();
    clearFolderSelection();
  };

  // Multi-select Deleted Folders (bulk restore / force delete)
  // state ini sudah ada: selectedFolderIds

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [foldersLoading, setFoldersLoading] = useState(false);
  const [foldersError, setFoldersError] = useState("");

  const [restoreFolderLoadingId, setRestoreFolderLoadingId] = useState<
    string | null
  >(null);

  const [selectedFolderForForceDelete, setSelectedFolderForForceDelete] =
    useState<TrashFolder | null>(null);
  const [isFolderForceDeleteModalOpen, setIsFolderForceDeleteModalOpen] =
    useState(false);
  const [forceDeleteFolderLoading, setForceDeleteFolderLoading] =
    useState(false);
  const [forceDeleteFolderError, setForceDeleteFolderError] = useState("");

  const [restoreLoadingId, setRestoreLoadingId] = useState<string | null>(null);
  const [forceDeleteLoadingId, setForceDeleteLoadingId] = useState<
    string | null
  >(null);

  const [selectedFileForForceDelete, setSelectedFileForForceDelete] =
    useState<TrashFile | null>(null);
  const [isForceDeleteModalOpen, setIsForceDeleteModalOpen] = useState(false);
  const [forceDeleteError, setForceDeleteError] = useState("");
  const [bulkAction, setBulkAction] = useState<TrashBulkAction | null>(null);
  const [bulkActionIds, setBulkActionIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkActionResult, setBulkActionResult] =
    useState<TrashBulkResult | null>(null);

  const [search, setSearch] = useState("");

  async function loadTrashFiles() {
    try {
      setLoading(true);
      setError("");

      const data = await getTrashFiles();
      setTrashFiles(Array.isArray(data) ? data : []);

      // Bersihkan selection setelah refresh data Trash selesai
      clearSelection();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load deleted files.");
    } finally {
      setLoading(false);
    }
  }

  async function loadTrashFolders() {
    setLoading(true);
    setError("");
    try {
      const folders = await getTrashFolders();
      setTrashFolders(Array.isArray(folders) ? folders : []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to load deleted folders.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrashFiles();
    loadTrashFolders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trashFiles;
    return trashFiles.filter((f) =>
      (f.original_name || "").toLowerCase().includes(q),
    );
  }, [trashFiles, search]);

  const filteredFolders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return trashFolders;
    return trashFolders.filter((f) => (f.name || "").toLowerCase().includes(q));
  }, [trashFolders, search]);

  const openForceDeleteModal = (file: TrashFile) => {
    setSelectedFileForForceDelete(file);
    setForceDeleteError("");
    setIsForceDeleteModalOpen(true);
  };

  const closeForceDeleteModal = () => {
    setIsForceDeleteModalOpen(false);
    setSelectedFileForForceDelete(null);
    setForceDeleteError("");
    setForceDeleteLoadingId(null);
  };

  const handleRestore = async (fileId: string) => {
    setRestoreLoadingId(fileId);
    try {
      await restoreFile(fileId);
      setTrashFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (e) {
      // tetap non-blocking tanpa alert
    } finally {
      setRestoreLoadingId(null);
    }
  };

  const handleForceDelete = async () => {
    if (!selectedFileForForceDelete) return;
    const id = selectedFileForForceDelete.id;

    setForceDeleteLoadingId(id);
    setForceDeleteError("");

    try {
      await forceDeleteFile(id);
      setTrashFiles((prev) => prev.filter((f) => f.id !== id));
      closeForceDeleteModal();
    } catch (e) {
      setForceDeleteError("Failed to delete permanently.");
      setForceDeleteLoadingId(null);
    }
  };

  const openBulkActionModal = (action: TrashBulkAction, ids: string[]) => {
    if (ids.length === 0) return;

    setBulkAction(action);
    setBulkActionIds(ids);
    setBulkActionResult(null);
    setBulkActionLoading(false);
  };

  const closeBulkActionModal = () => {
    if (bulkActionLoading) return;

    setBulkAction(null);
    setBulkActionIds([]);
    setBulkActionResult(null);
  };

  const handleConfirmBulkAction = async () => {
    if (!bulkAction || bulkActionLoading || bulkActionIds.length === 0) return;

    const action = bulkAction;
    const ids = [...bulkActionIds];

    setBulkActionLoading(true);
    setBulkActionResult(null);

    let okCount = 0;
    let failCount = 0;

    for (const id of ids) {
      try {
        if (action === "restore-files") {
          await restoreFile(id);
        } else if (action === "delete-files") {
          await forceDeleteFile(id);
        } else if (action === "restore-folders") {
          await restoreFolder(id);
        } else {
          await forceDeleteFolder(id);
        }

        okCount++;
      } catch {
        failCount++;
      }
    }

    if (action === "restore-files") {
      await loadTrashFiles();
      clearSelection();
    } else if (action === "delete-files") {
      await loadTrashFiles();
      if (okCount > 0) {
        onStorageChanged?.();
      }
      clearSelection();
    } else if (action === "restore-folders") {
      await loadTrashFolders();
      clearFolderSelection();
    } else {
      await loadTrashFolders();
      if (okCount > 0) {
        onStorageChanged?.();
      }
      clearFolderSelection();
    }

    setBulkActionResult({ okCount, failCount });
    setBulkActionLoading(false);
  };

  const hasItems = filtered.length > 0;

  const bulkActionContent = bulkAction
    ? {
        "restore-files": {
          title: "Restore file?",
          description: `${bulkActionIds.length} file terpilih akan direstore.`,
          actionLabel: "Restore",
          loadingLabel: "Merestore file...",
          danger: false,
        },
        "delete-files": {
          title: "Hapus file permanen?",
          description: `${bulkActionIds.length} file terpilih akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`,
          actionLabel: "Hapus Permanen",
          loadingLabel: "Menghapus file permanen...",
          danger: true,
        },
        "restore-folders": {
          title: "Restore folder?",
          description: `${bulkActionIds.length} folder terpilih akan direstore.`,
          actionLabel: "Restore",
          loadingLabel: "Merestore folder...",
          danger: false,
        },
        "delete-folders": {
          title: "Hapus folder permanen?",
          description: `${bulkActionIds.length} folder terpilih akan dihapus permanen. Tindakan ini tidak dapat dibatalkan. Seluruh isi folder ikut dihapus permanen.`,
          actionLabel: "Hapus Permanen",
          loadingLabel: "Menghapus folder permanen...",
          danger: true,
        },
      }[bulkAction]
    : null;

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      style={{ background: "#080d1a" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#e2e8f0" }}>
            Trash
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
            Items are deleted permanently after 30 days
          </p>
        </div>
      </div>

      {loading && (
        <div className="text-sm" style={{ color: "#94a3b8" }}>
          Loading trash...
        </div>
      )}
      {!loading && error && (
        <div className="text-sm" style={{ color: "#ef4444" }}>
          {error}
        </div>
      )}
      {!loading &&
        !error &&
        filtered.length === 0 &&
        filteredFolders.length === 0 && (
          <div className="text-sm" style={{ color: "#94a3b8" }}>
            Trash kosong.
          </div>
        )}

      {!loading && !error && (hasItems || filteredFolders.length > 0) && (
        <>
          {/* Bulk action bar (Deleted Files only) */}
          {selectedFileIds.size > 0 && (
            <div
              className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 rounded-xl"
              style={{ background: "#0f1729", border: "1px solid #1a2540" }}
            >
              <div className="text-xs" style={{ color: "#94a3b8" }}>
                <span style={{ color: "#e2e8f0", fontWeight: 700 }}>
                  {selectedFileIds.size}
                </span>{" "}
                file dipilih
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: "#0d1829",
                    border: "1px solid #1a2540",
                    color: "#94a3b8",
                  }}
                  aria-label="Bulk Restore"
                  onClick={() =>
                    openBulkActionModal(
                      "restore-files",
                      Array.from(selectedFileIds),
                    )
                  }
                >
                  Restore
                </button>

                <button
                  type="button"
                  className="px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#ef4444",
                  }}
                  aria-label="Delete Permanently"
                  onClick={() =>
                    openBulkActionModal(
                      "delete-files",
                      Array.from(selectedFileIds),
                    )
                  }
                >
                  Delete Permanently
                </button>

                <button
                  type="button"
                  className="px-3 py-2 rounded-lg text-xs font-medium"
                  style={{
                    background: "#0d1829",
                    border: "1px solid #1a2540",
                    color: "#94a3b8",
                  }}
                  aria-label="Batalkan pilihan"
                  onClick={() => {
                    clearSelection();
                  }}
                >
                  Batalkan pilihan
                </button>
              </div>
            </div>
          )}

          {/* Search */}

          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2"
                style={{ color: "#475569" }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search trash..."
                className="pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
                style={{
                  background: "#0d1829",
                  border: "1px solid #1a2540",
                  color: "#94a3b8",
                  width: "200px",
                }}
              />
            </div>
          </div>

          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "#0f1729", border: "1px solid #1a2540" }}
          >
            <div
              className="grid px-4 py-2.5"
              style={{
                gridTemplateColumns: "1fr 120px 150px 130px 170px",
                borderBottom: "1px solid #1a2540",
              }}
            >
              {["Name", "Type", "Size", "Deleted At", "Actions"].map((h) => (
                <span
                  key={h}
                  className="text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: "#334155" }}
                >
                  {h}
                </span>
              ))}
            </div>

            {filtered.length > 0 && (
              <div
                className="grid px-4 py-2.5 items-center"
                style={{
                  gridTemplateColumns: "28px 1fr 120px 150px 130px 170px",
                  borderBottom: "1px solid #1a2540",
                }}
              >
                {/* Select all */}
                {(() => {
                  const visibleIds = filtered.map((f) => f.id);
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
                      aria-label="Pilih semua file Deleted"
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
                      style={{ width: 14, height: 14, accentColor: "#3b82f6" }}
                    />
                  );
                })()}
                <span
                  className="text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: "#334155" }}
                >
                  Name
                </span>
                <span
                  className="text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: "#334155" }}
                >
                  Type
                </span>
                <span
                  className="text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: "#334155" }}
                >
                  Size
                </span>
                <span
                  className="text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: "#334155" }}
                >
                  Deleted At
                </span>
                <span
                  className="text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: "#334155" }}
                >
                  Actions
                </span>
              </div>
            )}

            {filtered.map((item) => (
              <div
                key={item.id}
                className="grid px-4 py-3 items-center hover:bg-[#0d1829] transition-colors"
                style={{
                  gridTemplateColumns: "28px 1fr 120px 150px 130px 170px",
                  borderBottom: "1px solid #0a1020",
                }}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    aria-label={`Pilih file Deleted ${item.original_name}`}
                    checked={selectedFileIds.has(item.id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSelectedFileIds((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(item.id);
                        else next.delete(item.id);
                        return next;
                      });
                    }}
                    style={{ width: 14, height: 14, accentColor: "#3b82f6" }}
                  />
                </div>

                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center opacity-60"
                    style={{ background: "#1a2540" }}
                  >
                    <FileText size={14} style={{ color: "#94a3b8" }} />
                  </div>
                  <span
                    className="text-sm text-ellipsis overflow-hidden whitespace-nowrap"
                    style={{ color: "#8899aa" }}
                  >
                    {item.original_name}
                  </span>
                </div>

                <span className="text-xs" style={{ color: "#475569" }}>
                  {item.mime_type || "-"}
                </span>

                <span className="text-xs" style={{ color: "#475569" }}>
                  {formatSize(item.size)}
                </span>

                <span className="text-xs" style={{ color: "#475569" }}>
                  {formatDate(item.deleted_at)}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    aria-label={`Restore ${item.original_name}`}
                    disabled={restoreLoadingId === item.id}
                    onClick={() => handleRestore(item.id)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] hover:bg-[#1a2540] transition-colors"
                    style={{
                      color: "#34d399",
                      border: "1px solid rgba(52,211,153,0.2)",
                      background: "rgba(52,211,153,0.08)",
                    }}
                  >
                    <RotateCcw size={10} />{" "}
                    {restoreLoadingId === item.id ? (
                      <>
                        <LoadingSpinner size={10} /> Restore...
                      </>
                    ) : (
                      "Restore"
                    )}
                  </button>

                  <button
                    aria-label={`Delete Permanently ${item.original_name}`}
                    onClick={() => openForceDeleteModal(item)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] hover:bg-[#1a2540] transition-colors"
                    style={{
                      color: "#ef4444",
                      border: "1px solid rgba(239,68,68,0.2)",
                      background: "rgba(239,68,68,0.08)",
                    }}
                  >
                    <Trash2 size={10} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Deleted Folders */}
      {!loading && !error && trashFolders.length > 0 && (
        <div className="mt-6">
          {/* Bulk action bar (Deleted Folders) */}
          {selectedFolderIds.size > 0 && (
            <div
              className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 rounded-xl"
              style={{ background: "#0f1729", border: "1px solid #1a2540" }}
            >
              <div className="text-xs" style={{ color: "#94a3b8" }}>
                <span style={{ color: "#e2e8f0", fontWeight: 700 }}>
                  {selectedFolderIds.size}
                </span>{" "}
                folder dipilih
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: "#0d1829",
                    border: "1px solid #1a2540",
                    color: "#94a3b8",
                  }}
                  aria-label="Bulk Restore Folders"
                  onClick={() =>
                    openBulkActionModal(
                      "restore-folders",
                      Array.from(selectedFolderIds),
                    )
                  }
                >
                  Restore
                </button>

                <button
                  type="button"
                  className="px-3 py-2 rounded-lg text-xs font-semibold"
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: "#ef4444",
                  }}
                  aria-label="Bulk Delete Permanently Folders"
                  onClick={() =>
                    openBulkActionModal(
                      "delete-folders",
                      Array.from(selectedFolderIds),
                    )
                  }
                >
                  Delete Permanently
                </button>

                <button
                  type="button"
                  className="px-3 py-2 rounded-lg text-xs font-medium"
                  style={{
                    background: "#0d1829",
                    border: "1px solid #1a2540",
                    color: "#94a3b8",
                  }}
                  aria-label="Batalkan pilihan folder"
                  onClick={() => {
                    clearFolderSelection();
                  }}
                >
                  Batalkan pilihan
                </button>
              </div>
            </div>
          )}

          <h2
            className="text-xs font-semibold mb-3 uppercase tracking-wider"
            style={{ color: "#334155" }}
          >
            Deleted Folders
          </h2>

          <div
            className="rounded-xl overflow-hidden"
            style={{ background: "#0f1729", border: "1px solid #1a2540" }}
          >
            <div
              className="grid px-4 py-2.5 items-center"
              style={{
                gridTemplateColumns: "28px 1fr 130px 170px",
                borderBottom: "1px solid #1a2540",
              }}
            >
              {/* Select all folders (visible only) */}
              {(() => {
                const visibleIds = filteredFolders.map((f) => f.id);
                const selectedVisibleCount = visibleIds.reduce(
                  (acc, id) => acc + (selectedFolderIds.has(id) ? 1 : 0),
                  0,
                );
                const allChecked =
                  visibleIds.length > 0 &&
                  selectedVisibleCount === visibleIds.length;
                const indeterminate = selectedVisibleCount > 0 && !allChecked;

                return (
                  <input
                    type="checkbox"
                    aria-label="Pilih semua folder"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = indeterminate;
                    }}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (checked) {
                        setSelectedFolderIds((prev) => {
                          const next = new Set(prev);
                          for (const id of visibleIds) next.add(id);
                          return next;
                        });
                      } else {
                        setSelectedFolderIds((prev) => {
                          const next = new Set(prev);
                          for (const id of visibleIds) next.delete(id);
                          return next;
                        });
                      }
                    }}
                    style={{ width: 14, height: 14, accentColor: "#3b82f6" }}
                  />
                );
              })()}

              <span
                className="text-[11px] font-medium uppercase tracking-wider"
                style={{ color: "#334155" }}
              >
                Folder
              </span>
              <span
                className="text-[11px] font-medium uppercase tracking-wider"
                style={{ color: "#334155" }}
              >
                Deleted At
              </span>
              <span
                className="text-[11px] font-medium uppercase tracking-wider"
                style={{ color: "#334155" }}
              >
                Actions
              </span>
            </div>

            {filteredFolders.map((folder) => (
              <div
                key={folder.id}
                className="grid px-4 py-3 items-center hover:bg-[#0d1829] transition-colors"
                style={{
                  gridTemplateColumns: "28px 1fr 130px 170px",
                  borderBottom: "1px solid #0a1020",
                }}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    aria-label={`Pilih folder ${folder.name}`}
                    checked={selectedFolderIds.has(folder.id)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSelectedFolderIds((prev) => {
                        const next = new Set(prev);
                        if (checked) next.add(folder.id);
                        else next.delete(folder.id);
                        return next;
                      });
                    }}
                    style={{ width: 14, height: 14, accentColor: "#3b82f6" }}
                  />
                </div>

                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center opacity-60"
                    style={{ background: "#1a2540" }}
                  >
                    <FileText size={14} style={{ color: "#94a3b8" }} />
                  </div>
                  <span
                    className="text-sm text-ellipsis overflow-hidden whitespace-nowrap"
                    style={{ color: "#8899aa" }}
                  >
                    {folder.name}
                  </span>
                </div>

                <span className="text-xs" style={{ color: "#475569" }}>
                  {formatDate(folder.deleted_at)}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    aria-label={`Restore ${folder.name}`}
                    disabled={restoreFolderLoadingId === folder.id}
                    onClick={async () => {
                      setRestoreFolderLoadingId(folder.id);
                      try {
                        await restoreFolder(folder.id);
                        setTrashFolders((current) =>
                          current.filter((item) => item.id !== folder.id),
                        );
                      } catch {
                        // non-blocking
                      } finally {
                        setRestoreFolderLoadingId(null);
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] hover:bg-[#1a2540] transition-colors"
                    style={{
                      color: "#34d399",
                      border: "1px solid rgba(52,211,153,0.2)",
                      background: "rgba(52,211,153,0.08)",
                    }}
                  >
                    <RotateCcw size={10} />{" "}
                    {restoreFolderLoadingId === folder.id ? (
                      <>
                        <LoadingSpinner size={10} /> Restore...
                      </>
                    ) : (
                      "Restore"
                    )}
                  </button>

                  <button
                    aria-label={`Delete Permanently ${folder.name}`}
                    onClick={() => {
                      setSelectedFolderForForceDelete(folder);
                      setForceDeleteFolderError("");
                      setIsFolderForceDeleteModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] hover:bg-[#1a2540] transition-colors"
                    style={{
                      color: "#ef4444",
                      border: "1px solid rgba(239,68,68,0.2)",
                      background: "rgba(239,68,68,0.08)",
                    }}
                  >
                    <Trash2 size={10} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk action modal */}
      {bulkAction && bulkActionContent && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="trash-bulk-action-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#1a2540] bg-[#0f1729] p-6"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="trash-bulk-action-title"
                  className="text-sm font-semibold"
                  style={{ color: "#e2e8f0" }}
                >
                  {bulkActionContent.title}
                </h2>
                <p className="mt-2 text-xs" style={{ color: "#94a3b8" }}>
                  {bulkActionContent.description}
                </p>
              </div>

              <button
                type="button"
                onClick={closeBulkActionModal}
                disabled={bulkActionLoading}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
                style={{
                  background: "#0d1829",
                  border: "1px solid #1a2540",
                  color: "#94a3b8",
                  opacity: bulkActionLoading ? 0.55 : 1,
                }}
                aria-label="Tutup modal bulk action"
              >
                ×
              </button>
            </div>

            {bulkActionContent.danger && !bulkActionResult && (
              <div
                className="mb-4 flex gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs"
                style={{ color: "#f87171" }}
              >
                <AlertTriangle size={14} />
                <span>Tindakan ini tidak dapat dibatalkan.</span>
              </div>
            )}

            {bulkActionLoading && (
              <div
                className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs flex items-center gap-2"
                style={{ color: "#67e8f9" }}
                role="status"
              >
                <LoadingSpinner size={12} />
                {bulkActionContent.loadingLabel}
              </div>
            )}

            {bulkActionResult ? (
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
                        {bulkActionResult.okCount}
                      </div>
                      <div className="text-[11px]">berhasil</div>
                    </div>
                    <div
                      className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2"
                      style={{ color: "#f87171" }}
                    >
                      <div className="text-lg font-semibold">
                        {bulkActionResult.failCount}
                      </div>
                      <div className="text-[11px]">gagal</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={closeBulkActionModal}
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
                  onClick={closeBulkActionModal}
                  disabled={bulkActionLoading}
                  className="rounded-xl px-3 py-2 text-xs font-medium"
                  style={{
                    background: "#0d1829",
                    border: "1px solid #1a2540",
                    color: "#94a3b8",
                    opacity: bulkActionLoading ? 0.6 : 1,
                  }}
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={() => void handleConfirmBulkAction()}
                  disabled={bulkActionLoading}
                  className="rounded-xl px-3 py-2 text-xs font-semibold"
                  style={{
                    background: bulkActionContent.danger
                      ? "#f87171"
                      : "linear-gradient(135deg, #3b82f6, #22d3ee)",
                    border: bulkActionContent.danger
                      ? "1px solid rgba(248,113,113,0.4)"
                      : "1px solid rgba(34,211,238,0.35)",
                    color: bulkActionContent.danger ? "#0b1121" : "#fff",
                    opacity: bulkActionLoading ? 0.75 : 1,
                  }}
                >
                  {bulkActionLoading ? (
                    <>
                      <LoadingSpinner size={12} />{" "}
                      {bulkActionContent.loadingLabel}
                    </>
                  ) : (
                    bulkActionContent.actionLabel
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Force delete modal (files) */}
      {isForceDeleteModalOpen && selectedFileForForceDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <div
            className="w-full max-w-md rounded-xl p-5"
            style={{ background: "#0f1729", border: "1px solid #1a2540" }}
          >
            <h2
              className="text-base font-semibold"
              style={{ color: "#e2e8f0" }}
            >
              Delete Permanently?
            </h2>
            <p className="text-xs mt-2" style={{ color: "#94a3b8" }}>
              File ini akan dihapus permanen dari storage dan tidak bisa
              direstore.
            </p>

            <div
              className="mt-3 rounded-lg p-3"
              style={{ background: "#0b1121", border: "1px solid #1a2540" }}
            >
              <div className="text-sm" style={{ color: "#8899aa" }}>
                {selectedFileForForceDelete.original_name}
              </div>
            </div>

            {forceDeleteError && (
              <div className="mt-3 text-xs" style={{ color: "#ef4444" }}>
                {forceDeleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                aria-label="Cancel force delete"
                onClick={closeForceDeleteModal}
                className="px-3 py-2 rounded-lg text-xs font-medium"
                style={{
                  background: "#0d1829",
                  border: "1px solid #1a2540",
                  color: "#94a3b8",
                }}
              >
                Cancel
              </button>
              <button
                aria-label="Delete Permanently confirm"
                disabled={
                  forceDeleteLoadingId === selectedFileForForceDelete.id
                }
                onClick={handleForceDelete}
                className="px-3 py-2 rounded-lg text-xs font-semibold"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#ef4444",
                }}
              >
                {forceDeleteLoadingId === selectedFileForForceDelete.id
                  ? "Deleting..."
                  : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Force delete modal (folders) */}
      {isFolderForceDeleteModalOpen && selectedFolderForForceDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)" }}
        >
          <div
            className="w-full max-w-md rounded-xl p-5"
            style={{ background: "#0f1729", border: "1px solid #1a2540" }}
          >
            <h2
              className="text-base font-semibold"
              style={{ color: "#e2e8f0" }}
            >
              Delete Folder Permanently?
            </h2>
            <p className="text-xs mt-2" style={{ color: "#94a3b8" }}>
              Folder, subfolder, dan seluruh file di dalamnya akan dihapus
              permanen. Tindakan ini tidak bisa direstore.
            </p>

            <div
              className="mt-3 rounded-lg p-3"
              style={{ background: "#0b1121", border: "1px solid #1a2540" }}
            >
              <div className="text-sm" style={{ color: "#8899aa" }}>
                {selectedFolderForForceDelete.name}
              </div>
            </div>

            {forceDeleteFolderError && (
              <div className="mt-3 text-xs" style={{ color: "#ef4444" }}>
                {forceDeleteFolderError}
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                aria-label="Cancel force delete folder"
                onClick={() => {
                  setIsFolderForceDeleteModalOpen(false);
                  setSelectedFolderForForceDelete(null);
                  setForceDeleteFolderError("");
                  setForceDeleteFolderLoading(false);
                }}
                className="px-3 py-2 rounded-lg text-xs font-medium"
                style={{
                  background: "#0d1829",
                  border: "1px solid #1a2540",
                  color: "#94a3b8",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                aria-label="Delete Permanently confirm folder"
                disabled={forceDeleteFolderLoading}
                onClick={async () => {
                  if (!selectedFolderForForceDelete) return;
                  try {
                    setForceDeleteFolderLoading(true);
                    setForceDeleteFolderError("");

                    await forceDeleteFolder(selectedFolderForForceDelete.id);

                    setTrashFolders((current) =>
                      current.filter(
                        (folder) =>
                          folder.id !== selectedFolderForForceDelete.id,
                      ),
                    );

                    setIsFolderForceDeleteModalOpen(false);
                    setSelectedFolderForForceDelete(null);
                  } catch (err: any) {
                    setForceDeleteFolderError(
                      err?.response?.data?.message ||
                        "Gagal menghapus folder secara permanen.",
                    );
                  } finally {
                    setForceDeleteFolderLoading(false);
                  }
                }}
                className="px-3 py-2 rounded-lg text-xs font-semibold"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#ef4444",
                  opacity: forceDeleteFolderLoading ? 0.75 : 1,
                }}
              >
                {forceDeleteFolderLoading
                  ? "Deleting..."
                  : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
