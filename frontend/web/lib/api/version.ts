import { request } from "./client";
import type { SystemVersion } from "./types";

export const versionApi = {
  version: () => request<SystemVersion>("/api/version"),
};
