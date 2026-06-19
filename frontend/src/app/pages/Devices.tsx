import { useEffect, useMemo, useState } from "react";
import {
  Monitor,
  Smartphone,
  Laptop,
  Tablet,
  Plus,
  Clock,
  HardDrive,
  Wifi,
  WifiOff,
  Shield,
  CheckCircle,
  RefreshCw,
} from "lucide-react";

import { getDevices, type Device } from "../../services/deviceService";

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
  try {
    if (theme === "light" || theme === "dark") return theme;
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    return mq?.matches ? "dark" : "light";
  } catch {
    return "dark";
  }
}


function getDeviceStatus(device: Device): "online" | "offline" {
  if (!device.last_seen_at) return "offline";
  const last = new Date(device.last_seen_at).getTime();
  if (Number.isNaN(last)) return "offline";
  const now = Date.now();
  return now - last <= 15 * 60 * 1000 ? "online" : "offline";
}

function formatLastSeen(lastSeen: string | null): string {
  if (!lastSeen) return "Never seen";
  const d = new Date(lastSeen);
  if (Number.isNaN(d.getTime())) return "Never seen";
  return d.toLocaleString();
}

export function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [appearanceTheme, setAppearanceTheme] = useState<AppearanceTheme>(
    safeReadAppearanceTheme,
  );
  const [accentColor, setAccentColor] = useState<string>(safeReadAccentColor);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(
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
    // Initialize
    try {
      syncThemeFromStorage();
    } catch {
      // ignore
    }

    if (typeof window === "undefined") return;

    const onNimbusAppearanceChange = () => syncThemeFromStorage();
    window.addEventListener("nimbus-appearance-change", onNimbusAppearanceChange);
    window.addEventListener("storage", onNimbusAppearanceChange);
    window.addEventListener("focus", onNimbusAppearanceChange);

    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia?.("(prefers-color-scheme: dark)") ?? null;
      const onMqChange = () => {
        syncThemeFromStorage();
      };
      mq?.addEventListener?.("change", onMqChange);

      return () => {
        mq?.removeEventListener?.("change", onMqChange);
        window.removeEventListener(
          "nimbus-appearance-change",
          onNimbusAppearanceChange,
        );
        window.removeEventListener("storage", onNimbusAppearanceChange);
        window.removeEventListener("focus", onNimbusAppearanceChange);
      };
    } catch {
      return () => {
        window.removeEventListener(
          "nimbus-appearance-change",
          onNimbusAppearanceChange,
        );
        window.removeEventListener("storage", onNimbusAppearanceChange);
        window.removeEventListener("focus", onNimbusAppearanceChange);
      };
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await getDevices();
        if (isMounted) setDevices(list);
      } catch {
        if (isMounted) setError("Failed to load devices.");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    run();
    return () => {
      isMounted = false;
    };
  }, []);


  const onlineCount = useMemo(
    () => devices.filter((d) => getDeviceStatus(d) === "online").length,
    [devices]
  );

  const trustedCount = useMemo(() => devices.filter((d) => d.trusted).length, [devices]);
  const offlineCount = Math.max(0, devices.length - onlineCount);

  const getIcon = (device: Device) => {
    const t = device.device_type;
    if (t === "laptop") return Laptop;
    if (t === "mobile") return Smartphone;
    if (t === "tablet") return Tablet;
    if (t === "desktop") return Monitor;
    return Monitor;
  };

  const deviceColors =
    resolvedTheme === "light"
      ? {
          pageBg: "#f8fafc",
          cardBg: "#ffffff",
          panelBg: "#f1f5f9",
          border: "#dbe3ef",
          borderSoft: "#e5eaf1",
          title: "#0f172a",
          text: "#334155",
          muted: "#64748b",
          muted2: "#94a3b8",
          iconMuted: "#64748b",
          buttonBg: "#f8fafc",
        }
      : {
          pageBg: "#111c2f",
          cardBg: "#0f1729",
          panelBg: "#0d1829",
          border: "#1a2540",
          borderSoft: "#0a1020",
          title: "#e2e8f0",
          text: "#94a3b8",
          muted: "#64748b",
          muted2: "#475569",
          iconMuted: "#475569",
          buttonBg: "#0d1829",
        };

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      style={{ background: deviceColors.pageBg }}
    >
      <div className="flex items-center justify-between mb-5">
        <div>

          <h1 className="text-xl font-semibold" style={{ color: deviceColors.title }}>
            Devices
          </h1>
          <p className="text-xs mt-0.5" style={{ color: deviceColors.muted }}>

            {devices.length} devices registered · {onlineCount} online
          </p>
        </div>
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-not-allowed"
          style={{
            background: `linear-gradient(135deg, ${accentColor} 0%, #22d3ee 100%)`,
            color: "#fff",
          }}
          disabled
          title="Coming soon"
        >
          <Plus size={13} /> Add Device
        </button>


      </div>

      {loading && (
        <div className="text-xs" style={{ color: deviceColors.muted }}>
          Loading devices...
        </div>
      )}


      {error && (
        <div
          className="text-xs p-3 rounded-lg mb-4"
          style={{
            background: "rgba(248,113,113,0.12)",
            border: "1px solid rgba(248,113,113,0.25)",
            color: "#f87171",
          }}
        >
          {error}
        </div>
      )}


      {!loading && !error && devices.length === 0 && (
        <div
          className="rounded-xl p-6"
          style={{ background: deviceColors.cardBg, border: `1px solid ${deviceColors.border}` }}
        >
          <div className="text-sm font-semibold" style={{ color: deviceColors.title }}>
            No devices found yet.
          </div>
          <div className="text-xs mt-1" style={{ color: deviceColors.muted }}>

            Devices will appear here after device tracking is available.
          </div>
        </div>
      )}

      {!loading && !error && devices.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Devices", value: devices.length, color: "#3b82f6", icon: Monitor },
              { label: "Online", value: onlineCount, color: "#34d399", icon: Wifi },
              { label: "Offline", value: offlineCount, color: "#f59e0b", icon: WifiOff },
              { label: "Trusted", value: trustedCount, color: "#a78bfa", icon: Shield },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-xl p-4"
                  style={{
                    background: deviceColors.cardBg,
                    border: `1px solid ${deviceColors.border}`,
                  }}
                >

                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ background: `${s.color}18` }}
                    >
                      <Icon size={14} style={{ color: s.color }} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: deviceColors.title }}>
                    {s.value}
                  </div>
                  <div className="text-xs" style={{ color: deviceColors.muted }}>
                    {s.label}
                  </div>

                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-4">
            {devices.map((device) => {
              const Icon = getIcon(device);
              const status = getDeviceStatus(device);

              return (
                <div
                  key={device.id}
                  className="rounded-xl p-4"
                  style={{
                    background: deviceColors.cardBg,
                    border: `1px solid ${
                      status === "online" ? "rgba(52,211,153,0.2)" : deviceColors.border
                    }`,
                  }}
                >

                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background:
                          status === "online" ? "rgba(52,211,153,0.1)" : `${deviceColors.muted}1A`,
                        border: `1px solid ${
                          status === "online" ? "rgba(52,211,153,0.2)" : deviceColors.border
                        }`,
                      }}
                    >
                      <Icon
                        size={22}
                        style={{
                          color: status === "online" ? "#34d399" : deviceColors.iconMuted,
                        }}
                      />
                    </div>


                    <div>
                      <div className="text-sm font-semibold" style={{ color: deviceColors.title }}>
                        {device.display_name ?? "Unknown device"}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: deviceColors.muted }}>

                        {device.device_type ?? "Unknown type"} · {device.platform ?? "Unknown platform"}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background:
                              status === "online" ? "#34d399" : deviceColors.iconMuted,
                          }}
                        />


                        <span

                          className="text-[10px] capitalize"
                          style={{ color: status === "online" ? "#34d399" : deviceColors.iconMuted }}
                        >
                          {status}
                        </span>

                        {device.trusted && <CheckCircle size={10} style={{ color: "#3b82f6" }} />}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-3" style={{ borderTop: `1px solid ${deviceColors.border}` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock size={11} style={{ color: deviceColors.iconMuted }} />
                        <span className="text-xs" style={{ color: deviceColors.muted }}>Last seen</span>
                      </div>
                      <span className="text-xs" style={{ color: deviceColors.muted2 }}>

                        {formatLastSeen(device.last_seen_at)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <HardDrive size={11} style={{ color: deviceColors.iconMuted }} />
                        <span className="text-xs" style={{ color: deviceColors.muted }}>Storage</span>
                      </div>
                      <span className="text-xs" style={{ color: deviceColors.muted2 }}>—</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Wifi size={11} style={{ color: deviceColors.iconMuted }} />
                        <span className="text-xs" style={{ color: deviceColors.muted }}>IP Address</span>
                      </div>
                      <span className="text-xs font-mono" style={{ color: deviceColors.muted }}>

                        {device.ip_address ?? "Unknown IP"}
                      </span>
                    </div>
                  </div>

                  <button
                    className="mt-3 w-full py-1.5 rounded-lg text-xs font-medium transition-colors opacity-60 cursor-not-allowed"
                    style={{
                      background: deviceColors.buttonBg,
                      border: `1px solid ${deviceColors.border}`,
                      color: deviceColors.muted,
                    }}
                    disabled
                    title="Coming soon"
                  >

                    <RefreshCw size={11} className="inline mr-1.5" />
                    Coming soon
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
