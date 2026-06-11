import type { ResourceItem } from "@/web/lib/api";

export const typeLabels: Record<string, string> = {
  code: "Key",
  link: "链接",
  credential: "凭证",
  physical: "实体物资",
};

export const distributionLabels: Record<string, string> = {
  one_per_participant: "每人一次",
  role_based: "按角色",
  manual: "手动发放",
};

export const phaseLabels: Record<string, string> = {
  pre_event: "赛前",
  in_event: "赛中",
  all: "全阶段",
};

export function resourceStats(items: ResourceItem[]) {
  return {
    total: items.length,
    available: items.filter((item) => item.status === "available").length,
    assigned: items.filter((item) => item.status === "assigned" || item.status === "used").length,
  };
}

export function displayItemStatus(status: string) {
  if (status === "available") return "未使用";
  if (status === "assigned" || status === "used") return "已使用";
  return status;
}

export function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}
