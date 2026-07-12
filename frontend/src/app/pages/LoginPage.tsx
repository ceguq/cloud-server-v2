import { useState, useEffect, useMemo } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { authService } from "../../services/authService";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { LoginBrandLogo } from "./login/LoginBrandLogo";
import { LoginErrorMessage } from "./login/LoginErrorMessage";
import { LoginSocialIcons } from "./login/LoginSocialIcons";

type LoginPageProps = {
  onLoginSuccess: () => void;
};

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  // --- Existing login logic (preserved) ---
  const [email, setEmail] = useState("admin@nimbusdrive.local");
  const [password, setPassword] = useState("admin123456");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // --- UI mode only ---
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // --- Register UI preview state (no backend call) ---
  const [regUsername, setRegUsername] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regShowPassword, setRegShowPassword] = useState(false);

  // Theme helpers for Login page
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
    if (theme === "dark" || theme === "light") return theme;
    try {
      const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
      return mq?.matches ? "dark" : "light";
    } catch {
      return "dark";
    }
  }

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveAppearanceTheme(safeReadAppearanceTheme()));
  const [accentColor, setAccentColor] = useState<string>(() => safeReadAccentColor());

  useEffect(() => {
    const syncThemeFromStorage = () => {
      const t = safeReadAppearanceTheme();
      setAccentColor(safeReadAccentColor());
      setResolvedTheme(resolveAppearanceTheme(t));
    };

    syncThemeFromStorage();
    if (typeof window === "undefined") return undefined;
    window.addEventListener("nimbus-appearance-change", syncThemeFromStorage);
    window.addEventListener("storage", syncThemeFromStorage);
    window.addEventListener("focus", syncThemeFromStorage);
    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia?.("(prefers-color-scheme: dark)") ?? null;
      mq?.addEventListener?.("change", syncThemeFromStorage);
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener("nimbus-appearance-change", syncThemeFromStorage);
      window.removeEventListener("storage", syncThemeFromStorage);
      window.removeEventListener("focus", syncThemeFromStorage);
      mq?.removeEventListener?.("change", syncThemeFromStorage);
    };
  }, []);

  const loginColors = useMemo(() => {
    if (resolvedTheme === "light") {
      return {
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
        rowHoverBg: "#f8fafc",
      };
    }

    return {
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
      rowHoverBg: "#111c2f",
    };
  }, [resolvedTheme]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const data = await authService.login(email, password);

      localStorage.setItem("nimbus_token", data.token);
      localStorage.setItem("nimbus_user", JSON.stringify(data.user));

      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.email?.[0] ||
          "Login gagal.",
      );
    } finally {
      setLoading(false);
    }
  }

  function toggleMode(next: boolean) {
    setIsRegisterMode(next);
    // Keep existing login error/loading behavior intact.
  }

  function renderTextInput({
    icon,
    label,
    type,
    value,
    onChange,
    placeholder,
    autoComplete,
    tabIndex,
  }: {
    icon: React.ReactNode;
    label: string;
    type: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    autoComplete: string;
    tabIndex?: number;
  }) {
    return (
      <label className="relative block">
        <span className="sr-only">{label}</span>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: loginColors.muted }}>
          {icon}
        </span>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          tabIndex={tabIndex}
          className="h-11 w-full rounded-full px-11 text-sm outline-none transition"
          style={{
            background: loginColors.inputBg,
            border: `1px solid ${loginColors.inputBorder}`,
            color: loginColors.inputText,
            paddingLeft: 44,
            caretColor: accentColor,
          }}
        />
      </label>
    );
  }

  function renderPasswordInput({
    label,
    value,
    onChange,
    showValue,
    onToggle,
    autoComplete,
    tabIndex,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    showValue: boolean;
    onToggle: () => void;
    autoComplete: string;
    tabIndex?: number;
  }) {
    return (
      <label className="relative block">
        <span className="sr-only">{label}</span>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: loginColors.muted }}>
          <Lock size={16} />
        </span>
        <input
          type={showValue ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Password"
          autoComplete={autoComplete}
          tabIndex={tabIndex}
          className="h-11 w-full rounded-full px-11 pr-12 text-sm outline-none transition"
          style={{
            background: loginColors.inputBg,
            border: `1px solid ${loginColors.inputBorder}`,
            color: loginColors.inputText,
            paddingLeft: 44,
            caretColor: accentColor,
          }}
        />
        <button
          type="button"
          aria-label={showValue ? "Sembunyikan password" : "Lihat password"}
          title={showValue ? "Sembunyikan password" : "Lihat password"}
          onClick={onToggle}
          tabIndex={tabIndex}
          className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition focus:outline-none"
          style={{ color: loginColors.muted }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = accentColor)}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = loginColors.muted)}
        >
          {showValue ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </label>
    );
  }

  function renderLoginForm(isInteractive: boolean) {
    const tabIndex = isInteractive ? undefined : -1;

    return (
      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-[300px]">
        <h1 className="text-center text-3xl font-semibold tracking-normal" style={{ color: loginColors.title }}>
          Login
        </h1>
        <div className="mt-5">
          <LoginSocialIcons />
        </div>
        <p className="mt-4 text-center text-xs" style={{ color: loginColors.muted }}>
          or use your account
        </p>

        <div className="mt-5 space-y-3">
          {renderTextInput({
            icon: <Mail size={16} />,
            label: "Username or Email",
            type: "text",
            value: email,
            onChange: setEmail,
            placeholder: "Username or Email",
            autoComplete: "email",
            tabIndex,
          })}

          {renderPasswordInput({
            label: "Password",
            value: password,
            onChange: setPassword,
            showValue: showPassword,
            onToggle: () => setShowPassword((current) => !current),
            autoComplete: "current-password",
            tabIndex,
          })}
        </div>

        {error ? <LoginErrorMessage message={error} /> : null}

        <div
          className="mx-auto mt-4 block text-xs"
          style={{ color: loginColors.muted, opacity: 0.9 }}
        >
          Password recovery is not available yet
        </div>

        <button
          type="submit"
          disabled={loading}
          tabIndex={tabIndex}
          className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold uppercase tracking-wide shadow-[0_12px_30px_rgba(0,0,0,0.12)] transition"
          style={{
            background: loading ? loginColors.buttonSoftBg : `linear-gradient(135deg, ${accentColor}, #22d3ee)`,
            color: loading ? loginColors.muted2 : "#fff",
            boxShadow: loading ? undefined : `${accentColor}33 0 12px 30px`,
          }}
        >
          {loading ? (
            <>
              <LoadingSpinner size={14} color={loading ? loginColors.muted2 : "#fff"} />
              Masuk...
            </>
          ) : (
            "LOGIN"
          )}
        </button>
      </form>
    );
  }

  function renderRegisterForm(isInteractive: boolean) {
    const tabIndex = isInteractive ? undefined : -1;

    return (
      <form
        onSubmit={(event) => event.preventDefault()}
        className="mx-auto w-full max-w-[300px]"
      >
        <h1 className="text-center text-3xl font-semibold tracking-normal text-white">
          Registration
        </h1>
        <div className="mt-5">
          <LoginSocialIcons />
        </div>
        <p className="mt-4 text-center text-xs text-blue-100/55">
          or use your email for registration
        </p>

        <div className="mt-5 space-y-3">
          {renderTextInput({
            icon: <User size={16} />,
            label: "Username",
            type: "text",
            value: regUsername,
            onChange: setRegUsername,
            placeholder: "Username",
            autoComplete: "username",
            tabIndex,
          })}

          {renderTextInput({
            icon: <Mail size={16} />,
            label: "Email",
            type: "email",
            value: regEmail,
            onChange: setRegEmail,
            placeholder: "Email",
            autoComplete: "email",
            tabIndex,
          })}

          {renderPasswordInput({
            label: "Password",
            value: regPassword,
            onChange: setRegPassword,
            showValue: regShowPassword,
            onToggle: () => setRegShowPassword((current) => !current),
            autoComplete: "new-password",
            tabIndex,
          })}
        </div>

        <button
          type="button"
          tabIndex={tabIndex}
          title="Registration UI preview only"
          className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 px-5 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_12px_30px_rgba(59,130,246,0.28)] transition hover:brightness-110"
        >
          REGISTER
        </button>
      </form>
    );
  }

  function renderWelcomePanel(kind: "register" | "login") {
    const isLoginPanel = kind === "login";

    return (
      <div className="flex h-full flex-col items-center justify-center bg-[linear-gradient(135deg,#2563eb_0%,#3b82f6_48%,#22d3ee_100%)] px-10 text-center text-white">
        <div className="max-w-[280px]">
          <div className="mb-7">
            <LoginBrandLogo />
          </div>
          <h2 className="text-3xl font-semibold tracking-normal">
            {isLoginPanel ? "Welcome Back!" : "Hello, Welcome!"}
          </h2>
          <p className="mt-4 text-sm leading-6 text-white/82">
            {isLoginPanel
              ? "Already have an account? Sign in and continue your cloud workspace."
              : "Don't have an account? Register and start your private cloud journey."}
          </p>
          <div
            className="mt-7 h-11 min-w-[150px] rounded-full border border-white/55 bg-white/10 px-7 text-sm font-semibold uppercase tracking-wide text-white/60 flex items-center justify-center"
            style={{ cursor: "default" }}
          >
            Registration is not available yet
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden overflow-y-auto px-4 py-6 sm:py-8" style={{ background: loginColors.pageBg, color: loginColors.title }}>
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(circle_at_18%_12%,${accentColor}22,transparent 30%),radial-gradient(circle_at_78%_80%,#22d3ee14,transparent 35%),linear-gradient(145deg,${loginColors.pageBg} 0%,${loginColors.pageBg} 100%)` }} />

      <div className="relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-[860px] flex-col items-center justify-center sm:min-h-[calc(100vh-4rem)]">
        <style>{`
          .nimbus-logo-float {
            animation: nimbusFloat 4s ease-in-out infinite;
          }

          @keyframes nimbusFloat {
            0%, 100% { transform: translateY(0); filter: drop-shadow(0 0 0 rgba(59,130,246,0)); }
            50% { transform: translateY(-4px); filter: drop-shadow(0 0 22px rgba(34,211,238,0.35)); }
          }

          .auth-form-panel,
          .auth-overlay-panel {
            transition:
              opacity 520ms ease,
              transform 820ms cubic-bezier(0.16, 1, 0.3, 1),
              translate 820ms cubic-bezier(0.16, 1, 0.3, 1);
            will-change: opacity, transform, translate;
          }

          .auth-mobile-card {
            animation: authMobileCard 420ms cubic-bezier(0.16, 1, 0.3, 1) both;
          }

          @keyframes authMobileCard {
            from { opacity: 0; transform: translateX(22px); }
            to { opacity: 1; transform: translateX(0); }
          }

          @media (prefers-reduced-motion: reduce) {
            .nimbus-logo-float {
              animation: none;
            }

            .auth-form-panel,
            .auth-overlay-panel {
              transition: none;
            }

            .auth-mobile-card {
              animation: none;
            }
          }
        `}</style>

        <section
          className="relative hidden h-[540px] w-full max-w-[820px] overflow-hidden rounded-3xl md:block"
          aria-label="Authentication panel"
          style={{ border: `1px solid ${loginColors.border}`, background: loginColors.cardBg, boxShadow: `0 26px 80px rgba(0,0,0,0.18)` }}
        >
          <div className="absolute inset-0" style={{ background: `linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))` }} />

          <div
            aria-hidden={isRegisterMode}
            className={`auth-form-panel absolute left-0 top-0 z-10 flex h-full w-1/2 items-center justify-center px-10 py-8 transform-gpu ${
              isRegisterMode
                ? "pointer-events-none -translate-x-14 opacity-0"
                : "pointer-events-auto translate-x-0 opacity-100"
            }`}
            style={{ background: loginColors.cardBg }}
          >
            {renderLoginForm(!isRegisterMode)}
          </div>

          <div
            aria-hidden={!isRegisterMode}
            className={`auth-form-panel absolute right-0 top-0 z-10 flex h-full w-1/2 items-center justify-center px-10 py-8 transform-gpu ${
              isRegisterMode
                ? "pointer-events-auto translate-x-0 opacity-100"
                : "pointer-events-none translate-x-14 opacity-0"
            }`}
            style={{ background: loginColors.cardBg }}
          >
            {renderRegisterForm(isRegisterMode)}
          </div>

          <div
            className={`auth-overlay-panel absolute left-0 top-0 z-20 h-full w-1/2 overflow-hidden transform-gpu ${
              isRegisterMode ? "translate-x-0" : "translate-x-full"
            }`}
            style={{ background: `linear-gradient(135deg, ${accentColor}, #22d3ee)` }}
          >
            {renderWelcomePanel(isRegisterMode ? "login" : "register")}
          </div>
        </section>

        <section
          className="w-full max-w-[420px] overflow-hidden rounded-3xl md:hidden"
          aria-label="Authentication panel"
          style={{ border: `1px solid ${loginColors.border}`, background: loginColors.cardBg, boxShadow: `0 22px 70px rgba(0,0,0,0.18)` }}
        >
          <div className="px-6 py-6 text-center" style={{ background: `linear-gradient(135deg, ${accentColor} 0%, ${loginColors.cardBg} 52%, #22d3ee 100%)`, color: '#fff' }}>
            <div className="mb-5">
              <LoginBrandLogo />
            </div>
            <h2 className="text-2xl font-semibold tracking-normal">
              {isRegisterMode ? "Welcome Back!" : "Hello, Welcome!"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/82">
              {isRegisterMode
                ? "Already have an account? Sign in and continue your cloud workspace."
                : "Don't have an account? Register and start your private cloud journey."}
            </p>
            <div
              className="mt-5 h-10 min-w-[140px] rounded-full border border-white/55 bg-white/10 px-6 text-xs font-semibold uppercase tracking-wide text-white/60 flex items-center justify-center"
              style={{ cursor: "default" }}
            >
              Registration is not available yet
            </div>
          </div>

          <div className="bg-[#0f1729] px-6 py-7">
            {isRegisterMode ? (
              <div key="register-mobile" className="auth-mobile-card">
                {renderRegisterForm(true)}
              </div>
            ) : (
              <div key="login-mobile" className="auth-mobile-card">
                {renderLoginForm(true)}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
