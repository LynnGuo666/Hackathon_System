"use client";

import { Button, Card, CardBody, CardHeader, Input } from "@heroui/react";
import { Mail } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <Card className="w-full rounded-md">
        <CardHeader className="block">
          <p className="text-sm text-foreground/60">赛前入口</p>
          <h1 className="text-2xl font-semibold">邮箱验证码登录</h1>
        </CardHeader>
        <CardBody className="gap-4">
          <Input label="邮箱" placeholder="player@example.com" startContent={<Mail size={16} />} />
          <Input label="验证码" placeholder="6 位数字" />
          <Button color="primary">发送验证码</Button>
          <Button color="success">验证并进入</Button>
          <p className="text-sm text-foreground/60">
            赛前用邮箱填写需求；现场签到后，CheckinID 将成为资源发放和核销身份。
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
