import { useEffect, useRef, useState } from "react";
import {
  Link2,
  Eye,
  Copy,
  Trash2,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  Globe,
  Clock,
  Download,
  ExternalLink,
} from "lucide-react";
import {
  getShareLinks,
  deleteShareLink,
  getPublicShareUrl,
  type ShareLink,
} from "../../services/shareService";
import { LoadingSpinner } from "../components/LoadingSpinner";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes?: number | null): string {
  const v = typeof bytes === "number" ? bytes : 0;
  if (v === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(v) / Math.log(1024)),
    units.length - 1,
  );
  const num = v / Math.pow(1024, i);
  return `${num.toFixed(num >= 10 ? 1 : 2)} ${units[i]}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getMimeIcon(mime?: string | null) {
  if (!mime) return { Icon: FileText, color: "#64748b" };
  if (mime.startsWith("image/")) return { Icon: Image, color: "#a78bfa" };
  if (mime.startsWith("video/")) return { Icon: Film, color: "#f59e0b" };
  if (mime.startsWith("audio/")) return { Icon: Music, color: "#22d3ee" };
  if (
    mime.includes("zip") ||
    mime.includes("compressed") ||
    mime.includes("tar")
  )
    return { Icon: Archive, color: "#34d399" };
  if (mime.includes("pdf")) return { Icon: FileText, color: "#ef4444" };
  return { Icon: FileText, color: "#3b82f6" };
}

/** Copy text with clipboard API + textarea fallback */
async function copyToClipboard(text: string): Promise<boolean> {
  // primary: Clipboard API
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to textarea fallback
    }
  }
  // fallback: textarea + execCommand
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "true");
    ta.style.position = "absolute";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    ta.focus();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// ─── component ──────────────────────────────────────────────────────────────

export function Shared() {
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // id of the share link that was just copied — shows "Copied!" badge
  const [copySuccessId, setCopySuccessId] = useState<string | null>(null);
  // id of the share link currently being deleted
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [selectedShareIds, setSelectedShareIds] = useState<Set<string>>(
    new Set(),
  );
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState<string[]>([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeleteResult, setBulkDeleteResult] = useState<{
    okCount: number;
    failCount: number;
  } | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const clearSelection = () => setSelectedShareIds(new Set());

  // ── load ──────────────────────────────────────────────────────────────────
  async function loadShareLinks() {
    try {
      setLoading(true);
      setError("");
      const data = await getShareLinks();
      setShareLinks(Array.isArray(data) ? data : []);
      clearSelection();
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to load shared links.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadShareLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── copy ──────────────────────────────────────────────────────────────────
  async function handleCopy(share: ShareLink) {
    const url = getPublicShareUrl(share.token);
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopySuccessId(share.id);
      setTimeout(() => setCopySuccessId(null), 1800);
    } else {
      // show error inline on the same badge slot
      setCopySuccessId(`fail-${share.id}`);
      setTimeout(() => setCopySuccessId(null), 2500);
    }
  }

  // ── open ──────────────────────────────────────────────────────────────────
  function handleOpen(share: ShareLink) {
    const url = getPublicShareUrl(share.token);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  // ── delete ────────────────────────────────────────────────────────────────
  async function handleDelete(share: ShareLink) {
    if (deleteLoadingId || bulkDeleteLoading) return; // prevent double-click
    try {
      setDeleteLoadingId(share.id);
      await deleteShareLink(share.id);
      // remove from local state — no extra round-trip needed
      setShareLinks((prev) => prev.filter((s) => s.id !== share.id));
      setSelectedShareIds((prev) => {
        const next = new Set(prev);
        next.delete(share.id);
        return next;
      });
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Gagal menghapus share link.",
      );
    } finally {
      setDeleteLoadingId(null);
    }
  }

  const openBulkDeleteModal = () => {
    const ids = Array.from(selectedShareIds);
    if (ids.length === 0) return;

    setBulkDeleteIds(ids);
    setBulkDeleteResult(null);
    setIsBulkDeleteModalOpen(true);
  };

  const closeBulkDeleteModal = () => {
    if (bulkDeleteLoading) return;

    setIsBulkDeleteModalOpen(false);
    setBulkDeleteIds([]);
    setBulkDeleteResult(null);
  };

  const handleConfirmBulkDelete = async () => {
    if (bulkDeleteLoading || bulkDeleteIds.length === 0) return;

    setBulkDeleteLoading(true);
    setBulkDeleteResult(null);
    setError("");

    let okCount = 0;
    let failCount = 0;
    const deletedIds: string[] = [];

    for (const id of bulkDeleteIds) {
      try {
        await deleteShareLink(id);
        okCount++;
        deletedIds.push(id);
      } catch {
        failCount++;
      }
    }

    setShareLinks((prev) =>
      prev.filter((share) => !deletedIds.includes(share.id)),
    );
    clearSelection();
    setBulkDeleteResult({ okCount, failCount });
    setBulkDeleteLoading(false);
  };

  const selectedVisibleCount = shareLinks.reduce(
    (count, share) => count + (selectedShareIds.has(share.id) ? 1 : 0),
    0,
  );
  const allVisibleSelected =
    shareLinks.length > 0 && selectedVisibleCount === shareLinks.length;
  const selectAllIndeterminate =
    selectedVisibleCount > 0 && !allVisibleSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectAllIndeterminate;
    }
  }, [selectAllIndeterminate]);

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      style={{ background: "#080d1a" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#e2e8f0" }}>
            Shared Links
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
            Semua share link yang sudah kamu buat
          </p>
        </div>

        {/* Stats pill */}
        {!loading && !error && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: "#0f1729",
              border: "1px solid #1a2540",
              color: "#64748b",
            }}
          >
            <Link2 size={12} style={{ color: "#3b82f6" }} />
            <span style={{ color: "#94a3b8", fontWeight: 600 }}>
              {shareLinks.length}
            </span>
            active link{shareLinks.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {/* Global error */}
      {error && (
        <div
          className="mb-4 px-4 py-3 rounded-xl text-xs"
          style={{
            background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.25)",
            color: "#f87171",
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div
          className="rounded-xl px-4 py-6 text-xs"
          style={{
            background: "#0f1729",
            border: "1px solid #1a2540",
            color: "#475569",
          }}
        >
          <div className="flex items-center gap-2">
            <LoadingSpinner size={12} />
            Memuat share link...
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && shareLinks.length === 0 && (
        <div
          className="rounded-xl px-4 py-10 flex flex-col items-center gap-3"
          style={{ background: "#0f1729", border: "1px solid #1a2540" }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "rgba(59,130,246,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Link2 size={22} style={{ color: "#3b82f6" }} />
          </div>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            Belum ada link share.
          </div>
          <div style={{ color: "#334155", fontSize: 11 }}>
            Buka MyFiles → klik ⋯ pada file → Share untuk membuat link.
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {!loading &&
        !error &&
        shareLinks.length > 0 &&
        selectedShareIds.size > 0 && (
          <div
            className="mb-4 flex flex-col gap-3 rounded-xl px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            style={{ background: "#0f1729", border: "1px solid #1a2540" }}
          >
            <div className="text-xs" style={{ color: "#94a3b8" }}>
              <span style={{ color: "#e2e8f0", fontWeight: 700 }}>
                {selectedShareIds.size}
              </span>{" "}
              share link dipilih
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={openBulkDeleteModal}
                disabled={bulkDeleteLoading}
                className="rounded-lg px-3 py-2 text-xs font-semibold"
                style={{
                  background: "#f87171",
                  border: "1px solid rgba(248,113,113,0.4)",
                  color: "#0b1121",
                  opacity: bulkDeleteLoading ? 0.75 : 1,
                }}
                aria-label="Hapus share link terpilih"
              >
                Hapus Link
              </button>

              <button
                type="button"
                onClick={clearSelection}
                disabled={bulkDeleteLoading}
                className="rounded-lg px-3 py-2 text-xs font-medium"
                style={{
                  background: "#0d1829",
                  border: "1px solid #1a2540",
                  color: "#94a3b8",
                  opacity: bulkDeleteLoading ? 0.6 : 1,
                }}
                aria-label="Batalkan pilihan share link"
              >
                Batalkan pilihan
              </button>
            </div>
          </div>
        )}

      {/* Bulk delete modal */}
      {isBulkDeleteModalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="shared-bulk-delete-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-[#1a2540] bg-[#0f1729] p-6"
            style={{ boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2
                  id="shared-bulk-delete-title"
                  className="text-sm font-semibold"
                  style={{ color: "#e2e8f0" }}
                >
                  Hapus share link?
                </h2>
                <p className="mt-2 text-xs" style={{ color: "#94a3b8" }}>
                  {bulkDeleteIds.length} share link terpilih akan dihapus. Akses
                  publik untuk file tersebut akan dicabut.
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
                aria-label="Tutup modal hapus share link"
              >
                ×
              </button>
            </div>

            {bulkDeleteLoading && (
              <div
                className="mb-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs"
                style={{ color: "#67e8f9" }}
                role="status"
              >
                Menghapus share link...
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
                  {bulkDeleteLoading ? "Menghapus..." : "Hapus Link"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      {!loading && !error && shareLinks.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "#0f1729", border: "1px solid #1a2540" }}
        >
          {/* Table head */}
          <div
            className="grid px-4 py-2.5"
            style={{
              gridTemplateColumns: "42px 1fr 90px 90px 80px 130px 120px 136px",
              borderBottom: "1px solid #1a2540",
            }}
          >
            <span className="flex items-center">
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(event) => {
                  if (event.target.checked) {
                    setSelectedShareIds(
                      new Set(shareLinks.map((share) => share.id)),
                    );
                  } else {
                    clearSelection();
                  }
                }}
                className="h-4 w-4 rounded border-[#1a2540] bg-[#0d1829]"
                style={{ accentColor: "#ef4444" }}
                aria-label="Pilih semua share link"
              />
            </span>

            {[
              "File",
              "Type",
              "Size",
              "Downloads",
              "Expires",
              "Created",
              "",
            ].map((h) => (
              <span
                key={h}
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "#334155" }}
              >
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {shareLinks.map((share) => {
            const { Icon, color } = getMimeIcon(share.file?.mime_type);
            const publicUrl = getPublicShareUrl(share.token);
            const isDeleting = deleteLoadingId === share.id;
            const isCopied = copySuccessId === share.id;
            const isCopyFail = copySuccessId === `fail-${share.id}`;
            const isSelected = selectedShareIds.has(share.id);

            const expiresText = share.expires_at
              ? formatDate(share.expires_at)
              : "No expiry";
            const expiresColor = share.expires_at ? "#94a3b8" : "#34d399";

            return (
              <div
                key={share.id}
                className="grid px-4 py-3 items-center hover:bg-[#0d1829] transition-colors group"
                style={{
                  gridTemplateColumns:
                    "42px 1fr 90px 90px 80px 130px 120px 136px",
                  borderBottom: "1px solid #0a1020",
                  opacity: isDeleting ? 0.5 : 1,
                  transition: "opacity 0.2s",
                  background: isSelected && !isDeleting
                    ? "rgba(168, 85, 247, 0.08)"
                    : "transparent",
                  borderLeft: isSelected && !isDeleting
                    ? "3px solid rgba(168, 85, 247, 0.3)"
                    : "3px solid transparent",
                  paddingLeft: isSelected && !isDeleting ? "calc(1rem - 3px)" : "1rem",
                }}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={isDeleting || bulkDeleteLoading}
                    onChange={(event) => {
                      setSelectedShareIds((prev) => {
                        const next = new Set(prev);
                        if (event.target.checked) next.add(share.id);
                        else next.delete(share.id);
                        return next;
                      });
                    }}
                    className="h-4 w-4 rounded border-[#1a2540] bg-[#0d1829]"
                    style={{ accentColor: "#ef4444" }}
                    aria-label={`Pilih share link ${share.file?.original_name ?? share.id}`}
                  />
                </div>

                {/* File name */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}18` }}
                  >
                    <Icon size={14} style={{ color }} />
                  </div>
                  <div className="min-w-0">
                    <div
                      className="text-sm truncate"
                      style={{ color: "#cbd5e1" }}
                      title={share.file?.original_name ?? "—"}
                    >
                      {share.file?.original_name ?? "—"}
                    </div>
                    {/* token sub-line */}
                    <div
                      className="text-[10px] truncate mt-0.5 font-mono"
                      style={{ color: "#334155" }}
                      title={publicUrl}
                    >
                      {publicUrl}
                    </div>
                  </div>
                </div>

                {/* MIME type label */}
                <span
                  className="text-[10px] px-2 py-0.5 rounded w-fit truncate"
                  style={{
                    background: `${color}18`,
                    color,
                    maxWidth: 80,
                    display: "inline-block",
                  }}
                  title={share.file?.mime_type ?? "—"}
                >
                  {share.file?.mime_type?.split("/")?.[1]?.toUpperCase() ?? "—"}
                </span>

                {/* Size */}
                <span className="text-xs" style={{ color: "#64748b" }}>
                  {formatBytes(share.file?.size)}
                </span>

                {/* Download count */}
                <div className="flex items-center gap-1">
                  <Download size={10} style={{ color: "#475569" }} />
                  <span className="text-xs" style={{ color: "#64748b" }}>
                    {share.download_count ?? 0}
                  </span>
                </div>

                {/* Expires */}
                <div className="flex items-center gap-1">
                  <Clock size={10} style={{ color: "#475569" }} />
                  <span className="text-xs" style={{ color: expiresColor }}>
                    {expiresText}
                  </span>
                </div>

                {/* Created */}
                <span className="text-xs" style={{ color: "#475569" }}>
                  {formatDate(share.created_at)}
                </span>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 justify-end">
                  {/* Copy */}
                  <button
                    type="button"
                    id={`share-copy-${share.id}`}
                    onClick={() => handleCopy(share)}
                    disabled={isDeleting || bulkDeleteLoading}
                    title="Copy public link"
                    aria-label={`Copy link for ${share.file?.original_name}`}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all hover:opacity-80"
                    style={{
                      background: isCopied
                        ? "rgba(52,211,153,0.1)"
                        : isCopyFail
                          ? "rgba(248,113,113,0.1)"
                          : "rgba(59,130,246,0.1)",
                      border: isCopied
                        ? "1px solid rgba(52,211,153,0.25)"
                        : isCopyFail
                          ? "1px solid rgba(248,113,113,0.25)"
                          : "1px solid rgba(59,130,246,0.2)",
                      color: isCopied
                        ? "#34d399"
                        : isCopyFail
                          ? "#f87171"
                          : "#60a5fa",
                      minWidth: 54,
                      justifyContent: "center",
                    }}
                  >
                    <Copy size={10} />
                    {isCopied ? "Copied!" : isCopyFail ? "Failed" : "Copy"}
                  </button>

                  {/* Open */}
                  <button
                    type="button"
                    id={`share-open-${share.id}`}
                    onClick={() => handleOpen(share)}
                    disabled={isDeleting || bulkDeleteLoading}
                    title="Open public link in new tab"
                    aria-label={`Open link for ${share.file?.original_name}`}
                    className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:opacity-80"
                    style={{
                      background: "rgba(34,211,238,0.08)",
                      border: "1px solid rgba(34,211,238,0.15)",
                      color: "#22d3ee",
                    }}
                  >
                    <ExternalLink size={11} />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    id={`share-delete-${share.id}`}
                    onClick={() => handleDelete(share)}
                    disabled={isDeleting || bulkDeleteLoading}
                    title="Delete share link"
                    aria-label={`Delete link for ${share.file?.original_name}`}
                    className="flex items-center justify-center w-7 h-7 rounded-lg transition-all hover:opacity-80"
                    style={{
                      background: "rgba(248,113,113,0.08)",
                      border: "1px solid rgba(248,113,113,0.2)",
                      color: "#f87171",
                      opacity: isDeleting ? 0.5 : 1,
                    }}
                  >
                    {isDeleting ? (
                      <LoadingSpinner size={10} color="#f87171" />
                    ) : (
                      <Trash2 size={11} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info note */}
      {!loading && !error && shareLinks.length > 0 && (
        <div className="mt-4 flex items-center gap-1.5">
          <Globe size={11} style={{ color: "#334155" }} />
          <p className="text-[11px]" style={{ color: "#334155" }}>
            Semua link bersifat publik — siapa saja dengan link bisa mengakses
            file. Hapus link untuk mencabut akses.
          </p>
        </div>
      )}
    </div>
  );
}
