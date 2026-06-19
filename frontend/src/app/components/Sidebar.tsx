import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  Share2,
  Upload,
  Monitor,
  Activity,
  History,
  Trash2,
  Server,
  Settings,
  ChevronRight,
  Cloud,
  HardDrive,
  ShieldCheck,
} from "lucide-react";

import storageService, {
  type StorageInfo,
} from "../../services/storageService";
import { LoadingSpinner } from "./LoadingSpinner";
import { GDriveIcon } from "./GDriveIcon";

const navItems = [
{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/", iconColor: "#60a5fa" },
{ id: "my-files", label: "My Files", icon: FolderOpen, path: "/my-files", iconColor: "#fbbf24" },
{ id: "gdrive", label: "GDrive", icon: GDriveIcon, path: "/gdrive", iconColor: "multicolor" },
{ id: "shared", label: "Shared", icon: Share2, path: "/shared", iconColor: "#22d3ee" },
{ id: "uploads", label: "Uploads", icon: Upload, path: "/uploads", iconColor: "#34d399" },
{ id: "devices", label: "Devices", icon: Monitor, path: "/devices", iconColor: "#818cf8" },
{ id: "activity", label: "Activity", icon: Activity, path: "/activity-feed", iconColor: "#c084fc" },
{ id: "trash", label: "Trash", icon: Trash2, path: "/trash", iconColor: "#fb7185" },
  {
    id: "activity-log",
    label: "Activity Log",
    icon: History,
    path: "/activity",
    iconColor: "#a78bfa",
  },
  {
    id: "server-monitor",
    label: "Server Monitor",
    icon: Server,
    path: "/server-monitor",
    iconColor: "#10b981",
  },
{ id: "settings", label: "Settings", icon: Settings, path: "/settings", iconColor: "#94a3b8" },
];

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string, path?: string) => void;
  storageRefreshKey?: number;
}

