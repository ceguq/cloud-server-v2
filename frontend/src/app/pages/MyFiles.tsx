import { useState } from "react";
import {
  Folder, FileText, Image, Film, Music, Archive, FileCode,
  MoreHorizontal, Upload, FolderPlus, Grid, List, Search,
  Filter, SortAsc, Eye, Download, Share2, Edit3, Trash2,
  ChevronRight, Home, Star, Clock
} from "lucide-react";

const folders = [
  { name: "Documents", count: 234, size: "2.1 GB", color: "#f59e0b", modified: "Today" },
  { name: "Photos", count: 1842, size: "18.4 GB", color: "#3b82f6", modified: "Yesterday" },
  { name: "Videos", count: 56, size: "42.3 GB", color: "#ef4444", modified: "3 days ago" },
  { name: "Music", count: 312, size: "8.7 GB", color: "#a78bfa", modified: "1 week ago" },
  { name: "Projects", count: 89, size: "4.2 GB", color: "#22d3ee", modified: "2 days ago" },
  { name: "Backups", count: 12, size: "22.1 GB", color: "#34d399", modified: "1 month ago" },
];

const files = [
  { name: "Annual Report 2024.pdf", icon: FileText, type: "PDF", size: "4.2 MB", modified: "May 22, 2024", shared: true, starred: true, color: "#ef4444" },
  { name: "Product Roadmap.pptx", icon: FileText, type: "PPTX", size: "12.8 MB", modified: "May 20, 2024", shared: false, starred: false, color: "#f59e0b" },
  { name: "Cover Image.jpg", icon: Image, type: "JPG", size: "3.1 MB", modified: "May 18, 2024", shared: true, starred: false, color: "#3b82f6" },
  { name: "Database Backup.zip", icon: Archive, type: "ZIP", size: "892 MB", modified: "May 15, 2024", shared: false, starred: false, color: "#64748b" },
  { name: "main.py", icon: FileCode, type: "PY", size: "28 KB", modified: "May 14, 2024", shared: false, starred: true, color: "#22d3ee" },
  { name: "Interview Recording.mp4", icon: Film, type: "MP4", size: "1.2 GB", modified: "May 12, 2024", shared: true, starred: false, color: "#a78bfa" },
  { name: "Budget Tracker.xlsx", icon: FileText, type: "XLSX", size: "842 KB", modified: "May 10, 2024", shared: false, starred: false, color: "#22c55e" },
  { name: "Playlist.m3u", icon: Music, type: "M3U", size: "12 KB", modified: "May 8, 2024", shared: false, starred: false, color: "#f472b6" },
];

const typeColors: Record<string, string> = {
  PDF: "#ef4444", PPTX: "#f59e0b", JPG: "#3b82f6", ZIP: "#64748b",
  PY: "#22d3ee", MP4: "#a78bfa", XLSX: "#22c55e", M3U: "#f472b6",
};

