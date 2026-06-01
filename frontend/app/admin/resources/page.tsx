"use client";

import { Button, Card, CardBody, CardHeader, Input, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { AppShell } from "@/components/app-shell";
import { StatusChip } from "@/components/status-chip";

const assignments = [
  { checkinId: "CHECKIN-001", pool: "AI 兑换码", item: "兑换码 001", status: "assigned" },
  { checkinId: "CHECKIN-002", pool: "云服务额度", item: "兑换码 002", status: "fulfilled" },
];

export default function AdminResourcesPage() {
  return (
    <AppShell>
      <section className="grid gap-5">
        <div>
          <p className="text-sm text-ink/60">resource_admin</p>
          <h2 className="text-2xl font-semibold">资源池与发放</h2>
        </div>
        <Card className="rounded-md">
          <CardHeader><h3 className="font-semibold">创建资源池</h3></CardHeader>
          <CardBody className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <Input label="资源名称" placeholder="AI 兑换码" />
            <Input label="类型" placeholder="code / link / credential" />
            <Button color="primary" className="self-end">创建</Button>
          </CardBody>
        </Card>
        <Card className="rounded-md">
          <CardHeader><h3 className="font-semibold">发放记录</h3></CardHeader>
          <CardBody>
            <Table aria-label="资源发放记录">
              <TableHeader>
                <TableColumn>CheckinID</TableColumn>
                <TableColumn>资源池</TableColumn>
                <TableColumn>资源项</TableColumn>
                <TableColumn>状态</TableColumn>
              </TableHeader>
              <TableBody items={assignments}>
                {(row) => (
                  <TableRow key={row.checkinId}>
                    <TableCell>{row.checkinId}</TableCell>
                    <TableCell>{row.pool}</TableCell>
                    <TableCell>{row.item}</TableCell>
                    <TableCell><StatusChip status={row.status} /></TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </section>
    </AppShell>
  );
}
