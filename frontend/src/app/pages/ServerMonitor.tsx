import { useState } from "react";
import {
  Server, Cpu, MemoryStick, HardDrive, Wifi, Activity,
  ThermometerSun, AlertTriangle, CheckCircle, RefreshCw,
  Globe, Clock, TrendingUp, Zap
} from "lucide-react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";

const generateData = (base: number, variance: number, points = 20) =>
  Array.from({ length: points }, (_, i) => ({
    time: `${i}:00`,
    value: Math.max(5, Math.min(98, base + (Math.random() - 0.5) * variance)),
  }));

const cpuData = generateData(42, 40);
const memData = generateData(67, 20);
const diskData = generateData(28, 15);
const netData = Array.from({ length: 20 }, (_, i) => ({
  time: `${i}:00`,
  upload: Math.random() * 80,
  download: Math.random() * 120,
}));

const services = [
  { name: "NimbusDrive Core", status: "running", uptime: "42d 14h 22m", port: 8080, color: "#34d399" },
  { name: "Sync Engine", status: "running", uptime: "42d 14h 22m", port: 9001, color: "#34d399" },
  { name: "File Indexer", status: "running", uptime: "12d 3h 45m", port: 9002, color: "#34d399" },
  { name: "Media Transcoder", status: "idle", uptime: "42d 14h 22m", port: 9003, color: "#f59e0b" },
  { name: "Backup Service", status: "running", uptime: "5d 8h 12m", port: 9004, color: "#34d399" },
  { name: "WebDAV Server", status: "stopped", uptime: "—", port: 9005, color: "#ef4444" },
];

const alerts = [
  { level: "warning", msg: "Memory usage above 65% for 2 hours", time: "1h ago" },
  { level: "info", msg: "Backup completed successfully", time: "3h ago" },
  { level: "warning", msg: "Disk I/O spike detected on /dev/sda1", time: "Yesterday" },
];

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

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "#080d1a" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold" style={{ color: "#e2e8f0" }}>Server Monitor</h1>
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.25)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse inline-block" />
              Online
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>NimbusDrive Server · 192.168.1.100 · Ubuntu 22.04 LTS</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all"
          style={{ background: "#0d1829", border: "1px solid #1a2540", color: "#94a3b8" }}
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "CPU Usage", value: "42%", icon: Cpu, color: "#3b82f6", sub: "8 cores · Intel i9", progress: 42 },
          { label: "Memory", value: "67%", icon: MemoryStick, color: "#a78bfa", sub: "10.7 / 16 GB", progress: 67 },
          { label: "Disk I/O", value: "28%", icon: HardDrive, color: "#22d3ee", sub: "234 MB/s read", progress: 28 },
          { label: "Network", value: "45 MB/s", icon: Wifi, color: "#34d399", sub: "↑12 MB/s ↓33 MB/s", progress: 45 },
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

      {/* Charts Row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* CPU Chart */}
        <div className="rounded-xl p-4" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Cpu size={13} style={{ color: "#3b82f6" }} />
              <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>CPU Usage</span>
            </div>
            <span className="text-sm font-bold" style={{ color: "#3b82f6" }}>42%</span>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={cpuData}>
              <defs>
                <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: "#334155", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#334155", fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#cpuGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Memory Chart */}
        <div className="rounded-xl p-4" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MemoryStick size={13} style={{ color: "#a78bfa" }} />
              <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>Memory Usage</span>
            </div>
            <span className="text-sm font-bold" style={{ color: "#a78bfa" }}>67%</span>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={memData}>
              <defs>
                <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: "#334155", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#334155", fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" stroke="#a78bfa" strokeWidth={2} fill="url(#memGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Network Chart */}
        <div className="rounded-xl p-4" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wifi size={13} style={{ color: "#34d399" }} />
              <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>Network I/O</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span style={{ color: "#34d399" }}>↑ Upload</span>
              <span style={{ color: "#22d3ee" }}>↓ Download</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={netData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: "#334155", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#334155", fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="upload" stroke="#34d399" strokeWidth={1.5} dot={false} />
              <Line type="monotone" dataKey="download" stroke="#22d3ee" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Disk I/O */}
        <div className="rounded-xl p-4" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <HardDrive size={13} style={{ color: "#22d3ee" }} />
              <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>Disk I/O</span>
            </div>
            <span className="text-sm font-bold" style={{ color: "#22d3ee" }}>28%</span>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={diskData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a2540" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: "#334155", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#334155", fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#22d3ee" radius={[2, 2, 0, 0]} opacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Services + Alerts Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Services */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #1a2540" }}>
            <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>Services</span>
            <span className="text-xs" style={{ color: "#475569" }}>{services.filter((s) => s.status === "running").length}/{services.length} running</span>
          </div>
          {services.map((svc, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#0d1829] transition-colors"
              style={{ borderBottom: "1px solid #0a1020" }}
            >
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: svc.color }} />
              <span className="text-sm flex-1" style={{ color: "#94a3b8" }}>{svc.name}</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                style={{ background: `${svc.color}18`, color: svc.color }}
              >
                {svc.status}
              </span>
              <span className="text-[10px] font-mono" style={{ color: "#475569" }}>:{svc.port}</span>
              <span className="text-[10px]" style={{ color: "#334155" }}>{svc.uptime}</span>
            </div>
          ))}
        </div>

        {/* Alerts */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #1a2540" }}>
            <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>System Alerts</span>
            <button className="text-xs" style={{ color: "#3b82f6" }}>Clear All</button>
          </div>
          <div className="p-3 space-y-2">
            {alerts.map((alert, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg"
                style={{
                  background: alert.level === "warning" ? "rgba(245,158,11,0.06)" : "rgba(59,130,246,0.06)",
                  border: `1px solid ${alert.level === "warning" ? "rgba(245,158,11,0.15)" : "rgba(59,130,246,0.15)"}`,
                }}
              >
                {alert.level === "warning" ? (
                  <AlertTriangle size={13} style={{ color: "#f59e0b" }} className="shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle size={13} style={{ color: "#3b82f6" }} className="shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <div className="text-xs" style={{ color: "#94a3b8" }}>{alert.msg}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#475569" }}>{alert.time}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Server info */}
          <div className="px-4 pb-3 pt-1 space-y-2" style={{ borderTop: "1px solid #1a2540" }}>
            {[
              { label: "Uptime", value: "42d 14h 30m", icon: Clock },
              { label: "Load Average", value: "0.82, 0.91, 1.02", icon: Activity },
              { label: "Temperature", value: "48°C", icon: ThermometerSun },
              { label: "Public IP", value: "203.0.113.42", icon: Globe },
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
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
