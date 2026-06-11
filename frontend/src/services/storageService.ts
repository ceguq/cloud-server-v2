import api from "./api";

export type StorageInfo = {
  used_bytes: number;
  used_human: string;
  limit_bytes: number;
  limit_human: string;
  usage_percent: number;
  file_count?: number;
  folder_count?: number;
};

function unwrapStorageResponse(response: any): any {
  // Backend yang diinginkan: { data: {...} }
  // Namun kita buat fleksibel agar tidak crash jika bentuk berubah.
  if (response == null) return response;
  if (response.data && typeof response.data === "object") {
    // Bisa jadi sudah ada data di dalam data
    if ("used_bytes" in response.data) return response.data;
    if (response.data.data && typeof response.data.data === "object") {
      return response.data.data;
    }
    if (response.data.data && "used_bytes" in response.data.data) {
      return response.data.data;
    }
    // Fallback: jika data berisi data storage langsung
    if (response.data.data === undefined && "used_bytes" in response.data) {
      return response.data;
    }
  }

  // Jika backend mengirim langsung object storage
  if (typeof response === "object" && response && "used_bytes" in response) {
    return response;
  }

  return response;
}

export async function getStorageInfo(): Promise<StorageInfo> {
  const res = await api.get("/storage");
  const storage = unwrapStorageResponse(res.data);
  return storage as StorageInfo;
}

const storageService = {
  getStorageInfo,
};

export default storageService;
