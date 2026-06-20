import type { ResourceItem } from "@/web/lib/api";
import {
  claimModeLabels,
  participantTagLabels,
  resourceTypeLabels as typeLabels,
} from "@/web/lib/resource-labels";

export { claimModeLabels, participantTagLabels, typeLabels };

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
