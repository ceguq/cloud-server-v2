import { useEffect, useState } from "react";

import {
  getServerMonitor,
  type ServerMonitorResponse,
} from "../../services/serverMonitorService";

import {
  Server, Cpu, MemoryStick, HardDrive, Wifi, Activity,
  ThermometerSun, AlertTriangle, CheckCircle, RefreshCw,
  Globe, Clock, TrendingUp, Zap
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from "recharts";


const ChartUnavailable = ({ title }: { title: string }) => (
  <div
    className="relative flex h-32 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/10 bg-white/[0.03] p-5 text-center"
  >
    {/* subtle background grid */}
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(148,163,184,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.10) 1px, transparent 1px)",
        backgroundSize: "26px 26px",
        opacity: 0.35,
      }}
    />

    <div className="relative">
      <div className="mx-auto mb-2 w-fit rounded-full border border-white/10 bg-white/[0.02] px-2 py-0.5 text-[11px] text-slate-300">
        Awaiting backend history
      </div>

      <p className="text-sm font-semibold text-slate-200">{title}</p>
      <p className="mt-2 text-xs text-slate-400">
        Backend time-series data is not available yet. Showing unavailable state.
      </p>
      <p className="mt-1 text-[11px] text-amber-300">
        Live summary values above use the current API response.
      </p>
    </div>
  </div>
);


// NOTE: Charts below are intentionally disabled because backend does not provide
// historical/time-series data yet. Do not reintroduce random/dummy series.



const formatBytes = (value: number | null | undefined) => {
  if (typeof value !== "number") return "N/A";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatPercent = (value: number | null | undefined) =>
  typeof value === "number" ? `${value.toFixed(1)}%` : "N/A";

const clampPercent = (value: number | null | undefined) => {
  if (typeof value !== "number") return 0;
  return Math.min(Math.max(value, 0), 100);
};

const formatLoad = (value: number | null | undefined) =>
  typeof value === "number" ? value.toFixed(2) : "N/A";

const formatDuration = (seconds: number | null | undefined) => {
  if (typeof seconds !== "number") return "N/A";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleString();
};

const formatCpuCores = (
  physical: number | null | undefined,
  logical: number | null | undefined,
) => {
  if (typeof physical !== "number" && typeof logical !== "number") return "N/A";
  if (typeof physical === "number" && typeof logical === "number") {
    return `${physical} physical / ${logical} logical`;
  }
  return typeof logical === "number" ? `${logical} logical` : `${physical} physical`;
};

const formatIpList = (ips: string[] | undefined) => {
  if (!ips || ips.length === 0) return "N/A";
  return ips.slice(0, 3).join(", ");
};




const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg px-3 py-2 text-xs" style={{ background: "#0f1729", border: "1px solid #1a2540", color: "#94a3b8" }}>
        <div style={{ color: "#64748b" }}>{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} style={{ color: p.color }}>{p.name || "Value"}: {Math.round(p.value)}%</div>
        ))}
      </div>
    );
  }
  return null;
};

