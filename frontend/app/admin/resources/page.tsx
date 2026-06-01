"use client";

import { Button, Card, CardBody, CardHeader, Input, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { AppShell } from "@/components/app-shell";
import { StatusChip } from "@/components/status-chip";
import { api, type ResourceAssignment } from "@/web/lib/api";
import { useEffect, useState } from "react";

export default function AdminResourcesPage() {
  const [name, setName] = useState("");
  const [type, setType] = useState("code");
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([]);
  const [message, setMessage] = useState("");

  async function refresh() {
    try {
      setAssignments(await api.assignments());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "读取发放记录失败");
    }
  }

  async function createPool() {
    setMessage("");
    try {
      const pool = await api.createPool(name, type);
      setMessage(`已创建资源池：${pool.name}`);
      setName("");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建失败");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AppShell variant="admin">
      <section className="grid gap-5">
        <div>
          <p className="text-sm text-foreground/60">resource_admin</p>
          <h2 className="text-2xl font-semibold">资源池与发放</h2>
        </div>
        <Card className="rounded-md">
          <CardHeader><h3 className="font-semibold">创建资源池</h3></CardHeader>
          <CardBody className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <Input label="资源名称" placeholder="AI 兑换码" value={name} onValueChange={setName} />
            <Input label="类型" placeholder="code / link / credential" value={type} onValueChange={setType} />
            <Button color="primary" className="self-end" onPress={createPool}>创建</Button>
            {message && <p className="text-sm text-foreground/70 md:col-span-3">{message}</p>}
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
                  <TableRow key={row.id}>
                    <TableCell>{row.checkinId}</TableCell>
                    <TableCell>{row.poolId}</TableCell>
                    <TableCell>{row.resourceItemId}</TableCell>
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
