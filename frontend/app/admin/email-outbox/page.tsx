"use client";

import { Button, Card, CardBody, CardHeader, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { StatusChip } from "@/components/status-chip";
import { emailRows } from "@/web/lib/mock-data";

export default function EmailOutboxPage() {
  return (
    <AppShell>
      <Card className="rounded-md">
        <CardHeader className="justify-between">
          <div>
            <p className="text-sm text-ink/60">Outbox</p>
            <h2 className="text-2xl font-semibold">邮件队列</h2>
          </div>
          <Button variant="flat" startContent={<RefreshCw size={16} />}>刷新</Button>
        </CardHeader>
        <CardBody>
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
                <TableRow key={`${row.to}-${row.subject}`}>
                  <TableCell>{row.to}</TableCell>
                  <TableCell>{row.subject}</TableCell>
                  <TableCell><StatusChip status={row.status} /></TableCell>
                  <TableCell>{row.retry}</TableCell>
                  <TableCell><Button size="sm" variant="flat">重试</Button></TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </AppShell>
  );
}
