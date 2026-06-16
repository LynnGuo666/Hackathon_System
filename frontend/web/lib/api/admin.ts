import { request } from "./client";
import type {
  AdminOverview,
  AsyncTask,
  CheckinIDRecord,
  EmailOutbox,
  Participant,
  ParticipantAccount,
  ParticipantProfile,
} from "./types";

export const adminApi = {
  adminOverview: () => request<AdminOverview>("/api/admin/overview", { admin: true }),
  profiles: () => request<ParticipantProfile[]>("/api/admin/profiles", { admin: true }),
  participants: () => request<ParticipantAccount[]>("/api/admin/participants", { admin: true }),
  updateParticipantStatus: (email: string, status: Participant["status"]) =>
    request<Participant>("/api/admin/participants/status", {
      admin: true,
      method: "PATCH",
      body: JSON.stringify({ email, status }),
    }),
  checkinIds: () => request<CheckinIDRecord[]>("/api/admin/checkin-ids", { admin: true }),
  generateCheckinIds: (count: number) =>
    request<CheckinIDRecord[]>("/api/admin/checkin-ids/generate", {
      admin: true,
      method: "POST",
      body: JSON.stringify({ count }),
    }),
  importCheckinIds: (values: string[]) =>
    request<CheckinIDRecord[]>("/api/admin/checkin-ids/import", {
      admin: true,
      method: "POST",
      body: JSON.stringify({ values }),
    }),
  emailOutbox: () => request<EmailOutbox[]>("/api/admin/email-outbox", { admin: true }),
  retryEmail: (id: string) =>
    request<EmailOutbox>(`/api/admin/email-outbox/${id}/retry`, {
      admin: true,
      method: "POST",
    }),
  tasks: (params?: { type?: string; status?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set("type", params.type);
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    return request<AsyncTask[]>(`/api/admin/tasks${query ? `?${query}` : ""}`, { admin: true });
  },
  getTask: (id: string) => request<AsyncTask>(`/api/admin/tasks/${id}`, { admin: true }),
  retryTask: (id: string) =>
    request<AsyncTask>(`/api/admin/tasks/${id}/retry`, {
      admin: true,
      method: "POST",
    }),
};
