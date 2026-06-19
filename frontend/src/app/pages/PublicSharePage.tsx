import { useEffect, useMemo, useState } from "react";
import axios from "axios";

// Gunakan axios langsung (bukan shared api instance) agar tidak
// mengirim Authorization header dari localStorage untuk halaman publik.
const apiBase =
  (import.meta as any).env?.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api";

type ShareFileInfo = {
  id?: string;
  original_name?: string;
  mime_type?: string | null;
  size?: number;
  created_at?: string;
};

type ShareData = {
  token?: string;
  file?: ShareFileInfo;
  download_count?: number;
  expires_at?: string | null;
};

function formatBytes(bytes?: number | null): string {
  const v = typeof bytes === "number" ? bytes : 0;
  if (v === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(
    Math.floor(Math.log(v) / Math.log(1024)),
    units.length - 1,
  );
  const num = v / Math.pow(1024, i);
  const fixed = num >= 10 ? 1 : 2;
  return `${num.toFixed(fixed)} ${units[i]}`;
}

function getFileIcon(mime?: string | null): string {
  if (!mime) return "📄";
  if (mime.startsWith("image/")) return "🖼️";
  if (mime.startsWith("video/")) return "🎬";
  if (mime.startsWith("audio/")) return "🎵";
  if (mime.includes("pdf")) return "📕";
  if (mime.includes("zip") || mime.includes("compressed") || mime.includes("tar")) return "🗜️";
  if (mime.includes("word") || mime.includes("document")) return "📝";
  if (mime.includes("spreadsheet") || mime.includes("excel")) return "📊";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "📋";
  return "📄";
}

/** Normalize error status from an axios error response */
function getErrorStatus(e: any): number | null {
  return e?.response?.status ?? null;
}

/** Normalize error message from axios error */
function getErrorMessage(e: any, fallback: string): string {
  return e?.response?.data?.message || fallback;
}

export function PublicSharePage() {
  const pathname = window.location.pathname;

  const token = useMemo(() => {
    // path format: /share/{token}
    const parts = pathname.split("/").filter(Boolean);
    // parts: ["share", "{token}"]
    if (parts.length >= 2 && parts[0] === "share") return parts[1];
    return "";
  }, [pathname]);

  // ── initial page load state ──────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [share, setShare] = useState<ShareData | null>(null);

  // ── download handler state ───────────────────────────────────────────────
  /** true while we are validating + downloading */
  const [downloadLoading, setDownloadLoading] = useState(false);

  // ── initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMessage("");
      setShare(null);

      try {
        if (!token) {
          setErrorMessage("Share link tidak ditemukan.");
          setLoading(false);
          return;
        }

        // Gunakan axios biasa (bukan shared api) — public endpoint, tidak butuh auth header
        const res = await axios.get(`${apiBase}/share/${token}`, {
          headers: { Accept: "application/json" },
        });

        // Backend kemungkinan: { data: {...} } atau langsung object
        const payload = res.data;
        const data: ShareData = payload?.data ?? payload;

        if (!cancelled) {
          setShare(data);
        }
      } catch (e: any) {
        const status = getErrorStatus(e);
        if (!cancelled) {
          if (status === 404) {
            setErrorMessage("Share link tidak ditemukan.");
          } else if (status === 410) {
            setErrorMessage("Share link sudah kedaluwarsa.");
          } else {
            setErrorMessage(getErrorMessage(e, "Gagal memuat share link."));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // ── handleDownload ────────────────────────────────────────────────────────
  /**
   * Re-validates the share token with the backend FIRST.
   * Only proceeds to download if the token is still valid.
   * This ensures that if the link was deleted in another tab,
   * clicking Download shows an error instead of downloading.
   */
  async function handleDownload() {
    if (!token || downloadLoading) return;

    setDownloadLoading(true);
    setErrorMessage(""); // clear any previous inline error

    try {
      // Step 1: re-check token is still valid
      await axios.get(`${apiBase}/share/${token}`, {
        headers: { Accept: "application/json" },
      });

      // Step 2: token valid — trigger download
      // Use window.location.href so the browser handles the binary response
      // (avoids loading the whole file into JS memory for large files).
      window.location.href = `${apiBase}/share/${token}/download`;

    } catch (e: any) {
      const status = getErrorStatus(e);

      // Invalidate the displayed share card so the Download button is hidden
      setShare(null);

      if (status === 404) {
        setErrorMessage("Share link tidak ditemukan.");
      } else if (status === 410) {
        setErrorMessage("Share link sudah kedaluwarsa.");
      } else {
        setErrorMessage(getErrorMessage(e, "Gagal memvalidasi share link."));
      }
    } finally {
      setDownloadLoading(false);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  const isInvalid = !loading && (!!errorMessage || !share?.file);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "linear-gradient(135deg, #142033 0%, #182640 60%, #10213a 100%)",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* Background subtle glow */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(59,130,246,0.07) 0%, transparent 70%)",
        }}
      />

      <div
        style={{
          width: "100%",
          maxWidth: 480,
          borderRadius: 20,
          border: "1px solid #1a2540",
          background: "#0f1729",
          padding: "32px",
          boxShadow: "0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(59,130,246,0.05)",
          position: "relative",
        }}
      >
        {/* Logo / branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #3b82f6, #22d3ee)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              boxShadow: "0 4px 16px rgba(59,130,246,0.3)",
            }}
          >
            ☁️
          </div>
          <div>
            <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>
              NimbusDrive
            </div>
            <div style={{ color: "#475569", fontSize: 11 }}>
              Shared File
            </div>
          </div>
        </div>

        {/* ── Loading state (initial page load) ─────────────────────────── */}
        {loading && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#94a3b8",
              fontSize: 13,
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: "2px solid #1a2540",
                borderTopColor: "#3b82f6",
                animation: "spin 0.8s linear infinite",
              }}
            />
            Loading shared file...
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── Error state ───────────────────────────────────────────────── */}
        {!loading && errorMessage && (
          <div
            style={{
              borderRadius: 12,
              border: "1px solid rgba(248,113,113,0.25)",
              background: "rgba(248,113,113,0.08)",
              padding: "16px 18px",
            }}
            role="alert"
          >
            <div style={{ color: "#f87171", fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
              ⚠️{" "}
              {errorMessage === "Share link tidak ditemukan."
                ? "Link Tidak Ditemukan"
                : errorMessage === "Share link sudah kedaluwarsa."
                  ? "Link Kedaluwarsa"
                  : "Terjadi Kesalahan"}
            </div>
            <div style={{ color: "#94a3b8", fontSize: 12 }}>
              {errorMessage}
            </div>
          </div>
        )}

        {/* ── Success state — file info card ────────────────────────────── */}
        {!loading && !isInvalid && share?.file && (
          <div>
            {/* File card */}
            <div
              style={{
                borderRadius: 14,
                border: "1px solid #1a2540",
                background: "#0d1829",
                padding: "20px",
                marginBottom: 20,
              }}
            >
              {/* File icon + name */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(34,211,238,0.1))",
                    border: "1px solid rgba(59,130,246,0.2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    flexShrink: 0,
                  }}
                >
                  {getFileIcon(share.file.mime_type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: "#e2e8f0",
                      fontSize: 14,
                      fontWeight: 600,
                      wordBreak: "break-word",
                      lineHeight: 1.4,
                    }}
                  >
                    {share.file.original_name ?? "Shared file"}
                  </div>
                  <div style={{ color: "#475569", fontSize: 11, marginTop: 4 }}>
                    {share.file.mime_type ?? "Unknown type"}
                  </div>
                </div>
              </div>

              {/* Metadata rows */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <span style={{ color: "#475569", fontSize: 11 }}>Size</span>
                  <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500 }}>
                    {formatBytes(share.file.size ?? 0)}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  <span style={{ color: "#475569", fontSize: 11 }}>Downloads</span>
                  <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500 }}>
                    {share.download_count ?? 0}
                  </span>
                </div>

                {share.expires_at && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "rgba(251,191,36,0.04)",
                      border: "1px solid rgba(251,191,36,0.1)",
                    }}
                  >
                    <span style={{ color: "#92400e", fontSize: 11 }}>Expires</span>
                    <span style={{ color: "#fbbf24", fontSize: 12, fontWeight: 500 }}>
                      {new Date(share.expires_at).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Download button ────────────────────────────────────────── */}
            <button
              id="public-share-download-btn"
              type="button"
              onClick={handleDownload}
              disabled={downloadLoading}
              aria-label="Download shared file"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "13px 20px",
                borderRadius: 12,
                background: downloadLoading
                  ? "rgba(59,130,246,0.4)"
                  : "linear-gradient(135deg, #3b82f6, #22d3ee)",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                border: "none",
                boxShadow: downloadLoading
                  ? "none"
                  : "0 4px 20px rgba(59,130,246,0.35)",
                cursor: downloadLoading ? "not-allowed" : "pointer",
                transition: "opacity 0.2s, transform 0.15s, background 0.2s",
                opacity: downloadLoading ? 0.75 : 1,
              }}
              onMouseEnter={(e) => {
                if (!downloadLoading) {
                  (e.currentTarget as HTMLButtonElement).style.opacity = "0.9";
                  (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.opacity = downloadLoading ? "0.75" : "1";
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
              }}
            >
              {downloadLoading ? (
                <>
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Checking link...
                </>
              ) : (
                <>⬇ Download File</>
              )}
            </button>

            <p
              style={{
                textAlign: "center",
                color: "#334155",
                fontSize: 11,
                marginTop: 14,
              }}
            >
              Shared via NimbusDrive · Link ini bersifat publik
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
