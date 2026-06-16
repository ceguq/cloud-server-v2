import { useEffect, useState } from "react";
import { Search, Upload, Bell, ChevronDown, Plus, Zap } from "lucide-react";

type AppearanceTheme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

interface TopbarProps {
  activePage: string;
  onLogout?: (() => void | Promise<void>) | undefined;
}



const pageTitles: Record<string, string> = {
  dashboard: "Dashboard",
  "my-files": "My Files",
  shared: "Shared",
  uploads: "Uploads",
  devices: "Devices",
  activity: "Activity",
  "activity-log": "Activity Log",
  trash: "Trash",
  "server-monitor": "Server Monitor",
  settings: "Settings",
};

function safeReadAppearanceTheme(): AppearanceTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = window.localStorage.getItem("nimbus_appearance_theme");
    if (raw === "dark" || raw === "light" || raw === "system") return raw;
    return "dark";
  } catch {
    return "dark";
  }
}

function safeReadAccentColor(): string {
  if (typeof window === "undefined") return "#3b82f6";
  try {
    const raw = window.localStorage.getItem("nimbus_accent_color");
    if (typeof raw === "string" && raw.trim().length > 0) return raw;
    return "#3b82f6";
  } catch {
    return "#3b82f6";
  }
}

function resolveAppearanceTheme(theme: AppearanceTheme): ResolvedTheme {
  try {
    if (theme === "dark" || theme === "light") return theme;

    if (typeof window === "undefined") return "dark";
    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mql) return "dark";
    return mql.matches ? "dark" : "light";
  } catch {
    return "dark";
  }
}

