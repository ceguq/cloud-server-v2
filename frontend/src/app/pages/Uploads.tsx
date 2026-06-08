import { useState, useRef } from "react";
import {
  Upload, CheckCircle, XCircle, Clock, Pause, Play,
  FileText, Image, Film, Archive, X, RotateCcw
} from "lucide-react";

const uploadsData = [
  { name: "Annual Report 2024.pdf", icon: FileText, iconColor: "#ef4444", size: "4.2 MB", progress: 100, status: "done", speed: "—", time: "Completed" },
  { name: "Summer Trip Photos.zip", icon: Archive, iconColor: "#64748b", size: "892 MB", progress: 67, status: "uploading", speed: "8.4 MB/s", time: "~2 min left" },
  { name: "Product Demo.mp4", icon: Film, iconColor: "#a78bfa", size: "1.2 GB", progress: 34, status: "uploading", speed: "5.1 MB/s", time: "~8 min left" },
  { name: "Logo Final.png", icon: Image, iconColor: "#3b82f6", size: "2.8 MB", progress: 100, status: "done", speed: "—", time: "Completed" },
  { name: "Database Export.sql", icon: FileText, iconColor: "#22c55e", size: "234 MB", progress: 0, status: "paused", speed: "—", time: "Paused" },
  { name: "source_code.zip", icon: Archive, iconColor: "#64748b", size: "48 MB", progress: 0, status: "failed", speed: "—", time: "Failed" },
  { name: "Project Assets.zip", icon: Archive, iconColor: "#f59e0b", size: "156 MB", progress: 100, status: "done", speed: "—", time: "Completed" },
];

const statusConfig = {
  done: { color: "#34d399", label: "Done", icon: CheckCircle },
  uploading: { color: "#3b82f6", label: "Uploading", icon: Clock },
  paused: { color: "#f59e0b", label: "Paused", icon: Pause },
  failed: { color: "#ef4444", label: "Failed", icon: XCircle },
};

export function Uploads() {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const activeUploads = uploadsData.filter((u) => u.status === "uploading").length;
  const completedUploads = uploadsData.filter((u) => u.status === "done").length;
  const totalProgress = Math.round(uploadsData.reduce((acc, u) => acc + u.progress, 0) / uploadsData.length);

  return (
    <div className="flex-1 overflow-y-auto p-6" style={{ background: "#080d1a" }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#e2e8f0" }}>Uploads</h1>
          <p className="text-xs mt-0.5" style={{ color: "#475569" }}>Manage your file uploads</p>
        </div>
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold"
          style={{ background: "linear-gradient(135deg, #3b82f6, #22d3ee)", color: "#fff" }}
        >
          <Upload size={13} /> Upload Files
        </button>
        <input ref={fileRef} type="file" multiple className="hidden" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Active Uploads", value: activeUploads, color: "#3b82f6" },
          { label: "Completed", value: completedUploads, color: "#34d399" },
          { label: "Failed", value: 1, color: "#ef4444" },
          { label: "Overall Progress", value: `${totalProgress}%`, color: "#22d3ee" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
            <div className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs" style={{ color: "#475569" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragOver(false); }}
        className="rounded-xl p-10 mb-6 flex flex-col items-center justify-center cursor-pointer transition-all"
        style={{
          border: `2px dashed ${isDragOver ? "#3b82f6" : "#1a2540"}`,
          background: isDragOver ? "rgba(59,130,246,0.05)" : "#0d1829",
        }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
          style={{ background: "rgba(59,130,246,0.1)", border: "2px solid rgba(59,130,246,0.2)" }}
        >
          <Upload size={22} style={{ color: "#3b82f6" }} />
        </div>
        <p className="text-sm font-medium mb-1" style={{ color: "#e2e8f0" }}>
          {isDragOver ? "Drop files here" : "Drag & drop files here"}
        </p>
        <p className="text-xs" style={{ color: "#475569" }}>or click to browse · Max 5 GB per file</p>
      </div>

      {/* Upload Queue */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#0f1729", border: "1px solid #1a2540" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #1a2540" }}>
          <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>Upload Queue</span>
          <button className="text-xs px-2 py-1 rounded-md" style={{ background: "#0d1829", color: "#64748b" }}>Clear Completed</button>
        </div>
        <div className="grid px-4 py-2.5" style={{ gridTemplateColumns: "1fr 100px 100px 100px 80px 60px", borderBottom: "1px solid #1a2540" }}>
          {["File", "Size", "Speed", "Time Left", "Progress", "Status"].map((h) => (
            <span key={h} className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#334155" }}>{h}</span>
          ))}
        </div>
        {uploadsData.map((u, i) => {
          const Icon = u.icon;
          const SC = statusConfig[u.status as keyof typeof statusConfig];
          const StatusIcon = SC.icon;
          return (
            <div
              key={i}
              className="grid px-4 py-3 items-center hover:bg-[#0d1829] transition-colors group"
              style={{ gridTemplateColumns: "1fr 100px 100px 100px 80px 60px", borderBottom: "1px solid #0a1020" }}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md flex items-center justify-center" style={{ background: `${u.iconColor}18` }}>
                  <Icon size={14} style={{ color: u.iconColor }} />
                </div>
                <span className="text-sm" style={{ color: "#cbd5e1" }}>{u.name}</span>
              </div>
              <span className="text-xs" style={{ color: "#64748b" }}>{u.size}</span>
              <span className="text-xs" style={{ color: "#64748b" }}>{u.speed}</span>
              <span className="text-xs" style={{ color: "#64748b" }}>{u.time}</span>
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-[10px]" style={{ color: "#475569" }}>{u.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1e2d45" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${u.progress}%`,
                      background: u.status === "done" ? "#34d399" : u.status === "failed" ? "#ef4444" : "linear-gradient(90deg, #3b82f6, #22d3ee)",
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <StatusIcon size={13} style={{ color: SC.color }} />
                <span className="text-[10px]" style={{ color: SC.color }}>{SC.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
