import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  HardDrive,
  Database,
  Star,
  Folder,
  FileText,
  Users,
  Share2,
  Grid3X3,
  LayoutList,
  Search,
} from "lucide-react";

import { GDriveIcon } from "../components/GDriveIcon";

type AppearanceTheme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

function safeReadAppearanceTheme(): AppearanceTheme {
  if (typeof window === "undefined") return "dark";
  try {
    const raw = window.localStorage.getItem("nimbus_appearance_theme");
    if (raw === "dark" || raw === "light" || raw === "system") return raw;
  } catch {
    // ignore
  }
  return "dark";
}

function safeReadAccentColor(): string {
  if (typeof window === "undefined") return "#3b82f6";
  try {
    const raw = window.localStorage.getItem("nimbus_accent_color");
    if (typeof raw === "string" && raw.trim().length > 0) return raw;
  } catch {
    // ignore
  }
  return "#3b82f6";
}

function resolveAppearanceTheme(theme: AppearanceTheme): ResolvedTheme {
  if (theme === "dark" || theme === "light") return theme;
  try {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    return mq?.matches ? "dark" : "light";
  } catch {
    return "dark";
  }
}

type GDriveAccount = {
  id: string;
  email: string;
  kind: "personal" | "work";
  status: "Connected";
  usedGB: number;
  limitGB: number;
};

type GDriveFile = {
  id: string;
  name: string;
  mime: string;
  starred?: boolean;
  shared?: boolean;
  recentAt: string;
  sizeGB: number;
  owner: "me" | "someone";
};

type TabKey = "all" | "starred" | "shared" | "recent";

type GDriveFileIconProps = {
  mime: string;
  size?: number;
};

function renderGDriveFileIcon({ mime, size = 16 }: GDriveFileIconProps) {
  const m = (mime || "").toLowerCase();
  const commonStyle: React.CSSProperties = { color: "rgba(148,163,184,0.9)" };

  if (m.includes("folder")) return <Folder size={size} style={commonStyle} />;
  if (m.includes("pdf")) return <FileText size={size} style={{ color: "#ef4444" }} />;
  if (m.includes("spreadsheet")) return <Database size={size} style={{ color: "#22c55e" }} />;
  if (m.includes("presentation")) return <Users size={size} style={{ color: "#3b82f6" }} />;
  if (m.includes("image")) return <span style={{ fontSize: size, lineHeight: 1 }}>🖼️</span>;
  if (m.includes("video")) return <span style={{ fontSize: size, lineHeight: 1 }}>🎬</span>;
  if (m.includes("audio")) return <span style={{ fontSize: size, lineHeight: 1 }}>🎵</span>;
  if (m.includes("zip") || m.includes("compressed"))
    return <span style={{ fontSize: size, lineHeight: 1 }}>🗜️</span>;
  if (m.includes("text") || m.includes("json") || m.includes("xml"))
    return <span style={{ fontSize: size, lineHeight: 1 }}>📄</span>;
  return <FileText size={size} style={commonStyle} />;
}

