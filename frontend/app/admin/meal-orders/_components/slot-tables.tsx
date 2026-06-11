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
import type { DrinkOrder, DrinkSlot, MealSlot } from "@/web/lib/api";
import { choiceStats, formatDateTime } from "./utils";
import { OptionsCell, SlotStatus } from "./shared-cells";

type TableStateProps = {
  loading: boolean;
  loadError: string;
};

export function MealSlotsTable({
  slots,
  stats,
  loading,
  loadError,
}: {
  slots: MealSlot[];
  stats: Record<string, number>;
} & TableStateProps) {
  return (
    <Card classNames={{ base: "rounded-md" }}>
      <CardHeader className="justify-between gap-4">
        <h3 className="font-semibold">餐食餐次</h3>
        <Chip variant="flat">{slots.length} 个餐次</Chip>
      </CardHeader>
      <CardBody>
        <Table aria-label="餐食餐次列表">
          <TableHeader>
            <TableColumn>餐次</TableColumn>
            <TableColumn>说明</TableColumn>
            <TableColumn>供应时间</TableColumn>
            <TableColumn>截止</TableColumn>
            <TableColumn>选项</TableColumn>
            <TableColumn>排序</TableColumn>
            <TableColumn>状态</TableColumn>
            <TableColumn>订单</TableColumn>
            <TableColumn>更新时间</TableColumn>
          </TableHeader>
          <TableBody
            items={slots}
            isLoading={loading}
            loadingContent={<Spinner size="sm" label="正在读取餐食餐次..." />}
            emptyContent={loadError || "暂无餐食餐次"}
          >
            {(slot) => (
              <TableRow key={slot.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{slot.title}</p>
                    <p className="text-xs text-foreground/45">{slot.id}</p>
                  </div>
                </TableCell>
                <TableCell>{slot.description || "-"}</TableCell>
                <TableCell>{slot.serviceDate || "-"} {slot.serviceTime}</TableCell>
                <TableCell>{formatDateTime(slot.orderDeadline)}</TableCell>
                <TableCell><OptionsCell values={slot.dietaryOptions} /></TableCell>
                <TableCell>{slot.sortOrder}</TableCell>
                <TableCell><SlotStatus enabled={slot.enabled} isOpen={slot.isOpen} /></TableCell>
                <TableCell>{stats[slot.id] ?? 0}</TableCell>
                <TableCell>{formatDateTime(slot.updatedAt || slot.createdAt)}</TableCell>
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
  loading,
  loadError,
}: {
  slots: DrinkSlot[];
  stats: Record<string, number>;
  orders: DrinkOrder[];
} & TableStateProps) {
  return (
    <Card classNames={{ base: "rounded-md" }}>
      <CardHeader className="justify-between gap-4">
        <h3 className="font-semibold">饮料补给批次</h3>
        <Chip variant="flat">{slots.length} 个批次</Chip>
      </CardHeader>
      <CardBody>
        <Table aria-label="饮料补给批次列表">
          <TableHeader>
            <TableColumn>批次</TableColumn>
            <TableColumn>说明</TableColumn>
            <TableColumn>供应时间</TableColumn>
            <TableColumn>截止</TableColumn>
            <TableColumn>选项</TableColumn>
            <TableColumn>排序</TableColumn>
            <TableColumn>状态</TableColumn>
            <TableColumn>订单</TableColumn>
            <TableColumn>选择统计</TableColumn>
            <TableColumn>更新时间</TableColumn>
          </TableHeader>
          <TableBody
            items={slots}
            isLoading={loading}
            loadingContent={<Spinner size="sm" label="正在读取饮料批次..." />}
            emptyContent={loadError || "暂无饮料批次"}
          >
            {(slot) => (
              <TableRow key={slot.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{slot.title}</p>
                    <p className="text-xs text-foreground/45">{slot.id}</p>
                  </div>
                </TableCell>
                <TableCell>{slot.description || "-"}</TableCell>
                <TableCell>{slot.serviceDate || "-"} {slot.serviceTime}</TableCell>
                <TableCell>{formatDateTime(slot.orderDeadline)}</TableCell>
                <TableCell><OptionsCell values={slot.drinkOptions} /></TableCell>
                <TableCell>{slot.sortOrder}</TableCell>
                <TableCell><SlotStatus enabled={slot.enabled} isOpen={slot.isOpen} /></TableCell>
                <TableCell>{stats[slot.id] ?? 0}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    {choiceStats(orders.filter((order) => order.slotId === slot.id)).map(([label, count]) => (
                      <Chip key={label} size="sm" variant="flat">{label} {count}</Chip>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{formatDateTime(slot.updatedAt || slot.createdAt)}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
}
