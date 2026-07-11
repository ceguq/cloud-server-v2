import { useEffect, useState } from "react";
import { authService } from "../../services/authService";
import { SettingsSectionHeader } from "./settings/components/SettingsSectionHeader";
import { SettingRow } from "./settings/components/SettingRow";
import { withAlpha } from "./settings/settingsColorUtils";
import {
  User,
  Bell,
  Shield,
  HardDrive,
  Palette,
  Save,
} from "lucide-react";

type AppearanceTheme = "dark" | "light" | "system";

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

const sections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "appearance", label: "Appearance", icon: Palette },
];

function Toggle({
  on,
  accentColor,
  offBg,
  knobBg,
}: {
  on: boolean;
  accentColor?: string;
  offBg?: string;
  knobBg?: string;
}) {
  const [checked, setChecked] = useState(on);
  const resolvedAccent = accentColor ?? "#3b82f6";
  const resolvedOffBg = offBg ?? "#1e2d45";
  const resolvedKnobBg = knobBg ?? "#fff";

  return (
    <button
      onClick={() => setChecked(!checked)}
      className="relative w-10 h-5 rounded-full transition-all"
      style={{
        background: checked
          ? `linear-gradient(135deg, ${resolvedAccent}, #22d3ee)`
          : resolvedOffBg,
      }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
        style={{
          background: resolvedKnobBg,
          left: checked ? "calc(100% - 18px)" : "2px",
        }}
      />
    </button>
  );
}

function EditableNamePanel({ accentColor, panelBg, panelBorder }: { accentColor: string; panelBg: string; panelBorder: string }) {
  const [name, setName] = useState<string>("");
  const [originalName, setOriginalName] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem('nimbus_user');
      const parsed = raw ? JSON.parse(raw) : null;
      const current = parsed?.name ?? '';
      setName(current);
      setOriginalName(current);
    } catch {
      setName('');
      setOriginalName('');
    }
  }, []);

  const canSave = () => {
    return !saving && name.trim().length >= 2 && name.trim() !== originalName;
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    if (!canSave()) return;

    setSaving(true);
    try {
      const data = await authService.updateProfile(name.trim());
      const updatedUser = data.user;
      try {
        window.localStorage.setItem('nimbus_user', JSON.stringify(updatedUser));
      } catch {
        // ignore
      }
      try {
        window.dispatchEvent(new CustomEvent('nimbus-user-change'));
      } catch {}

      setOriginalName(updatedUser.name);
      setSuccess('Profile updated');
    } catch (err: any) {
      if (err?.response?.status === 422) {
        const msg = err?.response?.data?.errors?.name?.[0] || 'Invalid name';
        setError(msg);
      } else {
        setError('Failed to update profile');
      }
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: panelBg, border: `1px solid ${panelBorder}`, color: '#e2e8f0' }}
        />
        <button
          onClick={handleSave}
          disabled={!canSave()}
          className="px-3 py-2 rounded-lg text-sm font-semibold"
          style={{
            background: canSave() ? `linear-gradient(135deg, ${accentColor}, #22d3ee)` : panelBg,
            color: canSave() ? '#fff' : '#94a3b8',
            border: `1px solid ${panelBorder}`,
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      {error && <div className="text-xs text-red-400 mb-2">{error}</div>}
      {success && <div className="text-xs text-green-400 mb-2">{success}</div>}
    </div>
  );
}


