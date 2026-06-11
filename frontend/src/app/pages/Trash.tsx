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

export function Trash() {
  const [trashFiles, setTrashFiles] = useState<TrashFile[]>([]);
  const [trashFolders, setTrashFolders] = useState<TrashFolder[]>([]);

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

  const [search, setSearch] = useState("");

  async function loadTrashFiles() {
    try {
      setLoading(true);
      setError("");

      const data = await getTrashFiles();
      setTrashFiles(Array.isArray(data) ? data : []);
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

  const hasItems = filtered.length > 0;

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

            {filtered.map((item) => (
              <div
                key={item.id}
                className="grid px-4 py-3 items-center hover:bg-[#0d1829] transition-colors"
                style={{
                  gridTemplateColumns: "1fr 120px 150px 130px 170px",
                  borderBottom: "1px solid #0a1020",
                }}
              >
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
                    {restoreLoadingId === item.id ? "Restoring..." : "Restore"}
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
              className="grid px-4 py-2.5"
              style={{
                gridTemplateColumns: "1fr 130px 170px",
                borderBottom: "1px solid #1a2540",
              }}
            >
              {(["Folder", "Deleted At", "Actions"] as const).map((h) => (
                <span
                  key={h}
                  className="text-[11px] font-medium uppercase tracking-wider"
                  style={{ color: "#334155" }}
                >
                  {h}
                </span>
              ))}
            </div>

            {trashFolders.map((folder) => (
              <div
                key={folder.id}
                className="grid px-4 py-3 items-center hover:bg-[#0d1829] transition-colors"
                style={{
                  gridTemplateColumns: "1fr 130px 170px",
                  borderBottom: "1px solid #0a1020",
                }}
              >
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
                    <RotateCcw size={10} /> Restore
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
