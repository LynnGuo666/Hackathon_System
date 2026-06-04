import { request } from "./client";
import type {
  DrinkOrder,
  DrinkOrderInput,
  DrinkSlot,
  DrinkSlotInput,
  MealOrder,
  MealOrderInput,
  MealSlot,
  MealSlotInput,
} from "./types";

export const foodApi = {
  mealSlots: () => request<MealSlot[]>("/api/meal-slots"),
  drinkSlots: () => request<DrinkSlot[]>("/api/drink-slots"),
  mealOrders: () => request<MealOrder[]>("/api/meal-orders"),
  drinkOrders: () => request<DrinkOrder[]>("/api/drink-orders"),
  updateMealOrder: (slotId: string, input: MealOrderInput) =>
    request<MealOrder>(`/api/meal-slots/${encodeURIComponent(slotId)}/order`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  updateDrinkOrder: (slotId: string, input: DrinkOrderInput) =>
    request<DrinkOrder>(`/api/drink-slots/${encodeURIComponent(slotId)}/order`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  adminMealSlots: () => request<MealSlot[]>("/api/admin/meal-slots", { admin: true }),
  createMealSlot: (input: MealSlotInput) =>
    request<MealSlot>("/api/admin/meal-slots", {
      admin: true,
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateMealSlot: (slotId: string, input: MealSlotInput) =>
    request<MealSlot>(`/api/admin/meal-slots/${encodeURIComponent(slotId)}`, {
      admin: true,
      method: "PUT",
      body: JSON.stringify(input),
    }),
  adminDrinkSlots: () => request<DrinkSlot[]>("/api/admin/drink-slots", { admin: true }),
  createDrinkSlot: (input: DrinkSlotInput) =>
    request<DrinkSlot>("/api/admin/drink-slots", {
      admin: true,
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateDrinkSlot: (slotId: string, input: DrinkSlotInput) =>
    request<DrinkSlot>(`/api/admin/drink-slots/${encodeURIComponent(slotId)}`, {
      admin: true,
      method: "PUT",
      body: JSON.stringify(input),
    }),
  adminMealOrders: () => request<MealOrder[]>("/api/admin/meal-orders", { admin: true }),
  adminDrinkOrders: () => request<DrinkOrder[]>("/api/admin/drink-orders", { admin: true }),
};
