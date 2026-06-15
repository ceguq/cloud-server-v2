
import { useEffect, useState } from "react";
import {
  HardDrive,
  FileText,
  Share2,
  Monitor,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Film,
  Archive,
  Music,
  FileCode,
  Cpu,
  MemoryStick,
  Activity,
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
import recentFileService, {
  type RecentFile,
} from "../../services/recentFileService";
import { getShareLinks } from "../../services/shareService";
import { getDevices } from "../../services/deviceService";
import { getActivityLogs } from "../../services/activityLogService";

import { LoadingSpinner } from "../components/LoadingSpinner";

import { FileTypeIcon } from "../components/FileTypeIcon";


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
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.2)",
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

const storageBreakdown = [
  { name: "Photos", value: 38, color: "#3b82f6" },
  { name: "Videos", value: 22, color: "#22d3ee" },
  { name: "Documents", value: 18, color: "#a78bfa" },
  { name: "Music", value: 12, color: "#34d399" },
  { name: "Others", value: 10, color: "#f59e0b" },
];

const serverData = Array.from({ length: 12 }, (_, i) => ({
  time: `${i * 2}:00`,
  cpu: 20 + Math.random() * 40,
  memory: 45 + Math.random() * 30,
  storage: 60 + Math.random() * 10,
}));
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
  const [fileMenu, setFileMenu] = useState<number | null>(null);

  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
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

  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [recentActivityLoading, setRecentActivityLoading] = useState(false);
  const [recentActivityError, setRecentActivityError] = useState(false);

  // existing UI keeps fileMenu actions as placeholders


  // (won't affect recent files rendering)

  const [recentFiles, setRecentFiles] = useState<RecentFileUI[]>([]);
  const [recentFilesLoading, setRecentFilesLoading] = useState(false);
  const [recentFilesError, setRecentFilesError] = useState(false);

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
                : "—",
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

        // getShareLinks() currently unwraps to ShareLink[]
        // but we still guard for wrapped/unknown shapes.
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

        // getDevices() currently unwraps to Device[]
        let count = 0;
        if (Array.isArray(payload)) {
          count = payload.length;
        } else if (payload && typeof payload === "object") {
          const maybe = (payload as any).data;
          if (Array.isArray(maybe)) count = maybe.length;
        }

        if (!cancelled) setActiveDevicesCount(count);
      } catch (e) {
        if (!cancelled) {
          setActiveDevicesError(true);
          setActiveDevicesCount(0);
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

    runStorage();
    runRecent();
    runSharedLinksCount();
    runActiveDevicesCount();
    runRecentActivity();

    return () => {

      cancelled = true;
    };
  }, []);


  return (
    <div
      className="flex-1 overflow-y-auto p-6 nimbus-scrollbar"
      style={{ background: "#080d1a" }}
    >

      {/* Welcome */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#e2e8f0" }}>
            Welcome back, Alex 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#475569" }}>
            Here's what's happening with your cloud today.
          </p>
        </div>
        <button
          type="button"
          title="Customize Dashboard"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-90"
          style={{
            background: "#0d1829",
            border: "1px solid #1a2540",
            color: "#94a3b8",
          }}
        >
          <Activity size={13} />
          Customize Dashboard
        </button>
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
            <div
              key={card.label}
              className="rounded-xl p-4 transition-all hover:scale-[1.02]"
              style={{ background: "#0f1729", border: "1px solid #1a2540" }}
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{
                    background: card.glow,
                    border: `1px solid ${card.color}33`,
                  }}
                >
                  {Icon ? (
                    <Icon size={18} style={{ color: card.color }} />
                  ) : (
                    <span style={{ color: card.color }}>•</span>
                  )}
                </div>
                <span
                  className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-md"
                  style={{
                    color: card.up ? "#34d399" : "#f87171",
                    background: card.up
                      ? "rgba(52,211,153,0.1)"
                      : "rgba(248,113,113,0.1)",
                  }}
                >
                  {card.up ? (
                    <TrendingUp size={10} />
                  ) : (
                    <TrendingDown size={10} />
                  )}
                  {card.change}
                </span>
              </div>
              <div className="text-2xl font-bold" style={{ color: "#e2e8f0" }}>
                {showStorageLoading ? <LoadingSpinner size={20} /> : storageValue ?? card.value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "#475569" }}>
                {card.label}
              </div>
              <div className="text-xs mt-0.5" style={{ color: "#334155" }}>
                {storageSub ?? card.sub}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* My Files Table */}
        <div
          className="col-span-2 rounded-xl overflow-hidden"
          style={{ background: "#0f1729", border: "1px solid #1a2540" }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid #1a2540" }}
          >
            <span
              className="text-sm font-semibold"
              style={{ color: "#e2e8f0" }}
            >
              My Files
            </span>
            <button
              className="text-xs hover:underline"
              style={{ color: "#3b82f6" }}
            >
              View All
            </button>
          </div>
          <div>
            <div
              className="grid px-4 py-2"
              style={{
                gridTemplateColumns: "1fr 160px 80px 36px",
                borderBottom: "1px solid #0d1829",
              }}
            >
              {["Name", "Modified", "Size", ""].map((h, i) => (
                <span
                  key={i}
                  className="text-xs font-medium"
                  style={{ color: "#334155" }}
                >
                  {h}
                </span>
              ))}
            </div>

            {recentFilesLoading ? (
              <div className="flex items-center gap-2 px-4 py-3 text-xs" style={{ color: "#94a3b8" }}>
                <LoadingSpinner size={12} />
                Loading recent files...
              </div>
            ) : recentFilesError ? (
              <div className="px-4 py-3 text-xs" style={{ color: "#f87171" }}>
                Recent files unavailable
              </div>
            ) : recentFiles.length === 0 ? (
              <div className="px-4 py-3 text-xs" style={{ color: "#94a3b8" }}>
                Belum ada file terbaru.
              </div>
            ) : (
              recentFiles.map((file, i) => (
                <div
                  key={file.id}
                  className="grid px-4 py-2.5 items-center hover:bg-[#0d1829] transition-colors cursor-pointer group relative"
                  style={{
                    gridTemplateColumns: "1fr 160px 80px 36px",
                    borderBottom: "1px solid #0a1020",
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <FileTypeIcon
                      originalName={file.original_name}
                      mimeType={file.mime_type}
                      className="w-7 h-7"
                      size={14}
                    />
                    <span className="text-sm" style={{ color: "#cbd5e1" }}>
                      {file.original_name}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: "#475569" }}>
                    {file.display_date}
                  </span>
                  <span className="text-xs" style={{ color: "#475569" }}>
                    {file.size_human}
                  </span>
                  <div className="relative">
                    <button
                      title="More"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFileMenu(fileMenu === i ? null : i);
                      }}
                      className="w-7 h-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#1e2d45]"
                    >
                      <MoreHorizontal size={14} style={{ color: "#64748b" }} />
                    </button>
                    {fileMenu === i && (
                      <div
                        className="absolute right-0 top-8 w-40 rounded-lg shadow-2xl z-50 overflow-hidden"
                        style={{
                          background: "#0f1729",
                          border: "1px solid #1a2540",
                        }}
                      >
                        {[
                          { icon: Eye, label: "Preview" },
                          { icon: Download, label: "Download" },
                          { icon: Share2, label: "Share" },
                          { icon: Edit3, label: "Rename" },
                          {
                            icon: Trash2,
                            label: "Delete",
                            danger: true,
                          },
                        ].map((action) => {
                          const AIcon = action.icon;
                          return (
                            <button
                              key={action.label}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[#1a2540] transition-colors"
                              style={{
                                color: (action as any).danger
                                  ? "#f87171"
                                  : "#94a3b8",
                              }}
                            >
                              <AIcon size={12} />
                              {action.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div
            className="flex justify-center py-2.5"
            style={{ borderTop: "1px solid #1a2540" }}
          >
            <button className="text-xs" style={{ color: "#475569" }}>
              Showing recent uploads —{" "}
              <span style={{ color: "#3b82f6" }}>View All</span>
            </button>
          </div>
        </div>

        {/* Storage Overview */}
        <div className="flex flex-col gap-4">
          <div
            className="rounded-xl p-4"
            style={{ background: "#0f1729", border: "1px solid #1a2540" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-sm font-semibold"
                style={{ color: "#e2e8f0" }}
              >
                Storage Overview
              </span>
              <button
                type="button"
                className="text-xs"
                style={{ color: "#3b82f6" }}
                title="Storage details"
              >
                Details
              </button>
            </div>
            <div className="flex items-center justify-center mb-3">
              <div className="relative">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie
                      data={storageBreakdown}
                      cx={65}
                      cy={65}
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {storageBreakdown.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="text-lg font-bold"
                    style={{ color: "#e2e8f0" }}
                  >
                    68%
                  </span>
                  <span className="text-[10px]" style={{ color: "#475569" }}>
                    Used
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {storageBreakdown.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: item.color }}
                  />
                  <span className="text-xs flex-1" style={{ color: "#64748b" }}>
                    {item.name}
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: "#94a3b8" }}
                  >
                    {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div
            className="rounded-xl p-4 flex-1"
            style={{ background: "#0f1729", border: "1px solid #1a2540" }}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className="text-sm font-semibold"
                style={{ color: "#e2e8f0" }}
              >
                Recent Activity
              </span>
              <button
                className="text-xs"
                style={{ color: "#3b82f6" }}
                title="See all"
              >
                See All
              </button>
            </div>
            <div className="space-y-3">
              {recentActivityLoading ? (
                <div className="text-xs" style={{ color: "#94a3b8" }}>
                  Loading activity...
                </div>
              ) : recentActivityError ? (
                <div className="text-xs" style={{ color: "#f87171" }}>
                  Failed to load activity
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-xs" style={{ color: "#94a3b8" }}>
                  No recent activity yet
                </div>
              ) : (
                recentActivity.map((item, i) => (
                  <div key={item.id ?? i} className="flex items-start gap-2.5">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 mt-0.5"
                      style={{ background: "#3b82f618", color: "#3b82f6" }}
                    >
                      •
                    </div>
                    <div>
                      <div className="text-xs" style={{ color: "#cbd5e1" }}>
                        <span style={{ color: "#e2e8f0" }}>
                          {item.description || item.action || "Activity"}
                        </span>
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color: "#334155" }}>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Server Status */}
        <div
          className="col-span-2 rounded-xl p-4"
          style={{ background: "#0f1729", border: "1px solid #1a2540" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span
                className="text-sm font-semibold"
                style={{ color: "#e2e8f0" }}
              >
                Server Status
              </span>
              <span
                className="flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full"
                style={{
                  background: "rgba(52,211,153,0.1)",
                  color: "#34d399",
                  border: "1px solid rgba(52,211,153,0.2)",
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] inline-block" />
                Online
              </span>
            </div>
            <span className="text-xs" style={{ color: "#475569" }}>
              NimbusDrive Server
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "CPU Usage", value: 42, color: "#3b82f6" },
              { label: "Memory Usage", value: 67, color: "#a78bfa" },
              { label: "Storage I/O", value: 28, color: "#22d3ee" },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs" style={{ color: "#64748b" }}>
                    {metric.label}
                  </span>
                  <span
                    className="text-xs font-semibold"
                    style={{ color: metric.color }}
                  >
                    {metric.value}%
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={50}>
                  <AreaChart data={serverData}>
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
                      dataKey={
                        metric.label === "CPU Usage"
                          ? "cpu"
                          : metric.label === "Memory Usage"
                            ? "memory"
                            : "storage"
                      }
                      stroke={metric.color}
                      strokeWidth={1.5}
                      fill={`url(#g-${metric.label})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex justify-between mt-1">
                  <span className="text-[10px]" style={{ color: "#334155" }}>
                    234 MB/s
                  </span>
                  <span className="text-[10px]" style={{ color: "#334155" }}>
                    14h 30m
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sync Status */}
        <div
          className="rounded-xl p-4"
          style={{ background: "#0f1729", border: "1px solid #1a2540" }}
        >
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-sm font-semibold"
              style={{ color: "#e2e8f0" }}
            >
              Sync Status
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
              <CheckCircle size={24} style={{ color: "#34d399" }} />
            </div>
            <span className="text-sm font-medium" style={{ color: "#e2e8f0" }}>
              All synced
            </span>
            <span className="text-xs mt-0.5" style={{ color: "#475569" }}>
              All files are up to date
            </span>
          </div>
          <div className="space-y-2">
            {[
              {
                device: "MacBook Pro",
                status: "Synced",
                time: "Just now",
                color: "#34d399",
              },
              {
                device: "iPhone 15",
                status: "Synced",
                color: "#34d399",
              },
              {
                device: "Home Desktop",
                status: "Synced",
                time: "5 min ago",
                color: "#34d399",
              },
            ].map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-1.5 px-2 rounded-lg"
                style={{ background: "#0d1829" }}
              >
                <div className="flex items-center gap-2">
                  <Monitor size={12} style={{ color: "#64748b" }} />
                  <span className="text-xs" style={{ color: "#94a3b8" }}>
                    {d.device}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: d.color }}
                  />
                  <span className="text-[10px]" style={{ color: "#475569" }}>
                    {d.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