export function Sidebar({
  activePage,
  onNavigate,
  storageRefreshKey,
}: SidebarProps) {
  const storedUser = (() => {
    try {
      const raw = localStorage.getItem("nimbus_user");
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  })();

  const role = storedUser?.role;
  const isAdmin = role === "admin";

  const visibleNavItems = isAdmin
    ? [
        // Up to (but not including) Activity Log
        ...navItems.slice(
          0,
          navItems.findIndex((i) => i.id === "activity-log")
        ),
        // Admin: Activity Log
        ...navItems.filter((i) => i.id === "activity-log"),
        // Admin: Admin Users
        {
          id: "admin-users",
        label: "Admin Users",
        icon: ShieldCheck,
        path: "/admin/users",
        iconColor: "#f59e0b",
      },
        // Admin: rest of items (including Settings)
        ...navItems.slice(navItems.findIndex((i) => i.id === "server-monitor")),
      ]
    : navItems.filter((i) => i.id !== "activity-log");

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
    if (theme === "dark") return "dark";
    if (theme === "light") return "light";

    try {
      const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
      return mq?.matches ? "dark" : "light";
    } catch {
      return "dark";
    }
  }

  const [appearanceTheme, setAppearanceTheme] = useState<AppearanceTheme>(() => safeReadAppearanceTheme());
  const [accentColor, setAccentColor] = useState<string>(() => safeReadAccentColor());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveAppearanceTheme(safeReadAppearanceTheme()));

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncThemeFromStorage = () => {
      const nextTheme = safeReadAppearanceTheme();
      const nextAccent = safeReadAccentColor();

      setAppearanceTheme(nextTheme);
      setAccentColor(nextAccent);
      setResolvedTheme(resolveAppearanceTheme(nextTheme));
    };

    syncThemeFromStorage();

    try {
      window.addEventListener("nimbus-appearance-change", syncThemeFromStorage);
      syncThemeFromStorage();

      window.addEventListener("storage", syncThemeFromStorage);
      window.addEventListener("focus", syncThemeFromStorage);

      const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
      const onChange = () => {
        syncThemeFromStorage();
      };
      mq?.addEventListener?.("change", onChange);

      return () => {
        window.removeEventListener("nimbus-appearance-change", syncThemeFromStorage);
        window.removeEventListener("storage", syncThemeFromStorage);
        window.removeEventListener("focus", syncThemeFromStorage);
        mq?.removeEventListener?.("change", onChange);
      };
    } catch {
      return;
    }
  }, []);

  const accentSoftBg = `${accentColor}26`;
  const accentBorder = `${accentColor}66`;

  const sidebarColors =
    resolvedTheme === "light"
      ? {
          sidebarBg: "#ffffff",
          border: "#dbe3ef",
          logoText: "#0f172a",
          subtitle: "#64748b",
          navText: "#64748b",
          navTextActive: "#0f172a",
          navIcon: "#64748b",

          cardBg: "#f8fafc",
          panelBg: "#e2e8f0",
          storageText: "#0f172a",
          storageLabel: "#334155",
          muted: "#64748b",
          muted2: "#94a3b8",
          error: "#dc2626",
        }
      : {
          sidebarBg: "#101a2d",
          border: "rgba(148, 163, 184, 0.14)",
          logoText: "#ffffff",
          subtitle: "rgba(148, 163, 184, 0.58)",
          navText: "rgba(148, 163, 184, 0.62)",
          navTextActive: "#e2e8f0",
          navIcon: "rgba(148, 163, 184, 0.48)",
          cardBg: "#0f1729",
          panelBg: "#0d1829",
          storageText: "#e2e8f0",
          storageLabel: "rgba(148, 163, 184, 0.72)",
          muted: "rgba(148, 163, 184, 0.58)",
          muted2: "rgba(148, 163, 184, 0.48)",
          error: "#f87171",
        };

  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);


  const [storageLoading, setStorageLoading] = useState(false);

  const [storageError, setStorageError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setStorageLoading(true);
        setStorageError("");
        const info = await storageService.getStorageInfo();
        if (!cancelled) setStorageInfo(info);
      } catch (e) {
        if (!cancelled) setStorageError("Storage unavailable");
      } finally {
        if (!cancelled) setStorageLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [storageRefreshKey]);

  const usedHuman = storageInfo?.used_human ?? "";
  const limitHuman = storageInfo?.limit_human ?? "";
  const usagePercentRaw =
    typeof storageInfo?.usage_percent === "number"
      ? storageInfo.usage_percent
      : 0;
  const usagePercent = Math.min(100, Math.max(0, usagePercentRaw));

  return (
    <aside
      className="flex flex-col h-full w-[220px] shrink-0 overflow-hidden rounded-2xl"
      style={{ background: sidebarColors.sidebarBg, border: `1px solid ${sidebarColors.border}` }}
    >

      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-5 py-5"
      >

        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, #22d3ee 100%)`,

          }}
        >
          <Cloud size={16} className="text-white" />
        </div>
        <div>
          <div className="font-semibold text-sm tracking-wide" style={{ color: sidebarColors.logoText }}>
            NimbusDrive
          </div>

          <div className="text-[10px]" style={{ color: sidebarColors.subtitle }}>

            Your Cloud. Your Data.
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;

            const isActive = item.path
              ? window.location.pathname === item.path
              : window.location.pathname === "/" && activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id, item.path)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group text-left"
                style={{
                  background: isActive
                    ? `linear-gradient(135deg, ${accentSoftBg} 0%, rgba(34,211,238,0.14) 100%)`
                    : "transparent",

                  border: isActive
                    ? `1px solid ${accentBorder}`
                    : "1px solid transparent",
                }}
              >

                <Icon
                  size={16}
                  style={{ color: isActive ? accentColor : sidebarColors.navIcon }}
                  stroke={
                    item.id === "gdrive"
                      ? undefined
                      : item.iconColor && item.iconColor !== "multicolor"
                        ? item.iconColor
                        : isActive
                          ? accentColor
                          : sidebarColors.navIcon
                  }
                  opacity={item.id === "gdrive" ? undefined : isActive ? 1 : 0.9}
                  className="shrink-0 transition-colors"

                />
                <span
                  className="text-sm transition-colors"
                  style={{
                    color: isActive ? sidebarColors.navTextActive : sidebarColors.navText,
                    fontWeight: isActive ? 500 : 400,

                  }}
                >
                  {item.label}
                </span>
                {isActive && (
                  <ChevronRight
                    size={12}
                    className="ml-auto"
                    style={{ color: accentColor }}
                  />

                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Storage Usage */}
      <div className="px-4 py-4" style={{ borderTop: `1px solid ${sidebarColors.border}` }}>

        <div
          className="rounded-xl p-3"
          style={{ background: sidebarColors.cardBg, border: `1px solid ${sidebarColors.border}` }}
        >

          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={13} style={{ color: accentColor }} />
            <span className="text-xs font-medium" style={{ color: sidebarColors.storageLabel }}>
              Storage Used
            </span>

          </div>
          {storageLoading ? (
            <div
              className="flex items-center gap-2 text-xs"
              style={{ color: sidebarColors.muted }}
            >

              <LoadingSpinner size={12} />
              Loading storage...

            </div>
          ) : storageError ? (
            <div className="text-xs" style={{ color: sidebarColors.error }}>
              Storage unavailable
            </div>

          ) : (
            <>
              <div className="flex justify-between items-center mb-2">
                <span
                  className="text-xs font-medium"
                  style={{ color: sidebarColors.storageText }}

                >
                  {usedHuman || "—"} of {limitHuman || "—"}
                </span>
                {/* Persentase tidak ditampilkan */}
                <span className="text-xs" style={{ color: sidebarColors.muted }} />

              </div>

              <div
                className="relative h-1.5 rounded-full overflow-hidden"
                style={{ background: sidebarColors.panelBg }}

              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{
                    width: `${usagePercent}%`,
                    background: `linear-gradient(90deg, ${accentColor}, #22d3ee)`,

                  }}
                />
              </div>
              <div className="mt-2.5 text-xs" style={{ color: sidebarColors.muted2 }}>
                {Math.max(0, 100 - usagePercent)}% free remaining
              </div>

            </>
          )}
        </div>

        <button
          className="mt-3 w-full py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, #22d3ee 100%)`,
            color: "#fff",
          }}

        >
          ↑ Upgrade to Pro
        </button>
      </div>
    </aside>
  );
}
