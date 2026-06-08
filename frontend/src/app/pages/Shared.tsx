import { useState } from "react";
import {
  Link2, Users, Eye, Copy, Trash2, MoreHorizontal,
  FileText, Image, Film, Folder, Globe, Lock,
  Clock, Plus, Search, Filter
} from "lucide-react";

const sharedLinks = [
  {
    name: "Project Proposal.pdf",
    icon: FileText,
    iconColor: "#ef4444",
    type: "File",
    access: "Anyone with link",
    accessIcon: Globe,
    views: 42,
    expires: "Jun 30, 2024",
    created: "May 20, 2024",
    sharedWith: [],
  },
  {
    name: "Photos / Summer Trip",
    icon: Folder,
    iconColor: "#f59e0b",
    type: "Folder",
    access: "Specific people",
    accessIcon: Users,
    views: 18,
    expires: "Never",
    created: "May 15, 2024",
    sharedWith: ["alice@example.com", "bob@example.com"],
  },
  {
    name: "Design Assets.zip",
    icon: FileText,
    iconColor: "#64748b",
    type: "File",
    access: "Password protected",
    accessIcon: Lock,
    views: 7,
    expires: "Jul 15, 2024",
    created: "May 12, 2024",
    sharedWith: [],
  },
  {
    name: "Product Demo.mp4",
    icon: Film,
    iconColor: "#a78bfa",
    type: "File",
    access: "Anyone with link",
    accessIcon: Globe,
    views: 156,
    expires: "Never",
    created: "May 5, 2024",
    sharedWith: [],
  },
  {
    name: "Team Docs",
    icon: Folder,
    iconColor: "#22d3ee",
    type: "Folder",
    access: "Specific people",
    accessIcon: Users,
    views: 89,
    expires: "Never",
    created: "Apr 28, 2024",
    sharedWith: ["charlie@example.com"],
  },
];

const sharedWithMe = [
  { name: "Q2 Strategy.pptx", from: "Sarah K.", icon: FileText, iconColor: "#f59e0b", size: "8.4 MB", date: "Today" },
  { name: "Website Mockups", from: "Design Team", icon: Folder, iconColor: "#3b82f6", size: "234 MB", date: "Yesterday" },
  { name: "Financial Report.xlsx", from: "Finance Dept.", icon: FileText, iconColor: "#22c55e", size: "1.2 MB", date: "May 18" },
];

export function Shared() {
  const [activeTab, setActiveTab] = useState<"my-shares" | "shared-with-me">("my-shares");
  const [menuOpen, setMenuOpen] = useState<number | null>(null);

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "#080d1a" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#e2e8f0" }}>Shared</h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>Manage shared files and links</p>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
          style={{ background: "linear-gradient(135deg, #3b82f6, #22d3ee)", color: "#fff" }}
        >
          <Plus size={13} /> Create Share Link
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Links", value: "243", color: "#3b82f6", icon: Link2 },
          { label: "Total Views", value: "1,842", color: "#22d3ee", icon: Eye },
          { label: "Shared Files", value: "87", color: "#a78bfa", icon: FileText },
          { label: "Collaborators", value: "12", color: "#34d399", icon: Users },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl p-4" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${s.color}18` }}>
                  <Icon size={14} style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-xl font-bold" style={{ color: "#e2e8f0" }}>{s.value}</div>
              <div className="text-xs" style={{ color: "#475569" }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-lg w-fit" style={{ background: "#0d1829", border: "1px solid #1a2540" }}>
        {(["my-shares", "shared-with-me"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              background: activeTab === tab ? "#1a2540" : "transparent",
              color: activeTab === tab ? "#e2e8f0" : "#475569",
            }}
          >
            {tab === "my-shares" ? "My Shares" : "Shared with Me"}
          </button>
        ))}
      </div>

      {activeTab === "my-shares" ? (
        <div className="rounded-xl overflow-hidden" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
          <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid #1a2540" }}>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#475569" }} />
              <input placeholder="Search shares..." className="pl-7 pr-3 py-1.5 rounded-lg text-xs outline-none" style={{ background: "#0d1829", border: "1px solid #1a2540", color: "#94a3b8", width: "200px" }} />
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: "#0d1829", border: "1px solid #1a2540", color: "#64748b" }}>
              <Filter size={12} /> Filter
            </button>
          </div>
          <div className="grid px-4 py-2.5" style={{ gridTemplateColumns: "1fr 140px 100px 80px 110px 100px 36px", borderBottom: "1px solid #1a2540" }}>
            {["Name", "Access", "Type", "Views", "Expires", "Created", ""].map((h) => (
              <span key={h} className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#334155" }}>{h}</span>
            ))}
          </div>
          {sharedLinks.map((link, i) => {
            const Icon = link.icon;
            const AccessIcon = link.accessIcon;
            return (
              <div
                key={i}
                className="grid px-4 py-3 items-center hover:bg-[#0d1829] transition-colors group"
                style={{ gridTemplateColumns: "1fr 140px 100px 80px 110px 100px 36px", borderBottom: "1px solid #0a1020" }}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${link.iconColor}18` }}>
                    <Icon size={14} style={{ color: link.iconColor }} />
                  </div>
                  <span className="text-sm" style={{ color: "#cbd5e1" }}>{link.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <AccessIcon size={11} style={{ color: "#475569" }} />
                  <span className="text-xs truncate" style={{ color: "#64748b" }}>{link.access}</span>
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded w-fit"
                  style={{ background: link.type === "Folder" ? "rgba(245,158,11,0.1)" : "rgba(59,130,246,0.1)", color: link.type === "Folder" ? "#f59e0b" : "#3b82f6" }}
                >
                  {link.type}
                </span>
                <div className="flex items-center gap-1">
                  <Eye size={11} style={{ color: "#475569" }} />
                  <span className="text-xs" style={{ color: "#64748b" }}>{link.views}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock size={11} style={{ color: "#475569" }} />
                  <span className="text-xs" style={{ color: link.expires === "Never" ? "#34d399" : "#64748b" }}>{link.expires}</span>
                </div>
                <span className="text-xs" style={{ color: "#475569" }}>{link.created}</span>
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen(menuOpen === i ? null : i)}
                    className="w-7 h-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#1e2d45]"
                  >
                    <MoreHorizontal size={14} style={{ color: "#64748b" }} />
                  </button>
                  {menuOpen === i && (
                    <div className="absolute right-0 top-8 w-40 rounded-lg shadow-2xl z-50 overflow-hidden" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
                      {[{ icon: Copy, label: "Copy Link" }, { icon: Eye, label: "View" }, { icon: Trash2, label: "Revoke", danger: true }].map((a) => {
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
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
          {sharedWithMe.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-[#0d1829] transition-colors" style={{ borderBottom: "1px solid #0a1020" }}>
                <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ background: `${item.iconColor}18` }}>
                  <Icon size={16} style={{ color: item.iconColor }} />
                </div>
                <div className="flex-1">
                  <div className="text-sm" style={{ color: "#cbd5e1" }}>{item.name}</div>
                  <div className="text-xs mt-0.5" style={{ color: "#475569" }}>Shared by <span style={{ color: "#3b82f6" }}>{item.from}</span> · {item.size}</div>
                </div>
                <span className="text-xs" style={{ color: "#475569" }}>{item.date}</span>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: "#0d1829", border: "1px solid #1a2540", color: "#94a3b8" }}>
                  <Eye size={12} /> Open
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
