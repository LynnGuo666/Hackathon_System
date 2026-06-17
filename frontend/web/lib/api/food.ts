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
  MealSupplyTemplateImportResult,
  MealSupplyTemplatePreview,
  MealSupplyTemplateRequest,
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
  cancelMealOrder: (slotId: string) =>
    request<{ ok: boolean }>(`/api/meal-slots/${encodeURIComponent(slotId)}/order`, {
      method: "DELETE",
    }),
  cancelDrinkOrder: (slotId: string) =>
    request<{ ok: boolean }>(`/api/drink-slots/${encodeURIComponent(slotId)}/order`, {
      method: "DELETE",
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
  previewMealSupplyTemplate: (input: MealSupplyTemplateRequest) =>
    request<MealSupplyTemplatePreview>("/api/admin/meal-supply/templates/preview", {
      admin: true,
      method: "POST",
      body: JSON.stringify(input),
    }),
  importMealSupplyTemplate: (input: MealSupplyTemplateRequest) =>
    request<MealSupplyTemplateImportResult>("/api/admin/meal-supply/templates/import", {
      admin: true,
      method: "POST",
      body: JSON.stringify(input),
    }),
};
