"use client";

import { useEffect, useMemo, useState } from "react";
import { Spinner, Tab, Tabs } from "@heroui/react";
import { Coffee, Utensils } from "lucide-react";
import { errorText, notify } from "@/components/toast";
import {
  api,
  type DrinkOrder,
  type DrinkSlot,
  type MealOrder,
  type MealSlot,
} from "@/web/lib/api";
import { DrinkSlotCard, EmptyState, MealSlotCard } from "./_components/slot-cards";

export default function MealOrderPage() {
  const [mealSlots, setMealSlots] = useState<MealSlot[]>([]);
  const [drinkSlots, setDrinkSlots] = useState<DrinkSlot[]>([]);
  const [mealOrders, setMealOrders] = useState<MealOrder[]>([]);
  const [drinkOrders, setDrinkOrders] = useState<DrinkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const [nextMealSlots, nextDrinkSlots, nextMealOrders, nextDrinkOrders] = await Promise.all([
        api.mealSlots().catch(() => []),
        api.drinkSlots().catch(() => []),
        api.mealOrders().catch(() => []),
        api.drinkOrders().catch(() => []),
      ]);
      setMealSlots(nextMealSlots);
      setDrinkSlots(nextDrinkSlots);
      setMealOrders(nextMealOrders);
      setDrinkOrders(nextDrinkOrders);
    } catch (error) {
      notify.error(errorText(error, "读取餐饮补给相关信息失败"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const mealOrdersBySlot = useMemo(() => {
    return Object.fromEntries(mealOrders.map((order) => [order.slotId, order]));
  }, [mealOrders]);

  const drinkOrdersBySlot = useMemo(() => {
    return Object.fromEntries(drinkOrders.map((order) => [order.slotId, order]));
  }, [drinkOrders]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner label="加载中" />
      </div>
    );
  }

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-xs font-medium text-foreground/40">餐饮补给</p>
        <h2 className="text-xl font-bold text-foreground">餐食与饮料补给</h2>
      </div>

      <Tabs aria-label="餐饮补给类型" variant="underlined">
        <Tab key="meals" title={<TabTitle icon={<Utensils size={14} />} label="餐食" />}>
          <div className="grid gap-4 pt-4">
            {mealSlots.length === 0 && <EmptyState text="暂无开放或可查看的餐食餐次数据。" />}
            {mealSlots.map((slot) => (
              <MealSlotCard
                key={slot.id}
                slot={slot}
                order={mealOrdersBySlot[slot.id]}
                onSaved={refresh}
              />
            ))}
          </div>
        </Tab>
        <Tab key="drinks" title={<TabTitle icon={<Coffee size={14} />} label="饮料补给" />}>
          <div className="grid gap-4 pt-4">
            {drinkSlots.length === 0 && <EmptyState text="暂无开放或可查看的饮料补给批次。" />}
            {drinkSlots.map((slot) => (
              <DrinkSlotCard
                key={slot.id}
                slot={slot}
                order={drinkOrdersBySlot[slot.id]}
                onSaved={refresh}
              />
            ))}
          </div>
        </Tab>
      </Tabs>
    </section>
  );
}

function TabTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <span className="inline-flex items-center gap-1.5 text-sm">{icon}{label}</span>;
}
