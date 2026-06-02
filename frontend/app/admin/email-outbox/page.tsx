"use client";

import { Button, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { StatusChip } from "@/components/status-chip";
import { errorText, notify } from "@/components/toast";
import { api, type EmailOutbox } from "@/web/lib/api";
import { useEffect, useState } from "react";

export default function EmailOutboxPage() {
  const [emailRows, setEmailRows] = useState<EmailOutbox[]>([]);

  async function refresh() {
    try {
      setEmailRows(await api.emailOutbox());
    } catch (error) {
      notify.error(errorText(error, "读取邮件队列失败"));
    }
  }

  async function retry(id: string) {
    try {
      await api.retryEmail(id);
      await refresh();
      notify.success("已重新加入邮件队列");
    } catch (error) {
      notify.error(errorText(error, "重试失败"));
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
          <Button variant="flat" startContent={<RefreshCw size={16} />} onPress={refresh}>刷新</Button>
        </div>
        <Table aria-label="邮件队列">
          <TableHeader>
            <TableColumn>收件人</TableColumn>
            <TableColumn>主题</TableColumn>
            <TableColumn>状态</TableColumn>
            <TableColumn>重试</TableColumn>
            <TableColumn>操作</TableColumn>
          </TableHeader>
          <TableBody items={emailRows}>
            {(row) => (
              <TableRow key={row.id}>
                <TableCell>{row.to}</TableCell>
                <TableCell>{row.subject}</TableCell>
                <TableCell><StatusChip status={row.status} /></TableCell>
                <TableCell>{row.retryCount}</TableCell>
                <TableCell><Button size="sm" variant="flat" onPress={() => retry(row.id)}>重试</Button></TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
    </AppShell>
    </AdminAuthGuard>
  );
}
