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
import { CheckCircle2 } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import type { ResourceAssignment, ResourceItem } from "@/web/lib/api";
import { displayItemStatus, formatDateTime } from "./utils";

export function InventoryTable({
  items,
  assignmentByItem,
  total,
}: {
  items: ResourceItem[];
  assignmentByItem: Record<string, ResourceAssignment>;
  total: number;
}) {
  return (
    <Card classNames={{ base: "rounded-md" }}>
      <CardHeader className="justify-between gap-4">
        <h3 className="font-semibold">库存明细</h3>
        <Chip variant="flat">{total} 条库存</Chip>
      </CardHeader>
      <CardBody>
        <Table aria-label="资源库存明细">
          <TableHeader>
            <TableColumn>资源项</TableColumn>
            <TableColumn>状态</TableColumn>
            <TableColumn>关联选手</TableColumn>
            <TableColumn>发放时间</TableColumn>
            <TableColumn>过期时间</TableColumn>
            <TableColumn>发放记录</TableColumn>
            <TableColumn>发放状态</TableColumn>
            <TableColumn>邮件送达</TableColumn>
            <TableColumn>记录创建</TableColumn>
            <TableColumn>明文码</TableColumn>
          </TableHeader>
          <TableBody items={items} emptyContent="暂无库存数据">
            {(row) => {
              const assignment = assignmentByItem[row.id];
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-foreground/45" />
                      <span>{row.publicLabel}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={displayItemStatus(row.status)} />
                  </TableCell>
                  <TableCell>{row.assignedCheckinId || assignment?.checkinId || "-"}</TableCell>
                  <TableCell>{formatDateTime(row.assignedAt)}</TableCell>
                  <TableCell>{formatDateTime(row.expiresAt)}</TableCell>
                  <TableCell>{assignment?.id ?? "-"}</TableCell>
                  <TableCell>{assignment ? <StatusChip status={assignment.status} /> : "-"}</TableCell>
                  <TableCell>{assignment ? (assignment.deliveredByEmail ? "已送达" : "未送达") : "-"}</TableCell>
                  <TableCell>{formatDateTime(assignment?.createdAt)}</TableCell>
                  <TableCell>{assignment?.plainCode || "-"}</TableCell>
                </TableRow>
              );
            }}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
}
