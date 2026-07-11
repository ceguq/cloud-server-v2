import { useEffect, useRef, useState } from "react";
import { Upload, Bell, ChevronDown } from "lucide-react";

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
  const [userName, setUserName] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement | null>(null);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const readUser = () => {
      try {
        const raw = window.localStorage.getItem('nimbus_user');
        if (!raw) {
          setUserName(null);
          return;
        }
        const parsed = JSON.parse(raw);
        setUserName(parsed?.name ?? null);
      } catch {
        setUserName(null);
      }
    };

    readUser();

    const onUserChange = () => readUser();
    window.addEventListener('nimbus-user-change', onUserChange as EventListener);
    window.addEventListener('storage', onUserChange as EventListener);
    window.addEventListener('focus', onUserChange as EventListener);

    return () => {
      window.removeEventListener('nimbus-user-change', onUserChange as EventListener);
      window.removeEventListener('storage', onUserChange as EventListener);
      window.removeEventListener('focus', onUserChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    if (!notifOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setNotifOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notifOpen]);



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
          topbarBg: "#101a2d",
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

  // Notifications are not wired up yet; keep UI honest.
  const notifications: Array<{ id: string }> = [];

  return (
    <header
      className="flex items-center gap-4 px-6 py-0 shrink-0 rounded-2xl"
      style={{
        background: topbarColors.topbarBg,
        border: `1px solid ${topbarColors.border}`,
        height: "76px",




      }}
    >
      {/* Page title */}
      <div className="shrink-0">
        <span className="text-sm font-semibold" style={{ color: topbarColors.title }}>
          {pageTitles[activePage] || "Dashboard"}
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
          onClick={() => {
            const nextPath = "/uploads";
            if (window.location.pathname !== nextPath) {
              window.history.pushState({}, "", nextPath);
              window.dispatchEvent(new PopStateEvent("popstate"));
            }
          }}
        >
          <Upload size={13} />
          Upload
        </button>

        {/* Notification */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen((open) => !open)}
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
            {notifications.length > 0 && (
              <span
                className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
                style={{ background: accentColor }}
              />
            )}
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
              {notifications.length > 0 ? (
                <div />
              ) : (
                <div className="px-4 py-6">
                  <div className="text-sm font-semibold" style={{ color: topbarColors.dropdownText }}>
                    No notifications yet
                  </div>
                  <div className="text-xs mt-1" style={{ color: topbarColors.dropdownMuted }}>
                    You're all caught up.
                  </div>
                </div>
              )}
              <div className="px-4 py-3" style={{ borderTop: `1px solid ${topbarColors.dropdownItemBorder}` }}>
                <button
                  className="text-xs font-semibold transition-all hover:opacity-90"
                  style={{
                    color: accentColor,
                    background: "transparent",
                  }}
                  onClick={() => {
                    window.history.pushState({}, "", "/settings#notifications");
                    window.dispatchEvent(new PopStateEvent("popstate"));
                    setNotifOpen(false);

                  }}
                >
                  Notification settings
                </button>
              </div>

            </div>
          )}
        </div>

        {/* User Avatar / Profile Dropdown */}
        <div className="relative" ref={userMenuRef}>
          <button
            className="flex items-center gap-2 px-3.5 h-10 rounded-lg transition-colors"
            style={{
              border: `1px solid ${topbarColors.buttonBorder}`,
              background: topbarColors.buttonBg,
              minWidth: "96px",
            }}
            onClick={() => setUserMenuOpen((o) => !o)}
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
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>
            <span className="text-xs font-medium" style={{ color: topbarColors.userText }}>
              {userName ?? "User"}
            </span>
            <ChevronDown size={12} style={{ color: topbarColors.icon }} />
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 top-10 w-56 rounded-xl shadow-2xl z-50 overflow-hidden"
              style={{ background: topbarColors.dropdownBg, border: `1px solid ${topbarColors.dropdownBorder}` }}
            >
              <div className="px-4 py-3" style={{ borderBottom: `1px solid ${topbarColors.dropdownBorder}` }}>
                <span className="text-sm font-semibold" style={{ color: topbarColors.dropdownText }}>
                  Account
                </span>
              </div>

              {(() => {
                const handleProfileClick = () => {
                  window.history.pushState({}, "", "/settings#profile");
                  window.dispatchEvent(new PopStateEvent("popstate"));
                  setUserMenuOpen(false);
                };

                const handleLogoutClick = async () => {
                  if (onLogout) await onLogout();
                  setUserMenuOpen(false);
                };

                return (
                  <>
                    <button
                      className="w-full text-left px-4 py-3 text-xs font-semibold transition-all hover:opacity-90"
                      style={{ color: topbarColors.dropdownText, background: "transparent" }}
                      onClick={handleProfileClick}
                    >
                      Profile
                    </button>



                    {onLogout && (
                      <button
                        className="w-full text-left px-4 py-3 text-xs font-semibold transition-all hover:opacity-90"
                        style={{
                          color: topbarColors.logoutText,
                          background: "transparent",
                          borderTop: `1px solid ${topbarColors.dropdownItemBorder}`,
                        }}
                        onClick={handleLogoutClick}
                      >
                        Logout
                      </button>
                    )}
                  </>
                );
              })()}

            </div>
          )}
        </div>


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

