"use client";

import { useState } from "react";
import { Button, Card, CardBody, CardHeader, Input, Switch, Textarea } from "@heroui/react";
import { Plus } from "lucide-react";
import { errorText, notify } from "@/components/toast";
import { api, type DrinkSlotInput, type MealSlotInput } from "@/web/lib/api";
import { defaultDrinkOptions, defaultMealOptions, splitLines } from "./utils";

type SlotFormProps = {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onSaved: () => Promise<void>;
};

export function MealSlotForm({ loading, setLoading, onSaved }: SlotFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [serviceTime, setServiceTime] = useState("");
  const [orderDeadline, setOrderDeadline] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [dietaryOptions, setDietaryOptions] = useState(defaultMealOptions);

  async function create() {
    if (!title.trim()) {
      notify.error("请填写餐次名称");
      return;
    }
    setLoading(true);
    try {
      const input: MealSlotInput = {
        title: title.trim(),
        description: description.trim(),
        serviceDate,
        serviceTime,
        orderDeadline,
        enabled,
        isOpen,
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
        dietaryOptions: splitLines(dietaryOptions),
      };
      await api.createMealSlot(input);
      notify.success("餐食餐次已创建");
      setTitle("");
      setDescription("");
      await onSaved();
    } catch (error) {
      notify.error(errorText(error, "创建餐次失败"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card classNames={{ base: "rounded-card" }}>
      <CardHeader>
        <h3 className="font-semibold">新增餐食餐次</h3>
      </CardHeader>
      <CardBody className="grid gap-4 md:grid-cols-2">
        <Input label="餐次名称" placeholder="Day 1 午餐" value={title} onValueChange={setTitle} />
        <Input label="排序" type="number" value={sortOrder} onValueChange={setSortOrder} />
        <Input label="供应日期" type="date" value={serviceDate} onValueChange={setServiceDate} />
        <Input label="供应时间" type="time" value={serviceTime} onValueChange={setServiceTime} />
        <Input label="提交截止时间" type="datetime-local" value={orderDeadline} onValueChange={setOrderDeadline} />
        <div className="hidden md:block" />
        <Textarea label="说明" minRows={4} value={description} onValueChange={setDescription} />
        <Textarea
          label="忌口选项"
          description="每行一个选项"
          minRows={4}
          value={dietaryOptions}
          onValueChange={setDietaryOptions}
        />
        <Switch isSelected={enabled} onValueChange={setEnabled}>启用批次</Switch>
        <Switch isSelected={isOpen} onValueChange={setIsOpen}>开放提交</Switch>
        <Button className="md:col-span-2 justify-self-start" color="primary" startContent={<Plus size={16} />} isLoading={loading} onPress={create}>
          创建餐次
        </Button>
      </CardBody>
    </Card>
  );
}

export function DrinkSlotForm({ loading, setLoading, onSaved }: SlotFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [serviceTime, setServiceTime] = useState("");
  const [orderDeadline, setOrderDeadline] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [isOpen, setIsOpen] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [drinkOptions, setDrinkOptions] = useState(defaultDrinkOptions);

  async function create() {
    if (!title.trim()) {
      notify.error("请填写饮料补给批次名称");
      return;
    }
    setLoading(true);
    try {
      const input: DrinkSlotInput = {
        title: title.trim(),
        description: description.trim(),
        serviceDate,
        serviceTime,
        orderDeadline,
        enabled,
        isOpen,
        sortOrder: Number.parseInt(sortOrder, 10) || 0,
        drinkOptions: splitLines(drinkOptions),
      };
      await api.createDrinkSlot(input);
      notify.success("饮料补给批次已创建");
      setTitle("");
      setDescription("");
      await onSaved();
    } catch (error) {
      notify.error(errorText(error, "创建饮料批次失败"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card classNames={{ base: "rounded-card" }}>
      <CardHeader>
        <h3 className="font-semibold">新增饮料补给批次</h3>
      </CardHeader>
      <CardBody className="grid gap-4 md:grid-cols-2">
        <Input label="批次名称" placeholder="Day 1 下午补给" value={title} onValueChange={setTitle} />
        <Input label="排序" type="number" value={sortOrder} onValueChange={setSortOrder} />
        <Input label="供应日期" type="date" value={serviceDate} onValueChange={setServiceDate} />
        <Input label="供应时间" type="time" value={serviceTime} onValueChange={setServiceTime} />
        <Input label="提交截止时间" type="datetime-local" value={orderDeadline} onValueChange={setOrderDeadline} />
        <div className="hidden md:block" />
        <Textarea label="说明" minRows={4} value={description} onValueChange={setDescription} />
        <Textarea
          label="饮料选项"
          description="每行一个选项"
          minRows={4}
          value={drinkOptions}
          onValueChange={setDrinkOptions}
        />
        <Switch isSelected={enabled} onValueChange={setEnabled}>启用批次</Switch>
        <Switch isSelected={isOpen} onValueChange={setIsOpen}>开放提交</Switch>
        <Button className="md:col-span-2 justify-self-start" color="primary" startContent={<Plus size={16} />} isLoading={loading} onPress={create}>
          创建批次
        </Button>
      </CardBody>
    </Card>
  );
}