export function ServerMonitor() {
  const [refreshing, setRefreshing] = useState(false);
  const [monitorData, setMonitorData] = useState<ServerMonitorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cpuHistory, setCpuHistory] = useState<Array<{ time: string; usage: number; load_1m: number }>>([]);
  const [memoryHistory, setMemoryHistory] = useState<Array<{ time: string; used: number; free: number }>>([]);

  const loadServerMonitor = async (options?: { silent?: boolean }) => {
    try {
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

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "#111c2f" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold" style={{ color: "#e2e8f0" }}>Server Monitor</h1>
            <span
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full"
              style={{
                background:
                  loading && !monitorData
                    ? "rgba(59,130,246,0.1)"
                    : error
                      ? "rgba(239,68,68,0.1)"
                      : monitorData
                        ? "rgba(52,211,153,0.1)"
                        : "rgba(245,158,11,0.1)",
                color:
                  loading && !monitorData
                    ? "#3b82f6"
                    : error
                      ? "#ef4444"
                      : monitorData
                        ? "#34d399"
                        : "#f59e0b",
                border:
                  loading && !monitorData
                    ? "1px solid rgba(59,130,246,0.25)"
                    : error
                      ? "1px solid rgba(239,68,68,0.25)"
                      : monitorData
                        ? "1px solid rgba(52,211,153,0.25)"
                        : "1px solid rgba(245,158,11,0.25)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{
                  background:
                    loading && !monitorData
                      ? "#3b82f6"
                      : error
                        ? "#ef4444"
                        : monitorData
                          ? "#34d399"
                          : "#f59e0b",
                }}
              />
              {loading && !monitorData
                ? "Checking"
                : error
                  ? "Offline"
                  : monitorData
                    ? "Online"
                    : "Unknown"}
            </span>

          </div>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
            {error
              ? "Server monitor API unavailable"
              : loading && !monitorData
                ? "Checking server monitor API..."
                : (
                  <>
                    {monitorData?.server.hostname ?? "Unknown host"}
                    {" · "}
                    {monitorData?.server.os ?? "Unknown OS"}
                    {" · "}
                    PHP {monitorData?.server.php_version ?? "N/A"}
                    {" · "}
                    Laravel {monitorData?.server.laravel_version ?? "N/A"}
                  </>
                )}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
          style={{ background: "#0d1829", border: "1px solid #1a2540", color: "#94a3b8" }}
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {loading && (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
          Memuat data server monitor...
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => loadServerMonitor()}
            className="mt-2 rounded-lg border border-red-400/40 px-3 py-1 text-xs text-red-100 hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      )}

      {monitorData && (
        <div
          className="mb-6 rounded-xl p-4"
          style={{ background: "#0f1729", border: "1px solid #1a2540" }}
        >
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Server size={16} style={{ color: "#60a5fa" }} />
              <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>
                Current PC
              </span>
            </div>
            <span className="text-[11px]" style={{ color: "#64748b" }}>
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
                  style={{ background: "#0d1829", border: "1px solid #1a2540" }}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Icon size={12} style={{ color: "#64748b" }} />
                    <span className="text-[11px]" style={{ color: "#64748b" }}>
                      {item.label}
                    </span>
                  </div>
                  <div
                    className="truncate text-xs font-medium"
                    title={item.value}
                    style={{ color: "#cbd5e1" }}
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
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "CPU Usage",
            value:
              typeof monitorData?.cpu.usage_percent === "number"
                ? formatPercent(monitorData.cpu.usage_percent)
                : formatLoad(monitorData?.cpu.load_1m),
            icon: Cpu,
            color: "#3b82f6",
            sub:
              monitorData?.cpu.load_1m == null
                ? "CPU usage unavailable"
                : `5m ${formatLoad(monitorData?.cpu.load_5m)} · 15m ${formatLoad(monitorData?.cpu.load_15m)}`,
            progress: clampPercent(monitorData?.cpu.usage_percent),
          },
          {
            label: "Memory",
            value: formatPercent(monitorData?.memory.usage_percent),
            icon: MemoryStick,
            color: "#a78bfa",
            sub: `${formatBytes(monitorData?.memory.used_bytes)} used / ${formatBytes(monitorData?.memory.total_bytes)} total`,
            progress: clampPercent(monitorData?.memory.usage_percent),
          },
          {
            label: "Disk Usage",
            value: formatPercent(monitorData?.disk.usage_percent),
            icon: HardDrive,
            color: "#22d3ee",
            sub: `${formatBytes(monitorData?.disk.used_bytes)} used / ${formatBytes(monitorData?.disk.total_bytes)} total`,
            progress: clampPercent(monitorData?.disk.usage_percent),
          },
          {
            label: "Network",
            value: monitorData?.network?.primary_ip ?? "N/A",
            icon: Wifi,
            color: "#f97316",
            sub:
              (monitorData?.network?.local_ips?.length ?? 0) > 0
                ? `${monitorData?.network?.local_ips?.length ?? 0} local IP detected`
                : "Local IP unavailable",
            progress: 0,
          },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="rounded-xl p-4" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon size={14} style={{ color: m.color }} />
                  <span className="text-xs" style={{ color: "#64748b" }}>{m.label}</span>
                </div>
                <span className="text-xs font-bold" style={{ color: m.color }}>{m.value}</span>
              </div>
              <div className="relative h-1.5 rounded-full overflow-hidden mb-2" style={{ background: "#1e2d45" }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ width: `${m.progress}%`, background: `linear-gradient(90deg, ${m.color}99, ${m.color})` }}
                />
              </div>
              <div className="text-[10px]" style={{ color: "#475569" }}>{m.sub}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">

        {/* CPU Chart */}
        <div className="rounded-xl p-4" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu size={13} style={{ color: "#3b82f6" }} />
              <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>CPU Usage (Real-time)</span>
            </div>
            <span className="text-sm font-bold" style={{ color: "#3b82f6" }}>
              {typeof monitorData?.cpu.usage_percent === "number"
                ? formatPercent(monitorData.cpu.usage_percent)
                : formatLoad(monitorData?.cpu.load_1m)}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            {cpuHistory.length > 0 ? (
              <LineChart data={cpuHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#64748b" 
                  style={{ fontSize: "11px" }}
                  tick={{ angle: -45, textAnchor: 'end', height: 60 }}
                />
                <YAxis stroke="#64748b" style={{ fontSize: "12px" }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "#0d1829", border: "1px solid #1a2540", borderRadius: "8px" }}
                  labelStyle={{ color: "#94a3b8" }}
                  formatter={(value) => typeof value === "number" ? `${value.toFixed(1)}%` : value}
                />
                <Line 
                  type="monotone" 
                  dataKey="usage" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={false}
                  name="CPU Usage %"
                  isAnimationActive={false}
                />
              </LineChart>
            ) : (
              <ChartUnavailable title="Waiting for data..." />
            )}
          </ResponsiveContainer>
        </div>

        {/* Memory Chart */}
        <div className="rounded-xl p-4" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MemoryStick size={13} style={{ color: "#a78bfa" }} />
              <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>Memory Usage (Real-time)</span>
            </div>
            <span className="text-sm font-bold" style={{ color: "#a78bfa" }}>
              {formatPercent(monitorData?.memory.usage_percent)}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            {memoryHistory.length > 0 ? (
              <LineChart data={memoryHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#64748b" 
                  style={{ fontSize: "11px" }}
                  tick={{ angle: -45, textAnchor: 'end', height: 60 }}
                />
                <YAxis stroke="#64748b" style={{ fontSize: "12px" }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: "#0d1829", border: "1px solid #1a2540", borderRadius: "8px" }}
                  labelStyle={{ color: "#94a3b8" }}
                  formatter={(value) => typeof value === "number" ? `${value.toFixed(1)}%` : value}
                />
                <Line 
                  type="monotone" 
                  dataKey="used" 
                  stroke="#a78bfa" 
                  strokeWidth={2}
                  dot={false}
                  name="Used %"
                  isAnimationActive={false}
                />
              </LineChart>
            ) : (
              <ChartUnavailable title="Waiting for data..." />
            )}
          </ResponsiveContainer>
        </div>

        {/* Network Chart */}
        <div className="rounded-xl p-4" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wifi size={13} style={{ color: "#34d399" }} />
              <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>Network Info</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "rgba(52, 211, 153, 0.1)", border: "1px solid rgba(52, 211, 153, 0.2)" }}>
              <span className="text-[10px] font-mono" style={{ color: "#34d399" }}>
                {(monitorData?.network?.local_ips?.length ?? 0)} IPs
              </span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="p-3 rounded-lg" style={{ background: "#1e2d45", border: "1px solid rgba(52, 211, 153, 0.2)" }}>
              <div className="text-[10px]" style={{ color: "#64748b" }}>Primary IP</div>
              <div className="text-sm font-mono font-semibold mt-1" style={{ color: "#34d399" }}>
                {monitorData?.network?.primary_ip ?? "N/A"}
              </div>
            </div>
            {(monitorData?.network?.local_ips ?? []).length > 1 && (
              <div className="p-3 rounded-lg" style={{ background: "#1e2d45" }}>
                <div className="text-[10px]" style={{ color: "#64748b" }}>All Local IPs</div>
                <div className="mt-2 space-y-1">
                  {monitorData?.network?.local_ips?.map((ip, i) => (
                    <div key={i} className="text-[11px] font-mono px-2 py-1 rounded" style={{ background: "rgba(52, 211, 153, 0.1)", color: "#34d399" }}>
                      {ip}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Disk Usage Chart */}
        <div className="rounded-xl p-4" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive size={13} style={{ color: "#22d3ee" }} />
              <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>Disk Usage</span>
            </div>
            <span className="text-sm font-bold" style={{ color: "#22d3ee" }}>
              {formatPercent(monitorData?.disk.usage_percent)}
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: "Used", value: Math.round(monitorData?.disk.usage_percent || 0), fill: "#22d3ee" },
                  { name: "Free", value: Math.round(100 - (monitorData?.disk.usage_percent || 0)), fill: "rgba(34, 211, 238, 0.2)" }
                ]}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                <Cell fill="#22d3ee" />
                <Cell fill="rgba(34, 211, 238, 0.2)" />
              </Pie>
              <Tooltip
                contentStyle={{ background: "#0d1829", border: "1px solid #1a2540", borderRadius: "8px" }}
                labelStyle={{ color: "#94a3b8" }}
                formatter={(value) => `${value}%`}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg" style={{ background: "#1e2d45" }}>
              <div style={{ color: "#64748b" }}>Used</div>
              <div className="font-semibold" style={{ color: "#22d3ee" }}>{formatBytes(monitorData?.disk.used_bytes)}</div>
            </div>
            <div className="p-2 rounded-lg" style={{ background: "#1e2d45" }}>
              <div style={{ color: "#64748b" }}>Free</div>
              <div className="font-semibold" style={{ color: "#22d3ee" }}>{formatBytes(monitorData?.disk.free_bytes)}</div>
            </div>
          </div>
        </div>

      </div>

      {/* Services + Alerts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Services */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #1a2540" }}>
            <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>Services</span>
            <span className="text-xs" style={{ color: "#475569" }}>
              {(monitorData?.services ?? []).filter((service) => service.status === "online").length}/{(monitorData?.services ?? []).length} online
            </span>
          </div>

          {loading ? (
            <div className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>Memuat layanan...</div>
          ) : ((monitorData?.services ?? []).length === 0 ? (
            <div className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>Tidak ada data layanan.</div>
          ) : (
            (monitorData?.services ?? []).map((svc, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#0d1829] transition-colors"
                style={{ borderBottom: "1px solid #0a1020" }}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{
                    background:
                      svc.status === "online" ? "#34d399" : svc.status === "offline" ? "#ef4444" : "#f59e0b",
                  }}
                />
                <span className="text-sm flex-1" style={{ color: "#94a3b8" }}>{svc.name}</span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                  style={{
                    background:
                      svc.status === "online"
                        ? "rgba(52,211,153,0.15)"
                        : svc.status === "offline"
                          ? "rgba(239,68,68,0.15)"
                          : "rgba(245,158,11,0.15)",
                    color:
                      svc.status === "online"
                        ? "#34d399"
                        : svc.status === "offline"
                          ? "#ef4444"
                          : "#f59e0b",
                  }}
                >
                  {svc.status}
                </span>
                <span className="text-[10px]" style={{ color: "#334155" }}>{svc.details ?? "No details"}</span>
              </div>
            ))
          ))}
        </div>

        {/* Alerts */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #1a2540" }}>
            <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>System Alerts</span>
            <span className="text-xs" style={{ color: "#475569" }}>{monitorData?.warnings?.length ?? 0} total</span>
          </div>
          <div className="p-3 space-y-2">
            {loading ? (
              <div className="text-xs" style={{ color: "#64748b" }}>Memuat peringatan...</div>
            ) : ((monitorData?.warnings ?? []).length === 0 ? (
              <div className="text-xs" style={{ color: "#34d399" }}>Tidak ada peringatan dari backend.</div>
            ) : (
              (monitorData?.warnings ?? []).map((w, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{
                    background: "rgba(245,158,11,0.06)",
                    border: "1px solid rgba(245,158,11,0.15)",
                  }}
                >
                  <AlertTriangle size={13} style={{ color: "#f59e0b" }} className="shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-xs" style={{ color: "#94a3b8" }}>{w}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "#475569" }}>Backend warning</div>
                  </div>
                </div>
              ))
            ))}
          </div>

          {/* Server info */}
          <div className="px-4 pb-3 pt-1 space-y-2" style={{ borderTop: "1px solid #1a2540" }}>
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
                      <InfoIcon size={11} style={{ color: "#475569" }} />
                      <span className="text-xs" style={{ color: "#64748b" }}>{info.label}</span>
                    </div>
                    <span className="text-xs font-mono" style={{ color: "#94a3b8" }}>{info.value}</span>
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
