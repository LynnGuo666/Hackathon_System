import type { DrinkOrder } from "@/web/lib/api";

export const defaultMealOptions = "无特殊忌口\n素食\n清真\n不吃牛肉\n不吃猪肉\n乳糖不耐受\n坚果过敏\n海鲜过敏";
export const defaultDrinkOptions = "矿泉水\n无糖茶\n可乐\n无糖可乐\n运动饮料\n咖啡";

export function splitLines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

export function countBySlot<T extends { slotId: string }>(orders: T[]) {
  return orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.slotId] = (acc[order.slotId] ?? 0) + 1;
    return acc;
  }, {});
}

export function choiceStats(orders: DrinkOrder[]) {
  const stats = orders.reduce<Record<string, number>>((acc, order) => {
    if (order.drinkOption) {
      acc[order.drinkOption] = (acc[order.drinkOption] ?? 0) + 1;
    }
    return acc;
  }, {});
  return Object.entries(stats);
}

export function formatDateTime(value: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", { hour12: false });
}
