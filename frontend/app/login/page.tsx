"use client";

import { Card, CardBody, CardHeader, Tab, Tabs } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorText, notify } from "@/components/toast";
import { api, type Participant } from "@/web/lib/api";
import { CheckinBindModal } from "./_components/checkin-bind-modal";
import { CheckinLoginForm, EmailLoginForm } from "./_components/login-forms";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [checkinId, setCheckinId] = useState("");
  const [checkinEmail, setCheckinEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [emailBindId, setEmailBindId] = useState("");
  const [bindingParticipant, setBindingParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const [bindLoading, setBindLoading] = useState(false);

  function nextPath() {
    const next = new URLSearchParams(window.location.search).get("next") || "/p/dashboard";
    return next.startsWith("/") ? next : "/p/dashboard";
  }

  function enter(participant?: Participant | null) {
    if (participant && !participant.checkinId) {
      setBindingParticipant(participant);
      return;
    }
    router.push(nextPath());
  }

  async function sendCode() {
    setLoading(true);
    try {
      await api.sendCode(email);
      notify.success("验证码已发送");
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
      enter(await api.me());
    } catch (error) {
      notify.error(errorText(error, "验证失败"));
    } finally {
      setLoading(false);
    }
  }

  async function bindAfterEmailLogin() {
    setBindLoading(true);
    try {
      const participant = await api.bindCheckin(emailBindId);
      notify.success("CheckinID 已绑定");
      setBindingParticipant(null);
      enter(participant);
    } catch (error) {
      notify.error(errorText(error, "绑定失败"));
    } finally {
      setBindLoading(false);
    }
  }

  async function loginWithCheckin() {
    setLoading(true);
    try {
      const participant = await api.checkinLogin({
        checkinId,
        email: checkinEmail,
        fullName,
      });
      notify.success("关联成功");
      enter(participant);
    } catch (error) {
      notify.error(errorText(error, "关联失败"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-screen max-w-md place-items-center px-5">
      <Card classNames={{ base: "w-full rounded-lg shadow-sm" }}>
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
          </Tabs>
        </CardBody>
      </Card>

      <CheckinBindModal
        participant={bindingParticipant}
        fallbackEmail={email}
        checkinId={emailBindId}
        loading={bindLoading}
        onCheckinIdChange={setEmailBindId}
        onSubmit={bindAfterEmailLogin}
      />
    </main>
  );
}
