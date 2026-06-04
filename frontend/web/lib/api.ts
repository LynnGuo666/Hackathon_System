"use client";

import { adminApi } from "./api/admin";
import { authApi } from "./api/auth";
import { configurationApi } from "./api/configuration";
import { foodApi } from "./api/food";
import { resourcesApi } from "./api/resources";

export * from "./api/types";

export const api = {
  ...authApi,
  ...resourcesApi,
  ...adminApi,
  ...configurationApi,
  ...foodApi,
};
