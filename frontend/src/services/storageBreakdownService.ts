import api from './api';

export type StorageBreakdownCategory = {
  key: string;
  name: string;
  bytes: number;
  human: string;
  share_percent: number;
  quota_percent: number;
};

export type StorageBreakdownInfo = {
  used_bytes: number;
  used_human: string;
  limit_bytes: number;
  limit_human: string;
  usage_percent: number;
  categories: StorageBreakdownCategory[];
};

function unwrapStorageBreakdownResponse(payload: any): StorageBreakdownInfo {
  if (!payload) {
    throw new Error('Invalid storage breakdown response');
  }

  // backend normal: { data: {...} }
  if (payload?.data && typeof payload.data === 'object' && payload.data.categories) {
    return payload.data as StorageBreakdownInfo;
  }

  // fallback if response directly object: { used_bytes, ... }
  if (payload.used_bytes !== undefined && payload.categories) {
    return payload as StorageBreakdownInfo;
  }

  // fallback nested: { data: { data: {...} } }
  if (payload?.data?.data && typeof payload.data.data === 'object') {
    return payload.data.data as StorageBreakdownInfo;
  }

  throw new Error('Unexpected storage breakdown response shape');
}

export async function getStorageBreakdown(): Promise<StorageBreakdownInfo> {
  const res = await api.get('/storage/breakdown');
  return unwrapStorageBreakdownResponse(res.data);
}

export default {
  getStorageBreakdown,
};

