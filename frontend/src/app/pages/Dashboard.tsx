

import { useEffect, useRef, useState } from "react";

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
  try {
    if (theme === "light" || theme === "dark") return theme;
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    return mq?.matches ? "dark" : "light";
  } catch {
    return "dark";
  }
}

import {
  HardDrive,

  FileText,
  Share2,
  Monitor,
  TrendingUp,
  TrendingDown,
  Film,
  Archive,
  Music,
  FileCode,
  Cpu,
  MemoryStick,
  CheckCircle,
  RefreshCw,
  Clock,
  Eye,
  Download,
  Trash2,
  Edit3,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import storageService, {
  type StorageInfo,
} from "../../services/storageService";
import storageBreakdownService, {
  getStorageBreakdown,
  type StorageBreakdownInfo,
} from "../../services/storageBreakdownService";

import recentFileService, {
  type RecentFile,
} from "../../services/recentFileService";
import { getShareLinks } from "../../services/shareService";
import { getDevices } from "../../services/deviceService";
import type { Device } from "../../services/deviceService";



import { getActivityLogs } from "../../services/activityLogService";
import {
  getServerMonitor,
  type ServerMonitorResponse,
} from "../../services/serverMonitorService";



import { LoadingSpinner } from "../components/LoadingSpinner";

import { FileTypeIcon } from "../components/FileTypeIcon";
import { DashboardStatCard } from "./dashboard/components/DashboardStatCard";
import { toLoadAverage, toPercent } from "./dashboard/dashboardFormatters";


type RecentFileUI = RecentFile & {
  display_date: string;
};

const statCards = [
  {
    label: "Storage Used",
    value: "",
    sub: "",
    change: "+12%",
    up: true,
    icon: HardDrive,
    color: "#3b82f6",
    glow: "rgba(59,130,246,0.2)",
    kind: "storage" as const,
  },
  {
    label: "Files",
    value: "",
    sub: "",
    change: "+8%",
    up: true,
    icon: FileText,
    color: "#22d3ee",
    glow: "rgba(34,211,238,0.2)",
    kind: "files" as const,
  },
  {
    label: "Shared Links",
    value: "",
    sub: "active links",
    change: "Real API",
    up: true,
    icon: Share2,
    color: "#22d3ee",
    glow: "rgba(34,211,238,0.2)",
    kind: "shared" as const,
  },
  {
    label: "Active Devices",
    value: "",
    sub: "connected",
    change: "+1",
    up: true,
    icon: Monitor,
    color: "#34d399",
    glow: "rgba(52,211,153,0.2)",
    kind: "devices" as const,
  },
];

// Dummy recent files removed; Dashboard uses backend GET /api/files/recent.


const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div
        className="rounded-lg px-3 py-2 text-xs"
        style={{
          background: "#0f1729",
          border: "1px solid #1a2540",
          color: "#94a3b8",
        }}
      >
        {payload.map((p: any, i: number) => (
          <div key={i}>
            {p.name}:{" "}
            <span style={{ color: p.color }}>{Math.round(p.value)}%</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function Dashboard() {
  const [appearanceTheme, setAppearanceTheme] = useState<AppearanceTheme>(safeReadAppearanceTheme);
  const [accentColor, setAccentColor] = useState<string>(safeReadAccentColor);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(resolveAppearanceTheme(safeReadAppearanceTheme()));

  const [openDashboardMenuId, setOpenDashboardMenuId] = useState<string | null>(null);
  const [dashboardMenuPosition, setDashboardMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const dashboardMenuWrapRef = useRef<HTMLDivElement | null>(null);

  const navigateToMyFiles = () => {
    const nextPath = "/my-files";
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  };



  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [storageBreakdownInfo, setStorageBreakdownInfo] = useState<StorageBreakdownInfo | null>(null);
  const [storageBreakdownLoading, setStorageBreakdownLoading] = useState(false);
  const [storageBreakdownError, setStorageBreakdownError] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");


  const [sharedLinksCount, setSharedLinksCount] = useState<number | null>(
    null
  );
  const [sharedLinksLoading, setSharedLinksLoading] = useState(false);
  const [sharedLinksError, setSharedLinksError] = useState(false);

  const [activeDevicesCount, setActiveDevicesCount] = useState<number>(0);
  const [activeDevicesLoading, setActiveDevicesLoading] = useState(false);
  const [activeDevicesError, setActiveDevicesError] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);

  const [recentActivity, setRecentActivity] = useState<any[]>([]);


  const [recentActivityLoading, setRecentActivityLoading] = useState(false);
  const [recentActivityError, setRecentActivityError] = useState(false);

  const [serverMonitor, setServerMonitor] =
    useState<ServerMonitorResponse | null>(null);
  const [serverMonitorLoading, setServerMonitorLoading] = useState(false);
  const [serverMonitorError, setServerMonitorError] = useState(false);

  // existing UI keeps fileMenu actions as placeholders

  // (won't affect recent files rendering)

  const [recentFiles, setRecentFiles] = useState<RecentFileUI[]>([]);
  const [recentFilesLoading, setRecentFilesLoading] = useState(false);
  const [recentFilesError, setRecentFilesError] = useState(false);





  useEffect(() => {
    const syncThemeFromStorage = () => {
      const nextTheme = safeReadAppearanceTheme();
      const nextAccent = safeReadAccentColor();
      setAppearanceTheme(nextTheme);
      setAccentColor(nextAccent);
      setResolvedTheme(resolveAppearanceTheme(nextTheme));
    };

    // initial sync
    try {
      syncThemeFromStorage();
    } catch {
      // ignore
    }

    if (typeof window === "undefined") return;

    const onNimbusAppearanceChange = () => syncThemeFromStorage();

    window.addEventListener(
      "nimbus-appearance-change",
      onNimbusAppearanceChange
    );
    window.addEventListener("storage", onNimbusAppearanceChange);
    window.addEventListener("focus", onNimbusAppearanceChange);

    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia?.("(prefers-color-scheme: dark)") ?? null;
      const onMqChange = () => syncThemeFromStorage();
      mq?.addEventListener?.("change", onMqChange);

      return () => {
        mq?.removeEventListener?.("change", onMqChange);
        window.removeEventListener(
          "nimbus-appearance-change",
          onNimbusAppearanceChange
        );
        window.removeEventListener("storage", onNimbusAppearanceChange);
        window.removeEventListener("focus", onNimbusAppearanceChange);
      };
    } catch {
      return () => {
        window.removeEventListener(
          "nimbus-appearance-change",
          onNimbusAppearanceChange
        );
        window.removeEventListener("storage", onNimbusAppearanceChange);
        window.removeEventListener("focus", onNimbusAppearanceChange);
      };
    }
  }, []);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!openDashboardMenuId) return;
      const wrap = dashboardMenuWrapRef.current;
      const target = e.target as Node | null;
      if (!wrap) {
        setOpenDashboardMenuId(null);
        setDashboardMenuPosition(null);
        return;
      }
      if (!target) return;
      if (!wrap.contains(target)) {
        setOpenDashboardMenuId(null);
        setDashboardMenuPosition(null);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [openDashboardMenuId]);

  useEffect(() => {
    let cancelled = false;

    const runStorage = async () => {
      try {
        setLoading(true);
        setError("");
        const info = await storageService.getStorageInfo();
        if (!cancelled) setStorageInfo(info);
      } catch (e) {
        if (!cancelled) setError("Dashboard data unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const runRecent = async () => {
      try {
        setRecentFilesLoading(true);
        setRecentFilesError(false);

        const data = await recentFileService.getRecentFiles();
        if (!cancelled) {
          const mapped: RecentFileUI[] = data.map((f) => ({
            ...f,
            display_date:
              f.created_at || f.updated_at
                ? new Date(f.created_at || f.updated_at || "").toLocaleString()
                : "-",
          }));
          setRecentFiles(mapped);
        }
      } catch (e) {
        if (!cancelled) setRecentFilesError(true);
      } finally {
        if (!cancelled) setRecentFilesLoading(false);
      }
    };

    const runSharedLinksCount = async () => {
      try {
        setSharedLinksLoading(true);
        setSharedLinksError(false);

        const payload = await getShareLinks();

        let count = 0;
        if (Array.isArray(payload)) {
          count = payload.length;
        } else if (payload && typeof payload === "object") {
          const maybe = (payload as any).data;
          if (Array.isArray(maybe)) count = maybe.length;
        }

        if (!cancelled) setSharedLinksCount(count);
      } catch (e) {
        if (!cancelled) {
          setSharedLinksError(true);
          setSharedLinksCount(0);
        }
      } finally {
        if (!cancelled) setSharedLinksLoading(false);
      }
    };

    const runActiveDevicesCount = async () => {
      try {
        setActiveDevicesLoading(true);
        setActiveDevicesError(false);

        const payload = await getDevices();

        let count = 0;
        let items: Device[] = [];
        if (Array.isArray(payload)) {
          count = payload.length;
          items = payload;
        } else if (payload && typeof payload === "object") {
          const maybe = (payload as any).data;
          if (Array.isArray(maybe)) {
            count = maybe.length;
            items = maybe;
          }
        }

        if (!cancelled) {
          setActiveDevicesCount(count);
          setDevices(items);
        }
      } catch (e) {
        if (!cancelled) {
          setActiveDevicesError(true);
          setActiveDevicesCount(0);
          setDevices([]);
        }
      } finally {
        if (!cancelled) setActiveDevicesLoading(false);
      }
    };

    const runRecentActivity = async () => {
      try {
        setRecentActivityLoading(true);
        setRecentActivityError(false);

        const response = await getActivityLogs();
        const items = Array.isArray(response?.data)
          ? response.data.slice(0, 5)
          : [];

        if (!cancelled) {
          setRecentActivity(items);
        }
      } catch (e) {
        if (!cancelled) {
          setRecentActivityError(true);
          setRecentActivity([]);
        }
      } finally {
        if (!cancelled) setRecentActivityLoading(false);
      }
    };

    const runStorageBreakdown = async () => {
      try {
        setStorageBreakdownLoading(true);
        setStorageBreakdownError(false);

        const data = await getStorageBreakdown();
        if (!cancelled) setStorageBreakdownInfo(data);
      } catch (e) {
        if (!cancelled) {
          setStorageBreakdownError(true);
          setStorageBreakdownInfo(null);
        }
      } finally {
        if (!cancelled) setStorageBreakdownLoading(false);
      }
    };

    const runServerMonitor = async () => {
      try {
        setServerMonitorLoading(true);
        setServerMonitorError(false);

        const response = await getServerMonitor();
        if (!cancelled) setServerMonitor(response);
      } catch (e) {
        if (!cancelled) {
          setServerMonitorError(true);
          setServerMonitor(null);
        }
      } finally {
        if (!cancelled) setServerMonitorLoading(false);
      }
    };

    runStorage();
    runStorageBreakdown();
    runRecent();
    runSharedLinksCount();
    runActiveDevicesCount();
    runRecentActivity();
    runServerMonitor();

    return () => {
      cancelled = true;
    };
  }, []);



  const serverStatusLabel = serverMonitorLoading
    ? "Checking"
    : serverMonitorError
      ? "Offline"
      : "Online";
  const serverStatusColor = serverMonitorLoading
    ? "#60a5fa"
    : serverMonitorError
      ? "#f87171"
      : "#34d399";
  const serverStatusBackground = serverMonitorLoading
    ? "rgba(96,165,250,0.1)"
    : serverMonitorError
      ? "rgba(248,113,113,0.1)"
      : "rgba(52,211,153,0.1)";
  const serverStatusBorder = serverMonitorLoading
    ? "rgba(96,165,250,0.2)"
    : serverMonitorError
      ? "rgba(248,113,113,0.2)"
      : "rgba(52,211,153,0.2)";

  const cpuLoad1m = toLoadAverage(serverMonitor?.cpu?.load_1m);
  const memoryUsage = toPercent(serverMonitor?.memory?.usage_percent);
  const diskUsage = toPercent(serverMonitor?.disk?.usage_percent);

  const serverMetrics = [
    {
      label: "CPU Load",
      value: cpuLoad1m.toFixed(2),
      suffix: "",
      color: "#3b82f6",
      data: [
        { time: "15m", value: toLoadAverage(serverMonitor?.cpu?.load_15m) },
        { time: "5m", value: toLoadAverage(serverMonitor?.cpu?.load_5m) },
        { time: "1m", value: cpuLoad1m },
      ],
    },
    {
      label: "Memory Usage",
      value: memoryUsage,
      suffix: "%",
      color: "#22d3ee",

      data: [
        { time: "15m", value: memoryUsage },
        { time: "5m", value: memoryUsage },
        { time: "1m", value: memoryUsage },
      ],
    },
    {
      label: "Disk Usage",
      value: diskUsage,
      suffix: "%",
      color: "#22d3ee",
      data: [
        { time: "15m", value: diskUsage },
        { time: "5m", value: diskUsage },
        { time: "1m", value: diskUsage },
      ],
    },
  ];

  const dashboardColors =
    resolvedTheme === "light"
      ? {
          pageBg: "#f8fafc",
          cardBg: "#ffffff",
          panelBg: "#f1f5f9",
          border: "#dbe3ef",
          title: "#0f172a",
          text: "#334155",
          muted: "#64748b",
          muted2: "#94a3b8",
          iconBg: `${accentColor}12`,
          iconBorder: `${accentColor}33`,
        }
      : {
          pageBg: "#111c2f",
          cardBg: "#0f1729",
          panelBg: "#0d1829",
          border: "#1a2540",
          title: "#e2e8f0",
          text: "#cbd5e1",
          muted: "#64748b",
          muted2: "#475569",
          iconBg: "rgba(59,130,246,0.12)",
          iconBorder: "rgba(59,130,246,0.25)",
        };

  // theme-aware small surface colors used by Server Status / Recent Activity / table borders
  const themeUI =
    resolvedTheme === "light"
      ? {
          subtleBg: "#f8fafc",
          subtleBg2: "#f1f5f9",
          divider: "#e5eaf1",
          dividerSoft: "#eef2f7",
          rowHoverBg: "rgba(59,130,246,0.06)",
          rowDivider: "#e7edf5",
          textMutedStrong: "#475569",
          textMutedSoft: "#64748b",
        }
      : {
          subtleBg: "#0f1729",
          subtleBg2: "#0d1829",
          divider: "#1a2540",
          dividerSoft: "#122043",
          rowHoverBg: "rgba(59,130,246,0.08)",
          rowDivider: "#0a1020",
          textMutedStrong: "#64748b",
          textMutedSoft: "#94a3b8",
        };

  return (
    <div
      className="flex-1 overflow-y-auto p-6 nimbus-scrollbar"
      style={{ background: dashboardColors.pageBg }}
    >


      {/* Welcome */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: dashboardColors.title }}>
            Welcome back, Alex
          </h1>
          <p className="text-sm mt-0.5" style={{ color: dashboardColors.muted }}>
            Here's what's happening with your cloud today.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          const storageValue =
            card.kind === "storage"

              ? storageInfo?.used_human
              : card.kind === "files"
                ? (storageInfo?.file_count?.toString?.() ??
                  storageInfo?.file_count)
                : card.kind === "shared"
                  ? sharedLinksLoading
                    ? "..."
                    : sharedLinksError
                      ? 0
                      : sharedLinksCount ?? 0
                  : card.kind === "devices"
                    ? activeDevicesLoading
                      ? "..."
                      : activeDevicesError
                        ? 0
                        : activeDevicesCount
                    : "4";



          const storageSub =
            card.kind === "storage"
              ? storageInfo?.limit_human
                ? `of ${storageInfo.limit_human}`
                : ""
              : card.kind === "files"
                ? "total files"
                : card.sub;
          const showStorageLoading =
            loading && (card.kind === "storage" || card.kind === "files");
          return (
            <DashboardStatCard
              key={card.label}
              title={card.label}
              value={showStorageLoading ? <LoadingSpinner size={20} /> : storageValue ?? card.value}
              subtitle={storageSub ?? card.sub}
              changeLabel={card.change}
              changeTone={card.up ? "up" : "down"}
              changeIcon={card.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              icon={
                Icon ? (
                  <Icon size={18} style={{ color: card.color }} />
                ) : (
                  <span style={{ color: card.color }}>{"•"}</span>
                )
              }
              textColor={dashboardColors.title}
              mutedColor={dashboardColors.muted}
              mutedColor2={dashboardColors.muted2}
              backgroundColor={dashboardColors.cardBg}
              borderColor={dashboardColors.border}
              iconBackgroundColor={dashboardColors.iconBg}
              iconBorderColor={dashboardColors.iconBorder}
              className="rounded-xl p-4 transition-all hover:scale-[1.02]"
            />
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* My Files Table */}
        <div
          className="col-span-2 rounded-xl overflow-hidden"
          style={{
            background: dashboardColors.cardBg,
            border: `1px solid ${dashboardColors.border}`,
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: `1px solid ${themeUI.divider}` }}
          >
              <span
                className="text-sm font-semibold"
                style={{ color: dashboardColors.title }}
              >
                My Files
              </span>
            <button
              type="button"
              className="text-xs hover:underline"
              style={{ color: accentColor }}
              onClick={() => navigateToMyFiles()}
            >
              View All
            </button>
          </div>
          <div>
            <div
            className="grid px-4 py-2"
            style={{
              gridTemplateColumns: "1fr 160px 80px 36px",
              borderBottom: `1px solid ${themeUI.dividerSoft}`,
            }}
          >
              {["Name", "Modified", "Size", ""].map((h, i) => (
                <span
                  key={i}
                  className="text-xs font-medium"
                  style={{ color: dashboardColors.text }}
                >
                  {h}
                </span>
              ))}
            </div>

            {recentFilesLoading ? (
                <div className="flex items-center gap-2 px-4 py-3 text-xs" style={{ color: dashboardColors.muted }}>
                <LoadingSpinner size={12} />
                Loading recent files...
              </div>

            ) : recentFilesError ? (
              <div className="px-4 py-3 text-xs" style={{ color: "#f87171" }}>
                Recent files unavailable
              </div>

            ) : recentFiles.length === 0 ? (
              <div className="px-4 py-3 text-xs" style={{ color: dashboardColors.muted }}>
                Belum ada file terbaru.
              </div>

            ) : (
              recentFiles.map((file, i) => (
                  <div
                    key={file.id}
                    className="grid px-4 py-2.5 items-center transition-colors cursor-pointer group relative"
                    style={{
                      gridTemplateColumns: "1fr 160px 80px 36px",
                      borderBottom: `1px solid ${themeUI.rowDivider}`,
                      backgroundColor: resolvedTheme === "light" ? "#ffffff" : "transparent",
                    }}
                  >
                  <div className="flex items-center gap-2.5">
                    <FileTypeIcon
                      originalName={file.original_name}
                      mimeType={file.mime_type}
                      className="w-7 h-7"
                      size={14}
                    />
                    <span className="text-sm" style={{ color: dashboardColors.text }}>
                      {file.original_name}
                    </span>

                   </div>
                  <span className="text-xs" style={{ color: dashboardColors.text }}>

                    {file.display_date}
                  </span>
                  <span className="text-xs" style={{ color: dashboardColors.text }}>
                    {file.size_human}
                  </span>

                  <div className="relative">
                  
                  </div>
                </div>
              ))
            )}
          </div>
              <div
                className="flex justify-center py-2.5"
                style={{ borderTop: `1px solid ${themeUI.divider}` }}
              >
          </div>
        </div>

        {/* Storage Overview */}
        <div className="flex flex-col gap-4">
          <div
            className="rounded-xl p-4"
            style={{ background: dashboardColors.cardBg, border: `1px solid ${dashboardColors.border}` }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-sm font-semibold"
                style={{ color: dashboardColors.title }}
              >
                Storage Overview
              </span>
              <button
                type="button"
                className="text-xs"
                style={{ color: accentColor }}
                title="Storage details"
              >
                Details
              </button>
            </div>
            <div className="flex items-center justify-center mb-3">
              {(() => {
                const usedPercentRaw = storageInfo?.usage_percent;
                const usedPercent =
                  typeof usedPercentRaw === "number"
                    ? usedPercentRaw
                    : parseFloat(String(usedPercentRaw ?? 0)) || 0;

                const safeUsedPercent = Math.round(
                  Math.max(0, Math.min(100, usedPercent))
                );
                const safeFreePercent = Math.max(0, 100 - safeUsedPercent);

                const realStorageBreakdown = [
                  {
                    name: "Used",
                    value: safeUsedPercent,
                    color: "#3b82f6",
                  },
                  {
                    name: "Free",
                    value: safeFreePercent,
                    color: "#1e2d45",
                  },
                ];

                const categoryColorByKey: Record<string, string> = {
                  photos: "#3b82f6",
                  videos: "#22d3ee",
                  documents: "#a78bfa",
                  music: "#34d399",
                  others: "#f59e0b",
                };

                const fallbackCategories = [
                  { key: "photos", name: "Photos", bytes: 0, human: "0 B", share_percent: 0, quota_percent: 0 },
                  { key: "videos", name: "Videos", bytes: 0, human: "0 B", share_percent: 0, quota_percent: 0 },
                  { key: "documents", name: "Documents", bytes: 0, human: "0 B", share_percent: 0, quota_percent: 0 },
                  { key: "music", name: "Music", bytes: 0, human: "0 B", share_percent: 0, quota_percent: 0 },
                  { key: "others", name: "Others", bytes: 0, human: "0 B", share_percent: 0, quota_percent: 0 },
                ];

                const categoriesFromApi = storageBreakdownInfo?.categories;
                const breakdownCategories = Array.isArray(categoriesFromApi) && categoriesFromApi.length
                  ? fallbackCategories.map((fb) =>
                      categoriesFromApi.find((c) => c?.key === fb.key) ? categoriesFromApi.find((c) => c?.key === fb.key)! : fb
                    )
                  : fallbackCategories;

                const pieData = breakdownCategories.map((c) => ({
                  key: c.key,
                  name: c.name,
                  value: typeof c.share_percent === "number" ? c.share_percent : Number(c.share_percent ?? 0) || 0,
                  human: c.human,
                  bytes: c.bytes,
                }));

                const usagePercentRaw = storageBreakdownInfo?.usage_percent ?? storageInfo?.usage_percent ?? 0;
                const usagePercent =
                  typeof usagePercentRaw === "number"
                    ? usagePercentRaw
                    : parseFloat(String(usagePercentRaw ?? 0)) || 0;

                const displayUsageText = storageBreakdownLoading
                  ? "..."
                  : storageBreakdownError
                    ? "0%"
                    : usagePercent > 0 && usagePercent < 1
                      ? "<1%"
                      : `${Math.round(usagePercent)}%`;

                return (
                  <div className="relative">
                    <PieChart width={140} height={140}>
                      <Pie
                        data={pieData}
                        cx={65}
                        cy={65}
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={categoryColorByKey[entry.key] ?? "#3b82f6"}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span
                        className="text-lg font-bold"
                        style={{ color: dashboardColors.title }}
                      >
                        {displayUsageText}
                      </span>
                      <span className="text-[10px]" style={{ color: dashboardColors.muted }}>
                        Used
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="space-y-2">
              {(() => {
                const categoryColorByKey: Record<string, string> = {
                  photos: "#3b82f6",
                  videos: "#22d3ee",
                  documents: "#a78bfa",
                  music: "#34d399",
                  others: "#f59e0b",
                };

                const fallbackCategories = [
                  { key: "photos", name: "Photos", bytes: 0, human: "0 B", share_percent: 0, quota_percent: 0 },
                  { key: "videos", name: "Videos", bytes: 0, human: "0 B", share_percent: 0, quota_percent: 0 },
                  { key: "documents", name: "Documents", bytes: 0, human: "0 B", share_percent: 0, quota_percent: 0 },
                  { key: "music", name: "Music", bytes: 0, human: "0 B", share_percent: 0, quota_percent: 0 },
                  { key: "others", name: "Others", bytes: 0, human: "0 B", share_percent: 0, quota_percent: 0 },
                ];

                const categoriesFromApi = storageBreakdownInfo?.categories;
                const breakdownCategories = Array.isArray(categoriesFromApi) && categoriesFromApi.length
                  ? fallbackCategories.map((fb) =>
                      categoriesFromApi.find((c) => c?.key === fb.key) ? categoriesFromApi.find((c) => c?.key === fb.key)! : fb
                    )
                  : fallbackCategories;

                return breakdownCategories.map((item) => (
                  <div key={item.key} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: categoryColorByKey[item.key] ?? "#3b82f6" }}
                    />
                    <span className="text-xs flex-1" style={{ color: dashboardColors.text }}>
                      {item.name}
                    </span>
                    <span
                      className="text-xs font-medium"
                      style={{ color: dashboardColors.muted2 }}
                    >
                      {typeof item.share_percent === "number" ? item.share_percent : Number(item.share_percent ?? 0) || 0}%
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Recent Activity */}
          <div
            className="rounded-xl p-4 flex-1"
                style={{
                  background: dashboardColors.cardBg,
                  border: `1px solid ${dashboardColors.border}`,
                }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-sm font-semibold"
                style={{ color: dashboardColors.title }}
              >
                Recent Activity
              </span>
              <button
                className="text-xs"
                style={{ color: accentColor }}
                title="See all"
              >
                See All
              </button>
            </div>
            <div className="space-y-3">
              {recentActivityLoading ? (
                <div className="text-xs" style={{ color: dashboardColors.muted2 }}>
                  Loading activity...
                </div>
              ) : recentActivityError ? (
                <div className="text-xs" style={{ color: "#f87171" }}>
                  Failed to load activity
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-xs" style={{ color: dashboardColors.muted2 }}>
                  No recent activity yet
                </div>
              ) : (
                recentActivity.map((item, i) => (
                  <div key={item.id ?? i} className="flex items-start gap-2.5">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5"
                      style={{
                        background:
                          resolvedTheme === "light"
                            ? `${accentColor}14`
                            : "rgba(59,130,246,0.16)",
                        color: accentColor,
                        border:
                          resolvedTheme === "light"
                            ? `1px solid ${accentColor}2A`
                            : "1px solid rgba(59,130,246,0.22)",
                      }}
                    >
                      {"\u2022"}
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: dashboardColors.text }}>
                        <span style={{ color: dashboardColors.title }}>
                          {item.description || item.action || "Activity"}
                        </span>
                      </div>
                      <div
                        className="text-[10px] mt-0.5"
                        style={{ color: themeUI.textMutedStrong }}
                      >
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : "-"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {openDashboardMenuId && dashboardMenuPosition ? (
        <div
          ref={dashboardMenuWrapRef}
          className="rounded-lg shadow-2xl overflow-hidden"
          style={{
            position: "fixed",
            top: dashboardMenuPosition.y,
            left: dashboardMenuPosition.x,
            width: 176,
            zIndex: 9999,
            background:
              resolvedTheme === "light" ? "#ffffff" : themeUI.subtleBg2,
            border: `1px solid ${themeUI.divider}`,
            boxShadow: "0 20px 60px rgba(0,0,0,0.22)",
            backgroundClip: "padding-box",
            isolation: "isolate",
          }}
          role="menu"
          aria-label="Dashboard item menu"
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onClick={(e) => {
            e.stopPropagation();
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        >
          {([
            { icon: Eye, label: "Preview", danger: false },
            { icon: Download, label: "Download", danger: false },
            { icon: Share2, label: "Share", danger: false },
            { icon: Edit3, label: "Rename", danger: false },
            { icon: Trash2, label: "Delete", danger: true },
          ] as const).map((action) => {
            const AIcon = action.icon;
            return (
                <button
                  key={action.label}
                  type="button"
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors"
                  style={{
                    color: action.danger ? "#f87171" : dashboardColors.muted2,
                    background: "transparent",
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    el.style.background = action.danger
                      ? "rgba(248,113,113,0.12)"
                      : `${accentColor}10`;
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.background = "transparent";
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setOpenDashboardMenuId(null);
                    setDashboardMenuPosition(null);
                    navigateToMyFiles();
                  }}
                role="menuitem"
                aria-label={action.label}
              >
                <AIcon size={12} />
                {action.label}
                </button>
            );
          })}
        </div>
      ) : null}

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-4">

        {/* Server Status */}
          <div
            className="col-span-2 rounded-xl p-4"
            style={{
              background: dashboardColors.cardBg,
              border: `1px solid ${dashboardColors.border}`,
            }}
          >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span
                className="text-sm font-semibold"
                style={{ color: dashboardColors.title }}
              >
                Server Status
              </span>
              <span
                className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: serverStatusBackground,
                  color: serverStatusColor,
                  border: `1px solid ${serverStatusBorder}`,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ background: serverStatusColor }}
                />
                {serverStatusLabel}
              </span>
            </div>
            <span className="text-xs" style={{ color: dashboardColors.muted2 }}>
              {serverMonitor?.server.hostname || "NimbusDrive Server"}
            </span>

          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {serverMetrics.map((metric) => (
              <div key={metric.label}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs" style={{ color: dashboardColors.muted }}>
                    {metric.label}
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: metric.color }}
                  >
                    {metric.value}
                    {metric.suffix}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={50}>
                  <AreaChart data={metric.data}>
                    <defs>
                      <linearGradient
                        id={`g-${metric.label}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={metric.color}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={metric.color}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={metric.color}
                      strokeWidth={1.5}
                      fill={`url(#g-${metric.label})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>

          {/* Server Details Grid */}
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg" style={{ background: themeUI.subtleBg2, border: `1px solid ${themeUI.dividerSoft}` }}>
              <div style={{ color: dashboardColors.muted }}>OS</div>
              <div className="font-semibold mt-1" style={{ color: dashboardColors.text }}>
                {serverMonitor?.server.os_name || "N/A"}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: dashboardColors.muted2 }}>
                {serverMonitor?.server.os_version || ""}
              </div>
            </div>

            <div className="p-3 rounded-lg" style={{ background: themeUI.subtleBg2, border: `1px solid ${themeUI.dividerSoft}` }}>
              <div style={{ color: dashboardColors.muted }}>CPU</div>
              <div className="font-semibold mt-1" style={{ color: dashboardColors.text }}>
                {serverMonitor?.cpu.logical_cores || 0} cores
              </div>
              <div className="text-[10px] mt-0.5 truncate" style={{ color: dashboardColors.muted2 }}>
                {serverMonitor?.cpu.model || "Unknown"}
              </div>
            </div>

            <div className="p-3 rounded-lg" style={{ background: themeUI.subtleBg2, border: `1px solid ${themeUI.dividerSoft}` }}>
              <div style={{ color: dashboardColors.muted }}>Memory</div>
              <div className="font-semibold mt-1" style={{ color: dashboardColors.text }}>
                {serverMonitor?.memory?.total_bytes
                  ? `${(serverMonitor.memory.total_bytes / 1024 / 1024 / 1024).toFixed(1)}GB`
                  : "N/A"}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: dashboardColors.muted2 }}>
                {serverMonitor?.memory?.used_bytes
                  ? `${(serverMonitor.memory.used_bytes / 1024 / 1024 / 1024).toFixed(1)}GB used`
                  : ""}
              </div>
            </div>

            <div className="p-3 rounded-lg" style={{ background: themeUI.subtleBg2, border: `1px solid ${themeUI.dividerSoft}` }}>
              <div style={{ color: dashboardColors.muted }}>Uptime</div>
              <div className="font-semibold mt-1" style={{ color: dashboardColors.text }}>
                {serverMonitor?.server?.uptime_seconds
                  ? (() => {
                      const total = serverMonitor.server.uptime_seconds;
                      const days = Math.floor(total / 86400);
                      const hours = Math.floor((total % 86400) / 3600);
                      if (days > 0) return `${days}d ${hours}h`;
                      return `${hours}h`;
                    })()
                  : "N/A"}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: dashboardColors.muted2 }}>
                System uptime
              </div>
            </div>
          </div>
        </div>

        {/* Connected Devices */}
        <div
          className="rounded-xl p-4"
          style={{ background: dashboardColors.cardBg, border: `1px solid ${dashboardColors.border}` }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-sm font-semibold"
              style={{ color: dashboardColors.title }}
            >
              Connected Devices
            </span>
            <RefreshCw size={13} style={{ color: "#3b82f6" }} />
          </div>
          <div className="flex flex-col items-center justify-center py-2 mb-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-2"
              style={{
                background: "rgba(52,211,153,0.1)",
                border: "2px solid rgba(52,211,153,0.3)",
              }}
            >
              {activeDevicesLoading ? (
                <RefreshCw size={24} style={{ color: "#3b82f6" }} />
              ) : (
                <CheckCircle
                  size={24}
                  style={{ color: activeDevicesError ? "#f87171" : "#34d399" }}
                />
              )}
            </div>
            <span className="text-sm font-medium" style={{ color: "#e2e8f0" }}>
              {activeDevicesLoading
                ? "Checking devices"
                : activeDevicesError
                  ? "Devices unavailable"
                  : devices.length === 0
                    ? "No devices connected"
                    : `${devices.length} device(s) connected`}
            </span>
            <span className="text-xs mt-0.5" style={{ color: "#475569" }}>
              {activeDevicesLoading
                ? "Loading device status..."
                : activeDevicesError
                  ? "Unable to load devices"
                  : devices.length === 0
                    ? "No device activity yet"
                    : "Showing latest known devices"}
            </span>
          </div>
          <div className="space-y-2">
            {devices.slice(0, 3).map((device, i) => {
              const platformBrowser = [device.platform, device.browser]
                .filter(Boolean)
                .join(" ");
              const deviceName =
                device.display_name || platformBrowser || "Unknown device";
              const lastSeen = device.last_seen_at
                ? new Date(device.last_seen_at).toLocaleString()
                : "Never seen";
              const dotColor = device.trusted ? "#34d399" : "#f59e0b";

              return (
                  <div
                    key={device.id ?? i}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg"
                    style={{ background: dashboardColors.panelBg }}
                  >
                  <div className="flex items-center gap-2">
                    <Monitor size={12} style={{ color: accentColor }} />
                    <span className="text-xs" style={{ color: dashboardColors.text }}>
                      {deviceName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: dotColor }}
                    />
                    <span className="text-[10px]" style={{ color: dashboardColors.muted }}>
                      {lastSeen}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
