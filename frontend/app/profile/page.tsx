"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, CardBody, CardHeader, Input, Textarea } from "@heroui/react";
import { Save } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { api, type ParticipantProfile } from "@/web/lib/api";

const emptyProfile: ParticipantProfile = {
  fullName: "",
  teamName: "",
  school: "",
  phone: "",
  dietaryNeeds: "",
  tshirtSize: "",
  emergencyContact: "",
  notes: "",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ParticipantProfile>(emptyProfile);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);

  useEffect(() => {
    api.profile()
      .then(setProfile)
      .catch((error) => {
        const text = error instanceof Error ? error.message : "资料尚未填写";
        if (text.includes("login required")) {
          setLoginRequired(true);
          setMessage("请先用邮箱验证码登录，再填写参赛资料。");
          return;
        }
        setMessage("资料尚未填写，请补全后保存。");
      });
  }, []);

  function updateField(key: keyof ParticipantProfile, value: string) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function saveProfile() {
    setLoading(true);
    setMessage("");
    try {
      const saved = await api.updateProfile(profile);
      setProfile(saved);
      setMessage("资料已保存。");
    } catch (error) {
      const text = error instanceof Error ? error.message : "保存失败";
      if (text.includes("login required")) {
        setLoginRequired(true);
      }
      setMessage(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <section className="grid gap-5">
        <div>
          <p className="text-sm text-foreground/60">公众填写信息</p>
          <h2 className="text-2xl font-semibold">我的参赛资料</h2>
        </div>

        <Card className="rounded-md">
          <CardHeader className="block">
            <h3 className="font-semibold">基础信息</h3>
            <p className="text-sm text-foreground/60">这些信息用于赛前联系、现场服务和物资准备。</p>
          </CardHeader>
          <CardBody className="grid gap-4 md:grid-cols-2">
            <Input label="姓名" value={profile.fullName} onValueChange={(value) => updateField("fullName", value)} isRequired />
            <Input label="团队名" value={profile.teamName} onValueChange={(value) => updateField("teamName", value)} isRequired />
            <Input label="学校 / 组织" value={profile.school} onValueChange={(value) => updateField("school", value)} isRequired />
            <Input label="手机号" value={profile.phone} onValueChange={(value) => updateField("phone", value)} isRequired />
            <Input label="衣服尺码" placeholder="S / M / L / XL" value={profile.tshirtSize} onValueChange={(value) => updateField("tshirtSize", value)} />
            <Input label="紧急联系人" value={profile.emergencyContact} onValueChange={(value) => updateField("emergencyContact", value)} />
            <Textarea className="md:col-span-2" label="饮食禁忌" value={profile.dietaryNeeds} onValueChange={(value) => updateField("dietaryNeeds", value)} />
            <Textarea className="md:col-span-2" label="备注 / 特殊需求" value={profile.notes} onValueChange={(value) => updateField("notes", value)} />
            {message && <p className="text-sm text-foreground/70 md:col-span-2">{message}</p>}
            <div className="flex gap-3 md:col-span-2">
              <Button color="primary" startContent={<Save size={16} />} isLoading={loading} onPress={saveProfile}>
                保存资料
              </Button>
              {loginRequired && (
                <Button as={Link} href="/login?next=/profile" variant="flat">
                  去登录
                </Button>
              )}
            </div>
          </CardBody>
        </Card>
      </section>
    </AppShell>
  );
}
