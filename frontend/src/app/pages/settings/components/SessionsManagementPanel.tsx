import { useCallback, useEffect, useState } from "react";
import {
  getSessions,
  revokeOtherSessions,
  revokeSession,
  type AuthenticatedSession,
} from "../../../../services/sessionService";

type SessionsManagementPanelProps = {
  cardBg: string;
  panelBg: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
};

function formatDate(value: string | null): string {
  if (!value) return "Not available";

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleString();
}

export function SessionsManagementPanel({
  cardBg,
  panelBg,
  borderColor,
  textColor,
  mutedColor,
}: SessionsManagementPanelProps) {
  const [sessions, setSessions] = useState<AuthenticatedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSessions(await getSessions());
    } catch {
      setError("Unable to load authenticated sessions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const handleRevoke = async (session: AuthenticatedSession) => {
    const confirmation = session.is_current
      ? "Revoke this session? You will be signed out."
      : "Revoke this session?";
    if (!window.confirm(confirmation)) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await revokeSession(session.id);
      if (session.is_current) {
        window.localStorage.removeItem("nimbus_token");
        window.localStorage.removeItem("nimbus_user");
        window.dispatchEvent(new CustomEvent("nimbus-user-change"));
        window.location.assign("/");
        return;
      }
      setSessions((current) => current.filter((item) => item.id !== session.id));
      setMessage("Session revoked.");
    } catch {
      setError("Unable to revoke this session.");
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeOthers = async () => {
    if (!window.confirm("Revoke all other sessions? This session will remain active.")) {
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const count = await revokeOtherSessions();
      setSessions((current) => current.filter((session) => session.is_current));
      setMessage(`${count} other session${count === 1 ? "" : "s"} revoked.`);
    } catch {
      setError("Unable to revoke other sessions.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="rounded-xl p-5 mb-4"
      style={{ background: cardBg, border: `1px solid ${borderColor}` }}
      aria-labelledby="active-sessions-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="active-sessions-heading" className="text-sm font-semibold" style={{ color: textColor }}>
            Active sessions
          </h3>
          <p className="mt-1 text-xs" style={{ color: mutedColor }}>
            Revoke authentication tokens. Device records are separate and removing a device does not revoke its sessions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleRevokeOthers()}
          disabled={busy || loading || !sessions.some((session) => !session.is_current)}
          className="rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
          style={{ color: textColor, background: panelBg, border: `1px solid ${borderColor}` }}
        >
          Revoke other sessions
        </button>
      </div>

      <p className="mt-3 text-xs" style={{ color: mutedColor }}>
        Device/browser and IP details are not linked to individual tokens yet. Session activity and creation times below come directly from Sanctum.
      </p>

      {loading ? (
        <p className="mt-4 text-xs" style={{ color: mutedColor }}>Loading sessions...</p>
      ) : error && sessions.length === 0 ? (
        <p role="alert" className="mt-4 text-xs text-red-400">{error}</p>
      ) : sessions.length === 0 ? (
        <p className="mt-4 text-xs" style={{ color: mutedColor }}>No active token sessions found.</p>
      ) : (
        <ul className="mt-4 divide-y" style={{ borderColor }}>
          {sessions.map((session) => (
            <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold" style={{ color: textColor }}>
                  <span>{session.name || "Sanctum session"}</span>
                  {session.is_current && (
                    <span className="rounded-full px-2 py-0.5" style={{ background: panelBg, color: mutedColor }}>
                      This session
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs" style={{ color: mutedColor }}>
                  Last active: {formatDate(session.last_used_at)}
                </div>
                <div className="mt-0.5 text-xs" style={{ color: mutedColor }}>
                  Created: {formatDate(session.created_at)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleRevoke(session)}
                disabled={busy}
                className="rounded-lg px-3 py-2 text-xs font-semibold text-red-400 disabled:opacity-50"
                style={{ background: panelBg, border: `1px solid ${borderColor}` }}
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && sessions.length > 0 && (
        <p role="alert" className="mt-3 text-xs text-red-400">{error}</p>
      )}
      {message && <p role="status" className="mt-3 text-xs text-green-400">{message}</p>}
    </section>
  );
}
