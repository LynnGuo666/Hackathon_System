export type Participant = {
  id: string;
  checkinId: string;
  email: string;
  status: ParticipantStatus;
};

export type ParticipantAccount = {
  email: string;
  checkinId: string;
  status: ParticipantStatus;
  fullName: string;
  teamName: string;
  school: string;
  phone: string;
  profileUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ParticipantStatus =
  | "pending"
  | "enrolled"
  | "accepted"
  | "checked_in"
  | "active"
  | "rejected"
  | "disabled";

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

export type PluginSecretState = {
  key: string;
  label?: string;
  configured: boolean;
  updatedAt?: string;
};

export type PluginIntegration = {
  id: string;
  name: string;
  description: string;
  provider: string;
  enabled: boolean;
  status: string;
  config: Record<string, unknown>;
  secrets: PluginSecretState[];
  lastSyncAt?: string;
  lastTestAt?: string;
  lastError?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PluginConnectionTestResult = {
  status: string;
  message: string;
  checkedAt?: string;
};

export type PluginSyncResult = {
  status: string;
  taskId?: string;
  message?: string;
  triggeredAt?: string;
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

export type CountdownStage = {
  id: string;
  label: string;
  // 后端统一返回 UTC ISO；页面展示时按 SiteConfig.timezone 转换。
  time: string;
};

export type SiteConfig = {
  id: string;
  eventName: string;
  timezone: string;
  countdownTitle: string;
  countdownEnd: string;
  countdownEnabled: boolean;
  countdownStages: CountdownStage[];
  walkupCheckinEnabled: boolean;
  emailProvider: string;
  emailServiceUrl: string;
  emailServiceAccountId: string;
  emailServiceSync: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  smtpFrom: string;
  smtpSecurity: string;
  updatedAt: string;
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

export type EnrollmentReviewStatus =
  | "pending"
  | "initial_review"
  | "final_review"
  | "approved"
  | "rejected";

export type Enrollment = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  school: string;
  teamName: string;
  personalBio: string;
  projectDesc: string;
  participationHistory: string;
  githubUrl: string;
  portfolioUrl: string;
  resumeFilename: string;
  reviewStatus: EnrollmentReviewStatus;
  initialReviewer: string;
  initialReviewAt?: string;
  initialReviewNote: string;
  finalReviewer: string;
  finalReviewAt?: string;
  finalReviewNote: string;
  createdAt?: string;
  updatedAt?: string;
};

export type EnrollmentInput = {
  fullName: string;
  email?: string;
  phone: string;
  school: string;
  teamName: string;
  personalBio: string;
  projectDesc: string;
  participationHistory: string;
  githubUrl: string;
  portfolioUrl: string;
};

export type EnrollmentReviewInput = {
  note: string;
};

export type SystemVersion = {
  backend: string;
  frontend: string;
  buildTime: string;
};

export type AsyncTask = {
  id: string;
  taskType: string;
  payload: Record<string, unknown>;
  status: "pending" | "sending" | "succeeded" | "failed" | "dead";
  attempts: number;
  maxAttempts: number;
  lastError: string;
  result: string;
  availableAt?: string;
  lockedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type SecretKeyList = {
  keys: string[];
};
