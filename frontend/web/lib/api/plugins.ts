import { request } from "./client";
import type {
  PluginConnectionTestResult,
  PluginIntegration,
  PluginSyncResult,
} from "./types";

export const pluginsApi = {
  adminPlugins: () => request<PluginIntegration[]>("/api/admin/plugins", { admin: true }),
  updatePlugin: (id: string, input: { enabled?: boolean; config?: Record<string, unknown> }) =>
    request<PluginIntegration>(`/api/admin/plugins/${id}`, {
      admin: true,
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  setPluginSecret: (id: string, key: string, value: string) =>
    request<PluginIntegration>(`/api/admin/plugins/${id}/secrets/${key}`, {
      admin: true,
      method: "PUT",
      body: JSON.stringify({ value }),
    }),
  deletePluginSecret: (id: string, key: string) =>
    request<PluginIntegration>(`/api/admin/plugins/${id}/secrets/${key}`, {
      admin: true,
      method: "DELETE",
    }),
  testPluginConnection: (id: string) =>
    request<PluginConnectionTestResult>(`/api/admin/plugins/${id}/test`, {
      admin: true,
      method: "POST",
    }),
  triggerPluginSync: (id: string) =>
    request<PluginSyncResult>(`/api/admin/plugins/${id}/sync`, {
      admin: true,
      method: "POST",
    }),
};
