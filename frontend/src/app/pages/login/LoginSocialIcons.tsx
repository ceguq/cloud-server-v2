import { Github } from "lucide-react";
import api from "../../../services/api";

type OAuthProvider = "google" | "github";

type LoginSocialIconsProps = {
  className?: string;
};

export function LoginSocialIcons({ className }: LoginSocialIconsProps) {
  const iconClass = "h-4 w-4";
  const buttonClass =
    "flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-slate-200 transition hover:border-blue-300/40 hover:bg-white/[0.08]";

  function buildOAuthUrl(provider: OAuthProvider): string {
    const configuredBaseUrl = api.defaults.baseURL;


    if (
      typeof configuredBaseUrl !== "string" ||
      configuredBaseUrl.trim() === ""
    ) {
      throw new Error("Backend API URL is not configured.");
    }

    const url = new URL(configuredBaseUrl, window.location.origin);

    let backendPath = url.pathname.replace(/\/+$/, "");

    if (backendPath.endsWith("/api")) {
      backendPath = backendPath.slice(0, -4);
    }

    url.pathname = `${backendPath}/auth/oauth/${provider}`.replace(
      /\/{2,}/g,
      "/",
    );

    url.search = "";
    url.hash = "";

    return url.toString();
  }

  function startOAuth(provider: OAuthProvider): void {
    window.location.assign(buildOAuthUrl(provider));
  }


  return (
    <div
      className={[
        "flex items-center justify-center gap-3",
        className,
      ].filter(Boolean).join(" ")}
    >
      <button
        type="button"
        className={buttonClass}
        aria-label="Login dengan Google"
        title="Login dengan Google"
        onClick={() => startOAuth("google")}
      >
        <span className="text-sm font-semibold leading-none">G</span>
      </button>
      <button
        type="button"
        className={buttonClass}
        aria-label="Login dengan GitHub"
        title="Login dengan GitHub"
        onClick={() => startOAuth("github")}
      >
        <Github className={iconClass} />
      </button>
    </div>
  );
}
