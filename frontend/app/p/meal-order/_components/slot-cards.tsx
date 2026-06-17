"use client";

import { useEffect, useState } from "react";
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
  Textarea,
} from "@heroui/react";
import { Save, Trash2 } from "lucide-react";
import { errorText, notify } from "@/components/toast";
import { api, type DrinkOrder, type DrinkSlot, type MealOrder, type MealSlot } from "@/web/lib/api";
import { formatDateTime } from "./utils";

export function MealSlotCard({
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
  const [canceling, setCanceling] = useState(false);
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

  async function cancelOrder() {
    setCanceling(true);
    try {
      await api.cancelMealOrder(slot.id);
      notify.success(`${slot.title} 已取消`);
      await onSaved();
    } catch (error) {
      notify.error(errorText(error, "取消餐食需求失败"));
    } finally {
      setCanceling(false);
    }
  }

  return (
    <Card classNames={{ base: "rounded-card" }}>
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
        <div className="flex flex-wrap items-center gap-3">
          <Button
            color="primary"
            startContent={<Save size={16} />}
            isDisabled={disabled}
            isLoading={saving}
            onPress={save}
          >
            {order ? "更新餐食需求" : "提交餐食需求"}
          </Button>
          {order && (
            <Button
              color="danger"
              variant="flat"
              startContent={<Trash2 size={16} />}
              isLoading={canceling}
              onPress={cancelOrder}
            >
              取消订单
            </Button>
          )}
          {order && <span className="text-sm text-foreground/50">上次更新：{formatDateTime(order.updatedAt)}</span>}
        </div>
      </CardBody>
    </Card>
  );
}

export function DrinkSlotCard({
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
  const [canceling, setCanceling] = useState(false);
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

  async function cancelOrder() {
    setCanceling(true);
    try {
      await api.cancelDrinkOrder(slot.id);
      notify.success(`${slot.title} 已取消`);
      await onSaved();
    } catch (error) {
      notify.error(errorText(error, "取消饮料补给失败"));
    } finally {
      setCanceling(false);
    }
  }

  return (
    <Card classNames={{ base: "rounded-card" }}>
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
        <div className="flex flex-wrap items-center gap-3">
          <Button
            color="primary"
            startContent={<Save size={16} />}
            isDisabled={disabled}
            isLoading={saving}
            onPress={save}
          >
            {order ? "更新饮料选择" : "提交饮料选择"}
          </Button>
          {order && (
            <Button
              color="danger"
              variant="flat"
              startContent={<Trash2 size={16} />}
              isLoading={canceling}
              onPress={cancelOrder}
            >
              取消订单
            </Button>
          )}
          {order && <span className="text-sm text-foreground/50">上次更新：{formatDateTime(order.updatedAt)}</span>}
        </div>
      </CardBody>
    </Card>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <Card classNames={{ base: "rounded-card" }}>
      <CardBody className="text-sm text-foreground/60">{text}</CardBody>
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
