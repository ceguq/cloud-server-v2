import { useEffect, useState } from "react";
import {
  User,
  Bell,
  Shield,
  HardDrive,
  Key,
  Palette,
  Cloud,
  Eye,
  EyeOff,
  Save,
  Download,
  Lock,
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

function withAlpha(color: string, alphaHex: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alphaHex}` : color;
}

const sections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: Shield },
  { id: "storage", label: "Storage", icon: HardDrive },
  { id: "sync", label: "Sync & Backup", icon: Cloud },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "api", label: "API Keys", icon: Key },
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


function SettingRow({
  label,
  desc,
  children,
  labelColor,
  descColor,
  borderColor,
}: {
  label: string;
  desc?: string;
  children?: React.ReactNode;
  labelColor?: string;
  descColor?: string;
  borderColor?: string;
}) {
  return (
    <div
      className="flex items-center justify-between py-3.5"
      style={{ borderBottom: `1px solid ${borderColor ?? "#0d1829"}` }}
    >
      <div>
        <div className="text-sm" style={{ color: labelColor ?? "#cbd5e1" }}>
          {label}
        </div>
        {desc && (
          <div className="text-xs mt-0.5" style={{ color: descColor ?? "#475569" }}>
            {desc}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}


export function Settings() {
  const [activeSection, setActiveSection] = useState("profile");

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
  const [showPass, setShowPass] = useState(false);

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
            <h2 className="text-lg font-semibold mb-1" style={{ color: settingsColors.title }}>
              Profile
            </h2>
            <p className="text-xs mb-5" style={{ color: settingsColors.muted }}>
              Manage your personal information
            </p>

            {/* Avatar */}
            <div
              className="flex items-center gap-5 mb-6 p-5 rounded-xl"
              style={{ background: settingsColors.cardBg, border: `1px solid ${settingsColors.border}` }}
            >
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{ background: `linear-gradient(135deg, ${accentColor}, #22d3ee)`, color: "#fff" }}
              >
                A
              </div>
              <div>
                <div className="text-sm font-semibold mb-0.5" style={{ color: settingsColors.title }}>
                  Alex Johnson
                </div>
                <div className="text-xs mb-2" style={{ color: settingsColors.muted }}>
                  alex@example.com
                </div>
                <button
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{
                    background: settingsColors.panelBg,
                    color: settingsColors.text,
                    border: `1px solid ${settingsColors.panelBorder}`,
                  }}
                >
                  Change Avatar
                </button>
              </div>
            </div>

            <div
              className="rounded-xl p-5"
              style={{ background: settingsColors.cardBg, border: `1px solid ${settingsColors.border}` }}
            >
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[
                  { label: "First Name", value: "Alex" },
                  { label: "Last Name", value: "Johnson" },
                  { label: "Email Address", value: "alex@example.com" },
                  { label: "Username", value: "@alex_nimbus" },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="block text-xs mb-1.5" style={{ color: settingsColors.muted }}>
                      {f.label}
                    </label>
                    <input
                      defaultValue={f.value}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                      style={{
                        background: settingsColors.panelBg,
                        border: `1px solid ${settingsColors.panelBorder}`,
                        color: settingsColors.text,
                        caretColor: accentColor,
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="mb-4">
                <label className="block text-xs mb-1.5" style={{ color: settingsColors.muted }}>
                  Bio
                </label>
                <textarea
                  defaultValue="Cloud enthusiast, self-hosting advocate."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{
                    background: settingsColors.panelBg,
                    border: `1px solid ${settingsColors.panelBorder}`,
                    color: settingsColors.text,
                    caretColor: accentColor,
                  }}
                />
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold"
                style={{ background: `linear-gradient(135deg, ${accentColor}, #22d3ee)`, color: "#fff" }}
              >
                <Save size={13} /> Save Changes
              </button>
            </div>
          </div>
        )}


        {activeSection === "notifications" && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: settingsColors.title }}>
              Notifications
            </h2>
            <p className="text-xs mb-5" style={{ color: settingsColors.muted }}>
              Configure when and how you get notified
            </p>
            <div
              className="rounded-xl px-5"
              style={{ background: settingsColors.cardBg, border: `1px solid ${settingsColors.border}` }}
            >

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
                  <Toggle
                    on={n.on}
                    accentColor={accentColor}
                    offBg={settingsColors.panelBg}
                    knobBg={resolvedSettingsTheme === "light" ? "#ffffff" : "#fff"}
                  />
                </SettingRow>
              ))}

            </div>
          </div>
        )}

        {activeSection === "security" && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: settingsColors.title }}>
              Security
            </h2>
            <p className="text-xs mb-5" style={{ color: settingsColors.muted }}>
              Manage your account security settings
            </p>

            <div
              className="rounded-xl p-5 mb-4"
              style={{ background: settingsColors.cardBg, border: `1px solid ${settingsColors.border}` }}
            >
              <h3 className="text-sm font-semibold mb-4" style={{ color: settingsColors.title }}>
                Change Password
              </h3>

              {["Current Password", "New Password", "Confirm Password"].map((f) => (
                <div key={f} className="mb-3">
              <label className="block text-xs mb-1.5" style={{ color: settingsColors.muted }}>
                    {f}
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      placeholder="********"
                      className="w-full px-3 py-2 pr-9 rounded-lg text-sm outline-none"
                      style={{
                        background: settingsColors.panelBg,
                        border: `1px solid ${settingsColors.panelBorder}`,
                        color: settingsColors.text,
                        caretColor: accentColor,
                      }}
                    />
              <button
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2"
                    >
                      {showPass ? <EyeOff size={13} style={{ color: settingsColors.muted }} /> : <Eye size={13} style={{ color: settingsColors.muted }} />}

                    </button>
                  </div>
                </div>
              ))}
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold"
                style={{ background: `linear-gradient(135deg, ${accentColor}, #22d3ee)`, color: "#fff" }}
              >
                <Lock size={13} /> Update Password
              </button>
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
                <Toggle
                  on={false}
                  accentColor={accentColor}
                  offBg={settingsColors.panelBg}
                  knobBg={resolvedSettingsTheme === "light" ? "#ffffff" : "#fff"}
                />
              </SettingRow>
              <SettingRow
                label="Login Notifications"
                desc="Email on new device login"
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
                label="Session Timeout"
                desc="Auto-logout after 24h of inactivity"
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
                label="End-to-End Encryption"
                desc="Encrypt files before upload"
                labelColor={settingsColors.text}
                descColor={settingsColors.muted}
                borderColor={settingsColors.border}
              >
                <Toggle
                  on={false}
                  accentColor={accentColor}
                  offBg={settingsColors.panelBg}
                  knobBg={resolvedSettingsTheme === "light" ? "#ffffff" : "#fff"}
                />
              </SettingRow>
            </div>
          </div>
        )}

        {activeSection === "storage" && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: settingsColors.title }}>
              Storage
            </h2>
            <p className="text-xs mb-5" style={{ color: settingsColors.muted }}>
              Manage storage and cleanup settings
            </p>


            <div
              className="rounded-xl p-5 mb-4"
              style={{ background: settingsColors.cardBg, border: `1px solid ${settingsColors.border}` }}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium" style={{ color: settingsColors.title }}>
                  Storage Usage
                </span>
                <span className="text-sm font-bold" style={{ color: accentColor }}>
                  68% used
                </span>
              </div>
              <div
                className="h-3 rounded-full overflow-hidden mb-3"
                style={{ background: settingsColors.panelBg }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: "68%", background: `linear-gradient(90deg, ${accentColor}, #22d3ee)` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Photos", pct: 38, color: "#3b82f6" },
                  { label: "Videos", pct: 22, color: "#22d3ee" },
                  { label: "Documents", pct: 18, color: "#a78bfa" },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="p-3 rounded-lg"
                    style={{
                      background: settingsColors.panelBg,
                      border: `1px solid ${settingsColors.panelBorder}`,
                    }}
                  >
                    <div className="text-xs font-semibold mb-0.5" style={{ color: s.color }}>
                      {s.pct}%
                    </div>
                    <div className="text-xs" style={{ color: settingsColors.muted }}>
                      {s.label}
                    </div>
                  </div>
                ))}
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
                <button
                  className="text-xs px-3 py-1.5 rounded-lg"
                  style={{
                    background: settingsColors.panelBg,
                    color: settingsColors.text,
                    border: `1px solid ${settingsColors.panelBorder}`,
                  }}
                >
                  Run Scan
                </button>
              </SettingRow>
              <SettingRow
                label="Download All Data"
                desc="Export all your files as ZIP"
                labelColor={settingsColors.text}
                descColor={settingsColors.muted}
                borderColor={settingsColors.border}
              >
                <button
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                  style={{
                    background: settingsColors.panelBg,
                    color: settingsColors.text,
                    border: `1px solid ${settingsColors.panelBorder}`,
                  }}
                >
                  <Download size={12} /> Export
                </button>
              </SettingRow>
            </div>
          </div>
        )}

        {activeSection === "appearance" && (
          <div>
            <h2 className="text-lg font-semibold mb-1" style={{ color: settingsColors.title }}>
              Appearance
            </h2>
            <p className="text-xs mb-5" style={{ color: settingsColors.muted }}>
              Customize how NimbusDrive looks
            </p>

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

        {!['profile', 'notifications', 'security', 'storage', 'appearance'].includes(activeSection as "profile" | "notifications" | "security" | "storage" | "appearance") && (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: settingsColors.muted }}>

            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center mb-3"
              style={{
                background: settingsColors.cardBg,
                border: `1px solid ${settingsColors.border}`,
              }}
            >
              {sections.find((s) => s.id === activeSection) &&
                (() => {
                  const S = sections.find((s) => s.id === activeSection)!;
                  const SIcon = S.icon;
                  return <SIcon size={24} style={{ color: settingsColors.emptyIcon }} />;
                })()}
            </div>
            <div className="text-sm font-medium" style={{ color: settingsColors.muted }}>
              {sections.find((s) => s.id === activeSection)?.label} Settings
            </div>
            <div className="text-xs mt-1" style={{ color: settingsColors.muted2 }}>Coming soon</div>
          </div>
        )}
      </div>
    </div>
  );
}

