export type ActivityLogUser = {
  id: number | string;
  name: string;
  email: string;
};

export type ActivityLogMetadata = Record<string, unknown>;

export type ActivityLogItem = {
  id: string;
  action: string;
  description: string;
  subject_type: string | null;
  subject_id: string | null;
  metadata: ActivityLogMetadata | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user: ActivityLogUser | null;
};

export type ActivityLogPaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type ActivityLogResponse = {
  data: ActivityLogItem[];
  meta: ActivityLogPaginationMeta;
};

export type ActivityLogQueryParams = {
  page?: number;
  per_page?: number;
  action?: string;
};
