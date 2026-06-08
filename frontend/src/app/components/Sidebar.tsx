import { useState } from "react";
import {
  LayoutDashboard, FolderOpen, Share2, Upload, Monitor,
  Activity, Trash2, Server, Settings, ChevronRight, Cloud,
  HardDrive
} from "lucide-react";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "my-files", label: "My Files", icon: FolderOpen },
  { id: "shared", label: "Shared", icon: Share2 },
  { id: "uploads", label: "Uploads", icon: Upload },
  { id: "devices", label: "Devices", icon: Monitor },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "trash", label: "Trash", icon: Trash2 },
  { id: "server-monitor", label: "Server Monitor", icon: Server },
  { id: "settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const storageUsed = 68;
  const storageGB = "1.36 TB";
  const storageTotal = "2 TB";

  return (
    <aside className="flex flex-col h-full w-[220px] shrink-0" style={{ background: "#0b1121", borderRight: "1px solid #1a2540" }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: "1px solid #1a2540" }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #3b82f6 0%, #22d3ee 100%)" }}>
          <Cloud size={16} className="text-white" />
        </div>
        <div>
          <div className="text-white font-semibold text-sm tracking-wide">NimbusDrive</div>
          <div className="text-[10px]" style={{ color: "#64748b" }}>Your Cloud. Your Data.</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group text-left"
                style={{
                  background: isActive ? "linear-gradient(135deg, rgba(59,130,246,0.2) 0%, rgba(34,211,238,0.1) 100%)" : "transparent",
                  border: isActive ? "1px solid rgba(59,130,246,0.3)" : "1px solid transparent",
                }}
              >
                <Icon
                  size={16}
                  style={{ color: isActive ? "#22d3ee" : "#475569" }}
                  className="shrink-0 transition-colors group-hover:text-blue-400"
                />
                <span
                  className="text-sm transition-colors"
                  style={{ color: isActive ? "#e2e8f0" : "#64748b", fontWeight: isActive ? 500 : 400 }}
                >
                  {item.label}
                </span>
                {isActive && (
                  <ChevronRight size={12} className="ml-auto" style={{ color: "#3b82f6" }} />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Storage Usage */}
      <div className="px-4 py-4" style={{ borderTop: "1px solid #1a2540" }}>
        <div className="rounded-xl p-3" style={{ background: "#0d1829", border: "1px solid #1a2540" }}>
          <div className="flex items-center gap-2 mb-2">
            <HardDrive size={13} style={{ color: "#3b82f6" }} />
            <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>Storage Used</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs" style={{ color: "#e2e8f0" }}>{storageGB} of {storageTotal}</span>
            <span className="text-xs font-semibold" style={{ color: "#22d3ee" }}>{storageUsed}%</span>
          </div>
          <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: "#1e2d45" }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all"
              style={{ width: `${storageUsed}%`, background: "linear-gradient(90deg, #3b82f6, #22d3ee)" }}
            />
          </div>
          <div className="mt-2.5 text-xs" style={{ color: "#475569" }}>
            {100 - storageUsed}% free remaining
          </div>
        </div>

        <button
          className="mt-3 w-full py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #0891b2 100%)", color: "#fff" }}
        >
          ↑ Upgrade to Pro
        </button>
      </div>
    </aside>
  );
}
