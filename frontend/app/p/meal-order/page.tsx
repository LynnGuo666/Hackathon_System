"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  CheckboxGroup,
  Chip,
  Radio,
  RadioGroup,
  Spinner,
  Tab,
  Tabs,
  Textarea,
} from "@heroui/react";
import { Coffee, Save, Utensils } from "lucide-react";
import { errorText, notify } from "@/components/toast";
import {
  api,
  type DrinkOrder,
  type DrinkSlot,
  type MealOrder,
  type MealSlot,
} from "@/web/lib/api";

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
      notify.error(errorText(error, "读取餐饮补给失败"));
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
    return <Spinner label="加载中" />;
  }

  return (
    <section className="grid gap-5">
      <div>
        <p className="text-sm text-foreground/60">餐饮补给</p>
        <h2 className="text-2xl font-semibold">餐食与饮料补给</h2>
        <p className="mt-1 text-sm text-foreground/60">
          按开放批次提交需求；关闭后只能查看已提交内容。
        </p>
      </div>

      <Tabs aria-label="餐饮补给类型" variant="underlined">
        <Tab
          key="meals"
          title={
            <span className="inline-flex items-center gap-2">
              <Utensils size={16} />
              餐食
            </span>
          }
        >
          <div className="grid gap-4 pt-4">
            {mealSlots.length === 0 && <EmptyState text="暂无开放或可查看的餐食餐次。" />}
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
        <Tab
          key="drinks"
          title={
            <span className="inline-flex items-center gap-2">
              <Coffee size={16} />
              饮料补给
            </span>
          }
        >
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

function MealSlotCard({
  slot,
  order,
  onSaved,
}: {
  slot: MealSlot;
  order?: MealOrder;
  onSaved: () => Promise<void>;
}) {
  const [dietaryNeeds, setDietaryNeeds] = useState<string[]>(order?.dietaryNeeds ?? []);
  const [otherDetail, setOtherDetail] = useState(order?.otherDetail ?? "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const disabled = !slot.isOpen || !slot.enabled;

  useEffect(() => {
    setDietaryNeeds(order?.dietaryNeeds ?? []);
    setOtherDetail(order?.otherDetail ?? "");
    setNotes(order?.notes ?? "");
  }, [order]);

  async function save() {
    setSaving(true);
    try {
      await api.updateMealOrder(slot.id, { dietaryNeeds, otherDetail, notes });
      notify.success(`${slot.title} 已保存`);
      await onSaved();
    } catch (error) {
      notify.error(errorText(error, "保存餐食需求失败"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-md">
      <CardHeader className="justify-between gap-4">
        <SlotTitle title={slot.title} description={slot.description} slot={slot} />
        <SlotStatus slot={slot} />
      </CardHeader>
      <CardBody className="grid gap-4">
        <CheckboxGroup
          label="忌口与餐食偏好"
          value={dietaryNeeds}
          isDisabled={disabled}
          onValueChange={(values) => setDietaryNeeds(values)}
        >
          {slot.dietaryOptions.map((option) => (
            <Checkbox key={option} value={option}>
              {option}
            </Checkbox>
          ))}
        </CheckboxGroup>
        <Textarea
          label="其他详情"
          placeholder="例如：严重过敏源、宗教饮食要求等"
          value={otherDetail}
          isDisabled={disabled}
          onValueChange={setOtherDetail}
        />
        <Textarea
          label="备注"
          placeholder="给主办方的补充说明"
          value={notes}
          isDisabled={disabled}
          onValueChange={setNotes}
        />
        <div className="flex items-center gap-3">
          <Button
            color="primary"
            startContent={<Save size={16} />}
            isDisabled={disabled}
            isLoading={saving}
            onPress={save}
          >
            {order ? "更新餐食需求" : "提交餐食需求"}
          </Button>
          {order && <span className="text-sm text-foreground/50">上次更新：{formatDateTime(order.updatedAt)}</span>}
        </div>
      </CardBody>
    </Card>
  );
}

function DrinkSlotCard({
  slot,
  order,
  onSaved,
}: {
  slot: DrinkSlot;
  order?: DrinkOrder;
  onSaved: () => Promise<void>;
}) {
  const [drinkOption, setDrinkOption] = useState(order?.drinkOption ?? "");
  const [notes, setNotes] = useState(order?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const disabled = !slot.isOpen || !slot.enabled;

  useEffect(() => {
    setDrinkOption(order?.drinkOption ?? "");
    setNotes(order?.notes ?? "");
  }, [order]);

  async function save() {
    if (!drinkOption) {
      notify.error("请选择饮料");
      return;
    }
    setSaving(true);
    try {
      await api.updateDrinkOrder(slot.id, { drinkOption, notes });
      notify.success(`${slot.title} 已保存`);
      await onSaved();
    } catch (error) {
      notify.error(errorText(error, "保存饮料补给失败"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-md">
      <CardHeader className="justify-between gap-4">
        <SlotTitle title={slot.title} description={slot.description} slot={slot} />
        <SlotStatus slot={slot} />
      </CardHeader>
      <CardBody className="grid gap-4">
        <RadioGroup
          label="饮料"
          value={drinkOption}
          isDisabled={disabled}
          onValueChange={setDrinkOption}
        >
          {slot.drinkOptions.map((option) => (
            <Radio key={option} value={option}>
              {option}
            </Radio>
          ))}
        </RadioGroup>
        <Textarea
          label="备注"
          placeholder="给主办方的补充说明"
          value={notes}
          isDisabled={disabled}
          onValueChange={setNotes}
        />
        <div className="flex items-center gap-3">
          <Button
            color="primary"
            startContent={<Save size={16} />}
            isDisabled={disabled}
            isLoading={saving}
            onPress={save}
          >
            {order ? "更新饮料选择" : "提交饮料选择"}
          </Button>
          {order && <span className="text-sm text-foreground/50">上次更新：{formatDateTime(order.updatedAt)}</span>}
        </div>
      </CardBody>
    </Card>
  );
}

function SlotTitle({
  title,
  description,
  slot,
}: {
  title: string;
  description: string;
  slot: Pick<MealSlot, "serviceDate" | "serviceTime" | "orderDeadline">;
}) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="text-sm text-foreground/60">{description}</p>}
      <p className="mt-1 text-sm text-foreground/50">
        供应：{slot.serviceDate || "-"} {slot.serviceTime || ""} · 截止：{formatDateTime(slot.orderDeadline)}
      </p>
    </div>
  );
}

function SlotStatus({ slot }: { slot: Pick<MealSlot, "isOpen" | "enabled"> }) {
  const open = slot.enabled && slot.isOpen;
  return (
    <Chip color={open ? "success" : "default"} variant="flat">
      {open ? "开放提交" : "已关闭"}
    </Chip>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="rounded-md">
      <CardBody className="text-sm text-foreground/60">{text}</CardBody>
    </Card>
  );
}

function formatDateTime(value: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", { hour12: false });
}
