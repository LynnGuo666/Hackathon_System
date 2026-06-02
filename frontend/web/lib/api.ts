"use client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

type RequestOptions = RequestInit & {
  admin?: boolean;
};

export type Participant = {
  id: string;
  checkinId: string;
  email: string;
  status: "pending" | "active" | "disabled";
};

export type ParticipantProfile = {
  email?: string;
  fullName: string;
  teamName: string;
  school: string;
  phone: string;
  dietaryNeeds: string;
  tshirtSize: string;
  emergencyContact: string;
  notes: string;
  submittedAt?: string;
  updatedAt?: string;
};

export type ResourcePool = {
  id: string;
  name: string;
  type: string;
  distributionRule: string;
  visiblePhase: string;
  enabled: boolean;
  createdAt: string;
};

export type ResourceAssignment = {
  id: string;
  checkinId: string;
  poolId: string;
  resourceItemId: string;
  status: string;
  deliveredByEmail: boolean;
  deliveredAt?: string;
  createdAt: string;
  plainCode?: string;
};

export type EmailOutbox = {
  id: string;
  to: string;
  subject: string;
  status: string;
  retryCount: number;
  lastError?: string;
  createdAt: string;
};

export type NavigationLink = {
  id: string;
  title: string;
  description: string;
  url: string;
  enabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type SiteConfig = {
  id: string;
  countdownTitle: string;
  countdownEnd: string;
  countdownEnabled: boolean;
  updatedAt: string;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.admin) {
    headers.set("X-Admin-Role", "resource_admin");
    headers.set("X-Actor-ID", "frontend-admin");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.error ?? `请求失败：${response.status}`);
  }
  return payload as T;
}

export const api = {
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
    request<Participant>("/api/auth/bind-checkin", {
      method: "POST",
      body: JSON.stringify({ checkinId }),
    }),
  me: () => request<Participant>("/api/me"),
  profile: () => request<ParticipantProfile>("/api/profile"),
  updateProfile: (profile: ParticipantProfile) =>
    request<ParticipantProfile>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(profile),
    }),
  resources: () => request<ResourceAssignment[]>("/api/resources"),
  pools: () => request<ResourcePool[]>("/api/admin/resources/pools", { admin: true }),
  createPool: (name: string, type: string) =>
    request<ResourcePool>("/api/admin/resources/pools", {
      admin: true,
      method: "POST",
      body: JSON.stringify({ name, type }),
    }),
  assignments: () => request<ResourceAssignment[]>("/api/admin/resources/assignments", { admin: true }),
  profiles: () => request<ParticipantProfile[]>("/api/admin/profiles", { admin: true }),
  emailOutbox: () => request<EmailOutbox[]>("/api/admin/email-outbox", { admin: true }),
  retryEmail: (id: string) =>
    request<EmailOutbox>(`/api/admin/email-outbox/${id}/retry`, {
      admin: true,
      method: "POST",
    }),
  navigationLinks: () => request<NavigationLink[]>("/api/navigation-links"),
  adminNavigationLinks: () => request<NavigationLink[]>("/api/admin/navigation-links", { admin: true }),
  createNavigationLink: (input: Pick<NavigationLink, "title" | "description" | "url"> & { sortOrder?: number }) =>
    request<NavigationLink>("/api/admin/navigation-links", {
      admin: true,
      method: "POST",
      body: JSON.stringify(input),
    }),
  siteConfig: () => request<SiteConfig>("/api/site-config"),
  updateSiteConfig: (input: Partial<SiteConfig>) =>
    request<SiteConfig>("/api/admin/site-config", {
      admin: true,
      method: "PUT",
      body: JSON.stringify(input),
    }),
};
