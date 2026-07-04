import { Laptop, Monitor, Smartphone, Tablet } from "lucide-react";

import type { Device } from "../../../services/deviceService";

export function getDeviceStatus(device: Device): "online" | "offline" {
  if (!device.last_seen_at) return "offline";
  const last = new Date(device.last_seen_at).getTime();
  if (Number.isNaN(last)) return "offline";
  const now = Date.now();
  return now - last <= 15 * 60 * 1000 ? "online" : "offline";
}

export function formatLastSeen(lastSeen: string | null): string {
  if (!lastSeen) return "Never seen";
  const d = new Date(lastSeen);
  if (Number.isNaN(d.getTime())) return "Never seen";
  return d.toLocaleString();
}

export function getIcon(device: Device) {
  const t = device.device_type;
  if (t === "laptop") return Laptop;
  if (t === "mobile") return Smartphone;
  if (t === "tablet") return Tablet;
  if (t === "desktop") return Monitor;
  return Monitor;
}
