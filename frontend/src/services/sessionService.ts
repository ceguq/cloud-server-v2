import api from "./api";

export type AuthenticatedSession = {
  id: string;
  name: string;
  is_current: boolean;
  last_used_at: string | null;
  created_at: string | null;
  expires_at: string | null;
};

type SessionsResponse = {
  data: AuthenticatedSession[];
};

export async function getSessions(): Promise<AuthenticatedSession[]> {
  const response = await api.get<SessionsResponse>("/sessions");
  return response.data.data;
}

export async function revokeSession(sessionId: string): Promise<void> {
  await api.delete(`/sessions/${encodeURIComponent(sessionId)}`);
}

export async function revokeOtherSessions(): Promise<number> {
  const response = await api.delete<{ revoked_count: number }>("/sessions");
  return response.data.revoked_count;
}
