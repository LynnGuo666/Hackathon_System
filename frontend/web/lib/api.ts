"use client";

import { adminApi } from "./api/admin";
import { authApi } from "./api/auth";
import { configurationApi } from "./api/configuration";
import { enrollmentApi, adminEnrollmentApi } from "./api/enrollment";
import { foodApi } from "./api/food";
import { pluginsApi } from "./api/plugins";
import { resourcesApi } from "./api/resources";
import { versionApi } from "./api/version";

export * from "./api/types";

export const api = {
  ...authApi,
  ...resourcesApi,
  ...adminApi,
  ...configurationApi,
  ...foodApi,
  ...pluginsApi,
  ...enrollmentApi,
  ...adminEnrollmentApi,
  ...versionApi,
};
