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

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { id: "my-files", label: "My Files", icon: FolderOpen, path: "/my-files" },
  { id: "shared", label: "Shared", icon: Share2, path: "/shared" },
  { id: "uploads", label: "Uploads", icon: Upload, path: "/uploads" },
  { id: "devices", label: "Devices", icon: Monitor, path: "/devices" },
  { id: "activity", label: "Activity", icon: Activity, path: "/activity-feed" },
  { id: "trash", label: "Trash", icon: Trash2, path: "/trash" },
  {
    id: "activity-log",
    label: "Activity Log",
    icon: History,
    path: "/activity",
  },
  {
    id: "server-monitor",
    label: "Server Monitor",
    icon: Server,
    path: "/server-monitor",
  },
  { id: "settings", label: "Settings", icon: Settings, path: "/settings" },
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
        },
        // Admin: rest of items (including Settings)
        ...navItems.slice(navItems.findIndex((i) => i.id === "server-monitor")),
      ]
    : navItems.filter((i) => i.id !== "activity-log");

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
      className="flex flex-col h-full w-[220px] shrink-0"
      style={{ background: "#0b1121", borderRight: "1px solid #1a2540" }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-5 py-5"
        style={{ borderBottom: "1px solid #1a2540" }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #22d3ee 100%)",
          }}
        >
          <Cloud size={16} className="text-white" />
        </div>
        <div>
          <div className="text-white font-semibold text-sm tracking-wide">
            NimbusDrive
          </div>
          <div className="text-[10px]" style={{ color: "#64748b" }}>
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
                    ? "linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(34,211,238,0.1) 100%)"
                    : "transparent",
                  border: isActive
                    ? "1px solid rgba(59,130,246,0.3)"
                    : "1px solid transparent",
                }}
              >
                <Icon
                  size={16}
                  style={{ color: isActive ? "#22d3ee" : "#475569" }}
                  className="shrink-0 transition-colors group-hover:text-blue-400"
                />
                <span
                  className="text-sm transition-colors"
                  style={{
                    color: isActive ? "#e2e8f0" : "#64748b",
                    fontWeight: isActive ? 500 : 400,
                  }}
                >
                  {item.label}
                </span>
                {isActive && (
                  <ChevronRight
                    size={12}
                    className="ml-auto"
                    style={{ color: "#3b82f6" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Storage Usage */}
      <div className="px-4 py-4" style={{ borderTop: "1px solid #1a2540" }}>
        <div
          className="rounded-xl p-3"
          style={{ background: "#0d1829", border: "1px solid #1a2540" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={13} style={{ color: "#3b82f6" }} />
            <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>
              Storage Used
            </span>
          </div>
          {storageLoading ? (
            <div
              className="flex items-center gap-2 text-xs"
              style={{ color: "#64748b" }}
            >
              <LoadingSpinner size={12} />
              Loading storage...
            </div>
          ) : storageError ? (
            <div className="text-xs" style={{ color: "#f87171" }}>
              Storage unavailable
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-2">
                <span
                  className="text-xs font-medium"
                  style={{ color: "#e2e8f0" }}
                >
                  {usedHuman || "—"} of {limitHuman || "—"}
                </span>
                {/* Persentase tidak ditampilkan */}
                <span className="text-xs" style={{ color: "#64748b" }} />
              </div>

              <div
                className="relative h-1.5 rounded-full overflow-hidden"
                style={{ background: "#1e2d45" }}
              >
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all"
                  style={{
                    width: `${usagePercent}%`,
                    background: "linear-gradient(90deg, #3b82f6, #22d3ee)",
                  }}
                />
              </div>
              <div className="mt-2.5 text-xs" style={{ color: "#475569" }}>
                {Math.max(0, 100 - usagePercent)}% free remaining
              </div>
            </>
          )}
        </div>

        <button
          className="mt-3 w-full py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)",
            color: "#fff",
          }}
        >
          ↑ Upgrade to Pro
        </button>
      </div>
    </aside>
  );
}
