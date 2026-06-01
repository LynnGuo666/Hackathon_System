"use client";

import { Button, Card, CardBody, CardHeader, Input } from "@heroui/react";
import { AppShell } from "@/components/app-shell";
import { api } from "@/web/lib/api";
import { useState } from "react";

export default function IdentityPage() {
  const [checkinId, setCheckinId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function bindCheckin() {
    setLoading(true);
    setMessage("");
    try {
      const participant = await api.bindCheckin(checkinId);
      setMessage(`已绑定 ${participant.checkinId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "绑定失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <Card className="max-w-2xl rounded-md">
        <CardHeader className="block">
          <p className="text-sm text-foreground/60">现场签到</p>
          <h2 className="text-2xl font-semibold">绑定 CheckinID</h2>
        </CardHeader>
        <CardBody className="gap-4">
          <Input label="CheckinID" placeholder="例如 CHECKIN-001" value={checkinId} onValueChange={setCheckinId} />
          <Button color="primary" isLoading={loading} onPress={bindCheckin}>确认签到并绑定</Button>
          {message && <p className="text-sm text-foreground/70">{message}</p>}
          <p className="text-sm text-foreground/60">
            绑定后，CheckinID 会成为赛中唯一业务身份，用于 AI 兑换码、物资核销和现场操作记录。
          </p>
        </CardBody>
      </Card>
    </AppShell>
  );
}
