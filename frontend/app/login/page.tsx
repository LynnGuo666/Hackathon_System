"use client";

import { Card, CardBody, CardHeader, Tab, Tabs } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { errorText, notify } from "@/components/toast";
import { api } from "@/web/lib/api";
import { CheckinLoginForm, EmailLoginForm } from "./_components/login-forms";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [checkinId, setCheckinId] = useState("");
  const [checkinEmail, setCheckinEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [walkupCheckinEnabled, setWalkupCheckinEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.siteConfig()
      .then((config) => setWalkupCheckinEnabled(config.walkupCheckinEnabled ?? false))
      .catch(() => setWalkupCheckinEnabled(false));
  }, []);

  function nextPath() {
    const next = new URLSearchParams(window.location.search).get("next") || "/p/dashboard";
    return next.startsWith("/p/") && !next.startsWith("//") ? next : "/p/dashboard";
  }

  async function sendCode() {
    setLoading(true);
    try {
      await api.sendCode(email);
      notify.success("验证码已发送（未配置邮件服务时请到后端日志查看）");
    } catch (error) {
      notify.error(errorText(error, "发送失败"));
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
