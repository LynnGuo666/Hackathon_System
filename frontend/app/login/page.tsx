"use client";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tab,
  Tabs,
} from "@heroui/react";
import { Hash, Link as LinkIcon, Mail, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { errorText, notify } from "@/components/toast";
import { api, type Participant } from "@/web/lib/api";

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
      const participant = await api.me();
      enter(participant);
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
      <Card className="w-full rounded-md">
        <CardHeader className="block">
          <h1 className="text-2xl font-semibold">进入系统</h1>
        </CardHeader>
        <CardBody className="gap-4">
          <Tabs fullWidth aria-label="登录方式">
            <Tab key="email" title="邮箱">
              <div className="grid gap-4 pt-4">
                <Input
                  label="邮箱"
                  placeholder="player@example.com"
                  value={email}
                  onValueChange={setEmail}
                  startContent={<Mail size={16} />}
                />
                <Input label="验证码" placeholder="6 位数字" value={code} onValueChange={setCode} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button variant="flat" isLoading={loading} onPress={sendCode}>
                    发送验证码
                  </Button>
                  <Button color="primary" isLoading={loading} onPress={verifyCode}>
                    验证进入
                  </Button>
                </div>
              </div>
            </Tab>
            <Tab key="checkin" title="CheckinID">
              <div className="grid gap-4 pt-4">
                <Input
                  label="CheckinID"
                  placeholder="000001"
                  value={checkinId}
                  onValueChange={setCheckinId}
                  startContent={<Hash size={16} />}
                />
                <Input
                  label="昵称"
                  placeholder="你的现场昵称"
                  value={fullName}
                  onValueChange={setFullName}
                  startContent={<UserRound size={16} />}
                />
                <Input
                  label="邮箱"
                  placeholder="player@example.com"
                  value={checkinEmail}
                  onValueChange={setCheckinEmail}
                  startContent={<Mail size={16} />}
                />
                <Button color="primary" isLoading={loading} onPress={loginWithCheckin}>
                  关联进入
                </Button>
              </div>
            </Tab>
          </Tabs>
        </CardBody>
      </Card>

      <Modal
        isDismissable={false}
        isKeyboardDismissDisabled
        isOpen={Boolean(bindingParticipant)}
        onOpenChange={() => {}}
      >
        <ModalContent>
          <ModalHeader className="flex items-center gap-2">
            <LinkIcon size={18} />
            绑定 CheckinID
          </ModalHeader>
          <ModalBody className="grid gap-4">
            <Input
              label="邮箱"
              value={bindingParticipant?.email ?? email}
              isReadOnly
              startContent={<Mail size={16} />}
            />
            <Input
              label="CheckinID"
              placeholder="000001"
              value={emailBindId}
              onValueChange={setEmailBindId}
              startContent={<Hash size={16} />}
            />
          </ModalBody>
          <ModalFooter>
            <Button color="primary" isLoading={bindLoading} onPress={bindAfterEmailLogin}>
              绑定进入
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </main>
  );
}