export function Topbar({ activePage, onLogout }: TopbarProps) {
  const [searchValue, setSearchValue] = useState("");

  const [notifOpen, setNotifOpen] = useState(false);

  const [appearanceTheme, setAppearanceTheme] = useState<AppearanceTheme>("dark");
  const [accentColor, setAccentColor] = useState<string>("#3b82f6");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("dark");

  useEffect(() => {
    if (typeof window === "undefined") return;

    let mql: MediaQueryList | null = null;

    const syncThemeFromStorage = () => {
      const theme = safeReadAppearanceTheme();
      const accent = safeReadAccentColor();
      setAppearanceTheme(theme);
      setAccentColor(accent);
      setResolvedTheme(resolveAppearanceTheme(theme));
    };

    syncThemeFromStorage();

    window.addEventListener(
      "nimbus-appearance-change",
      syncThemeFromStorage as EventListener
    );
    window.addEventListener("storage", syncThemeFromStorage as EventListener);
    window.addEventListener("focus", syncThemeFromStorage as EventListener);

    try {
      mql = window.matchMedia?.("(prefers-color-scheme: dark)") ?? null;
      const onSystemChange = () => {
        // Only update if current mode is system; but resolveAppearanceTheme handles it.
        setResolvedTheme(resolveAppearanceTheme(safeReadAppearanceTheme()));
      };
      mql?.addEventListener?.("change", onSystemChange);
      return () => {
        window.removeEventListener(
          "nimbus-appearance-change",
          syncThemeFromStorage as EventListener
        );
        window.removeEventListener(
          "storage",
          syncThemeFromStorage as EventListener
        );
        window.removeEventListener(
          "focus",
          syncThemeFromStorage as EventListener
        );
        mql?.removeEventListener?.("change", onSystemChange);
      };
    } catch {
      return () => {
        window.removeEventListener(
          "nimbus-appearance-change",
          syncThemeFromStorage as EventListener
        );
        window.removeEventListener(
          "storage",
          syncThemeFromStorage as EventListener
        );
        window.removeEventListener(
          "focus",
          syncThemeFromStorage as EventListener
        );
      };
    }
  }, []);

  const topbarColors =
    resolvedTheme === "light"
      ? {
          topbarBg: "#ffffff",
          border: "#dbe3ef",
          title: "#0f172a",
          inputBg: "#f8fafc",
          inputBorder: "#dbe3ef",
          inputText: "#334155",
          placeholder: "#94a3b8",
          shortcutBg: "#e2e8f0",
          shortcutText: "#64748b",
          buttonBg: "#f8fafc",
          buttonBorder: "#dbe3ef",
          buttonHover: "#f1f5f9",
          icon: "#475569",
          dropdownBg: "#ffffff",

          dropdownBorder: "#dbe3ef",
          dropdownItemBorder: "#e2e8f0",
          dropdownText: "#0f172a",
          dropdownMuted: "#64748b",
          dropdownTime: "#94a3b8",
          userText: "#334155",
          logoutBg: "#fff1f2",
          logoutBorder: "#fecdd3",
          logoutText: "#be123c",
          logoutHover: "#ffe4e6",
        }
      : {
          topbarBg: "#0b1121",
          border: "#1a2540",
          title: "#e2e8f0",
          inputBg: "#0d1829",
          inputBorder: "#1a2540",
          inputText: "#94a3b8",
          placeholder: "#64748b",
          shortcutBg: "#1e2d45",
          shortcutText: "#475569",
          buttonBg: "#0d1829",
          buttonBorder: "#1a2540",
          buttonHover: "#1a2540",
          icon: "#64748b",
          dropdownBg: "#0f1729",
          dropdownBorder: "#1a2540",
          dropdownItemBorder: "#0d1829",
          dropdownText: "#e2e8f0",
          dropdownMuted: "#64748b",
          dropdownTime: "#475569",
          userText: "#94a3b8",
          logoutBg: "rgba(239, 68, 68, 0.10)",
          logoutBorder: "rgba(248, 113, 113, 0.35)",
          logoutText: "#fca5a5",
          logoutHover: "rgba(239, 68, 68, 0.18)",
        };

  const systemModeAccentCaret = accentColor;

  return (
    <header
      className="flex items-center gap-4 px-6 py-0 shrink-0"
      style={{
        background: topbarColors.topbarBg,
        borderBottom: `1px solid ${topbarColors.border}`,
        height: "76px",




      }}
    >
      {/* Page title */}
      <div className="shrink-0">
        <span className="text-sm font-semibold" style={{ color: topbarColors.title }}>
          {pageTitles[activePage] || "Dashboard"}
        </span>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-xl relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: topbarColors.icon }}
        />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search files, folders, and more..."
          className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none transition-all"
          style={{
            background: topbarColors.inputBg,
            border: `1px solid ${topbarColors.inputBorder}`,
            color: topbarColors.inputText,
            caretColor: systemModeAccentCaret,
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = systemModeAccentCaret;
            e.currentTarget.style.boxShadow = `0 0 0 2px ${systemModeAccentCaret}26`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = topbarColors.inputBorder;
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: topbarColors.shortcutBg, color: topbarColors.shortcutText }}
        >
          ⌘K
        </span>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Quick action */}
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, #22d3ee 100%)`,
            color: "#fff",
          }}
        >
          <Upload size={13} />
          Upload
        </button>

        {/* Notification */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{
              border: `1px solid ${topbarColors.buttonBorder}`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = topbarColors.buttonHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = topbarColors.buttonBg;
            }}
          >
            <Bell size={15} style={{ color: topbarColors.icon }} />
            <span
              className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
              style={{ background: accentColor }}
            />
          </button>
          {notifOpen && (
            <div
              className="absolute right-0 top-10 w-72 rounded-xl shadow-2xl z-50 overflow-hidden"
              style={{ background: topbarColors.dropdownBg, border: `1px solid ${topbarColors.dropdownBorder}` }}
            >
              <div className="px-4 py-3" style={{ borderBottom: `1px solid ${topbarColors.dropdownBorder}` }}>
                <span className="text-sm font-semibold" style={{ color: topbarColors.dropdownText }}>
                  Notifications
                </span>
              </div>
              {[
                { title: "Sync Complete", desc: "All 3 devices are up to date", time: "2m ago", dot: accentColor },
                { title: "Storage Warning", desc: "You've used 68% of your storage", time: "1h ago", dot: "#f59e0b" },
                { title: "New Share", desc: "Alex shared 'Project Files'", time: "3h ago", dot: "#3b82f6" },
              ].map((n, i) => (
                <div
                  key={i}
                  className="flex gap-3 px-4 py-3 cursor-pointer transition-colors"
                  style={{
                    borderBottom: `1px solid ${topbarColors.dropdownItemBorder}`,
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = topbarColors.buttonHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: n.dot }} />
                  <div>
                    <div className="text-xs font-medium" style={{ color: topbarColors.dropdownText }}>
                      {n.title}
                    </div>
                    <div className="text-xs" style={{ color: topbarColors.dropdownMuted }}>
                      {n.desc}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: topbarColors.dropdownTime }}>
                      {n.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Avatar */}
        <button
          className="flex items-center gap-2 px-3.5 h-10 rounded-lg transition-colors"
          style={{
            border: `1px solid ${topbarColors.buttonBorder}`,
            background: topbarColors.buttonBg,
            minWidth: "96px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = topbarColors.buttonHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = topbarColors.buttonBg;
          }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: `linear-gradient(135deg, ${accentColor}, #22d3ee)`, color: "#fff" }}
          >
            A
          </div>
          <span className="text-xs font-medium" style={{ color: topbarColors.userText }}>
            Alex
          </span>
          <ChevronDown size={12} style={{ color: topbarColors.icon }} />
        </button>

        {/* Logout */}
        {onLogout && (
          <button
            type="button"
            onClick={() => onLogout()}

            className="flex h-10 min-w-[88px] items-center justify-center rounded-lg px-3.5 text-xs font-semibold transition-colors"
            style={{
              background: topbarColors.logoutBg,
              border: `1px solid ${topbarColors.logoutBorder}`,
              color: topbarColors.logoutText,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = topbarColors.logoutHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = topbarColors.logoutBg;
            }}
          >
            Logout
          </button>
        )}

      </div>
    </header>
  );
}

