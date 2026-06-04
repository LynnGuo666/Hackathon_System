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

export type ParticipantAccount = {
  email: string;
  checkinId: string;
  status: "pending" | "active" | "disabled";
  fullName: string;
  teamName: string;
  school: string;
  phone: string;
  profileUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CheckinIDRecord = {
  id: string;
  status: "available" | "bound";
  assignedEmail: string;
  boundAt?: string;
  createdAt?: string;
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
  allowMultipleClaims: boolean;
  createdAt: string;
};

export type ResourceItem = {
  id: string;
  poolId: string;
  publicLabel: string;
  status: string;
  assignedCheckinId: string;
  assignedAt?: string;
  expiresAt?: string;
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

export type FeatureLink = {
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
  eventName: string;
  timezone: string;
  countdownTitle: string;
  countdownEnd: string;
  countdownEnabled: boolean;
  countdownStages: CountdownStage[];
  updatedAt: string;
};

export type CountdownStage = {
  id: string;
  label: string;
  time: string;
};

export type EventLocation = {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  osmType: string;
  osmId: string;
  osmUrl: string;
  updatedAt: string;
};

export type OSMSearchResult = {
  placeId: string;
  displayName: string;
  latitude: number;
  longitude: number;
  osmType: string;
  osmId: string;
  category: string;
  type: string;
};

export type AccommodationOption = "sleeping_bag" | "tent" | "blanket" | "hotel" | "other";

export type AccommodationRequest = {
  email: string;
  selections: AccommodationOption[];
  otherDetail: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminOverview = {
  participants: {
    total: number;
    pending: number;
    active: number;
    disabled: number;
    checkedIn: number;
  };
  checkinIds: {
    total: number;
    available: number;
    bound: number;
  };
  resources: {
    pools: number;
    items: number;
    availableItems: number;
    assignedItems: number;
    assignments: number;
  };
  emails: {
    total: number;
    pending: number;
    sending: number;
    sent: number;
    failed: number;
  };
  meals: {
    mealSlots: number;
    drinkSlots: number;
    mealOrders: number;
    drinkOrders: number;
  };
  configuration: {
    siteConfig: SiteConfig;
    navigationLinks: number;
    featureLinks: number;
  };
};

export type MealSlot = {
  id: string;
  title: string;
  description: string;
  serviceDate: string;
  serviceTime: string;
  orderDeadline: string;
  isOpen: boolean;
  enabled: boolean;
  sortOrder: number;
  dietaryOptions: string[];
  createdAt: string;
  updatedAt: string;
};

export type DrinkSlot = {
  id: string;
  title: string;
  description: string;
  serviceDate: string;
  serviceTime: string;
  orderDeadline: string;
  isOpen: boolean;
  enabled: boolean;
  sortOrder: number;
  drinkOptions: string[];
  createdAt: string;
  updatedAt: string;
};

export type MealOrder = {
  id: string;
  email: string;
  slotId: string;
  dietaryNeeds: string[];
  otherDetail: string;
  notes: string;
  participantName?: string;
  teamName?: string;
  slot?: MealSlot;
  createdAt: string;
  updatedAt: string;
};

export type DrinkOrder = {
  id: string;
  email: string;
  slotId: string;
  drinkOption: string;
  notes: string;
  participantName?: string;
  teamName?: string;
  slot?: DrinkSlot;
  createdAt: string;
  updatedAt: string;
};

export type MealSlotInput = Pick<
  MealSlot,
  "title" | "description" | "serviceDate" | "serviceTime" | "orderDeadline" | "isOpen" | "enabled" | "sortOrder" | "dietaryOptions"
>;

export type DrinkSlotInput = Pick<
  DrinkSlot,
  "title" | "description" | "serviceDate" | "serviceTime" | "orderDeadline" | "isOpen" | "enabled" | "sortOrder" | "drinkOptions"
>;

export type MealOrderInput = Pick<MealOrder, "dietaryNeeds" | "otherDetail" | "notes">;

export type DrinkOrderInput = Pick<DrinkOrder, "drinkOption" | "notes">;

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (options.admin) {
    const token = typeof window !== "undefined" ? sessionStorage.getItem("admin_token") : null;
    if (token) {
      headers.set("X-Admin-Token", token);
    }
    headers.set("X-Actor-ID", "admin");
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
  resources: () => request<ResourceAssignment[]>("/api/resources"),
  adminOverview: () => request<AdminOverview>("/api/admin/overview", { admin: true }),
  pools: () => request<ResourcePool[]>("/api/admin/resources/pools", { admin: true }),
  pool: (poolId: string) => request<ResourcePool>(`/api/admin/resources/pools/${poolId}`, { admin: true }),
  createPool: (input: Pick<ResourcePool, "name" | "type"> & { allowMultipleClaims?: boolean }) =>
    request<ResourcePool>("/api/admin/resources/pools", {
      admin: true,
      method: "POST",
      body: JSON.stringify(input),
    }),
  resourceItems: (poolId: string) =>
    request<ResourceItem[]>(`/api/admin/resources/pools/${poolId}/items`, { admin: true }),
  importResourceItems: (poolId: string, values: string[]) =>
    request<ResourceItem[]>(`/api/admin/resources/pools/${poolId}/items/import`, {
      admin: true,
      method: "POST",
      body: JSON.stringify({ values }),
    }),
  assignResource: (poolId: string, checkinId: string) =>
    request<ResourceAssignment>(`/api/admin/resources/pools/${poolId}/assign`, {
      admin: true,
      method: "POST",
      body: JSON.stringify({ checkinId }),
    }),
  assignments: (poolId?: string) =>
    request<ResourceAssignment[]>(
      `/api/admin/resources/assignments${poolId ? `?pool_id=${encodeURIComponent(poolId)}` : ""}`,
      { admin: true },
    ),
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
  navigationLinks: () => request<NavigationLink[]>("/api/navigation-links"),
  adminNavigationLinks: () => request<NavigationLink[]>("/api/admin/navigation-links", { admin: true }),
  createNavigationLink: (input: Pick<NavigationLink, "title" | "description" | "url"> & { sortOrder?: number }) =>
    request<NavigationLink>("/api/admin/navigation-links", {
      admin: true,
      method: "POST",
      body: JSON.stringify(input),
    }),
  featureLinks: () => request<FeatureLink[]>("/api/feature-links"),
  adminFeatureLinks: () => request<FeatureLink[]>("/api/admin/feature-links", { admin: true }),
  updateFeatureEnabled: (id: string, enabled: boolean) =>
    request<FeatureLink>(`/api/admin/feature-links/${id}`, {
      admin: true,
      method: "PATCH",
      body: JSON.stringify({ enabled }),
    }),
  siteConfig: () => request<SiteConfig>("/api/site-config"),
  updateSiteConfig: (input: Partial<SiteConfig>) =>
    request<SiteConfig>("/api/admin/site-config", {
      admin: true,
      method: "PUT",
      body: JSON.stringify(input),
    }),
  eventLocation: () => request<EventLocation>("/api/event-location"),
  adminEventLocation: () => request<EventLocation>("/api/admin/event-location", { admin: true }),
  searchLocations: (query: string) =>
    request<OSMSearchResult[]>(`/api/admin/locations/search?q=${encodeURIComponent(query)}`, { admin: true }),
  updateEventLocation: (input: EventLocation) =>
    request<EventLocation>("/api/admin/event-location", {
      admin: true,
      method: "PUT",
      body: JSON.stringify(input),
    }),
  accommodation: () => request<AccommodationRequest>("/api/accommodation"),
  adminAccommodationRequests: () =>
    request<AccommodationRequest[]>("/api/admin/accommodation-requests", { admin: true }),
  updateAccommodation: (input: Pick<AccommodationRequest, "selections" | "otherDetail">) =>
    request<AccommodationRequest>("/api/accommodation", {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  mealSlots: () => request<MealSlot[]>("/api/meal-slots"),
  drinkSlots: () => request<DrinkSlot[]>("/api/drink-slots"),
  mealOrders: () => request<MealOrder[]>("/api/meal-orders"),
  drinkOrders: () => request<DrinkOrder[]>("/api/drink-orders"),
  updateMealOrder: (slotId: string, input: MealOrderInput) =>
    request<MealOrder>(`/api/meal-slots/${encodeURIComponent(slotId)}/order`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  updateDrinkOrder: (slotId: string, input: DrinkOrderInput) =>
    request<DrinkOrder>(`/api/drink-slots/${encodeURIComponent(slotId)}/order`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  adminMealSlots: () => request<MealSlot[]>("/api/admin/meal-slots", { admin: true }),
  createMealSlot: (input: MealSlotInput) =>
    request<MealSlot>("/api/admin/meal-slots", {
      admin: true,
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateMealSlot: (slotId: string, input: MealSlotInput) =>
    request<MealSlot>(`/api/admin/meal-slots/${encodeURIComponent(slotId)}`, {
      admin: true,
      method: "PUT",
      body: JSON.stringify(input),
    }),
  adminDrinkSlots: () => request<DrinkSlot[]>("/api/admin/drink-slots", { admin: true }),
  createDrinkSlot: (input: DrinkSlotInput) =>
    request<DrinkSlot>("/api/admin/drink-slots", {
      admin: true,
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateDrinkSlot: (slotId: string, input: DrinkSlotInput) =>
    request<DrinkSlot>(`/api/admin/drink-slots/${encodeURIComponent(slotId)}`, {
      admin: true,
      method: "PUT",
      body: JSON.stringify(input),
    }),
  adminMealOrders: () => request<MealOrder[]>("/api/admin/meal-orders", { admin: true }),
  adminDrinkOrders: () => request<DrinkOrder[]>("/api/admin/drink-orders", { admin: true }),
};
