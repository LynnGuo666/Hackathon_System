import { request } from "./client";
import type {
  AdminOverview,
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
};
