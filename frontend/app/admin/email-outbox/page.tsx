"use client";

import { Button, Card, CardBody, CardHeader, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { StatusChip } from "@/components/status-chip";
import { api, type EmailOutbox } from "@/web/lib/api";
import { useEffect, useState } from "react";

export default function EmailOutboxPage() {
  const [emailRows, setEmailRows] = useState<EmailOutbox[]>([]);
  const [message, setMessage] = useState("");

  async function refresh() {
    try {
      setEmailRows(await api.emailOutbox());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "读取邮件队列失败");
    }
  }

  async function retry(id: string) {
    try {
      await api.retryEmail(id);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重试失败");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AdminAuthGuard>
    <AppShell variant="admin">
      <Card className="rounded-md">
        <CardHeader className="justify-between">
          <div>
            <p className="text-sm text-foreground/60">Outbox</p>
            <h2 className="text-2xl font-semibold">邮件队列</h2>
          </div>
          <Button variant="flat" startContent={<RefreshCw size={16} />} onPress={refresh}>刷新</Button>
        </CardHeader>
        <CardBody>
          {message && <p className="mb-3 text-sm text-danger">{message}</p>}
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
        </CardBody>
      </Card>
    </AppShell>
    </AdminAuthGuard>
  );
}
