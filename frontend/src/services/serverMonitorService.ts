import api from "./api";

export type ServerMonitorServiceStatus = "online" | "offline" | "unknown";

export type ServerMonitorResponse = {
  server: {
    hostname: string | null;
    os: string | null;
    os_family: string | null;
    os_name: string | null;
    os_version: string | null;
    architecture: string | null;
    php_version: string | null;
    laravel_version: string | null;
    uptime_seconds: number | null;
    checked_at: string;
  };
  cpu: {
    load_1m: number | null;
    load_5m: number | null;
    load_15m: number | null;
    usage_percent: number | null;
    model: string | null;
    logical_cores: number | null;
    physical_cores: number | null;
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
  network: {
    local_ips: string[];
    primary_ip: string | null;
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

