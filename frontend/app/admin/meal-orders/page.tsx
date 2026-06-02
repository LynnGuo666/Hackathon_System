"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tabs,
  Textarea,
} from "@heroui/react";
import { Coffee, Plus, RefreshCw, Utensils } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { errorText, notify } from "@/components/toast";
import {
  api,
  type DrinkOrder,
  type DrinkSlot,
  type DrinkSlotInput,
  type MealOrder,
  type MealSlot,
  type MealSlotInput,
} from "@/web/lib/api";

const defaultMealOptions = "无特殊忌口\n素食\n清真\n不吃牛肉\n不吃猪肉\n乳糖不耐受\n坚果过敏\n海鲜过敏";
const defaultDrinkOptions = "矿泉水\n无糖茶\n可乐\n无糖可乐\n运动饮料\n咖啡";

export default function AdminMealOrdersPage() {
  const [mealSlots, setMealSlots] = useState<MealSlot[]>([]);
  const [drinkSlots, setDrinkSlots] = useState<DrinkSlot[]>([]);
  const [mealOrders, setMealOrders] = useState<MealOrder[]>([]);
  const [drinkOrders, setDrinkOrders] = useState<DrinkOrder[]>([]);
  const [loading, setLoading] = useState(false);

  async function refresh() {
    try {
      const [nextMealSlots, nextDrinkSlots, nextMealOrders, nextDrinkOrders] = await Promise.all([
        api.adminMealSlots().catch(() => []),
        api.adminDrinkSlots().catch(() => []),
        api.adminMealOrders().catch(() => []),
        api.adminDrinkOrders().catch(() => []),
      ]);
      setMealSlots(nextMealSlots);
      setDrinkSlots(nextDrinkSlots);
      setMealOrders(nextMealOrders);
      setDrinkOrders(nextDrinkOrders);
    } catch (error) {
      notify.error(errorText(error, "读取餐饮订单失败"));
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
        <section className="grid gap-5">
          <div>
            <p className="text-sm text-foreground/60">餐饮运营</p>
            <h2 className="text-2xl font-semibold">餐饮与饮料补给</h2>
            <p className="mt-1 text-sm text-foreground/60">
              管理餐食餐次、饮料补给批次，并查看选手提交情况。
            </p>
          </div>

          <div className="flex justify-end">
            <Button variant="flat" startContent={<RefreshCw size={16} />} onPress={refresh}>
              刷新
            </Button>
          </div>

          <Tabs aria-label="餐饮补给管理" variant="underlined">
            <Tab
              key="meals"
              title={
                <span className="inline-flex items-center gap-2">
                  <Utensils size={16} />
                  餐食餐次
                </span>
              }
            >
              <div className="grid gap-5 pt-4">
                <MealSlotForm
                  loading={loading}
                  setLoading={setLoading}
                  onSaved={refresh}
                />
                <MealSlotsTable slots={mealSlots} stats={mealStats} />
                <MealOrdersTable orders={mealOrders} slots={mealSlots} />
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
              <div className="grid gap-5 pt-4">
                <DrinkSlotForm
                  loading={loading}
                  setLoading={setLoading}
                  onSaved={refresh}
                />
                <DrinkSlotsTable slots={drinkSlots} stats={drinkStats} orders={drinkOrders} />
                <DrinkOrdersTable orders={drinkOrders} slots={drinkSlots} />
              </div>
            </Tab>
          </Tabs>
        </section>
      </AppShell>
    </AdminAuthGuard>
  );
}

function MealSlotForm({
  loading,
  setLoading,
  onSaved,
}: {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onSaved: () => Promise<void>;
}) {
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
    <Card className="rounded-md">
      <CardHeader>
        <div>
          <h3 className="font-semibold">新增餐食餐次</h3>
          <p className="text-sm text-foreground/60">配置选手端可提交的餐食批次和忌口选项。</p>
        </div>
      </CardHeader>
      <CardBody className="grid gap-3 md:grid-cols-2">
        <Input label="餐次名称" placeholder="Day 1 午餐" value={title} onValueChange={setTitle} />
        <Input label="排序" type="number" value={sortOrder} onValueChange={setSortOrder} />
        <Input label="供应日期" type="date" value={serviceDate} onValueChange={setServiceDate} />
        <Input label="供应时间" type="time" value={serviceTime} onValueChange={setServiceTime} />
        <Input className="md:col-span-2" label="提交截止时间" type="datetime-local" value={orderDeadline} onValueChange={setOrderDeadline} />
        <Textarea className="md:col-span-2" label="说明" value={description} onValueChange={setDescription} />
        <Textarea
          className="md:col-span-2"
          label="忌口选项"
          description="每行一个选项"
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

function DrinkSlotForm({
  loading,
  setLoading,
  onSaved,
}: {
  loading: boolean;
  setLoading: (loading: boolean) => void;
  onSaved: () => Promise<void>;
}) {
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
    <Card className="rounded-md">
      <CardHeader>
        <div>
          <h3 className="font-semibold">新增饮料补给批次</h3>
          <p className="text-sm text-foreground/60">配置选手端单选饮料范围和开放状态。</p>
        </div>
      </CardHeader>
      <CardBody className="grid gap-3 md:grid-cols-2">
        <Input label="批次名称" placeholder="Day 1 下午补给" value={title} onValueChange={setTitle} />
        <Input label="排序" type="number" value={sortOrder} onValueChange={setSortOrder} />
        <Input label="供应日期" type="date" value={serviceDate} onValueChange={setServiceDate} />
        <Input label="供应时间" type="time" value={serviceTime} onValueChange={setServiceTime} />
        <Input className="md:col-span-2" label="提交截止时间" type="datetime-local" value={orderDeadline} onValueChange={setOrderDeadline} />
        <Textarea className="md:col-span-2" label="说明" value={description} onValueChange={setDescription} />
        <Textarea
          className="md:col-span-2"
          label="饮料选项"
          description="每行一个选项"
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

function MealSlotsTable({ slots, stats }: { slots: MealSlot[]; stats: Record<string, number> }) {
  return (
    <Card className="rounded-md">
      <CardHeader className="justify-between gap-4">
        <div>
          <h3 className="font-semibold">餐食餐次</h3>
          <p className="text-sm text-foreground/60">查看批次开放状态和订单数。</p>
        </div>
        <Chip variant="flat">{slots.length} 个餐次</Chip>
      </CardHeader>
      <CardBody>
        <Table aria-label="餐食餐次列表">
          <TableHeader>
            <TableColumn>餐次</TableColumn>
            <TableColumn>供应时间</TableColumn>
            <TableColumn>截止</TableColumn>
            <TableColumn>状态</TableColumn>
            <TableColumn>订单</TableColumn>
          </TableHeader>
          <TableBody items={slots}>
            {(slot) => (
              <TableRow key={slot.id}>
                <TableCell>{slot.title}</TableCell>
                <TableCell>{slot.serviceDate || "-"} {slot.serviceTime}</TableCell>
                <TableCell>{formatDateTime(slot.orderDeadline)}</TableCell>
                <TableCell><SlotStatus enabled={slot.enabled} isOpen={slot.isOpen} /></TableCell>
                <TableCell>{stats[slot.id] ?? 0}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
}

function DrinkSlotsTable({
  slots,
  stats,
  orders,
}: {
  slots: DrinkSlot[];
  stats: Record<string, number>;
  orders: DrinkOrder[];
}) {
  return (
    <Card className="rounded-md">
      <CardHeader className="justify-between gap-4">
        <div>
          <h3 className="font-semibold">饮料补给批次</h3>
          <p className="text-sm text-foreground/60">查看批次开放状态、订单数和选择分布。</p>
        </div>
        <Chip variant="flat">{slots.length} 个批次</Chip>
      </CardHeader>
      <CardBody>
        <Table aria-label="饮料补给批次列表">
          <TableHeader>
            <TableColumn>批次</TableColumn>
            <TableColumn>供应时间</TableColumn>
            <TableColumn>状态</TableColumn>
            <TableColumn>订单</TableColumn>
            <TableColumn>选择统计</TableColumn>
          </TableHeader>
          <TableBody items={slots}>
            {(slot) => (
              <TableRow key={slot.id}>
                <TableCell>{slot.title}</TableCell>
                <TableCell>{slot.serviceDate || "-"} {slot.serviceTime}</TableCell>
                <TableCell><SlotStatus enabled={slot.enabled} isOpen={slot.isOpen} /></TableCell>
                <TableCell>{stats[slot.id] ?? 0}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {choiceStats(orders.filter((order) => order.slotId === slot.id)).map(([label, count]) => (
                      <Chip key={label} size="sm" variant="flat">{label} {count}</Chip>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
}

function MealOrdersTable({ orders, slots }: { orders: MealOrder[]; slots: MealSlot[] }) {
  const slotNames = Object.fromEntries(slots.map((slot) => [slot.id, slot.title]));
  return (
    <Card className="rounded-md">
      <CardHeader className="justify-between gap-4">
        <div>
          <h3 className="font-semibold">餐食订单</h3>
          <p className="text-sm text-foreground/60">查看选手忌口、其他详情和备注。</p>
        </div>
        <Chip variant="flat">{orders.length} 条订单</Chip>
      </CardHeader>
      <CardBody>
        <Table aria-label="餐食订单列表">
          <TableHeader>
            <TableColumn>选手</TableColumn>
            <TableColumn>餐次</TableColumn>
            <TableColumn>忌口</TableColumn>
            <TableColumn>其他详情</TableColumn>
            <TableColumn>备注</TableColumn>
            <TableColumn>更新</TableColumn>
          </TableHeader>
          <TableBody items={orders}>
            {(order) => (
              <TableRow key={order.id}>
                <TableCell><ParticipantCell order={order} /></TableCell>
                <TableCell>{slotNames[order.slotId] ?? order.slotId}</TableCell>
                <TableCell>{order.dietaryNeeds.join("、") || "-"}</TableCell>
                <TableCell>{order.otherDetail || "-"}</TableCell>
                <TableCell>{order.notes || "-"}</TableCell>
                <TableCell>{formatDateTime(order.updatedAt)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
}

function DrinkOrdersTable({ orders, slots }: { orders: DrinkOrder[]; slots: DrinkSlot[] }) {
  const slotNames = Object.fromEntries(slots.map((slot) => [slot.id, slot.title]));
  return (
    <Card className="rounded-md">
      <CardHeader className="justify-between gap-4">
        <div>
          <h3 className="font-semibold">饮料订单</h3>
          <p className="text-sm text-foreground/60">查看选手饮料选择和备注。</p>
        </div>
        <Chip variant="flat">{orders.length} 条订单</Chip>
      </CardHeader>
      <CardBody>
        <Table aria-label="饮料订单列表">
          <TableHeader>
            <TableColumn>选手</TableColumn>
            <TableColumn>批次</TableColumn>
            <TableColumn>饮料</TableColumn>
            <TableColumn>备注</TableColumn>
            <TableColumn>更新</TableColumn>
          </TableHeader>
          <TableBody items={orders}>
            {(order) => (
              <TableRow key={order.id}>
                <TableCell><ParticipantCell order={order} /></TableCell>
                <TableCell>{slotNames[order.slotId] ?? order.slotId}</TableCell>
                <TableCell>{order.drinkOption || "-"}</TableCell>
                <TableCell>{order.notes || "-"}</TableCell>
                <TableCell>{formatDateTime(order.updatedAt)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
}

function ParticipantCell({ order }: { order: MealOrder | DrinkOrder }) {
  return (
    <div>
      <p className="font-medium">{order.participantName || order.email}</p>
      <p className="text-xs text-foreground/45">{order.teamName || order.email}</p>
    </div>
  );
}

function SlotStatus({ enabled, isOpen }: { enabled: boolean; isOpen: boolean }) {
  const open = enabled && isOpen;
  return (
    <Chip size="sm" color={open ? "success" : enabled ? "warning" : "default"} variant="flat">
      {open ? "开放" : enabled ? "关闭提交" : "停用"}
    </Chip>
  );
}

function splitLines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

function countBySlot<T extends { slotId: string }>(orders: T[]) {
  return orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.slotId] = (acc[order.slotId] ?? 0) + 1;
    return acc;
  }, {});
}

function choiceStats(orders: DrinkOrder[]) {
  const stats = orders.reduce<Record<string, number>>((acc, order) => {
    if (order.drinkOption) {
      acc[order.drinkOption] = (acc[order.drinkOption] ?? 0) + 1;
    }
    return acc;
  }, {});
  return Object.entries(stats);
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
