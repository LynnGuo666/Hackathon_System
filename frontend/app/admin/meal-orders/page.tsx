"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card, CardBody, Tab, Tabs } from "@heroui/react";
import { Coffee, RefreshCw, Utensils } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { errorText, notify } from "@/components/toast";
import {
  api,
  type DrinkOrder,
  type DrinkSlot,
  type MealOrder,
  type MealSlot,
} from "@/web/lib/api";
import {
  DrinkOrdersTable,
  DrinkSlotsTable,
  MealOrdersTable,
  MealSlotsTable,
} from "./_components/order-tables";
import { DrinkSlotForm, MealSlotForm } from "./_components/slot-forms";
import { countBySlot } from "./_components/utils";

export default function AdminMealOrdersPage() {
  const [mealSlots, setMealSlots] = useState<MealSlot[]>([]);
  const [drinkSlots, setDrinkSlots] = useState<DrinkSlot[]>([]);
  const [mealOrders, setMealOrders] = useState<MealOrder[]>([]);
  const [drinkOrders, setDrinkOrders] = useState<DrinkOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function refresh() {
    setListLoading(true);
    setLoadError("");
    try {
      const [nextMealSlots, nextDrinkSlots, nextMealOrders, nextDrinkOrders] = await Promise.all([
        api.adminMealSlots(),
        api.adminDrinkSlots(),
        api.adminMealOrders(),
        api.adminDrinkOrders(),
      ]);
      setMealSlots(nextMealSlots);
      setDrinkSlots(nextDrinkSlots);
      setMealOrders(nextMealOrders);
      setDrinkOrders(nextDrinkOrders);
    } catch (error) {
      const message = errorText(error, "读取餐饮订单失败");
      setLoadError(message);
      notify.error(message);
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const mealStats = useMemo(() => countBySlot(mealOrders), [mealOrders]);
  const drinkStats = useMemo(() => countBySlot(drinkOrders), [drinkOrders]);

  return (
    <AdminAuthGuard>
      <AppShell variant="admin">
        <section className="grid gap-6">
          <div>
            <p className="text-xs font-medium text-foreground/40">运营功能</p>
            <h2 className="text-xl font-bold text-foreground">餐饮与饮料补给</h2>
          </div>

          <div className="flex justify-end">
            <Button variant="flat" startContent={<RefreshCw size={16} />} isLoading={listLoading} onPress={refresh}>
              刷新
            </Button>
          </div>

          {loadError && (
            <Card classNames={{ base: "rounded-md" }}>
              <CardBody className="text-sm text-danger">{loadError}</CardBody>
            </Card>
          )}

          <Tabs aria-label="餐饮补给管理" variant="underlined">
            <Tab key="meals" title={<TabTitle icon={<Utensils size={16} />} label="餐食餐次" />}>
              <div className="grid gap-5 pt-4">
                <MealSlotForm loading={loading} setLoading={setLoading} onSaved={refresh} />
                <MealSlotsTable slots={mealSlots} stats={mealStats} loading={listLoading} loadError={loadError} />
                <MealOrdersTable orders={mealOrders} slots={mealSlots} loading={listLoading} loadError={loadError} />
              </div>
            </Tab>
            <Tab key="drinks" title={<TabTitle icon={<Coffee size={16} />} label="饮料补给" />}>
              <div className="grid gap-5 pt-4">
                <DrinkSlotForm loading={loading} setLoading={setLoading} onSaved={refresh} />
                <DrinkSlotsTable slots={drinkSlots} stats={drinkStats} orders={drinkOrders} loading={listLoading} loadError={loadError} />
                <DrinkOrdersTable orders={drinkOrders} slots={drinkSlots} loading={listLoading} loadError={loadError} />
              </div>
            </Tab>
          </Tabs>
        </section>
      </AppShell>
    </AdminAuthGuard>
  );
}

function TabTitle({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <span className="inline-flex items-center gap-2">{icon}{label}</span>;
}
