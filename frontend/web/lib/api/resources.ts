import { request } from "./client";
import type {
  AllowedTagOption,
  ResourceAssignment,
  ResourceEligibility,
  ResourceItem,
  ResourcePool,
  ResourceRequest,
} from "./types";

export type ResourcePoolInput = Pick<
  ResourcePool,
  "name" | "type" | "docUrl" | "docMarkdown"
> & {
  allowMultipleClaims?: boolean;
  claimMode?: string;
  requireReview?: boolean;
  allowedTags?: string[];
};

export type ResourcePoolUpdateInput = Partial<
  Pick<
    ResourcePool,
    | "name"
    | "type"
    | "enabled"
    | "allowMultipleClaims"
    | "claimMode"
    | "requireReview"
    | "allowedTags"
    | "docUrl"
    | "docMarkdown"
  >
>;

export type ResourceItemUpdateInput = Partial<
  Pick<ResourceItem, "docUrl" | "docMarkdown">
>;

export const resourcesApi = {
  resources: () => request<ResourceAssignment[]>("/api/resources"),
  visiblePools: () => request<ResourcePool[]>("/api/resources/pools"),
  pools: () => request<ResourcePool[]>("/api/admin/resources/pools", { admin: true }),
  pool: (poolId: string) => request<ResourcePool>(`/api/admin/resources/pools/${poolId}`, { admin: true }),
  createPool: (input: ResourcePoolInput) =>
    request<ResourcePool>("/api/admin/resources/pools", {
      admin: true,
      method: "POST",
      body: JSON.stringify(input),
    }),
  updatePool: (poolId: string, input: ResourcePoolUpdateInput) =>
    request<ResourcePool>(`/api/admin/resources/pools/${encodeURIComponent(poolId)}`, {
      admin: true,
      method: "PUT",
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
  updateResourceItem: (poolId: string, itemId: string, input: ResourceItemUpdateInput) =>
    request<ResourceItem>(
      `/api/admin/resources/pools/${encodeURIComponent(poolId)}/items/${encodeURIComponent(itemId)}`,
      {
        admin: true,
        method: "PUT",
        body: JSON.stringify(input),
      },
    ),
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
  myRequests: () => request<ResourceRequest[]>("/api/resources/requests"),
  applyResource: (poolId: string) =>
    request<ResourceRequest>(`/api/resources/${encodeURIComponent(poolId)}/apply`, {
      method: "POST",
    }),
  claimResource: (poolId: string) =>
    request<ResourceAssignment>(`/api/resources/${encodeURIComponent(poolId)}/claim`, {
      method: "POST",
    }),
  myEligibility: () => request<ResourceEligibility>("/api/resources/my-eligibility"),
  adminRequests: (poolId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (poolId) params.set("pool_id", poolId);
    if (status) params.set("status", status);
    const search = params.toString() ? `?${params.toString()}` : "";
    return request<ResourceRequest[]>(`/api/admin/resources/requests${search}`, {
      admin: true,
    });
  },
  reviewRequest: (requestId: string, approve: boolean, note: string) =>
    request<ResourceAssignment | ResourceRequest>(
      `/api/admin/resources/requests/${encodeURIComponent(requestId)}/review?approve=${approve}`,
      {
        admin: true,
        method: "POST",
        body: JSON.stringify({ approve, note }),
      },
    ),
  allowedTagOptions: () =>
    request<AllowedTagOption[]>("/api/admin/resources/allowed-tags", { admin: true }),
};
