import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { CheckCircle2, HardDrive, LoaderCircle, Trash2, XCircle } from "lucide-react";
import {
  disconnectGDriveAccount,
  getGDriveAccounts,
  removeRevokedGDriveAccount,
  type GDriveAccount,
} from "../../../services/gdriveService";
import { SettingsSectionHeader } from "./components/SettingsSectionHeader";
import { InlineErrorMessage } from "../gdrive/components/InlineErrorMessage";

type GoogleDriveIntegrationsPanelProps = {
  cardBg: string;
  panelBg: string;
  panelBorder: string;
  borderColor: string;
  titleColor: string;
  textColor: string;
  mutedColor: string;
  accentColor: string;
  resolvedTheme: "dark" | "light";
};

function getRequestError(error: unknown): string {
  if (isAxiosError<{ message?: unknown }>(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim() !== "") return message;
  }

  return "The Google Drive request could not be completed. Please try again.";
}

export function GoogleDriveIntegrationsPanel({
  cardBg,
  panelBg,
  panelBorder,
  borderColor,
  titleColor,
  textColor,
  mutedColor,
  accentColor,
  resolvedTheme,
}: GoogleDriveIntegrationsPanelProps) {
  const [accounts, setAccounts] = useState<GDriveAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingAccount, setPendingAccount] = useState<GDriveAccount | null>(null);
  const [workingAccountId, setWorkingAccountId] = useState<string | null>(null);

  const refreshAccounts = useCallback(async () => {
    const response = await getGDriveAccounts();
    setAccounts(response.data);
  }, []);

  useEffect(() => {
    let mounted = true;

    void getGDriveAccounts()
      .then((response) => {
        if (mounted) {
          setAccounts(response.data);
          setLoadError(null);
        }
      })
      .catch((error: unknown) => {
        if (mounted) setLoadError(getRequestError(error));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const closeDialog = () => {
    if (workingAccountId) return;
    setPendingAccount(null);
    setRequestError(null);
  };

  const handleConfirmRemove = async () => {
    const account = pendingAccount;
    if (!account || workingAccountId) return;

    setWorkingAccountId(account.id);
    setRequestError(null);
    setSuccess(null);

    try {
      if (account.is_connected) {
        await disconnectGDriveAccount(account.id);
        setAccounts((current) =>
          current.map((item) =>
            item.id === account.id
              ? {
                  ...item,
                  is_connected: false,
                  is_revoked: true,
                  status: "revoked",
                  revoked_at: new Date().toISOString(),
                }
              : item,
          ),
        );
        setSuccess("Google Drive connection disconnected from CenimBox.");
      } else {
        await removeRevokedGDriveAccount(account.id);
        setAccounts((current) => current.filter((item) => item.id !== account.id));
        setSuccess("Google Drive connection removed from CenimBox.");
      }

      setPendingAccount(null);

      try {
        await refreshAccounts();
      } catch {
        setRequestError(
          "The Google Drive connection was updated, but its status could not be refreshed.",
        );
      }
    } catch (error: unknown) {
      setRequestError(getRequestError(error));
    } finally {
      setWorkingAccountId(null);
    }
  };

  const headingDescription =
    "Manage existing Google Drive connections. To connect or reconnect an account, use the Google Drive page.";

  return (
    <div>
      <SettingsSectionHeader
        title="Integrations"
        description={headingDescription}
        textColor={titleColor}
        mutedColor={mutedColor}
        className="mb-5"
      />

      {loadError ? (
        <InlineErrorMessage message={loadError} className="mb-4" role="alert" />
      ) : null}

      {loading ? (
        <div className="rounded-xl p-5 text-sm" style={{ background: cardBg, color: mutedColor }}>
          Loading Google Drive connections...
        </div>
      ) : accounts.length === 0 ? (
        <div
          className="rounded-xl border p-5 text-sm"
          style={{ background: cardBg, borderColor, color: mutedColor }}
        >
          No Google Drive connections. Use the{" "}
          <a href="/gdrive" className="font-medium underline" style={{ color: accentColor }}>
            Google Drive page
          </a>{" "}
          to connect an account.
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account) => {
            const connected = account.is_connected;
            const pending = workingAccountId === account.id;
            const accountName = account.label?.trim() || account.email || "Google Drive";
            const tokenExpired =
              account.token_expires_at !== null &&
              Date.parse(account.token_expires_at) < Date.now();
            const statusLabel = connected
              ? "Connected"
              : account.is_revoked
                ? "Revoked"
                : tokenExpired
                  ? "Expired"
                  : "Disconnected";
            const statusColor = connected ? "#22c55e" : "#f59e0b";

            return (
              <div
                key={account.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border p-5"
                style={{ background: cardBg, borderColor }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  {account.avatar_url ? (
                    <img
                      src={account.avatar_url}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                      style={{ background: panelBg, color: accentColor }}
                    >
                      <HardDrive size={17} />
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold" style={{ color: titleColor }}>
                      {accountName}
                    </div>
                    <div className="truncate text-xs" style={{ color: mutedColor }}>
                      {account.email}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs">
                      {connected ? (
                        <CheckCircle2 size={13} style={{ color: "#22c55e" }} />
                      ) : (
                        <XCircle size={13} style={{ color: "#f59e0b" }} />
                      )}
                      <span style={{ color: statusColor }}>{statusLabel}</span>
                    </div>
                    {!connected ? (
                      <div className="mt-1 text-xs" style={{ color: mutedColor }}>
                        This connection is no longer authorized.
                      </div>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={workingAccountId !== null}
                  onClick={() => {
                    setRequestError(null);
                    setSuccess(null);
                    setPendingAccount(account);
                  }}
                  className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-80 disabled:cursor-wait disabled:opacity-60"
                  style={{
                    background: panelBg,
                    borderColor: panelBorder,
                    color: "#ef4444",
                  }}
                >
                  {pending ? <LoaderCircle size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  {pending ? "Removing..." : "Remove connection"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {(requestError || success) && (
        <div
          className={`mt-3 text-xs ${requestError ? "text-red-400" : "text-green-400"}`}
          role={requestError ? "alert" : "status"}
        >
          {requestError ?? success}
        </div>
      )}

      {pendingAccount ? (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="settings-gdrive-remove-title"
          aria-describedby="settings-gdrive-remove-description"
          className="fixed inset-0 z-[100] flex items-center justify-center px-4"
          style={{
            background: resolvedTheme === "light" ? "rgba(15,23,42,0.35)" : "rgba(0,0,0,0.65)",
          }}
          onMouseDown={closeDialog}
        >
          <div
            className="w-full max-w-md rounded-2xl border p-6"
            style={{
              background: cardBg,
              borderColor,
              boxShadow: "0 22px 60px rgba(0,0,0,0.28)",
            }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="settings-gdrive-remove-title" className="text-sm font-semibold" style={{ color: titleColor }}>
              Remove Google Drive connection?
            </h2>
            <p id="settings-gdrive-remove-description" className="mt-2 text-xs" style={{ color: mutedColor }}>
              This removes the Google Drive connection from CenimBox. Your files in Google Drive will not be deleted.
            </p>

            {requestError ? (
              <InlineErrorMessage message={requestError} className="mt-4" role="alert" />
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-5">
              <button
                type="button"
                disabled={workingAccountId !== null}
                onClick={closeDialog}
                className="rounded-xl border px-3 py-2 text-xs font-medium disabled:opacity-60"
                style={{ background: panelBg, borderColor: panelBorder, color: textColor }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={workingAccountId !== null}
                onClick={() => void handleConfirmRemove()}
                className="flex items-center gap-2 rounded-xl border border-red-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-70"
                style={{ background: "#dc2626" }}
              >
                {workingAccountId ? <LoaderCircle size={13} className="animate-spin" /> : null}
                {workingAccountId ? "Removing..." : "Remove connection"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
