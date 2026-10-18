import { useCallback, useEffect, useRef, useState } from "react";
import { isAxiosError } from "axios";
import {
  authService,
  type AuthMeUser,
  type ConnectedProvider,
} from "../../../../services/authService";

type ConnectedAccountsPanelProps = {
  user: Pick<AuthMeUser, "has_local_password" | "connected_providers"> | null;
  textColor: string;
  mutedColor: string;
  panelBg: string;
  panelBorder: string;
  onUserUpdated: (user: Partial<AuthMeUser>) => void;
};

const callbackErrorMessages: Record<string, string> = {
  oauth_cancelled: "Provider connection was cancelled.",
  oauth_state_invalid:
    "The connection request expired or was already used. Please try again.",
  oauth_link_conflict:
    "This provider identity is already connected to another account, or a different identity for this provider is connected.",
  oauth_email_unavailable:
    "The provider did not return a verified email address.",
  oauth_temporarily_unavailable:
    "Provider connection is temporarily unavailable. Please try again.",
  oauth_link_failed: "The provider could not be connected. Please try again.",
};

function errorMessage(error: unknown): string {
  if (isAxiosError<{ message?: unknown }>(error)) {
    const message = error.response?.data?.message;

    if (typeof message === "string" && message.trim() !== "") {
      return message;
    }
  }

  return "The request could not be completed. Please try again.";
}

export function ConnectedAccountsPanel({
  user,
  textColor,
  mutedColor,
  panelBg,
  panelBorder,
  onUserUpdated,
}: ConnectedAccountsPanelProps) {
  const [pendingProvider, setPendingProvider] = useState<ConnectedProvider | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const handledCallbackRef = useRef(false);

  const refreshUser = useCallback(async () => {
    const response = await authService.me();
    onUserUpdated(response.user);
  }, [onUserUpdated]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("oauth_link");

    if (!result || handledCallbackRef.current) {
      return;
    }

    handledCallbackRef.current = true;
    window.history.replaceState({}, "", window.location.pathname + window.location.hash);

    if (result !== "success") {
      const reason = params.get("reason") ?? "";
      setError(
        callbackErrorMessages[reason] ??
          "The provider could not be connected. Please try again.",
      );
      return;
    }

    const provider = params.get("provider");
    setSuccess(
      provider === "github"
        ? "GitHub connected."
        : provider === "google"
          ? "Google connected."
          : "Provider connected.",
    );

    void refreshUser().catch(() => {
      setError("The provider was connected, but account status could not be refreshed.");
    });
  }, [refreshUser]);

  const handleConnect = async (provider: ConnectedProvider) => {
    setPendingProvider(provider);
    setError(null);
    setSuccess(null);

    try {
      const response = await authService.startProviderLink(provider);

      if (
        typeof response.authorization_url !== "string" ||
        response.authorization_url.trim() === ""
      ) {
        throw new Error("The provider authorization URL is missing.");
      }

      window.location.assign(response.authorization_url);
    } catch (requestError) {
      setError(errorMessage(requestError));
      setPendingProvider(null);
    }
  };

  const handleDisconnect = async (provider: ConnectedProvider) => {
    setPendingProvider(provider);
    setError(null);
    setSuccess(null);

    try {
      const response = await authService.unlinkProvider(provider);
      onUserUpdated(response.user);
      setSuccess(`${provider === "github" ? "GitHub" : "Google"} disconnected.`);

      try {
        await refreshUser();
      } catch {
        setError("The provider was disconnected, but account status could not be refreshed.");
      }
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setPendingProvider(null);
    }
  };

  const connectedProviders = user?.connected_providers ?? [];
  const hasLocalPassword = user?.has_local_password ?? false;

  const renderProvider = (provider: ConnectedProvider, label: string) => {
    const connected = connectedProviders.includes(provider);
    const pending = pendingProvider === provider;

    return (
      <div
        key={provider}
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="text-xs font-medium" style={{ color: textColor }}>
            {label}
          </span>
          <span
            className="rounded-lg px-3 py-1.5 text-xs"
            style={{
              background: panelBg,
              color: mutedColor,
              border: `1px solid ${panelBorder}`,
            }}
          >
            {connected ? "Connected" : "Not connected"}
          </span>
        </div>
        <button
          type="button"
          disabled={pendingProvider !== null}
          onClick={() =>
            connected
              ? void handleDisconnect(provider)
              : void handleConnect(provider)
          }
          className="rounded-lg px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            color: textColor,
            background: panelBg,
            border: `1px solid ${panelBorder}`,
          }}
        >
          {pending ? "Working..." : connected ? "Disconnect" : "Connect"}
        </button>
      </div>
    );
  };

  return (
    <div
      className="mb-4 rounded-xl p-5"
      style={{ background: panelBg, border: `1px solid ${panelBorder}` }}
    >
      <h3 className="mb-2 text-sm font-semibold" style={{ color: textColor }}>
        Connected Accounts
      </h3>

      <div className="mt-3 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs" style={{ color: textColor }}>
            Local Password
          </span>
          <span
            className="rounded-lg px-3 py-1.5 text-xs"
            style={{
              background: panelBg,
              color: mutedColor,
              border: `1px solid ${panelBorder}`,
            }}
          >
            {hasLocalPassword ? "Enabled" : "Not enabled"}
          </span>
        </div>

        {renderProvider("google", "Google")}
        {renderProvider("github", "GitHub")}
      </div>

      {(error || success) && (
        <div
          className={`mt-3 text-xs ${error ? "text-red-400" : "text-green-400"}`}
          role={error ? "alert" : "status"}
        >
          {error ?? success}
        </div>
      )}
    </div>
  );
}
