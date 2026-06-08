import { useState } from "react";
import {
  Upload, Download, Share2, Trash2, Edit3, Eye,
  FolderPlus, Link2, Shield, Clock, Filter, Search,
  FileText, Image, Film, Folder, Archive
} from "lucide-react";

const activityLog = [
  { action: "Uploaded", file: "Annual Report 2024.pdf", user: "You", time: "2 minutes ago", date: "Today", icon: Upload, color: "#22d3ee", fileIcon: FileText, fileColor: "#ef4444" },
  { action: "Shared", file: "Project Assets folder", user: "You", time: "15 minutes ago", date: "Today", icon: Share2, color: "#3b82f6", fileIcon: Folder, fileColor: "#f59e0b" },
  { action: "Downloaded", file: "Budget 2024.xlsx", user: "Sarah K.", time: "1 hour ago", date: "Today", icon: Download, color: "#34d399", fileIcon: FileText, fileColor: "#22c55e" },
  { action: "Created folder", file: "Q2 Reports", user: "You", time: "3 hours ago", date: "Today", icon: FolderPlus, color: "#f59e0b", fileIcon: Folder, fileColor: "#f59e0b" },
  { action: "Shared link", file: "Product Demo.mp4", user: "You", time: "5 hours ago", date: "Today", icon: Link2, color: "#a78bfa", fileIcon: Film, fileColor: "#a78bfa" },
  { action: "Deleted", file: "old_backup.zip", user: "You", time: "Yesterday 4:32 PM", date: "Yesterday", icon: Trash2, color: "#ef4444", fileIcon: Archive, fileColor: "#64748b" },
  { action: "Downloaded", file: "Cover Image.jpg", user: "Alex M.", time: "Yesterday 2:15 PM", date: "Yesterday", icon: Download, color: "#34d399", fileIcon: Image, fileColor: "#3b82f6" },
  { action: "Renamed", file: "final_v3.psd → logo_final.psd", user: "You", time: "Yesterday 11:00 AM", date: "Yesterday", icon: Edit3, color: "#f59e0b", fileIcon: Image, fileColor: "#a78bfa" },
  { action: "Uploaded", file: "source_code_v2.zip", user: "You", time: "May 20, 2024", date: "May 20", icon: Upload, color: "#22d3ee", fileIcon: Archive, fileColor: "#64748b" },
  { action: "Viewed", file: "Team Roadmap.pdf", user: "Bob J.", time: "May 20, 2024", date: "May 20", icon: Eye, color: "#94a3b8", fileIcon: FileText, fileColor: "#ef4444" },
];

const groupedActivity = activityLog.reduce((groups, item) => {
  if (!groups[item.date]) groups[item.date] = [];
  groups[item.date].push(item);
  return groups;
}, {} as Record<string, typeof activityLog>);

const filters = ["All", "Uploads", "Downloads", "Shares", "Edits", "Deletes"];

export function Activity() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "#080d1a" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#e2e8f0" }}>Activity</h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>Complete audit log of all file activity</p>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs"
          style={{ background: "#0d1829", border: "1px solid #1a2540", color: "#94a3b8" }}
        >
          <Download size={13} /> Export Log
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Actions Today", value: "28", color: "#3b82f6" },
          { label: "Uploads", value: "12", color: "#22d3ee" },
          { label: "Shares", value: "8", color: "#a78bfa" },
          { label: "Downloads", value: "15", color: "#34d399" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
            <div className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: "#475569" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#475569" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activity..."
            className="pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: "#0d1829", border: "1px solid #1a2540", color: "#94a3b8", width: "200px" }}
          />
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "#0d1829", border: "1px solid #1a2540" }}>
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="px-3 py-1 rounded-md text-xs transition-all"
              style={{
                background: activeFilter === f ? "#1a2540" : "transparent",
                color: activeFilter === f ? "#e2e8f0" : "#475569",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="space-y-6">
        {Object.entries(groupedActivity).map(([date, items]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "#334155" }}>{date}</span>
              <div className="flex-1 h-px" style={{ background: "#1a2540" }} />
            </div>
            <div className="rounded-xl overflow-hidden" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
              {items.map((item, i) => {
                const ActionIcon = item.icon;
                const FileIcon = item.fileIcon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-[#0d1829] transition-colors"
                    style={{ borderBottom: i < items.length - 1 ? "1px solid #0a1020" : "none" }}
                  >
                    {/* Action Icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `${item.color}18`, border: `1px solid ${item.color}22` }}
                    >
                      <ActionIcon size={14} style={{ color: item.color }} />
                    </div>

                    {/* File Icon */}
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: `${item.fileColor}18` }}
                    >
                      <FileIcon size={13} style={{ color: item.fileColor }} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-medium" style={{ color: item.color }}>{item.action}</span>
                        <span className="text-xs" style={{ color: "#94a3b8" }}>
                          {item.file}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold" style={{ background: "linear-gradient(135deg, #3b82f6, #22d3ee)", color: "#fff" }}>
                          {item.user[0]}
                        </div>
                        <span className="text-[10px]" style={{ color: "#475569" }}>{item.user}</span>
                      </div>
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Clock size={10} style={{ color: "#334155" }} />
                      <span className="text-[10px]" style={{ color: "#334155" }}>{item.time}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
