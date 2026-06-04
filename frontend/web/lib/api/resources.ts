import { request } from "./client";
import type { ResourceAssignment, ResourceItem, ResourcePool } from "./types";

export const resourcesApi = {
  resources: () => request<ResourceAssignment[]>("/api/resources"),
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
};
