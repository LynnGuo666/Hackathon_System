import { request } from "./client";
import type { Participant, ParticipantProfile } from "./types";

export const authApi = {
  health: () => request<{ status: string }>("/api/health"),
  sendCode: (email: string) =>
    request<{ status: string }>("/api/auth/send-code", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  verifyCode: (email: string, code: string) =>
    request<{ status: string }>("/api/auth/verify-code", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),
  bindCheckin: (checkinId: string) =>
    request<Participant>("/api/checkin/claim", {
      method: "POST",
      body: JSON.stringify({ checkinId }),
    }),
  checkinLogin: (input: { checkinId: string; email: string; fullName: string }) =>
    request<Participant>("/api/auth/checkin-login", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  me: () => request<Participant>("/api/me"),
  profile: () => request<ParticipantProfile>("/api/profile"),
  updateProfile: (profile: ParticipantProfile) =>
    request<ParticipantProfile>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    }),
};
