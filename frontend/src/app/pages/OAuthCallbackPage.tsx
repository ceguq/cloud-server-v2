import { useEffect, useRef, useState } from "react";
import { authService } from "../../services/authService";
import { LoadingSpinner } from "../components/LoadingSpinner";

type OAuthCallbackPageProps = {
  onLoginSuccess: () => void;
};

type CallbackState =
  | { status: "processing"; message: string }
  | { status: "error"; message: string };

export function OAuthCallbackPage({
  onLoginSuccess,
}: OAuthCallbackPageProps) {
  const hasStartedRef = useRef(false);
  const [state, setState] = useState<CallbackState>({
    status: "processing",
    message: "Menyelesaikan login...",
  });

  useEffect(() => {
    if (hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    const code = params.get("code");

    window.history.replaceState({}, "", "/auth/oauth/callback");

    const oauthErrorMessages: Record<string, string> = {
      oauth_cancelled: "Login dibatalkan.",
      oauth_state_invalid:
        "Sesi login tidak valid atau sudah kedaluwarsa. Silakan mulai login kembali.",
      oauth_account_conflict:
        "Akun ini sudah terhubung dengan akun provider lain.",
      oauth_email_unavailable:
        "Provider tidak memberikan email terverifikasi yang dapat digunakan.",
      oauth_temporarily_unavailable:
        "Layanan login sementara tidak tersedia. Silakan coba kembali.",
      oauth_failed: "Login melalui provider gagal. Silakan coba kembali.",
    };

    if (oauthError) {
      const message = oauthErrorMessages[oauthError] ??
        "Login melalui provider gagal. Silakan coba kembali.";
      setState({ status: "error", message });
      return;
    }

    if (!code || code.trim() === "") {
      setState({
        status: "error",
        message: "Kode login tidak ditemukan. Silakan mulai login kembali.",
      });
      return;
    }

    (async () => {
      try {
        const data = await authService.exchangeOAuthCode(code);

        if (
          !data ||
          typeof data.token !== "string" ||
          data.token.trim() === "" ||
          !data.user ||
          typeof data.user !== "object"
        ) {
          throw new Error("Respons login OAuth tidak valid.");
        }

        localStorage.setItem("nimbus_token", data.token);
        localStorage.setItem(
          "nimbus_user",
          JSON.stringify(data.user),
        );

        onLoginSuccess();
      } catch (error: unknown) {
        const message =
          (error as any)?.response?.data?.message ||
          "Login melalui provider gagal. Silakan mulai kembali.";

        setState({ status: "error", message });
      }
    })();
  }, [onLoginSuccess]);

  if (state.status === "processing") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0f14",
          color: "#e5e7eb",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "#111827",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            textAlign: "center",
          }}
          aria-live="polite"
        >
          <LoadingSpinner />
          <div style={{ marginTop: 16, fontWeight: 600 }}>
            {state.message}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b0f14",
        color: "#e5e7eb",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#111827",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        }}
        aria-live="polite"
      >
        <h2 style={{ margin: 0, fontSize: 20 }}>Login Gagal</h2>
        <div style={{ marginTop: 12, color: "#cbd5e1" }}>
          {state.message}
        </div>
        <div style={{ marginTop: 18 }}>
          <button
            type="button"
            onClick={() => window.location.assign("/" )}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              background: "#2563eb",
              color: "white",
              fontWeight: 700,
            }}
          >
            Kembali ke Login
          </button>
        </div>
      </div>
    </div>
  );
}
