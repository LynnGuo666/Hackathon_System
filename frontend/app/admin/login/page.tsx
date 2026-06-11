"use client";

import { Button, Card, CardBody, CardHeader, Input } from "@heroui/react";
import { KeyRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorText, notify } from "@/components/toast";
import { api } from "@/web/lib/api";

export default function AdminLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!token.trim()) {
      notify.warning("请输入管理员令牌");
      return;
    }
    setLoading(true);
    try {
      // Test the token by calling an admin endpoint
      sessionStorage.setItem("admin_token", token.trim());
      await api.pools();
      const next = new URLSearchParams(window.location.search).get("next") || "/admin/resources";
      router.push(next.startsWith("/") && next.startsWith("/admin") ? next : "/admin/resources");
    } catch (error) {
      sessionStorage.removeItem("admin_token");
      const message = errorText(error, "验证失败，请检查令牌");
      notify.error(message.includes("admin not configured") ? "后端 ADMIN_TOKEN 未配置，请先启动带管理员令牌的后端" : message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <Card classNames={{ base: "w-full rounded-md" }}>
        <CardHeader className="block">
          <h1 className="text-2xl font-semibold">管理员登录</h1>
        </CardHeader>
        <CardBody className="gap-4">
          <Input
            label="管理员令牌"
            placeholder="请输入 ADMIN_TOKEN"
            value={token}
            onValueChange={setToken}
            startContent={<KeyRound size={16} />}
            type="password"
          />
          <Button color="primary" isLoading={loading} onPress={handleLogin}>
            登录
          </Button>
        </CardBody>
      </Card>
    </main>
  );
}
