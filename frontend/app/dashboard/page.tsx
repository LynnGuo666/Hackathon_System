"use client";

import { Card, CardBody, CardHeader, Chip, Divider } from "@heroui/react";
import { AppShell } from "@/components/app-shell";
import { participant, tasks } from "@/web/lib/mock-data";

export default function DashboardPage() {
  return (
    <AppShell>
      <section className="grid gap-5">
        <div>
          <p className="text-sm text-ink/60">当前身份</p>
          <h2 className="text-2xl font-semibold">赛前需求工作台</h2>
        </div>

        <Card className="rounded-md">
          <CardBody className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-sm text-ink/60">邮箱</p>
              <p className="font-medium">{participant.email}</p>
            </div>
            <div>
              <p className="text-sm text-ink/60">CheckinID</p>
              <p className="font-medium">{participant.checkinId || "现场签到后绑定"}</p>
            </div>
            <div>
              <p className="text-sm text-ink/60">状态</p>
              <Chip color="warning" variant="flat">赛前 email 身份</Chip>
            </div>
          </CardBody>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tasks.map((task) => (
            <Card key={task.title} className="rounded-md">
              <CardHeader className="justify-between">
                <h3 className="font-semibold">{task.title}</h3>
                <Chip size="sm" variant="flat">{task.status}</Chip>
              </CardHeader>
              <Divider />
              <CardBody>
                <p className="text-sm text-ink/65">审核结果和截止状态会通过邮件同步通知。</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
