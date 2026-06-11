import {
  Card,
  CardBody,
  CardHeader,
  Chip,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import type { DrinkOrder, DrinkSlot, MealOrder, MealSlot } from "@/web/lib/api";
import { formatDateTime } from "./utils";
import { ParticipantCell } from "./shared-cells";

type TableStateProps = {
  loading: boolean;
  loadError: string;
};

export function MealOrdersTable({
  orders,
  slots,
  loading,
  loadError,
}: {
  orders: MealOrder[];
  slots: MealSlot[];
} & TableStateProps) {
  const slotNames = Object.fromEntries(slots.map((slot) => [slot.id, slot.title]));
  return (
    <Card classNames={{ base: "rounded-card" }}>
      <CardHeader className="justify-between gap-4">
        <h3 className="font-semibold">餐食订单</h3>
        <Chip variant="flat">{orders.length} 条订单</Chip>
      </CardHeader>
      <CardBody>
        <Table aria-label="餐食订单列表">
          <TableHeader>
            <TableColumn>选手</TableColumn>
            <TableColumn>邮箱</TableColumn>
            <TableColumn>餐次</TableColumn>
            <TableColumn>忌口</TableColumn>
            <TableColumn>其他详情</TableColumn>
            <TableColumn>备注</TableColumn>
            <TableColumn>创建</TableColumn>
            <TableColumn>更新</TableColumn>
          </TableHeader>
          <TableBody
            items={orders}
            isLoading={loading}
            loadingContent={<Spinner size="sm" label="正在读取餐食订单..." />}
            emptyContent={loadError || "暂无餐食订单"}
          >
            {(order) => (
              <TableRow key={order.id}>
                <TableCell><ParticipantCell order={order} /></TableCell>
                <TableCell>{order.email}</TableCell>
                <TableCell>{slotNames[order.slotId] ?? order.slotId}</TableCell>
                <TableCell>{order.dietaryNeeds.join("、") || "-"}</TableCell>
                <TableCell>{order.otherDetail || "-"}</TableCell>
                <TableCell>{order.notes || "-"}</TableCell>
                <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                <TableCell>{formatDateTime(order.updatedAt)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
}

export function DrinkOrdersTable({
  orders,
  slots,
  loading,
  loadError,
}: {
  orders: DrinkOrder[];
  slots: DrinkSlot[];
} & TableStateProps) {
  const slotNames = Object.fromEntries(slots.map((slot) => [slot.id, slot.title]));
  return (
    <Card classNames={{ base: "rounded-card" }}>
      <CardHeader className="justify-between gap-4">
        <h3 className="font-semibold">饮料订单</h3>
        <Chip variant="flat">{orders.length} 条订单</Chip>
      </CardHeader>
      <CardBody>
        <Table aria-label="饮料订单列表">
          <TableHeader>
            <TableColumn>选手</TableColumn>
            <TableColumn>邮箱</TableColumn>
            <TableColumn>批次</TableColumn>
            <TableColumn>饮料</TableColumn>
            <TableColumn>备注</TableColumn>
            <TableColumn>创建</TableColumn>
            <TableColumn>更新</TableColumn>
          </TableHeader>
          <TableBody
            items={orders}
            isLoading={loading}
            loadingContent={<Spinner size="sm" label="正在读取饮料订单..." />}
            emptyContent={loadError || "暂无饮料订单"}
          >
            {(order) => (
              <TableRow key={order.id}>
                <TableCell><ParticipantCell order={order} /></TableCell>
                <TableCell>{order.email}</TableCell>
                <TableCell>{slotNames[order.slotId] ?? order.slotId}</TableCell>
                <TableCell>{order.drinkOption || "-"}</TableCell>
                <TableCell>{order.notes || "-"}</TableCell>
                <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                <TableCell>{formatDateTime(order.updatedAt)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
}
