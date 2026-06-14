import api from "./api";
import {
  ActivityLogQueryParams,
  ActivityLogResponse,
} from "../types/activityLog";

function buildCleanParams(params?: ActivityLogQueryParams) {
  if (!params) return {};

  const cleaned: Record<string, string | number> = {};

  if (params.page !== undefined) cleaned.page = params.page;
  if (params.per_page !== undefined) cleaned.per_page = params.per_page;
  if (params.action && params.action.trim() !== "")
    cleaned.action = params.action;

  return cleaned;
}

export async function getActivityLogs(
  params?: ActivityLogQueryParams,
): Promise<ActivityLogResponse> {
  const res = await api.get("/activity-logs", {
    params: buildCleanParams(params),
  });

  return res.data as ActivityLogResponse;
}

export async function getAdminActivityLogs(
  params?: ActivityLogQueryParams,
): Promise<ActivityLogResponse> {
  const res = await api.get("/admin/activity-logs", {
    params: buildCleanParams(params),
  });

  return res.data as ActivityLogResponse;
}

