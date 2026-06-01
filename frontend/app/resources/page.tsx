"use client";

import { Button, Card, CardBody, CardHeader, Input } from "@heroui/react";
import { Copy } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { resources } from "@/web/lib/mock-data";
import { StatusChip } from "@/components/status-chip";

export default function ResourcesPage() {
  return (
    <AppShell>
      <section className="grid gap-5">
        <div>
          <p className="text-sm text-ink/60">唯一资源</p>
          <h2 className="text-2xl font-semibold">我的兑换码与领取凭证</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {resources.map((resource) => (
            <Card key={resource.name} className="rounded-md">
              <CardHeader className="justify-between">
                <h3 className="font-semibold">{resource.name}</h3>
                <StatusChip status={resource.status === "已发放" ? "fulfilled" : "pending"} />
              </CardHeader>
              <CardBody className="gap-3">
                <Input label="兑换码" value={resource.code} readOnly />
                <div className="flex items-center justify-between">
                  <p className="text-sm text-ink/60">有效期：{resource.expiresAt}</p>
                  <Button size="sm" variant="flat" startContent={<Copy size={16} />}>复制</Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
