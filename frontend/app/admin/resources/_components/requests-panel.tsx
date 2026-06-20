"use client";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
} from "@heroui/react";
import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { errorText, notify } from "@/components/toast";
import { api, type ResourceRequest } from "@/web/lib/api";
import { resourceRequestStatusLabels } from "@/web/lib/resource-labels";
import { formatDateTime } from "./utils";

const STATUS_FILTERS = [
  { key: "pending", label: "审核中" },
  { key: "approved", label: "已通过" },
  { key: "rejected", label: "已拒绝" },
  { key: "", label: "全部" },
];

const STATUS_COLORS: Record<string, "warning" | "success" | "danger" | "default"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export function RequestsPanel({ poolId }: { poolId: string }) {
  const [status, setStatus] = useState("pending");
  const [requests, setRequests] = useState<ResourceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<ResourceRequest | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const next = await api.adminRequests(poolId, status);
      setRequests(next);
    } catch (error) {
      notify.error(errorText(error, "读取申请失败"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolId, status]);

  async function submitReview(approve: boolean) {
    if (!reviewing) return;
    setSubmitting(true);
    try {
      await api.reviewRequest(reviewing.id, approve, note);
      notify.success(approve ? "已通过并发放" : "已拒绝");
      setReviewing(null);
      setNote("");
      await refresh();
    } catch (error) {
      notify.error(errorText(error, "审核失败"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card classNames={{ base: "rounded-card" }}>
      <CardHeader className="justify-between gap-4">
        <h3 className="font-semibold">申请审批</h3>
        <div className="w-40">
          <Select
            size="sm"
            selectedKeys={[status]}
            onSelectionChange={(keys) => setStatus(String(Array.from(keys)[0] ?? "pending"))}
          >
            {STATUS_FILTERS.map((item) => (
              <SelectItem key={item.key}>{item.label}</SelectItem>
            ))}
          </Select>
        </div>
      </CardHeader>
      <CardBody>
        <Table aria-label="资源申请列表">
          <TableHeader>
            <TableColumn>选手 CheckinID</TableColumn>
            <TableColumn>状态</TableColumn>
            <TableColumn>提交时间</TableColumn>
            <TableColumn>审核备注</TableColumn>
            <TableColumn>操作</TableColumn>
          </TableHeader>
          <TableBody
            items={requests}
            isLoading={loading}
            loadingContent={<Spinner size="sm" label="正在读取申请..." />}
            emptyContent="暂无申请"
          >
            {(row) => (
              <TableRow key={row.id}>
                <TableCell>{row.checkinId}</TableCell>
                <TableCell>
                  <Chip size="sm" color={STATUS_COLORS[row.status] ?? "default"} variant="flat">
                    {resourceRequestStatusLabels[row.status] ?? row.status}
                  </Chip>
                </TableCell>
                <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                <TableCell className="max-w-[200px] truncate">{row.reviewNote || "-"}</TableCell>
                <TableCell>
                  {row.status === "pending" ? (
                    <Button
                      size="sm"
                      variant="flat"
                      onPress={() => {
                        setReviewing(row);
                        setNote("");
                      }}
                    >
                      审核
                    </Button>
                  ) : (
                    <span className="text-xs text-foreground/40">{row.reviewer || "-"}</span>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardBody>

      <Modal isOpen={!!reviewing} onOpenChange={(open) => !open && setReviewing(null)} size="lg">
        <ModalContent>
          {() => (
            <>
              <ModalHeader>
                <h3 className="font-semibold">审核资源申请</h3>
              </ModalHeader>
              <ModalBody className="grid gap-3">
                <p className="text-sm text-foreground/60">
                  选手 CheckinID：<span className="font-medium">{reviewing?.checkinId}</span>
                </p>
                <Textarea
                  label="审核备注"
                  placeholder="通过/拒绝原因（可选）"
                  value={note}
                  onValueChange={setNote}
                />
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={() => setReviewing(null)}>
                  取消
                </Button>
                <Button
                  color="danger"
                  variant="flat"
                  startContent={<X size={16} />}
                  isLoading={submitting}
                  onPress={() => submitReview(false)}
                >
                  拒绝
                </Button>
                <Button
                  color="primary"
                  startContent={<Check size={16} />}
                  isLoading={submitting}
                  onPress={() => submitReview(true)}
                >
                  通过并发放
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </Card>
  );
}
