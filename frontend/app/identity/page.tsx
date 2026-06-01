"use client";

import { Button, Card, CardBody, CardHeader, Input } from "@heroui/react";
import { AppShell } from "@/components/app-shell";

export default function IdentityPage() {
  return (
    <AppShell>
      <Card className="max-w-2xl rounded-md">
        <CardHeader className="block">
          <p className="text-sm text-foreground/60">现场签到</p>
          <h2 className="text-2xl font-semibold">绑定 CheckinID</h2>
        </CardHeader>
        <CardBody className="gap-4">
          <Input label="CheckinID" placeholder="例如 CHECKIN-001" />
          <Button color="primary">确认签到并绑定</Button>
          <p className="text-sm text-foreground/60">
            绑定后，CheckinID 会成为赛中唯一业务身份，用于 AI 兑换码、物资核销和现场操作记录。
          </p>
        </CardBody>
      </Card>
    </AppShell>
  );
}
