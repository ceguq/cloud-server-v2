import api from './api';

export type Device = {
  id: string;
  display_name: string | null;
  device_type: string | null;
  platform: string | null;
  browser: string | null;
  ip_address: string | null;
  trusted: boolean;
  last_seen_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type DevicesResponse = {
  data: Device[];
};

type DeviceResponse = {
  data: Device;
};

export async function getDevices(): Promise<Device[]> {
  const response = await api.get<DevicesResponse>("/devices");
  return response.data.data ?? [];
}

export async function renameDevice(deviceId: string, displayName: string): Promise<Device> {
  const response = await api.patch<DeviceResponse>(`/devices/${deviceId}`, {
    display_name: displayName,
  });

  return response.data.data;
}
