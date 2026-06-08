import { useState } from "react";
import {
  Trash2, RotateCcw, AlertTriangle, FileText, Image,
  Film, Archive, Folder, Clock, Search, CheckSquare
} from "lucide-react";

const trashedItems = [
  { name: "old_presentation.pptx", icon: FileText, iconColor: "#f59e0b", size: "8.4 MB", deletedAt: "May 22, 2024", deletedBy: "You", daysLeft: 8 },
  { name: "Summer 2023 Photos", icon: Folder, iconColor: "#f59e0b", size: "2.3 GB", deletedAt: "May 20, 2024", deletedBy: "You", daysLeft: 6 },
  { name: "database_backup_v1.sql", icon: FileText, iconColor: "#22c55e", size: "234 MB", deletedAt: "May 18, 2024", deletedBy: "You", daysLeft: 4 },
  { name: "test_video.mp4", icon: Film, iconColor: "#a78bfa", size: "1.1 GB", deletedAt: "May 15, 2024", deletedBy: "Sarah K.", daysLeft: 1 },
  { name: "Draft Copy.docx", icon: FileText, iconColor: "#3b82f6", size: "142 KB", deletedAt: "May 14, 2024", deletedBy: "You", daysLeft: 0 },
  { name: "Archive 2022.zip", icon: Archive, iconColor: "#64748b", size: "4.2 GB", deletedAt: "May 10, 2024", deletedBy: "You", daysLeft: 0 },
];

export function Trash() {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  const toggle = (i: number) => {
    const s = new Set(selected);
    s.has(i) ? s.delete(i) : s.add(i);
    setSelected(s);
  };

  const totalSize = "7.8 GB";
  const expiringSoon = trashedItems.filter((t) => t.daysLeft <= 2).length;

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "#080d1a" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#e2e8f0" }}>Trash</h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>Items are deleted permanently after 30 days</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: "#0d1829", border: "1px solid #1a2540", color: "#94a3b8" }}
          >
            <RotateCcw size={13} /> Restore All
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}
          >
            <Trash2 size={13} /> Empty Trash
          </button>
        </div>
      </div>

      {/* Warning Banner */}
      {expiringSoon > 0 && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl mb-5"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
          <span className="text-sm" style={{ color: "#fbbf24" }}>
            {expiringSoon} items will be permanently deleted within 2 days.
          </span>
          <button className="ml-auto text-xs font-medium px-3 py-1 rounded-lg" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>
            Review Now
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Items in Trash", value: trashedItems.length, color: "#ef4444" },
          { label: "Storage Used", value: totalSize, color: "#f59e0b" },
          { label: "Expiring Soon", value: expiringSoon, color: "#f97316" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
            <div className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: "#475569" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Bulk actions */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#475569" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trash..."
            className="pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: "#0d1829", border: "1px solid #1a2540", color: "#94a3b8", width: "200px" }}
          />
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs" style={{ color: "#64748b" }}>{selected.size} selected</span>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)", color: "#34d399" }}>
              <RotateCcw size={12} /> Restore
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}>
              <Trash2 size={12} /> Delete Forever
            </button>
          </div>
        )}
      </div>

      {/* Trash List */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
        <div
          className="grid px-4 py-2.5"
          style={{ gridTemplateColumns: "28px 1fr 100px 130px 100px 90px 100px", borderBottom: "1px solid #1a2540" }}
        >
          {["", "Name", "Size", "Deleted On", "Deleted By", "Expires In", "Actions"].map((h) => (
            <span key={h} className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#334155" }}>{h}</span>
          ))}
        </div>
        {trashedItems.map((item, i) => {
          const Icon = item.icon;
          const isSelected = selected.has(i);
          const isExpiring = item.daysLeft <= 2;
          return (
            <div
              key={i}
              className="grid px-4 py-3 items-center hover:bg-[#0d1829] transition-colors group"
              style={{
                gridTemplateColumns: "28px 1fr 100px 130px 100px 90px 100px",
                borderBottom: "1px solid #0a1020",
                background: isSelected ? "rgba(239,68,68,0.06)" : undefined,
              }}
            >
              <div
                onClick={() => toggle(i)}
                className="w-4 h-4 rounded flex items-center justify-center cursor-pointer transition-all"
                style={{
                  border: isSelected ? "1px solid #ef4444" : "1px solid #1e2d45",
                  background: isSelected ? "#ef4444" : "transparent",
                }}
              >
                {isSelected && <span className="text-[8px] text-white">✓</span>}
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md flex items-center justify-center opacity-60" style={{ background: `${item.iconColor}18` }}>
                  <Icon size={14} style={{ color: item.iconColor }} />
                </div>
                <span className="text-sm" style={{ color: "#8899aa" }}>{item.name}</span>
              </div>
              <span className="text-xs" style={{ color: "#475569" }}>{item.size}</span>
              <span className="text-xs" style={{ color: "#475569" }}>{item.deletedAt}</span>
              <span className="text-xs" style={{ color: "#475569" }}>{item.deletedBy}</span>
              <div className="flex items-center gap-1">
                <Clock size={10} style={{ color: isExpiring ? "#f97316" : "#475569" }} />
                <span className="text-xs" style={{ color: isExpiring ? "#f97316" : "#475569" }}>
                  {item.daysLeft === 0 ? "Expired" : `${item.daysLeft}d`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] hover:bg-[#1a2540] transition-colors" style={{ color: "#34d399" }}>
                  <RotateCcw size={10} /> Restore
                </button>
                <button className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] hover:bg-[#1a2540] transition-colors" style={{ color: "#ef4444" }}>
                  <Trash2 size={10} /> Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