export function MyFiles() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggleSelect = (i: number) => {
    const s = new Set(selected);
    s.has(i) ? s.delete(i) : s.add(i);
    setSelected(s);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "#080d1a" }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 mb-4">
        <button className="flex items-center gap-1 text-xs hover:opacity-80" style={{ color: "#3b82f6" }}>
          <Home size={12} /> My Files
        </button>
        <ChevronRight size={12} style={{ color: "#334155" }} />
        <span className="text-xs" style={{ color: "#64748b" }}>All Files</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#e2e8f0" }}>My Files</h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>12,428 items · 1.36 TB used</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-80"
            style={{ background: "#0d1829", border: "1px solid #1a2540", color: "#94a3b8" }}
          >
            <FolderPlus size={13} /> New Folder
          </button>
          <button
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
            style={{ background: "linear-gradient(135deg, #3b82f6, #22d3ee)", color: "#fff" }}
          >
            <Upload size={13} /> Upload Files
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#475569" }} />
          <input
            placeholder="Search files..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
            style={{ background: "#0d1829", border: "1px solid #1a2540", color: "#94a3b8" }}
          />
        </div>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: "#0d1829", border: "1px solid #1a2540", color: "#64748b" }}>
          <Filter size={12} /> Filter
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs" style={{ background: "#0d1829", border: "1px solid #1a2540", color: "#64748b" }}>
          <SortAsc size={12} /> Sort
        </button>
        <div className="flex items-center rounded-lg overflow-hidden ml-auto" style={{ border: "1px solid #1a2540" }}>
          {(["list", "grid"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="w-8 h-8 flex items-center justify-center transition-colors"
              style={{ background: viewMode === mode ? "#1a2540" : "#0d1829", color: viewMode === mode ? "#e2e8f0" : "#475569" }}
            >
              {mode === "list" ? <List size={14} /> : <Grid size={14} />}
            </button>
          ))}
        </div>
      </div>

      {/* Folders */}
      <div className="mb-6">
        <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#334155" }}>Folders</h3>
        <div className="grid grid-cols-6 gap-3">
          {folders.map((folder, i) => (
            <div
              key={i}
              className="rounded-xl p-3 cursor-pointer hover:scale-[1.03] transition-all group"
              style={{ background: "#0f1729", border: "1px solid #1a2540" }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${folder.color}18` }}>
                  <Folder size={18} style={{ color: folder.color }} />
                </div>
                <MoreHorizontal size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "#475569" }} />
              </div>
              <div className="text-xs font-medium truncate" style={{ color: "#e2e8f0" }}>{folder.name}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "#475569" }}>{folder.count} files</div>
              <div className="text-[10px]" style={{ color: "#334155" }}>{folder.size}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Files */}
      <div>
        <h3 className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "#334155" }}>Recent Files</h3>
        <div className="rounded-xl overflow-hidden" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
          <div
            className="grid px-4 py-2.5"
            style={{ gridTemplateColumns: "28px 1fr 80px 120px 80px 60px 36px", borderBottom: "1px solid #1a2540" }}
          >
            {["", "Name", "Type", "Modified", "Size", "Status", ""].map((h, i) => (
              <span key={i} className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#334155" }}>{h}</span>
            ))}
          </div>
          {files.map((file, i) => {
            const Icon = file.icon;
            const isSelected = selected.has(i);
            return (
              <div
                key={i}
                onClick={() => toggleSelect(i)}
                className="grid px-4 py-2.5 items-center cursor-pointer hover:bg-[#0d1829] transition-colors group relative"
                style={{
                  gridTemplateColumns: "28px 1fr 80px 120px 80px 60px 36px",
                  borderBottom: "1px solid #0a1020",
                  background: isSelected ? "rgba(59,130,246,0.08)" : undefined,
                }}
              >
                <div
                  className="w-4 h-4 rounded flex items-center justify-center transition-all"
                  style={{
                    border: isSelected ? "1px solid #3b82f6" : "1px solid #1e2d45",
                    background: isSelected ? "#3b82f6" : "transparent",
                  }}
                >
                  {isSelected && <span className="text-[8px] text-white">✓</span>}
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${file.color}18` }}>
                    <Icon size={14} style={{ color: file.color }} />
                  </div>
                  <span className="text-sm" style={{ color: "#cbd5e1" }}>{file.name}</span>
                  {file.starred && <Star size={10} fill="#f59e0b" style={{ color: "#f59e0b" }} />}
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded font-medium w-fit"
                  style={{ background: `${typeColors[file.type]}18`, color: typeColors[file.type] }}
                >
                  {file.type}
                </span>
                <span className="text-xs" style={{ color: "#475569" }}>{file.modified}</span>
                <span className="text-xs" style={{ color: "#475569" }}>{file.size}</span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded w-fit"
                  style={{
                    background: file.shared ? "rgba(59,130,246,0.1)" : "rgba(71,85,105,0.1)",
                    color: file.shared ? "#3b82f6" : "#475569",
                  }}
                >
                  {file.shared ? "Shared" : "Private"}
                </span>
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === i ? null : i); }}
                    className="w-7 h-7 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#1e2d45]"
                  >
                    <MoreHorizontal size={14} style={{ color: "#64748b" }} />
                  </button>
                  {menuOpen === i && (
                    <div
                      className="absolute right-0 top-8 w-40 rounded-lg shadow-2xl z-50 overflow-hidden"
                      style={{ background: "#0f1729", border: "1px solid #1a2540" }}
                    >
                      {[
                        { icon: Eye, label: "Preview" }, { icon: Download, label: "Download" },
                        { icon: Share2, label: "Share" }, { icon: Star, label: "Star" },
                        { icon: Edit3, label: "Rename" }, { icon: Trash2, label: "Delete", danger: true },
                      ].map((action) => {
                        const AIcon = action.icon;
                        return (
                          <button key={action.label} className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-[#1a2540] transition-colors" style={{ color: (action as any).danger ? "#f87171" : "#94a3b8" }}>
                            <AIcon size={12} />{action.label}
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
      </div>
    </div>
  );
}
