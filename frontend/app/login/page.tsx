"use client";

import { Card, CardBody, CardHeader, Tab, Tabs } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { errorText, notify } from "@/components/toast";
import { api } from "@/web/lib/api";
import { CheckinLoginForm, EmailLoginForm } from "./_components/login-forms";

// 与后端 RESEND_COOLDOWN_SECONDS 保持一致。
const RESEND_COOLDOWN_SECONDS = 60;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [checkinId, setCheckinId] = useState("");
  const [checkinEmail, setCheckinEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [walkupCheckinEnabled, setWalkupCheckinEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.siteConfig()
      .then((config) => setWalkupCheckinEnabled(config.walkupCheckinEnabled ?? false))
      .catch(() => setWalkupCheckinEnabled(false));
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  useEffect(() => {
    // 已登录用户直接访问 /login 时，自动跳转到目标页，无需再次登录。
    api.me()
      .then(() => router.replace(nextPath()))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCooldown(seconds: number) {
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    setCooldown(seconds);
    cooldownTimer.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function nextPath() {
    const next = new URLSearchParams(window.location.search).get("next") || "/p/dashboard";
    return next.startsWith("/p/") && !next.startsWith("//") ? next : "/p/dashboard";
  }

  async function sendCode() {
    setLoading(true);
    try {
      await api.sendCode(email);
      notify.success("验证码已发送（未配置邮件服务时请到后端日志查看）");
      startCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      // 后端在冷却期内返回 429，message 形如 "请 N 秒后再试"，取出剩余秒数同步倒计时。
      const message = errorText(error, "发送失败");
      const match = message.match(/(\d+)\s*秒/);
      if (match) startCooldown(Number(match[1]));
      notify.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setLoading(true);
    try {
      await api.verifyCode(email, code);
      router.push(nextPath());
    } catch (error) {
      notify.error(errorText(error, "验证失败"));
    } finally {
      setLoading(false);
    }
  }

  async function loginWithCheckin() {
    setLoading(true);
    try {
      await api.checkinLogin({
        checkinId,
        email: checkinEmail,
        fullName,
      });
      notify.success("现场签到成功");
      router.push(nextPath());
    } catch (error) {
      notify.error(errorText(error, "签到失败"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <Card classNames={{ base: "w-full rounded-card shadow-sm" }}>
        <CardHeader className="block px-6 pt-6 pb-0">
          <h1 className="text-xl font-bold text-foreground">进入系统</h1>
          <p className="mt-1 text-xs text-foreground/40">选择登录方式</p>
        </CardHeader>
        <CardBody className="gap-4 px-6 pb-6">
          <Tabs fullWidth aria-label="登录方式">
            <Tab key="email" title="邮箱">
              <EmailLoginForm
                email={email}
                code={code}
                loading={loading}
                cooldown={cooldown}
                onEmailChange={setEmail}
                onCodeChange={setCode}
                onSendCode={sendCode}
                onVerifyCode={verifyCode}
              />
            </Tab>
            {walkupCheckinEnabled && (
              <Tab key="checkin" title="CheckinID">
                <CheckinLoginForm
                  checkinId={checkinId}
                  email={checkinEmail}
                  fullName={fullName}
                  loading={loading}
                  onCheckinIdChange={setCheckinId}
                  onEmailChange={setCheckinEmail}
                  onFullNameChange={setFullName}
                  onSubmit={loginWithCheckin}
                />
              </Tab>
            )}
          </Tabs>
        </CardBody>
      </Card>
    </main>
  );
}
