import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { PublicShareErrorState } from "./public-share/components/PublicShareErrorState";
import { PublicShareLoadingState } from "./public-share/components/PublicShareLoadingState";
import { formatBytes, getFileIcon } from "./public-share/publicShareFormatters";

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
  requires_password?: boolean;
};

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
  const [password, setPassword] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // ── download handler state ───────────────────────────────────────────────
  /** true while we are validating + downloading */
  const [downloadLoading, setDownloadLoading] = useState(false);

  // ── initial load ─────────────────────────────────────────────────────────
  async function loadShare(passwordValue?: string, isCancelled?: () => boolean) {
    const cancelled = () => isCancelled?.() ?? false;

    if (cancelled()) return;
    setLoading(true);
    if (cancelled()) return;
    setErrorMessage("");
    if (cancelled()) return;
    setPasswordError("");
    if (cancelled()) return;
    setShare(null);

    try {
      if (!token) {
        if (!cancelled()) {
          setErrorMessage("Share link tidak ditemukan.");
          setLoading(false);
        }
        return;
      }

      const params = passwordValue ? { password: passwordValue } : undefined;

      const res = await axios.get(`${apiBase}/share/${token}`, {
        headers: { Accept: "application/json" },
        params,
      });

      const payload = res.data;
      const data: ShareData = payload?.data ?? payload;
      const requiresPassword = Boolean(data?.requires_password);

      if (cancelled()) return;
      setPasswordRequired(requiresPassword);
      if (cancelled()) return;
      setPassword(passwordValue ?? "");
      if (cancelled()) return;
      setShare(data);
    } catch (e: any) {
      if (cancelled()) return;
      const status = getErrorStatus(e);
      const requiresPassword = Boolean(e?.response?.data?.requires_password);

      if (status === 404) {
        setErrorMessage("Share link tidak ditemukan.");
        setPasswordRequired(false);
      } else if (status === 410) {
        setErrorMessage("Share link sudah kedaluwarsa.");
        setPasswordRequired(false);
      } else if (requiresPassword) {
        setPasswordRequired(true);
        setPasswordError("Password diperlukan untuk membuka tautan ini.");
      } else {
        setPasswordRequired(false);
        setErrorMessage(getErrorMessage(e, "Gagal memuat share link."));
      }
    } finally {
      if (cancelled()) return;
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setPasswordRequired(false);
      setPassword("");
      setPasswordError("");
      await loadShare(undefined, () => cancelled);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!token || passwordLoading) return;

    setPasswordLoading(true);
    setPasswordError("");
    setErrorMessage("");

    try {
      await loadShare(password);
    } catch {
      // loadShare already handles state updates
    } finally {
      setPasswordLoading(false);
    }
  }

  function handleRetry() {
    if (loading) return;
    loadShare();
  }

  // ── handleDownload ────────────────────────────────────────────────────────
  /**
   * Re-validates the share token with the backend FIRST.
   * Only proceeds to download if the token is still valid.
   * This ensures that if the link was deleted in another tab,
   * clicking Download shows an error instead of downloading.
   */
  async function handleDownload() {
    if (!token || downloadLoading) return;

    if (share?.requires_password && !password.trim()) {
      setPasswordRequired(true);
      setPasswordError("Password diperlukan untuk mengunduh file ini.");
      return;
    }

    setDownloadLoading(true);
    setErrorMessage(""); // clear any previous inline error

    try {
      const params = share?.requires_password ? { password } : undefined;
      const downloadUrl = new URL(`${apiBase}/share/${token}/download`);
      if (params) {
        downloadUrl.searchParams.set("password", password);
      }

      // Step 1: re-check token is still valid
      await axios.get(`${apiBase}/share/${token}`, {
        headers: { Accept: "application/json" },
        params,
      });

      // Step 2: token valid — trigger download
      // Use window.location.href so the browser handles the binary response
      // (avoids loading the whole file into JS memory for large files).
      window.location.href = downloadUrl.toString();

    } catch (e: any) {
      const status = getErrorStatus(e);
      const requiresPassword = Boolean(e?.response?.data?.requires_password);

      // Invalidate the displayed share card so the Download button is hidden
      setShare(null);

      if (status === 404) {
        setErrorMessage("Share link tidak ditemukan.");
        setPasswordRequired(false);
      } else if (status === 410) {
        setErrorMessage("Share link sudah kedaluwarsa.");
        setPasswordRequired(false);
      } else if (requiresPassword) {
        setPasswordRequired(true);
        setPasswordError("Password salah atau diperlukan untuk mengunduh file ini.");
      } else {
        setErrorMessage(getErrorMessage(e, "Gagal memvalidasi share link."));
      }
    } finally {
      setDownloadLoading(false);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  const isInvalid = !loading && !!errorMessage && !passwordRequired && !share?.file;

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
        {loading ? <PublicShareLoadingState /> : null}

        {/* ── Error state ───────────────────────────────────────────────── */}
        {!loading && errorMessage ? (
          <PublicShareErrorState
            title={
              <>
                ⚠️{" "}
                {errorMessage === "Share link tidak ditemukan."
                  ? "Link Tidak Ditemukan"
                  : errorMessage === "Share link sudah kedaluwarsa."
                    ? "Link Kedaluwarsa"
                    : "Terjadi Kesalahan"}
              </>
            }
            message={errorMessage}
            onRetry={handleRetry}
          />
        ) : null}

        {!loading && passwordRequired && !share?.file ? (
          <div
            style={{
              borderRadius: 14,
              border: "1px solid rgba(59,130,246,0.2)",
              background: "rgba(59,130,246,0.08)",
              padding: "20px",
            }}
          >
            <div style={{ color: "#e2e8f0", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              Tautan ini dilindungi password
            </div>
            <div style={{ color: "#94a3b8", fontSize: 12, lineHeight: 1.5, marginBottom: 14 }}>
              Masukkan password untuk melihat file dan mengunduhnya.
            </div>
            <form onSubmit={handleSubmitPassword}>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                placeholder="Password"
                autoComplete="current-password"
                style={{
                  width: "100%",
                  borderRadius: 10,
                  border: "1px solid #1a2540",
                  background: "#0d1829",
                  color: "#e2e8f0",
                  padding: "10px 12px",
                  marginBottom: 10,
                  fontSize: 13,
                }}
              />
              <button
                type="submit"
                disabled={passwordLoading}
                style={{
                  width: "100%",
                  borderRadius: 10,
                  background: passwordLoading ? "rgba(59,130,246,0.45)" : "linear-gradient(135deg, #3b82f6, #22d3ee)",
                  color: "#fff",
                  border: "none",
                  padding: "10px 12px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: passwordLoading ? "not-allowed" : "pointer",
                }}
              >
                {passwordLoading ? "Memeriksa password..." : "Buka tautan"}
              </button>
            </form>
            {passwordError ? (
              <div style={{ color: "#f87171", fontSize: 12, marginTop: 10 }}>
                {passwordError}
              </div>
            ) : null}
          </div>
        ) : null}

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
