"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Chip,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { StatusChip } from "@/components/status-chip";
import { errorText, notify } from "@/components/toast";
import { api, type AsyncTask } from "@/web/lib/api";

const TASK_TYPE_OPTIONS = [
  { value: "", label: "全部类型" },
  { value: "email_send", label: "邮件发送" },
];

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "pending", label: "等待中" },
  { value: "sending", label: "执行中" },
  { value: "succeeded", label: "成功" },
  { value: "failed", label: "失败" },
  { value: "dead", label: "已放弃" },
];

export default function AdminTasksPage() {
  const [rows, setRows] = useState<AsyncTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryingId, setRetryingId] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  async function refresh() {
    setLoading(true);
    setLoadError("");
    try {
      const params: { type?: string; status?: string } = {};
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      setRows(await api.tasks(params));
    } catch (error) {
      const message = errorText(error, "读取任务列表失败");
      setLoadError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function retry(id: string) {
    setRetryingId(id);
    try {
      await api.retryTask(id);
      await refresh();
      notify.success("任务已重新入队");
    } catch (error) {
      notify.error(errorText(error, "重试失败"));
    } finally {
      setRetryingId("");
    }
  }

  useEffect(() => {
    refresh();
  }, [typeFilter, statusFilter]);

  return (
    <AdminAuthGuard>
      <AppShell variant="admin">
        <section className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-foreground/40">运维工具</p>
              <h2 className="text-xl font-bold text-foreground">异步任务</h2>
            </div>
            <div className="flex items-center gap-2">
              <Select
                size="sm"
                className="w-36"
                selectedKeys={[typeFilter]}
                onSelectionChange={(keys) => setTypeFilter(String(Array.from(keys)[0] ?? ""))}
              >
                {TASK_TYPE_OPTIONS.map((item) => (
                  <SelectItem key={item.value}>{item.label}</SelectItem>
                ))}
              </Select>
              <Select
                size="sm"
                className="w-36"
                selectedKeys={[statusFilter]}
                onSelectionChange={(keys) => setStatusFilter(String(Array.from(keys)[0] ?? ""))}
              >
                {STATUS_OPTIONS.map((item) => (
                  <SelectItem key={item.value}>{item.label}</SelectItem>
                ))}
              </Select>
              <Button
                variant="flat"
                size="sm"
                startContent={<RefreshCw size={16} />}
                isLoading={loading}
                onPress={refresh}
              >
                刷新
              </Button>
            </div>
          </div>

          <Table aria-label="异步任务列表">
            <TableHeader>
              <TableColumn>类型</TableColumn>
              <TableColumn>状态</TableColumn>
              <TableColumn>尝试次数</TableColumn>
              <TableColumn>错误信息</TableColumn>
              <TableColumn>创建时间</TableColumn>
              <TableColumn>操作</TableColumn>
            </TableHeader>
            <TableBody
              items={rows}
              isLoading={loading}
              loadingContent={<Spinner size="sm" label="正在读取任务列表..." />}
              emptyContent={loadError || "暂无任务数据"}
            >
              {(row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Chip size="sm" variant="flat">
                      {row.taskType}
                    </Chip>
                  </TableCell>
                  <TableCell>
                    <StatusChip status={row.status} />
                  </TableCell>
                  <TableCell>
                    {row.attempts} / {row.maxAttempts}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{row.lastError || "-"}</TableCell>
                  <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                  <TableCell>
                    {isRetryable(row.status) ? (
                      <Button
                        size="sm"
                        variant="flat"
                        isLoading={retryingId === row.id}
                        onPress={() => retry(row.id)}
                      >
                        重试
                      </Button>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>
      </AppShell>
    </AdminAuthGuard>
  );
}

function isRetryable(status: string) {
  return ["failed", "dead"].includes(status);
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}
