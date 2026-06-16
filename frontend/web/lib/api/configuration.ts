import { request } from "./client";
import type {
  AccommodationRequest,
  EventLocation,
  FeatureLink,
  NavigationLink,
  OSMSearchResult,
  SecretKeyList,
  SiteConfig,
} from "./types";

export const configurationApi = {
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
  emailSecrets: () => request<SecretKeyList>("/api/admin/email-secrets", { admin: true }),
  setEmailSecret: (key: string, value: string) =>
    request<{ status: string }>(`/api/admin/email-secrets/${key}`, {
      admin: true,
      method: "PUT",
      body: JSON.stringify({ value }),
    }),
  deleteEmailSecret: (key: string) =>
    request<{ status: string }>(`/api/admin/email-secrets/${key}`, {
      admin: true,
      method: "DELETE",
    }),
};
