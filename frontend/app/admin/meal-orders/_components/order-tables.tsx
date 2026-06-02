"use client";

import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import type { DrinkOrder, DrinkSlot, MealOrder, MealSlot } from "@/web/lib/api";
import { choiceStats, formatDateTime } from "./utils";

export function MealSlotsTable({ slots, stats }: { slots: MealSlot[]; stats: Record<string, number> }) {
  return (
    <Card className="rounded-md">
      <CardHeader className="justify-between gap-4">
        <h3 className="font-semibold">餐食餐次</h3>
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

export function DrinkSlotsTable({
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
        <h3 className="font-semibold">饮料补给批次</h3>
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

export function MealOrdersTable({ orders, slots }: { orders: MealOrder[]; slots: MealSlot[] }) {
  const slotNames = Object.fromEntries(slots.map((slot) => [slot.id, slot.title]));
  return (
    <Card className="rounded-md">
      <CardHeader className="justify-between gap-4">
        <h3 className="font-semibold">餐食订单</h3>
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

export function DrinkOrdersTable({ orders, slots }: { orders: DrinkOrder[]; slots: DrinkSlot[] }) {
  const slotNames = Object.fromEntries(slots.map((slot) => [slot.id, slot.title]));
  return (
    <Card className="rounded-md">
      <CardHeader className="justify-between gap-4">
        <h3 className="font-semibold">饮料订单</h3>
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
