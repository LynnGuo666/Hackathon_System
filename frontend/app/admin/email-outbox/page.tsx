"use client";

import { Button, Spinner, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { StatusChip } from "@/components/status-chip";
import { errorText, notify } from "@/components/toast";
import { api, type EmailOutbox } from "@/web/lib/api";
import { useEffect, useState } from "react";

export default function EmailOutboxPage() {
  const [emailRows, setEmailRows] = useState<EmailOutbox[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryingId, setRetryingId] = useState("");

  async function refresh() {
    setLoading(true);
    setLoadError("");
    try {
      setEmailRows(await api.emailOutbox());
    } catch (error) {
      const message = errorText(error, "读取邮件队列失败");
      setLoadError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function retry(id: string) {
    setRetryingId(id);
    try {
      await api.retryEmail(id);
      await refresh();
      notify.success("已重新加入邮件队列");
    } catch (error) {
      notify.error(errorText(error, "重试失败"));
    } finally {
      setRetryingId("");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AdminAuthGuard>
    <AppShell variant="admin">
      <section className="grid gap-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">邮件队列</h2>
          <Button variant="flat" startContent={<RefreshCw size={16} />} isLoading={loading} onPress={refresh}>刷新</Button>
        </div>
        <Table aria-label="邮件队列">
          <TableHeader>
            <TableColumn>收件人</TableColumn>
            <TableColumn>主题</TableColumn>
            <TableColumn>状态</TableColumn>
            <TableColumn>重试</TableColumn>
            <TableColumn>错误</TableColumn>
            <TableColumn>创建时间</TableColumn>
            <TableColumn>操作</TableColumn>
          </TableHeader>
          <TableBody
            items={emailRows}
            isLoading={loading}
            loadingContent={<Spinner size="sm" label="正在读取邮件队列..." />}
            emptyContent={loadError || "暂无邮件队列数据"}
          >
            {(row) => (
              <TableRow key={row.id}>
                <TableCell>{row.to}</TableCell>
                <TableCell>{row.subject}</TableCell>
                <TableCell><StatusChip status={row.status} /></TableCell>
                <TableCell>{row.retryCount}</TableCell>
                <TableCell>{row.lastError || "-"}</TableCell>
                <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                <TableCell>
                  {isRetryableStatus(row.status) ? (
                    <Button
                      size="sm"
                      variant="flat"
                      isLoading={retryingId === row.id}
                      onPress={() => retry(row.id)}
                    >
                      重试
                    </Button>
                  ) : "-"}
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

function isRetryableStatus(status: string) {
  return ["pending", "failed"].includes(status);
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", { hour12: false });
}
