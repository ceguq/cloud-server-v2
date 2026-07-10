import { useEffect, useMemo, useRef, useState } from "react";

import {
  getServerMonitor,
  type ServerMonitorResponse,
} from "../../services/serverMonitorService";

import {
  Server, Cpu, MemoryStick, HardDrive, Wifi, Activity,
  AlertTriangle, CheckCircle, RefreshCw,
  Globe, Clock, Zap
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";

import {
  clampPercent,
  formatBytes,
  formatCpuCores,
  formatDateTime,
  formatDuration,
  formatIpList,
  formatLoad,
  formatPercent,
} from "./server-monitor/serverMonitorFormatters";
import { ServerMonitorStatusPill } from "./server-monitor/components/ServerMonitorStatusPill";
import { ServerMonitorLoadingBanner } from "./server-monitor/components/ServerMonitorLoadingBanner";

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
  if (theme === "dark" || theme === "light") return theme;

  try {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    return mq?.matches ? "dark" : "light";
  } catch {
    return "dark";
  }
}

function withAlpha(color: string, alphaHex: string): string {
  return /^#[0-9a-f]{6}$/i.test(color) ? `${color}${alphaHex}` : color;
}

function tone(color: string, isDark: boolean) {
  return {
    background: withAlpha(color, isDark ? "24" : "14"),
    border: `1px solid ${withAlpha(color, isDark ? "55" : "40")}`,
    color,
  };
}


const ChartUnavailable = ({
  colors,
  title,
}: {
  colors: Record<string, string>;
  title: string;
}) => (
  <div
    className="relative flex h-32 items-center justify-center overflow-hidden rounded-xl border border-dashed p-5 text-center"
    style={{
      backgroundColor: colors.panelSoftBg,
      borderColor: colors.border,
    }}
  >
    {/* subtle background grid */}
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage:
          `linear-gradient(to right, ${colors.grid} 1px, transparent 1px), linear-gradient(to bottom, ${colors.grid} 1px, transparent 1px)`,
        backgroundSize: "26px 26px",
        opacity: 0.35,
      }}
    />

    <div className="relative">
      <div
        className="mx-auto mb-2 w-fit rounded-full border px-2 py-0.5 text-[11px]"
        style={{
          backgroundColor: colors.panelBg,
          borderColor: colors.border,
          color: colors.text,
        }}
      >
        Awaiting backend history
      </div>

      <p className="text-sm font-semibold" style={{ color: colors.title }}>
        {title}
      </p>
      <p className="mt-2 text-xs" style={{ color: colors.muted }}>
        Backend time-series data is not available yet. Showing unavailable state.
      </p>
      <p className="mt-1 text-[11px]" style={{ color: colors.warning }}>
        Live summary values above use the current API response.
      </p>
    </div>
  </div>
);


// NOTE: Charts below are intentionally disabled because backend does not provide
// historical/time-series data yet. Do not reintroduce random/dummy series.


