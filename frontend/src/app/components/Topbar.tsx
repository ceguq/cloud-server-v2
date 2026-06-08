import { useState } from "react";
import { Search, Upload, Bell, ChevronDown, Plus, Zap } from "lucide-react";

interface TopbarProps {
  activePage: string;
}

const pageTitles: Record<string, string> = {
  dashboard: "Dashboard",
  "my-files": "My Files",
  shared: "Shared",
  uploads: "Uploads",
  devices: "Devices",
  activity: "Activity",
  trash: "Trash",
  "server-monitor": "Server Monitor",
  settings: "Settings",
};

export function Topbar({ activePage }: TopbarProps) {
  const [searchValue, setSearchValue] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header
      className="flex items-center gap-4 px-6 py-3 shrink-0"
      style={{ background: "#0b1121", borderBottom: "1px solid #1a2540", height: "60px" }}
    >
      {/* Page title */}
      <div className="shrink-0">
        <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>{pageTitles[activePage] || "Dashboard"}</span>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-xl relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#475569" }} />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          placeholder="Search files, folders, and more..."
          className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none transition-all"
          style={{
            background: "#0d1829",
            border: "1px solid #1a2540",
            color: "#94a3b8",
            caretColor: "#22d3ee",
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.boxShadow = "0 0 0 2px rgba(59,130,246,0.15)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "#1a2540"; e.currentTarget.style.boxShadow = "none"; }}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#1e2d45", color: "#475569" }}>⌘K</span>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Quick action */}
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #3b82f6 0%, #22d3ee 100%)", color: "#fff" }}
        >
          <Upload size={13} />
          Upload
        </button>

        {/* Notification */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[#1a2540]"
            style={{ border: "1px solid #1a2540" }}
          >
            <Bell size={15} style={{ color: "#64748b" }} />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full" style={{ background: "#22d3ee" }} />
          </button>
          {notifOpen && (
            <div
              className="absolute right-0 top-10 w-72 rounded-xl shadow-2xl z-50 overflow-hidden"
              style={{ background: "#0f1729", border: "1px solid #1a2540" }}
            >
              <div className="px-4 py-3" style={{ borderBottom: "1px solid #1a2540" }}>
                <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>Notifications</span>
              </div>
              {[
                { title: "Sync Complete", desc: "All 3 devices are up to date", time: "2m ago", dot: "#22d3ee" },
                { title: "Storage Warning", desc: "You've used 68% of your storage", time: "1h ago", dot: "#f59e0b" },
                { title: "New Share", desc: "Alex shared 'Project Files'", time: "3h ago", dot: "#3b82f6" },
              ].map((n, i) => (
                <div key={i} className="flex gap-3 px-4 py-3 hover:bg-[#1a2540] cursor-pointer transition-colors" style={{ borderBottom: "1px solid #0d1829" }}>
                  <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: n.dot }} />
                  <div>
                    <div className="text-xs font-medium" style={{ color: "#e2e8f0" }}>{n.title}</div>
                    <div className="text-xs" style={{ color: "#64748b" }}>{n.desc}</div>
                    <div className="text-[10px] mt-0.5" style={{ color: "#475569" }}>{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Avatar */}
        <button
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-[#1a2540]"
          style={{ border: "1px solid #1a2540" }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "linear-gradient(135deg, #3b82f6, #22d3ee)", color: "#fff" }}
          >
            A
          </div>
          <span className="text-xs font-medium" style={{ color: "#94a3b8" }}>Alex</span>
          <ChevronDown size={12} style={{ color: "#475569" }} />
        </button>
      </div>
    </header>
  );
}
