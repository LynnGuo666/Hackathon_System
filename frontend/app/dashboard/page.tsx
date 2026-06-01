"use client";

import { Button, Card, CardBody, CardHeader, Chip, Divider, Spinner } from "@heroui/react";
import { AppShell } from "@/components/app-shell";
import { api, type Participant } from "@/web/lib/api";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.me()
      .then(setParticipant)
      .catch((err) => setError(err instanceof Error ? err.message : "无法读取身份信息"));
  }, []);

  return (
    <AppShell>
      <section className="grid gap-5">
        <div>
          <p className="text-sm text-foreground/60">当前身份</p>
          <h2 className="text-2xl font-semibold">赛前需求工作台</h2>
        </div>

        {error && (
          <Card className="rounded-md">
            <CardBody className="gap-3">
              <p className="text-sm text-danger">{error}</p>
              <Button as={Link} href="/login" color="primary" className="w-fit">去登录</Button>
            </CardBody>
          </Card>
        )}

        {!participant && !error && <Spinner label="正在读取后端身份信息" />}

        {participant && (
          <Card className="rounded-md">
            <CardBody className="grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-sm text-foreground/60">邮箱</p>
                <p className="font-medium">{participant.email}</p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">CheckinID</p>
                <p className="font-medium">{participant.checkinId || "现场签到后绑定"}</p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">状态</p>
                <Chip color={participant.status === "active" ? "success" : "warning"} variant="flat">
                  {participant.status}
                </Chip>
              </div>
            </CardBody>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            ["邮箱身份", participant ? "已验证" : "未登录"],
            ["签到身份", participant?.checkinId ? "已绑定" : "待绑定"],
            ["资源领取", participant?.checkinId ? "可领取" : "签到后开放"],
          ].map(([title, status]) => (
            <Card key={title} className="rounded-md">
              <CardHeader className="justify-between">
                <h3 className="font-semibold">{title}</h3>
                <Chip size="sm" variant="flat">{status}</Chip>
              </CardHeader>
              <Divider />
              <CardBody>
                <p className="text-sm text-foreground/65">状态来自后端身份与资源接口。</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
