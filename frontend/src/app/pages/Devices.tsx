import { useState } from "react";
import {
  Monitor, Smartphone, Laptop, Tablet, MoreHorizontal,
  Wifi, WifiOff, RefreshCw, Trash2, Shield, CheckCircle,
  Plus, Clock, HardDrive
} from "lucide-react";

const devices = [
  {
    name: "MacBook Pro 16\"",
    type: "laptop",
    icon: Laptop,
    os: "macOS Sonoma 14.2",
    lastSync: "Just now",
    status: "online",
    storage: "156 GB synced",
    ip: "192.168.1.105",
    trusted: true,
  },
  {
    name: "iPhone 15 Pro",
    type: "mobile",
    icon: Smartphone,
    os: "iOS 17.3",
    lastSync: "2 minutes ago",
    status: "online",
    storage: "42 GB synced",
    ip: "192.168.1.108",
    trusted: true,
  },
  {
    name: "Home Desktop",
    type: "desktop",
    icon: Monitor,
    os: "Windows 11 Pro",
    lastSync: "5 minutes ago",
    status: "online",
    storage: "892 GB synced",
    ip: "192.168.1.101",
    trusted: true,
  },
  {
    name: "iPad Air",
    type: "tablet",
    icon: Tablet,
    os: "iPadOS 17.2",
    lastSync: "3 hours ago",
    status: "offline",
    storage: "28 GB synced",
    ip: "192.168.1.112",
    trusted: true,
  },
  {
    name: "Work Laptop",
    type: "laptop",
    icon: Laptop,
    os: "Ubuntu 22.04 LTS",
    lastSync: "2 days ago",
    status: "offline",
    storage: "234 GB synced",
    ip: "10.0.0.45",
    trusted: false,
  },
];

export function Devices() {
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  const onlineCount = devices.filter((d) => d.status === "online").length;

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "#080d1a" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#e2e8f0" }}>Devices</h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>{devices.length} devices registered · {onlineCount} online</p>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
          style={{ background: "linear-gradient(135deg, #3b82f6, #22d3ee)", color: "#fff" }}
        >
          <Plus size={13} /> Add Device
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Devices", value: devices.length, color: "#3b82f6", icon: Monitor },
          { label: "Online", value: onlineCount, color: "#34d399", icon: Wifi },
          { label: "Offline", value: devices.length - onlineCount, color: "#f59e0b", icon: WifiOff },
          { label: "Trusted", value: devices.filter((d) => d.trusted).length, color: "#a78bfa", icon: Shield },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl p-4" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${s.color}18` }}>
                  <Icon size={14} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold" style={{ color: "#e2e8f0" }}>{s.value}</div>
              <div className="text-xs" style={{ color: "#475569" }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Device Cards */}
      <div className="grid grid-cols-3 gap-4">
        {devices.map((device, i) => {
          const Icon = device.icon;
          const isOnline = device.status === "online";
          return (
            <div
              key={i}
              className="rounded-xl p-4 relative group"
              style={{ background: "#0f1729", border: `1px solid ${isOnline ? "rgba(52,211,153,0.2)" : "#1a2540"}` }}
            >
              {/* Menu */}
              <div className="absolute top-3 right-3">
                <button
                  onClick={() => setMenuOpen(menuOpen === i ? null : i)}
                  className="w-7 h-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#1e2d45]"
                >
                  <MoreHorizontal size={14} style={{ color: "#64748b" }} />
                </button>
                {menuOpen === i && (
                  <div className="absolute right-0 top-8 w-40 rounded-lg shadow-2xl z-50 overflow-hidden" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
                    {[{ icon: RefreshCw, label: "Force Sync" }, { icon: Shield, label: "Trust/Untrust" }, { icon: Trash2, label: "Remove Device", danger: true }].map((a) => {
                      const AIcon = a.icon;
                      return (
                        <button key={a.label} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[#1a2540] transition-colors" style={{ color: (a as any).danger ? "#f87171" : "#94a3b8" }}>
                          <AIcon size={12} />{a.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Device Icon + Status */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: isOnline ? "rgba(52,211,153,0.1)" : "rgba(71,85,105,0.1)", border: `1px solid ${isOnline ? "rgba(52,211,153,0.2)" : "#1a2540"}` }}
                >
                  <Icon size={22} style={{ color: isOnline ? "#34d399" : "#475569" }} />
                </div>
                <div>
                  <div className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>{device.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#475569" }}>{device.os}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: isOnline ? "#34d399" : "#475569" }}
                    />
                    <span className="text-[10px] capitalize" style={{ color: isOnline ? "#34d399" : "#475569" }}>
                      {device.status}
                    </span>
                    {device.trusted && (
                      <CheckCircle size={10} style={{ color: "#3b82f6" }} />
                    )}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-2 pt-3" style={{ borderTop: "1px solid #1a2540" }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock size={11} style={{ color: "#475569" }} />
                    <span className="text-xs" style={{ color: "#64748b" }}>Last sync</span>
                  </div>
                  <span className="text-xs" style={{ color: "#94a3b8" }}>{device.lastSync}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <HardDrive size={11} style={{ color: "#475569" }} />
                    <span className="text-xs" style={{ color: "#64748b" }}>Storage</span>
                  </div>
                  <span className="text-xs" style={{ color: "#94a3b8" }}>{device.storage}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Wifi size={11} style={{ color: "#475569" }} />
                    <span className="text-xs" style={{ color: "#64748b" }}>IP Address</span>
                  </div>
                  <span className="text-xs font-mono" style={{ color: "#64748b" }}>{device.ip}</span>
                </div>
              </div>

              {/* Action */}
              <button
                className="mt-3 w-full py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{ background: "#0d1829", border: "1px solid #1a2540", color: "#64748b" }}
              >
                <RefreshCw size={11} className="inline mr-1.5" />
                {isOnline ? "Force Sync" : "Wake Device"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
