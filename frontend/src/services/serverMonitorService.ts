import api from "./api";

export type ServerMonitorServiceStatus = "online" | "offline" | "unknown";

export type ServerMonitorResponse = {
  server: {
    hostname: string | null;
    os: string | null;
    php_version: string | null;
    laravel_version: string | null;
    uptime_seconds: number | null;
    checked_at: string;
  };
  cpu: {
    load_1m: number | null;
    load_5m: number | null;
    load_15m: number | null;
  };
  memory: {
    total_bytes: number | null;
    used_bytes: number | null;
    free_bytes: number | null;
    usage_percent: number | null;
  };
  disk: {
    total_bytes: number | null;
    used_bytes: number | null;
    free_bytes: number | null;
    usage_percent: number | null;
  };
  services: Array<{
    name: string;
    status: ServerMonitorServiceStatus;
    details: string | null;
  }>;
  warnings: string[];
};

export async function getServerMonitor(): Promise<ServerMonitorResponse> {
  const response = await api.get<ServerMonitorResponse>("/server-monitor");
  return response.data;
}