export function GDrive() {
  const [appearanceTheme, setAppearanceTheme] = useState<AppearanceTheme>(
    safeReadAppearanceTheme,
  );
  const [accentColor, setAccentColor] = useState<string>(safeReadAccentColor);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveAppearanceTheme(safeReadAppearanceTheme()),
  );

  const syncThemeFromStorage = () => {
    const nextTheme = safeReadAppearanceTheme();
    const nextAccent = safeReadAccentColor();
    setAppearanceTheme(nextTheme);
    setAccentColor(nextAccent);
    setResolvedTheme(resolveAppearanceTheme(nextTheme));
  };

  useEffect(() => {
    syncThemeFromStorage();

    if (typeof window === "undefined") return;

    window.addEventListener("nimbus-appearance-change", syncThemeFromStorage);
    window.addEventListener("storage", syncThemeFromStorage);
    window.addEventListener("focus", syncThemeFromStorage);

    return () => {
      window.removeEventListener("nimbus-appearance-change", syncThemeFromStorage);
      window.removeEventListener("storage", syncThemeFromStorage);
      window.removeEventListener("focus", syncThemeFromStorage);
    };
  }, []);

  const colors = useMemo(() => {
    if (resolvedTheme === "light") {
      return {
        pageBg: "#f8fafc",
        cardBg: "#ffffff",
        panelBg: "#f1f5f9",
        border: "#dbe3ef",
        borderSoft: "#e5eaf1",
        title: "#0f172a",
        text: "#334155",
        muted: "#64748b",
        muted2: "#94a3b8",
        divider: "#e5eaf1",
      };
    }

    return {
      pageBg: "#111c2f",
      cardBg: "#0f1729",
      panelBg: "#0d1829",
      border: "#1a2540",
      borderSoft: "#0a1020",
      title: "#e2e8f0",
      text: "#cbd5e1",
      muted: "rgba(148,163,184,0.62)",
      muted2: "rgba(148,163,184,0.48)",
      divider: "#122043",
    };
  }, [resolvedTheme]);

  // Dummy accounts
  const gdriveAccounts: GDriveAccount[] = useMemo(
    () => [
      {
        id: "acc-personal",
        email: "alex.personal@gmail.com",
        kind: "personal",
        status: "Connected",
        usedGB: 18.4,
        limitGB: 30,
      },
      {
        id: "acc-work",
        email: "alex.work@company.com",
        kind: "work",
        status: "Connected",
        usedGB: 62.1,
        limitGB: 100,
      },
    ],
    [],
  );

  // Dummy file list
  const gdriveAllFiles: GDriveFile[] = useMemo(
    () => [
      {
        id: "f-1",
        name: "Project NimbusDrive Plan.pdf",
        mime: "application/pdf",
        starred: true,
        shared: true,
        recentAt: "2026-06-17T10:12:00Z",
        sizeGB: 0.42,
        owner: "someone",
      },
      {
        id: "f-2",
        name: "Q2 Budget 2026.xlsx",
        mime: "application/vnd.google-apps.spreadsheet",
        starred: false,
        shared: false,
        recentAt: "2026-06-14T08:01:00Z",
        sizeGB: 0.08,
        owner: "me",
      },
      {
        id: "f-3",
        name: "Sprint 21 Deck.pptx",
        mime: "application/vnd.google-apps.presentation",
        starred: true,
        shared: false,
        recentAt: "2026-06-12T18:34:00Z",
        sizeGB: 0.22,
        owner: "me",
      },
      {
        id: "f-4",
        name: "Brand Assets.zip",
        mime: "application/zip",
        starred: false,
        shared: true,
        recentAt: "2026-06-11T09:20:00Z",
        sizeGB: 1.3,
        owner: "someone",
      },
      {
        id: "f-5",
        name: "Team Photo.png",
        mime: "image/png",
        starred: false,
        shared: false,
        recentAt: "2026-06-09T22:12:00Z",
        sizeGB: 0.05,
        owner: "me",
      },
    ],
    [],
  );

  const [activeAccountId, setActiveAccountId] = useState<string>(
    gdriveAccounts[0]?.id ?? "",
  );
  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState<string>("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const filteredFiles = useMemo(() => {
    const q = search.trim().toLowerCase();

    let base = [...gdriveAllFiles];
    if (tab === "starred") base = base.filter((f) => !!f.starred);
    if (tab === "shared") base = base.filter((f) => !!f.shared);
    if (tab === "recent") {
      base = [...base]
        .sort((a, b) => b.recentAt.localeCompare(a.recentAt))
        .slice(0, 4);
    }

    if (q) base = base.filter((f) => f.name.toLowerCase().includes(q));

    // UI-only anchor
    void activeAccountId;
    return base;
  }, [gdriveAllFiles, tab, search, activeAccountId]);

  const anyFiles = filteredFiles.length > 0;

  const formatGB = (n: number) => {
    if (!Number.isFinite(n)) return "0 GB";
    if (n < 1) return `${Math.round(n * 1024)} MB`;
    return `${n.toFixed(n >= 10 ? 0 : 1)} GB`;
  };

  const storagePct = (usedGB: number, limitGB: number) => {
    const pctRaw = limitGB > 0 ? (usedGB / limitGB) * 100 : 0;
    return Math.min(100, Math.max(0, Math.round(pctRaw)));
  };

  const activeAccount = gdriveAccounts.find((a) => a.id === activeAccountId) ?? gdriveAccounts[0];

  const tabs: Array<{ key: TabKey; label: string; icon?: any }> = [
    { key: "all", label: "All Files" },
    { key: "starred", label: "Starred" },
    { key: "shared", label: "Shared" },
    { key: "recent", label: "Recent" },
  ];

  const tabButtonStyle = (isActive: boolean) => ({
    background: isActive ? `${accentColor}18` : "transparent",
    border: isActive ? `1px solid ${accentColor}55` : `1px solid transparent`,
    color: isActive ? colors.title : colors.muted,
  });

  return (
    <div className="flex-1 min-h-0 overflow-hidden" style={{ background: colors.pageBg }}>
      <div className="h-full min-h-0 overflow-y-auto p-6 nimbus-scrollbar">
        {/* Top header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: `${accentColor}14`,
                border: `1px solid ${accentColor}33`,
              }}
            >
              <GDriveIcon size={20} />
            </div>
            <div>
              <h1 className="text-xl font-semibold" style={{ color: colors.title }}>
                Google Drive
              </h1>
              <p className="text-xs mt-0.5" style={{ color: colors.muted }}>
                Manage connected Google Drive accounts and browse synced files.
              </p>
            </div>
          </div>

        </div>

        {/* Two columns layout */}
        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4 h-full">
          {/* Left panel: accounts */}
          <div
            className="rounded-2xl p-4 border overflow-hidden"
            style={{ background: colors.cardBg, borderColor: colors.border }}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold" style={{ color: colors.title }}>
                  Google Drive
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: colors.muted2 }}>
                  {gdriveAccounts.length} accounts connected
                </div>
              </div>
              <button
                type="button"
                className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs"
                style={{ background: `${accentColor}14`, border: `1px solid ${accentColor}33`, color: colors.title }}
                onClick={() => {
                  // UI-only: placeholder
                }}
              >
                <Plus size={13} />
              </button>
            </div>

            <div className="space-y-3">
              {gdriveAccounts.map((acc) => {
                const pct = storagePct(acc.usedGB, acc.limitGB);
                const isActive = acc.id === activeAccountId;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => setActiveAccountId(acc.id)}
                    className="w-full text-left rounded-xl p-3 transition-all"
                    style={{
                      background: isActive ? `${accentColor}12` : colors.panelBg,
                      border: `1px solid ${isActive ? `${accentColor}55` : colors.borderSoft}`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <HardDrive size={13} style={{ color: accentColor }} />
                          <div className="text-xs font-semibold truncate" style={{ color: colors.title }}>
                            {acc.kind === "personal" ? "Personal" : "Work"}
                          </div>
                        </div>
                        <div className="text-[11px] mt-1 truncate" style={{ color: colors.muted2 }}>
                          {acc.email}
                        </div>
                      </div>

                      <div className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{
                        background: "rgba(52,211,153,0.12)",
                        color: "#34d399",
                        border: "1px solid rgba(52,211,153,0.25)",
                      }}>
                        {acc.status}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between items-center text-[11px]" style={{ color: colors.muted2 }}>
                        <span>
                          {formatGB(acc.usedGB)} of {formatGB(acc.limitGB)}
                        </span>
                        <span>{pct}%</span>
                      </div>
                      <div className="relative h-2 mt-2 rounded-full overflow-hidden" style={{ background: colors.borderSoft }}>
                        <div
                          className="absolute inset-y-0 left-0"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${accentColor}, #22d3ee)`,
                          }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel: file browser */}
          <div
            className="rounded-2xl border overflow-hidden flex flex-col"
            style={{ background: colors.cardBg, borderColor: colors.border }}
          >
            {/* Tabs + controls */}
            <div className="p-4 border-b" style={{ borderColor: colors.borderSoft }}>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {tabs.map((t) => {
                    const isActive = tab === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ ...tabButtonStyle(isActive), color: isActive ? colors.title : colors.muted }}
                        onClick={() => setTab(t.key)}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg overflow-hidden" style={{ border: `1px solid ${colors.borderSoft}`, background: colors.panelBg }}>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className="px-3 py-2 text-xs flex items-center"
                      style={{
                        color: viewMode === "list" ? colors.title : colors.muted,
                        background: viewMode === "list" ? `${accentColor}16` : "transparent",
                      }}
                    >
                      <LayoutList size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className="px-3 py-2 text-xs flex items-center"
                      style={{
                        color: viewMode === "grid" ? colors.title : colors.muted,
                        background: viewMode === "grid" ? `${accentColor}16` : "transparent",
                      }}
                    >
                      <Grid3X3 size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search
                    size={13}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: colors.muted2 }}
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search Drive files..."
                    className="w-full pl-9 pr-3 py-2 rounded-lg text-xs outline-none"
                    style={{
                      background: colors.panelBg,
                      border: `1px solid ${colors.borderSoft}`,
                      color: colors.text,
                    }}
                  />
                </div>

                <div className="text-xs" style={{ color: colors.muted2 }}>
                  {activeAccount ? `Showing ${filteredFiles.length} item(s)` : ""}
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              {!anyFiles ? (
                <div className="flex flex-col items-center justify-center py-14">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}33` }}>
                    <Share2 size={18} style={{ color: accentColor }} />
                  </div>
                  <div className="mt-4 text-sm font-semibold" style={{ color: colors.title }}>
                    No files found
                  </div>
                  <div className="text-xs mt-1" style={{ color: colors.muted2 }}>
                    Try another tab or clear your search.
                  </div>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredFiles.map((f) => (
                    <div
                      key={f.id}
                      className="rounded-xl p-3 border transition-all"
                      style={{
                        background: colors.panelBg,
                        borderColor: colors.borderSoft,
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}33` }}>
                            {renderGDriveFileIcon({ mime: f.mime, size: 18 })}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate" style={{ color: colors.title }}>
                              {f.name}
                            </div>
                            <div className="text-[11px] mt-1" style={{ color: colors.muted2 }}>
                              {new Date(f.recentAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        {f.starred && (
                          <Star size={14} style={{ color: "#fbbf24" }} />
                        )}
                      </div>

                      <div className="mt-3 flex justify-between text-[11px]" style={{ color: colors.muted2 }}>
                        <span>{f.owner === "me" ? "You" : "Shared"}</span>
                        <span>{formatGB(f.sizeGB)}</span>
                      </div>

                      {f.shared && (
                        <div className="mt-2 text-[11px] font-semibold px-2 py-1 rounded-full inline-flex" style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}33`, color: accentColor }}>
                          Shared
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  {/* Header */}
                  <div
                    className="grid px-2 py-2 text-[11px] font-semibold uppercase tracking-wider"
                    style={{
                      gridTemplateColumns: "28px 1fr 140px 120px 110px 80px",
                      color: colors.muted2,
                      borderBottom: `1px solid ${colors.borderSoft}`,
                    }}
                  >
                    <span />
                    <span>Name</span>
                    <span>Modified</span>
                    <span>Size</span>
                    <span>Owner</span>
                    <span>Star</span>
                  </div>

                  <div className="flex flex-col">
                    {filteredFiles.map((f) => (
                      <div
                        key={f.id}
                        className="grid px-2 py-2.5 items-center rounded-lg mb-1"
                        style={{
                          gridTemplateColumns: "28px 1fr 140px 120px 110px 80px",
                          border: `1px solid transparent`,
                          background: "transparent",
                          color: colors.title,
                        }}
                      >
                        <div className="flex items-center justify-center">
                          {renderGDriveFileIcon({ mime: f.mime, size: 16 })}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate" style={{ color: colors.title }}>
                            {f.name}
                          </div>
                          <div className="text-[11px] mt-0.5" style={{ color: colors.muted2 }}>
                            {f.shared ? "Shared file" : ""}
                          </div>
                        </div>
                        <div className="text-xs" style={{ color: colors.muted2 }}>
                          {new Date(f.recentAt).toLocaleString()}
                        </div>
                        <div className="text-xs" style={{ color: colors.muted2 }}>
                          {formatGB(f.sizeGB)}
                        </div>
                        <div className="text-xs" style={{ color: colors.muted2 }}>
                          {f.owner === "me" ? "You" : "Someone"}
                        </div>
                        <div className="flex items-center justify-start">
                          {f.starred ? <Star size={16} style={{ color: "#fbbf24" }} /> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