export function Settings() {
  const [activeSection, setActiveSection] = useState("profile");

  const [user, setUser] = useState<{ id?: number; name?: string; email?: string; role?: string } | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem("nimbus_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [meLoadWarning, setMeLoadWarning] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let mounted = true;

    const refreshAuthoritativeUser = async () => {
      try {
        const data: any = await authService.me();

        const payload = data?.user ?? data;
        if (!payload) return;

        const normalized = {
          id: payload.id,
          name: payload.name,
          email: payload.email,
          role: payload.role,
        };

        if (!mounted) return;

        setUser(normalized);

        try {
          window.localStorage.setItem("nimbus_user", JSON.stringify(normalized));
        } catch {
          // ignore localStorage write errors
        }

        try {
          window.dispatchEvent(new CustomEvent("nimbus-user-change"));
        } catch {
          // ignore
        }
      } catch (err) {
        if (!mounted) return;
        setMeLoadWarning(true);
      }
    };

    // Call refresh but keep any cached user as immediate fallback
    refreshAuthoritativeUser();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applyHash = () => {
      const hash = window.location.hash || "";
      if (hash === "#notifications") {
        setActiveSection("notifications");
      }
    };

    applyHash();
    window.addEventListener("popstate", applyHash);
    return () => window.removeEventListener("popstate", applyHash);
  }, []);

  const [appearanceTheme, setAppearanceTheme] = useState<AppearanceTheme>(safeReadAppearanceTheme);
  const [accentColor, setAccentColor] = useState<string>(safeReadAccentColor);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem("nimbus_appearance_theme", appearanceTheme);
    } catch {
      // ignore
    }

    try {
      window.localStorage.setItem("nimbus_accent_color", accentColor);
    } catch {
      // ignore
    }

    try {
      document?.documentElement?.style?.setProperty("--nimbus-accent", accentColor);
    } catch {
      // ignore
    }

    try {
      window.dispatchEvent(new CustomEvent("nimbus-appearance-change"));
    } catch {
      // ignore
    }


    const applyDark = (isDark: boolean) => {
      if (!document?.documentElement) return;
      if (isDark) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    };

    if (appearanceTheme === "dark") {
      applyDark(true);
      return;
    }

    if (appearanceTheme === "light") {
      applyDark(false);
      return;
    }

    // system
    try {
      const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
      const isDark = !!mq?.matches;
      applyDark(isDark);

      const onChange = (e: MediaQueryListEvent) => applyDark(!!e.matches);
      mq?.addEventListener?.("change", onChange);

      return () => mq?.removeEventListener?.("change", onChange);
    } catch {
      applyDark(true);
    }
  }, [appearanceTheme, accentColor]);

  const resolvedSettingsTheme: "dark" | "light" = (() => {
    try {
      if (appearanceTheme === "system") {
        if (typeof window === "undefined") return "dark";
        const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
        return mq?.matches ? "dark" : "light";
      }
      return appearanceTheme === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  })();

  const settingsColors =
    resolvedSettingsTheme === "light"
      ? {
          pageBg: "#f8fafc",
          sidebarBg: "#ffffff",
          border: "#dbe3ef",
          title: "#0f172a",
          text: "#334155",
          muted: "#64748b",
          muted2: "#94a3b8",
          sectionLabel: "#64748b",
          itemActiveBg: `linear-gradient(135deg, ${withAlpha(accentColor, "26")} 0%, rgba(34,211,238,0.14) 100%)`,
          itemActiveBorder: withAlpha(accentColor, "66"),
          itemInactiveText: "#64748b",
          itemActiveText: "#0f172a",
          itemInactiveIcon: "#94a3b8",
          itemActiveIcon: accentColor,
          cardBg: "#ffffff",
          panelBg: "#f8fafc",
          panelBorder: "#dbe3ef",
          previewBorder: "#dbe3ef",
          emptyIcon: "#94a3b8",
        }
      : {
          pageBg: "#111c2f",
          sidebarBg: "#0b1121",
          border: "#1a2540",
          title: "#e2e8f0",
          text: "#cbd5e1",
          muted: "#64748b",
          muted2: "#475569",
          sectionLabel: "#334155",
          itemActiveBg: `linear-gradient(135deg, ${withAlpha(accentColor, "26")} 0%, rgba(34,211,238,0.14) 100%)`,
          itemActiveBorder: withAlpha(accentColor, "66"),
          itemInactiveText: "#64748b",
          itemActiveText: "#e2e8f0",
          itemInactiveIcon: "#475569",
          itemActiveIcon: accentColor,
          cardBg: "#0f1729",
          panelBg: "#0d1829",
          panelBorder: "#1a2540",
          previewBorder: "#1a2540",
          emptyIcon: "#334155",
        };

  return (
    <div className="flex-1 overflow-hidden flex" style={{ background: settingsColors.pageBg }}>

      {/* Settings Sidebar */}
      <div
        className="w-52 shrink-0 p-4"
        style={{ background: settingsColors.sidebarBg, borderRight: `1px solid ${settingsColors.border}` }}
      >
        <div
          className="text-xs font-semibold uppercase tracking-wider mb-3"
          style={{ color: settingsColors.sectionLabel }}
        >
          Settings
        </div>

        <div className="space-y-0.5">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all text-left"
                style={{
                  background: isActive ? settingsColors.itemActiveBg : "transparent",
                  border: isActive ? `1px solid ${settingsColors.itemActiveBorder}` : "1px solid transparent",
                  color: isActive ? settingsColors.itemActiveText : settingsColors.itemInactiveText,
                }}
              >
                <Icon size={14} style={{ color: isActive ? settingsColors.itemActiveIcon : settingsColors.itemInactiveIcon }} />
                <span className="text-sm">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeSection === "profile" && (
          <div>
            <SettingsSectionHeader
              title="Profile"
              description="Manage your personal information"
              textColor={settingsColors.title}
              mutedColor={settingsColors.muted}
              className="mb-5"
            />

            {/* Avatar */}
            <div
              className="flex items-center gap-5 mb-6 p-5 rounded-xl"
              style={{ background: settingsColors.cardBg, border: `1px solid ${settingsColors.border}` }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{ background: `linear-gradient(135deg, ${accentColor}, #22d3ee)`, color: "#fff" }}
              >
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </div>
              <div>
                <div className="text-sm font-semibold mb-0.5" style={{ color: settingsColors.title }}>
                  {user?.name ?? "User"}
                </div>
                <div className="text-xs mb-2" style={{ color: settingsColors.muted }}>
                  {user?.email ?? ""}
                </div>
                <div
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{
                    background: settingsColors.panelBg,
                    color: settingsColors.muted,
                    border: `1px solid ${settingsColors.panelBorder}`,
                  }}
                >
                  Avatar editing is not available yet
                </div>
              </div>
            </div>

            <div
              className="rounded-xl p-5"
              style={{ background: settingsColors.cardBg, border: `1px solid ${settingsColors.border}` }}
            >
              <div className="mb-4">
                <label className="block text-xs mb-1.5" style={{ color: settingsColors.muted }}>
                  Display Name
                </label>
                <input
                  value={user?.name ?? ''}
                  onChange={() => {}}
                  readOnly
                  id="nimbus-profile-name-readonly"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{
                    background: settingsColors.panelBg,
                    border: `1px solid ${settingsColors.panelBorder}`,
                    color: settingsColors.muted,
                    caretColor: accentColor,
                  }}
                />
                {meLoadWarning && (
                  <div className="text-xs text-yellow-400 mt-2">Failed to refresh profile; using cached data.</div>
                )}
              </div>
              <div>
                {/* Editable row */}
                <label className="block text-xs mb-1.5" style={{ color: settingsColors.muted }}>
                  Edit Display Name
                </label>
                <EditableNamePanel accentColor={accentColor} panelBg={settingsColors.panelBg} panelBorder={settingsColors.panelBorder} />
              </div>
            </div>
          </div>
        )}


        {activeSection === "notifications" && (
          <div>
            <SettingsSectionHeader
              title="Notifications"
              description="Configure when and how you get notified"
              textColor={settingsColors.title}
              mutedColor={settingsColors.muted}
              className="mb-5"
            />
            <div
              className="rounded-xl px-5"
              style={{ background: settingsColors.cardBg, border: `1px solid ${settingsColors.border}` }}
            >
              <div className="py-3 text-xs" style={{ color: settingsColors.muted }}>
                Notification preferences are not available yet.
              </div>

              {[
                { label: "Upload Complete", desc: "Notify when file uploads finish", on: true },
                { label: "Sync Status", desc: "Notify when devices sync", on: true },
                { label: "Shared File Activity", desc: "When someone views your shared files", on: false },
                { label: "Storage Warnings", desc: "Alert when storage exceeds 80%", on: true },
                { label: "Security Alerts", desc: "New login from unknown device", on: true },
                { label: "Server Alerts", desc: "CPU/Memory critical thresholds", on: true },
                { label: "Weekly Report", desc: "Summary of your cloud activity", on: false },
              ].map((n) => (
                <SettingRow
                  key={n.label}
                  label={n.label}
                  desc={n.desc}
                  labelColor={settingsColors.text}
                  descColor={settingsColors.muted}
                  borderColor={settingsColors.border}
                >
                  <div
                    className="text-xs px-3 py-1.5 rounded-lg"
                    style={{
                      background: settingsColors.panelBg,
                      color: settingsColors.muted,
                      border: `1px solid ${settingsColors.panelBorder}`,
                    }}
                  >
                    Coming soon
                  </div>
                </SettingRow>
              ))}

            </div>
          </div>
        )}

        {activeSection === "security" && (
          <div>
            <SettingsSectionHeader
              title="Security"
              description="Manage your account security settings"
              textColor={settingsColors.title}
              mutedColor={settingsColors.muted}
              className="mb-5"
            />

            <div
              className="rounded-xl px-5 py-3 mb-4 text-xs"
              style={{
                background: settingsColors.cardBg,
                border: `1px solid ${settingsColors.border}`,
                color: settingsColors.muted,
              }}
            >
              Security settings are not available yet.
            </div>

            <div
              className="rounded-xl p-5 mb-4"
              style={{ background: settingsColors.cardBg, border: `1px solid ${settingsColors.border}` }}
            >
              <h3 className="text-sm font-semibold mb-2" style={{ color: settingsColors.title }}>
                Password
              </h3>
              <div className="text-xs" style={{ color: settingsColors.muted }}>
                Password updates are not available yet.
              </div>
            </div>

            <div
              className="rounded-xl px-5"
              style={{ background: settingsColors.cardBg, border: `1px solid ${settingsColors.border}` }}
            >
              <SettingRow
                label="Two-Factor Authentication"
                desc="Require 2FA for sign-in"
                labelColor={settingsColors.text}
                descColor={settingsColors.muted}
                borderColor={settingsColors.border}
              >
                <div
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{
                    background: settingsColors.panelBg,
                    color: settingsColors.muted,
                    border: `1px solid ${settingsColors.panelBorder}`,
                  }}
                >
                  Coming soon
                </div>
              </SettingRow>
              <SettingRow
                label="Login Notifications"
                desc="Email on new device login"
                labelColor={settingsColors.text}
                descColor={settingsColors.muted}
                borderColor={settingsColors.border}
              >
                <div
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{
                    background: settingsColors.panelBg,
                    color: settingsColors.muted,
                    border: `1px solid ${settingsColors.panelBorder}`,
                  }}
                >
                  Coming soon
                </div>
              </SettingRow>
              <SettingRow
                label="Session Timeout"
                desc="Auto-logout after 24h of inactivity"
                labelColor={settingsColors.text}
                descColor={settingsColors.muted}
                borderColor={settingsColors.border}
              >
                <div
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{
                    background: settingsColors.panelBg,
                    color: settingsColors.muted,
                    border: `1px solid ${settingsColors.panelBorder}`,
                  }}
                >
                  Coming soon
                </div>
              </SettingRow>
              <SettingRow
                label="End-to-End Encryption"
                desc="Encrypt files before upload"
                labelColor={settingsColors.text}
                descColor={settingsColors.muted}
                borderColor={settingsColors.border}
              >
                <div
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{
                    background: settingsColors.panelBg,
                    color: settingsColors.muted,
                    border: `1px solid ${settingsColors.panelBorder}`,
                  }}
                >
                  Coming soon
                </div>
              </SettingRow>
            </div>
          </div>
        )}

        {activeSection === "storage" && (
          <div>
            <SettingsSectionHeader
              title="Storage"
              description="Manage storage and cleanup settings"
              textColor={settingsColors.title}
              mutedColor={settingsColors.muted}
              className="mb-5"
            />


            <div
              className="rounded-xl px-5 py-3 mb-4 text-xs"
              style={{
                background: settingsColors.cardBg,
                border: `1px solid ${settingsColors.border}`,
                color: settingsColors.muted,
              }}
            >
              Storage settings are not available yet.
            </div>

            <div
              className="rounded-xl p-5 mb-4"
              style={{ background: settingsColors.cardBg, border: `1px solid ${settingsColors.border}` }}
            >
              <div className="text-sm font-medium" style={{ color: settingsColors.title }}>
                Storage usage
              </div>
              <div className="mt-2 text-xs" style={{ color: settingsColors.muted }}>
                Live storage usage is available from the Dashboard.
              </div>
            </div>


            <div className="rounded-xl px-5" style={{ background: settingsColors.cardBg, border: `1px solid ${settingsColors.border}` }}>
              <SettingRow
                label="Auto-Delete Trash"
                desc="Permanently delete after 30 days"
                labelColor={settingsColors.text}
                descColor={settingsColors.muted}
                borderColor={settingsColors.border}
              >
                <Toggle
                  on={true}
                  accentColor={accentColor}
                  offBg={settingsColors.panelBg}
                  knobBg={resolvedSettingsTheme === "light" ? "#ffffff" : "#fff"}
                />
              </SettingRow>
              <SettingRow
                label="Duplicate Detection"
                desc="Find and remove duplicate files"
                labelColor={settingsColors.text}
                descColor={settingsColors.muted}
                borderColor={settingsColors.border}
              >
                <div
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{
                    background: settingsColors.panelBg,
                    color: settingsColors.muted,
                    border: `1px solid ${settingsColors.panelBorder}`,
                  }}
                >
                  Storage scan is not available yet.
                </div>
              </SettingRow>
              <SettingRow
                label="Download All Data"
                desc="Export all your files as ZIP"
                labelColor={settingsColors.text}
                descColor={settingsColors.muted}
                borderColor={settingsColors.border}
              >
                <div
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{
                    background: settingsColors.panelBg,
                    color: settingsColors.muted,
                    border: `1px solid ${settingsColors.panelBorder}`,
                  }}
                >
                  Storage export is not available yet.
                </div>
              </SettingRow>
            </div>
          </div>
        )}

        {activeSection === "appearance" && (
          <div>
            <SettingsSectionHeader
              title="Appearance"
              description="Customize how NimbusDrive looks"
              textColor={settingsColors.title}
              mutedColor={settingsColors.muted}
              className="mb-5"
            />

            <div
              className="rounded-xl p-5"
              style={{
                background: settingsColors.cardBg,
                border: `1px solid ${settingsColors.border}`,
              }}
            >
              <div className="mb-5">
                <div className="text-sm mb-3" style={{ color: settingsColors.text }}>
                  Theme
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: "dark", label: "Dark", preview: "#111c2f" },
                    { id: "light", label: "Light", preview: "#f8fafc" },
                    { id: "system", label: "System", preview: "linear-gradient(135deg, #111c2f 50%, #f8fafc 50%)" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setAppearanceTheme(t.id as AppearanceTheme)}
                      className="p-3 rounded-xl flex flex-col items-center gap-2 transition-all"
                      style={{
                        border: appearanceTheme === (t.id as AppearanceTheme) ? `2px solid ${accentColor}` : `1px solid ${settingsColors.panelBorder}`,
                        background: settingsColors.panelBg,
                      }}
                    >
                      <div
                        className="w-full h-10 rounded-lg"
                        style={{ background: t.preview, border: `1px solid ${settingsColors.previewBorder}` }}
                      />
                      <span
                        className="text-xs"
                        style={{
                          color: appearanceTheme === (t.id as AppearanceTheme) ? accentColor : settingsColors.muted,
                        }}
                      >
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <div className="text-sm mb-3" style={{ color: settingsColors.text }}>
                  Accent Color
                </div>
                <div className="flex items-center gap-2">
                  {["#3b82f6", "#22d3ee", "#a78bfa", "#34d399", "#f59e0b", "#ef4444"].map((color) => (
                    <button
                      key={color}
                      onClick={() => setAccentColor(color)}
                      className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                      style={{
                        background: color,
                        outline:
                          accentColor === color ? `2px solid ${accentColor}` : "1px solid transparent",
                        outlineOffset: "2px",
                      }}
                    />
                  ))}
                </div>
                <div className="text-xs mt-2" style={{ color: settingsColors.muted }}>
                  Selected: {accentColor}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

