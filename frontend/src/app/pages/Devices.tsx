import { useEffect, useMemo, useRef, useState } from "react";
import {
  Monitor,
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
import { formatLastSeen, getDeviceStatus, getIcon } from "./devices/deviceFormatters";
import { DevicesLoadingState } from "./devices/components/DevicesLoadingState";
import { DevicesErrorMessage } from "./devices/components/DevicesErrorMessage";
import { DevicesEmptyState } from "./devices/components/DevicesEmptyState";

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


export function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const loadingRef = useRef(false);

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

  const loadDevices = async () => {
    if (loadingRef.current) return;

    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      const list = await getDevices();
      if (isMountedRef.current) setDevices(list);
    } catch {
      if (isMountedRef.current) setError("Failed to load devices.");
    } finally {
      loadingRef.current = false;
      if (isMountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    loadDevices();
    return () => {
      isMountedRef.current = false;
    };
  }, []);


  const onlineCount = useMemo(
    () => devices.filter((d) => getDeviceStatus(d) === "online").length,
    [devices]
  );

  const trustedCount = useMemo(() => devices.filter((d) => d.trusted).length, [devices]);
  const offlineCount = Math.max(0, devices.length - onlineCount);

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
        <div className="flex items-center gap-2">
          <button
            onClick={loadDevices}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              borderColor: deviceColors.border,
              color: deviceColors.text,
              background: deviceColors.cardBg,
            }}
            type="button"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <div
            className="rounded-full border px-3 py-2 text-xs font-semibold"
            style={{
              borderColor: deviceColors.border,
              color: deviceColors.muted,
              background: deviceColors.cardBg,
            }}
          >
            Devices are detected automatically
          </div>
        </div>


      </div>

      {loading && (
        <DevicesLoadingState
          title="Loading devices..."
          textColor={deviceColors.muted}
          className="text-xs"
        />
      )}


      {error && (
        <div className="mb-4">
          <DevicesErrorMessage message={error} />
          <button
            onClick={loadDevices}
            className="mt-2 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold"
            style={{
              borderColor: deviceColors.border,
              color: deviceColors.text,
              background: deviceColors.cardBg,
            }}
            type="button"
          >
            Retry
          </button>
        </div>
      )}


      {!loading && !error && devices.length === 0 && (
        <DevicesEmptyState
          title="No devices found yet."
          description="Devices will appear here after device tracking is available."
          textColor={deviceColors.title}
          mutedColor={deviceColors.muted}
          backgroundColor={deviceColors.cardBg}
          borderColor={deviceColors.border}
          className="rounded-xl p-6"
        />
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
                        <span className="text-xs" style={{ color: deviceColors.muted }}>Browser</span>
                      </div>
                      <span className="text-xs" style={{ color: deviceColors.muted2 }}>
                        {device.browser ?? "Unknown"}
                      </span>
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

                  <div
                    className="mt-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold"
                    style={{
                      background: deviceColors.panelBg,
                      border: `1px solid ${deviceColors.border}`,
                      color: deviceColors.muted,
                    }}
                  >
                    Read-only
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
