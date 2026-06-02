"use client";

import { Button, Card, CardBody, CardHeader, Input } from "@heroui/react";
import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/web/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setLoading(true);
    setMessage("");
    try {
      await api.sendCode(email);
      setMessage("验证码已写入邮件队列，请在后台邮件队列中查看或等待发送。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "发送失败");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setLoading(true);
    setMessage("");
    try {
      await api.verifyCode(email, code);
      const next = new URLSearchParams(window.location.search).get("next") || "/p/dashboard";
      router.push(next.startsWith("/") ? next : "/p/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "验证失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <Card className="w-full rounded-md">
        <CardHeader className="block">
          <p className="text-sm text-foreground/60">赛前入口</p>
          <h1 className="text-2xl font-semibold">邮箱验证码登录</h1>
        </CardHeader>
        <CardBody className="gap-4">
          <Input label="邮箱" placeholder="player@example.com" value={email} onValueChange={setEmail} startContent={<Mail size={16} />} />
          <Input label="验证码" placeholder="6 位数字" value={code} onValueChange={setCode} />
          <Button color="primary" isLoading={loading} onPress={sendCode}>发送验证码</Button>
          <Button color="success" isLoading={loading} onPress={verifyCode}>验证并进入</Button>
          {message && <p className="text-sm text-foreground/70">{message}</p>}
          <p className="text-sm text-foreground/60">
            赛前用邮箱填写需求；现场签到后，CheckinID 将成为资源发放和核销身份。
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