export function ServerMonitor() {
  const [refreshing, setRefreshing] = useState(false);
  const [monitorData, setMonitorData] = useState<ServerMonitorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestInFlightRef = useRef(false);
  const [cpuHistory, setCpuHistory] = useState<Array<{ time: string; usage: number; load_1m: number }>>([]);
  const [memoryHistory, setMemoryHistory] = useState<Array<{ time: string; used: number; free: number }>>([]);
  const [accentColor, setAccentColor] = useState(() => safeReadAccentColor());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveAppearanceTheme(safeReadAppearanceTheme()),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncThemeFromStorage = () => {
      const nextTheme = safeReadAppearanceTheme();
      setAccentColor(safeReadAccentColor());
      setResolvedTheme(resolveAppearanceTheme(nextTheme));
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key === "nimbus_appearance_theme" ||
        event.key === "nimbus_accent_color"
      ) {
        syncThemeFromStorage();
      }
    };

    syncThemeFromStorage();
    window.addEventListener("nimbus-appearance-change", syncThemeFromStorage);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", syncThemeFromStorage);

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", syncThemeFromStorage);

    return () => {
      window.removeEventListener("nimbus-appearance-change", syncThemeFromStorage);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", syncThemeFromStorage);
      mq?.removeEventListener?.("change", syncThemeFromStorage);
    };
  }, []);

  const isDark = resolvedTheme === "dark";

  const colors = useMemo(() => {
    if (isDark) {
      return {
        pageBg: "#111c2f",
        panelBg: "#0f1729",
        panelSoftBg: "#0d1829",
        tileBg: "#1e2d45",
        border: "#1a2540",
        borderSoft: "#0a1020",
        title: "#e2e8f0",
        text: "#94a3b8",
        textStrong: "#cbd5e1",
        muted: "#64748b",
        mutedSoft: "#475569",
        mutedFaint: "#334155",
        grid: "rgba(148,163,184,0.10)",
        shadow: "0 22px 60px rgba(0, 0, 0, 0.28)",
        accent: accentColor,
        accentSoftBg: withAlpha(accentColor, "1f"),
        accentBorder: withAlpha(accentColor, "59"),
        blue: "#3b82f6",
        blueSoft: "rgba(59,130,246,0.10)",
        success: "#34d399",
        successSoft: "rgba(52,211,153,0.15)",
        warning: "#f59e0b",
        warningSoft: "rgba(245,158,11,0.12)",
        danger: "#ef4444",
        dangerSoft: "rgba(239,68,68,0.14)",
        cyan: "#22d3ee",
        cyanSoft: "rgba(34,211,238,0.20)",
        purple: "#a78bfa",
        orange: "#f97316",
      };
    }

    return {
      pageBg: "#f8fafc",
      panelBg: "#ffffff",
      panelSoftBg: "#f8fafc",
      tileBg: "#f1f5f9",
      border: "#dbe3ef",
      borderSoft: "#e5eaf1",
      title: "#0f172a",
      text: "#334155",
      textStrong: "#1e293b",
      muted: "#64748b",
      mutedSoft: "#94a3b8",
      mutedFaint: "#cbd5e1",
      grid: "rgba(100,116,139,0.16)",
      shadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
      accent: accentColor,
      accentSoftBg: withAlpha(accentColor, "12"),
      accentBorder: withAlpha(accentColor, "4d"),
      blue: "#2563eb",
      blueSoft: "rgba(37,99,235,0.10)",
      success: "#059669",
      successSoft: "rgba(5,150,105,0.12)",
      warning: "#d97706",
      warningSoft: "rgba(217,119,6,0.10)",
      danger: "#dc2626",
      dangerSoft: "rgba(220,38,38,0.10)",
      cyan: "#0891b2",
      cyanSoft: "rgba(8,145,178,0.14)",
      purple: "#7c3aed",
      orange: "#ea580c",
    };
  }, [accentColor, isDark]);

  const loadServerMonitor = async (options?: { silent?: boolean }) => {
    if (requestInFlightRef.current) return;

    try {
      requestInFlightRef.current = true;

      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);
      const data = await getServerMonitor();
      setMonitorData(data);

      // Add to history (keep last 30 data points)
      const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      setCpuHistory(prev => {
        const updated = [
          ...prev,
          {
            time: now,
            usage: typeof data.cpu.usage_percent === 'number' ? data.cpu.usage_percent : 0,
            load_1m: data.cpu.load_1m || 0,
          }
        ];
        return updated.slice(-30);
      });

      setMemoryHistory(prev => {
        const updated = [
          ...prev,
          {
            time: now,
            used: data.memory.usage_percent || 0,
            free: Math.max(0, 100 - (data.memory.usage_percent || 0)),
          }
        ];
        return updated.slice(-30);
      });
    } catch (err) {
      console.error("Failed to load server monitor:", err);
      setError("Gagal memuat data server monitor.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      requestInFlightRef.current = false;
    }
  };

  const handleRefresh = () => {
    loadServerMonitor({ silent: true });
  };

  useEffect(() => {
    loadServerMonitor();

    // Auto-refresh every 5 seconds after initial load
    const interval = setInterval(() => {
      loadServerMonitor({ silent: true });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const statusColor =
    loading && !monitorData
      ? colors.blue
      : error
        ? colors.danger
        : monitorData
          ? colors.success
          : colors.warning;

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      style={{ background: colors.pageBg, color: colors.text }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold" style={{ color: colors.title }}>Server Monitor</h1>
            <ServerMonitorStatusPill
              label={loading && !monitorData
                ? "Checking"
                : error
                  ? "Offline"
                  : monitorData
                    ? "Online"
                    : "Unknown"}
              icon={<span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: statusColor }} />}
              textColor={tone(statusColor, isDark).color}
              backgroundColor={tone(statusColor, isDark).background}
              borderColor={tone(statusColor, isDark).border.replace("1px solid ", "")}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
              title="Server status"
            />

          </div>
          <p className="text-xs mt-0.5" style={{ color: colors.muted }}>
            {error
              ? "Server monitor API unavailable"
              : loading && !monitorData
                ? "Checking server monitor API..."
                : (
                  <>
                    {monitorData?.server.hostname ?? "Unknown host"}
                    {" / "}
                    {monitorData?.server.os ?? "Unknown OS"}
                    {" / "}
                    PHP {monitorData?.server.php_version ?? "N/A"}
                    {" / "}
                    Laravel {monitorData?.server.laravel_version ?? "N/A"}
                  </>
                )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
          style={{
            background: colors.panelSoftBg,
            border: `1px solid ${colors.border}`,
            color: colors.text,
          }}
        >
          <RefreshCw size={13} className={loading || refreshing ? "animate-spin" : ""} />
          {loading || refreshing ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {loading && (
        <ServerMonitorLoadingBanner
          title="Memuat data server monitor..."
          textColor={colors.text}
          mutedColor={colors.muted}
          backgroundColor={colors.panelSoftBg}
          borderColor={colors.border}
          className="mt-3 rounded-xl border p-3 text-sm"
        />
      )}

      {error && (
        <div
          className="mt-3 rounded-xl border p-3 text-sm"
          style={{
            background: colors.dangerSoft,
            borderColor: withAlpha(colors.danger, isDark ? "66" : "40"),
            color: colors.danger,
          }}
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => loadServerMonitor()}
            className="mt-2 rounded-lg border px-3 py-1 text-xs hover:opacity-90"
            style={{
              borderColor: withAlpha(colors.danger, isDark ? "66" : "40"),
              color: colors.danger,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {monitorData && (
        <div
          className="mb-6 rounded-xl p-4"
          style={{
            background: colors.panelBg,
            border: `1px solid ${colors.border}`,
            boxShadow: colors.shadow,
          }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Server size={16} style={{ color: colors.accent }} />
              <span className="text-sm font-semibold" style={{ color: colors.title }}>
                Current PC
              </span>
            </div>
            <span className="text-[11px]" style={{ color: colors.muted }}>
              Last checked {formatDateTime(monitorData.server.checked_at)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Hostname",
                value: monitorData.server.hostname ?? "N/A",
                icon: Server,
              },
              {
                label: "Operating System",
                value:
                  monitorData.server.os_name ??
                  monitorData.server.os ??
                  "N/A",
                icon: Globe,
              },
              {
                label: "Architecture",
                value: monitorData.server.architecture ?? "N/A",
                icon: Activity,
              },
              {
                label: "CPU",
                value: monitorData.cpu.model ?? "N/A",
                icon: Cpu,
              },
              {
                label: "CPU Cores",
                value: formatCpuCores(
                  monitorData.cpu.physical_cores,
                  monitorData.cpu.logical_cores,
                ),
                icon: Zap,
              },
              {
                label: "Local IP",
                value: formatIpList(monitorData.network?.local_ips),
                icon: Wifi,
              },
              {
                label: "Uptime",
                value: formatDuration(monitorData.server.uptime_seconds),
                icon: Clock,
              },
              {
                label: "Runtime",
                value: `PHP ${monitorData.server.php_version ?? "N/A"} / Laravel ${monitorData.server.laravel_version ?? "N/A"}`,
                icon: CheckCircle,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="min-w-0 rounded-lg px-3 py-2"
                  style={{
                    background: colors.panelSoftBg,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Icon size={12} style={{ color: colors.muted }} />
                    <span className="text-[11px]" style={{ color: colors.muted }}>
                      {item.label}
                    </span>
                  </div>
                  <div
                    className="truncate text-xs font-medium"
                    title={item.value}
                    style={{ color: colors.textStrong }}
                  >
                    {item.value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* Key Metrics */}
      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "CPU Usage",
            value:
              typeof monitorData?.cpu.usage_percent === "number"
                ? formatPercent(monitorData.cpu.usage_percent)
                : formatLoad(monitorData?.cpu.load_1m),
            icon: Cpu,
            color: colors.blue,
            sub:
              monitorData?.cpu.load_1m == null
                ? "CPU usage unavailable"
                : `5m ${formatLoad(monitorData?.cpu.load_5m)} / 15m ${formatLoad(monitorData?.cpu.load_15m)}`,
            progress: clampPercent(monitorData?.cpu.usage_percent),
          },
          {
            label: "Memory",
            value: formatPercent(monitorData?.memory.usage_percent),
            icon: MemoryStick,
            color: colors.purple,
            sub: `${formatBytes(monitorData?.memory.used_bytes)} used / ${formatBytes(monitorData?.memory.total_bytes)} total`,
            progress: clampPercent(monitorData?.memory.usage_percent),
          },
          {
            label: "Disk Usage",
            value: formatPercent(monitorData?.disk.usage_percent),
            icon: HardDrive,
            color: colors.cyan,
            sub: `${formatBytes(monitorData?.disk.used_bytes)} used / ${formatBytes(monitorData?.disk.total_bytes)} total`,
            progress: clampPercent(monitorData?.disk.usage_percent),
          },
          {
            label: "Network",
            value: monitorData?.network?.primary_ip ?? "N/A",
            icon: Wifi,
            color: colors.orange,
            sub:
              (monitorData?.network?.local_ips?.length ?? 0) > 0
                ? `${monitorData?.network?.local_ips?.length ?? 0} local IP detected`
                : "Local IP unavailable",
            progress: 0,
          },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.label}
              className="rounded-xl p-4"
              style={{
                background: colors.panelBg,
                border: `1px solid ${colors.border}`,
                boxShadow: colors.shadow,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon size={14} style={{ color: m.color }} />
                  <span className="text-xs" style={{ color: colors.muted }}>{m.label}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: m.color }}>{m.value}</span>
              </div>
              <div className="relative h-1.5 rounded-full overflow-hidden mb-2" style={{ background: colors.tileBg }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${m.progress}%`, background: `linear-gradient(90deg, ${m.color}99, ${m.color})` }}
                />
              </div>
              <div className="text-[10px]" style={{ color: colors.mutedSoft }}>{m.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 mb-4 xl:grid-cols-2">

        {/* CPU Chart */}
        <div className="rounded-xl p-4" style={{ background: colors.panelBg, border: `1px solid ${colors.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu size={13} style={{ color: colors.blue }} />
              <span className="text-sm font-semibold" style={{ color: colors.title }}>CPU Usage (Real-time)</span>
            </div>
            <span className="text-sm font-bold" style={{ color: colors.blue }}>
              {typeof monitorData?.cpu.usage_percent === "number"
                ? formatPercent(monitorData.cpu.usage_percent)
                : formatLoad(monitorData?.cpu.load_1m)}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            {cpuHistory.length > 0 ? (
              <LineChart data={cpuHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke={colors.muted}
                  style={{ fontSize: "11px" }}
                  tick={{ angle: -45, textAnchor: 'end', height: 60 }}
                />
                <YAxis stroke={colors.muted} style={{ fontSize: "12px" }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: colors.panelSoftBg, border: `1px solid ${colors.border}`, borderRadius: "8px" }}
                  labelStyle={{ color: colors.text }}
                  formatter={(value) => typeof value === "number" ? `${value.toFixed(1)}%` : value}
                />
                <Line 
                  type="monotone" 
                  dataKey="usage" 
                  stroke={colors.blue}
                  strokeWidth={2}
                  dot={false}
                  name="CPU Usage %"
                  isAnimationActive={false}
                />
              </LineChart>
            ) : (
              <ChartUnavailable colors={colors} title="Waiting for data..." />
            )}
          </ResponsiveContainer>
        </div>

        {/* Memory Chart */}
        <div className="rounded-xl p-4" style={{ background: colors.panelBg, border: `1px solid ${colors.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MemoryStick size={13} style={{ color: colors.purple }} />
              <span className="text-sm font-semibold" style={{ color: colors.title }}>Memory Usage (Real-time)</span>
            </div>
            <span className="text-sm font-bold" style={{ color: colors.purple }}>
              {formatPercent(monitorData?.memory.usage_percent)}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            {memoryHistory.length > 0 ? (
              <LineChart data={memoryHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.border} vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke={colors.muted}
                  style={{ fontSize: "11px" }}
                  tick={{ angle: -45, textAnchor: 'end', height: 60 }}
                />
                <YAxis stroke={colors.muted} style={{ fontSize: "12px" }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: colors.panelSoftBg, border: `1px solid ${colors.border}`, borderRadius: "8px" }}
                  labelStyle={{ color: colors.text }}
                  formatter={(value) => typeof value === "number" ? `${value.toFixed(1)}%` : value}
                />
                <Line 
                  type="monotone" 
                  dataKey="used" 
                  stroke={colors.purple}
                  strokeWidth={2}
                  dot={false}
                  name="Used %"
                  isAnimationActive={false}
                />
              </LineChart>
            ) : (
              <ChartUnavailable colors={colors} title="Waiting for data..." />
            )}
          </ResponsiveContainer>
        </div>

        {/* Network Chart */}
        <div className="rounded-xl p-4" style={{ background: colors.panelBg, border: `1px solid ${colors.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wifi size={13} style={{ color: colors.success }} />
              <span className="text-sm font-semibold" style={{ color: colors.title }}>Network Info</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={tone(colors.success, isDark)}>
              <span className="text-[10px] font-mono" style={{ color: colors.success }}>
                {(monitorData?.network?.local_ips?.length ?? 0)} IPs
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-lg" style={{ background: colors.tileBg, border: `1px solid ${withAlpha(colors.success, isDark ? "55" : "40")}` }}>
              <div className="text-[10px]" style={{ color: colors.muted }}>Primary IP</div>
              <div className="text-sm font-mono font-semibold mt-1" style={{ color: colors.success }}>
                {monitorData?.network?.primary_ip ?? "N/A"}
              </div>
            </div>
            {(monitorData?.network?.local_ips ?? []).length > 1 && (
              <div className="p-3 rounded-lg" style={{ background: colors.tileBg }}>
                <div className="text-[10px]" style={{ color: colors.muted }}>All Local IPs</div>
                <div className="mt-2 space-y-1">
                  {monitorData?.network?.local_ips?.map((ip, i) => (
                    <div key={i} className="text-[11px] font-mono px-2 py-1 rounded" style={{ background: colors.successSoft, color: colors.success }}>
                      {ip}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Disk Usage Chart */}
        <div className="rounded-xl p-4" style={{ background: colors.panelBg, border: `1px solid ${colors.border}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive size={13} style={{ color: colors.cyan }} />
              <span className="text-sm font-semibold" style={{ color: colors.title }}>Disk Usage</span>
            </div>
            <span className="text-sm font-bold" style={{ color: colors.cyan }}>
              {formatPercent(monitorData?.disk.usage_percent)}
            </span>
          </div>
          {typeof monitorData?.disk.usage_percent === "number" && Number.isFinite(monitorData.disk.usage_percent) ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Used", value: Math.round(monitorData.disk.usage_percent), fill: colors.cyan },
                    { name: "Free", value: Math.round(100 - monitorData.disk.usage_percent), fill: colors.cyanSoft }
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  <Cell fill={colors.cyan} />
                  <Cell fill={colors.cyanSoft} />
                </Pie>
                <Tooltip
                  contentStyle={{ background: colors.panelSoftBg, border: `1px solid ${colors.border}`, borderRadius: "8px" }}
                  labelStyle={{ color: colors.text }}
                  formatter={(value) => `${value}%`}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ChartUnavailable colors={colors} title="Disk usage unavailable" />
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg" style={{ background: colors.tileBg }}>
              <div style={{ color: colors.muted }}>Used</div>
              <div className="font-semibold" style={{ color: colors.cyan }}>{formatBytes(monitorData?.disk.used_bytes)}</div>
            </div>
            <div className="p-2 rounded-lg" style={{ background: colors.tileBg }}>
              <div style={{ color: colors.muted }}>Free</div>
              <div className="font-semibold" style={{ color: colors.cyan }}>{formatBytes(monitorData?.disk.free_bytes)}</div>
            </div>
          </div>
        </div>

      </div>

      {/* Services + Alerts Row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Services */}
        <div className="rounded-xl overflow-hidden" style={{ background: colors.panelBg, border: `1px solid ${colors.border}` }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
            <span className="text-sm font-semibold" style={{ color: colors.title }}>Services</span>
            <span className="text-xs" style={{ color: colors.mutedSoft }}>
              {(monitorData?.services ?? []).filter((service) => service.status === "online").length}/{(monitorData?.services ?? []).length} online
            </span>
          </div>

          {loading ? (
            <div className="px-4 py-3 text-xs" style={{ color: colors.muted }}>Memuat layanan...</div>
          ) : ((monitorData?.services ?? []).length === 0 ? (
            <div className="px-4 py-3 text-xs" style={{ color: colors.muted }}>Tidak ada data layanan.</div>
          ) : (
            (monitorData?.services ?? []).map((svc, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                style={{ borderBottom: `1px solid ${colors.borderSoft}` }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background:
                      svc.status === "online" ? colors.success : svc.status === "offline" ? colors.danger : colors.warning,
                  }}
                />
                <span className="text-sm flex-1" style={{ color: colors.text }}>{svc.name}</span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                  style={{
                    background:
                      svc.status === "online"
                        ? colors.successSoft
                        : svc.status === "offline"
                          ? colors.dangerSoft
                          : colors.warningSoft,
                    color:
                      svc.status === "online"
                        ? colors.success
                        : svc.status === "offline"
                          ? colors.danger
                          : colors.warning,
                  }}
                >
                  {svc.status}
                </span>
                <span className="text-[10px]" style={{ color: colors.mutedFaint }}>{svc.details ?? "No details"}</span>
              </div>
            ))
          ))}
        </div>

        {/* Alerts */}
        <div className="rounded-xl overflow-hidden" style={{ background: colors.panelBg, border: `1px solid ${colors.border}` }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: `1px solid ${colors.border}` }}>
            <span className="text-sm font-semibold" style={{ color: colors.title }}>System Alerts</span>
            <span className="text-xs" style={{ color: colors.mutedSoft }}>{monitorData?.warnings?.length ?? 0} total</span>
          </div>
          <div className="p-3 space-y-2">
            {loading ? (
              <div className="text-xs" style={{ color: colors.muted }}>Memuat peringatan...</div>
            ) : ((monitorData?.warnings ?? []).length === 0 ? (
              <div className="text-xs" style={{ color: colors.success }}>Tidak ada peringatan dari backend.</div>
            ) : (
              (monitorData?.warnings ?? []).map((w, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{
                    background: colors.warningSoft,
                    border: `1px solid ${withAlpha(colors.warning, isDark ? "55" : "40")}`,
                  }}
                >
                  <AlertTriangle size={13} style={{ color: colors.warning }} className="shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs" style={{ color: colors.text }}>{w}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: colors.mutedSoft }}>Backend warning</div>
                  </div>
                </div>
              ))
            ))}
          </div>

          {/* Server info */}
          <div className="px-4 pb-3 pt-1 space-y-2" style={{ borderTop: `1px solid ${colors.border}` }}>
            {(() => {
              const uptimeValue = formatDuration(monitorData?.server.uptime_seconds);
              const cpuLoad1m = monitorData?.cpu.load_1m;
              const cpuLoad5m = monitorData?.cpu.load_5m;
              const cpuLoad15m = monitorData?.cpu.load_15m;
              const loadAvgValue =
                cpuLoad1m == null || cpuLoad5m == null || cpuLoad15m == null
                  ? "N/A"
                  : `${formatLoad(cpuLoad1m)}, ${formatLoad(cpuLoad5m)}, ${formatLoad(cpuLoad15m)}`;

              return [
                { label: "Uptime", value: uptimeValue, icon: Clock },
                { label: "Load Average", value: loadAvgValue, icon: Activity },
              ].map((info) => {
                const InfoIcon = info.icon;
                return (
                  <div key={info.label} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <InfoIcon size={11} style={{ color: colors.mutedSoft }} />
                      <span className="text-xs" style={{ color: colors.muted }}>{info.label}</span>
                    </div>
                    <span className="text-xs font-mono" style={{ color: colors.text }}>{info.value}</span>
                  </div>
                );
              });
            })()}
          </div>

        </div>
      </div>
    </div>
  );
}
