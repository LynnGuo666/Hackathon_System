"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardBody, CardHeader, Input } from "@heroui/react";
import { Save } from "lucide-react";
import { api, type ParticipantProfile } from "@/web/lib/api";

export default function ProfilePage() {
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.profile()
      .then((profile) => setFullName(profile.fullName || ""))
      .catch(() => {
        // no existing profile
      });
  }, []);

  async function saveProfile() {
    setLoading(true);
    setMessage("");
    try {
      await api.updateProfile({
        fullName,
        teamName: "",
        school: "",
        phone: "",
        dietaryNeeds: "",
        tshirtSize: "",
        emergencyContact: "",
        notes: "",
      });
      setMessage("已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-5">
      <div>
        <p className="text-sm text-foreground/60">参赛信息</p>
        <h2 className="text-2xl font-semibold">我的参赛资料</h2>
      </div>

      <Card className="rounded-md">
        <CardHeader className="block">
          <h3 className="font-semibold">基础信息</h3>
          <p className="text-sm text-foreground/60">只需填写姓名即可完成报名。</p>
        </CardHeader>
        <CardBody className="grid gap-4">
          <Input label="姓名" value={fullName} onValueChange={setFullName} isRequired />
          {message && <p className="text-sm text-foreground/70">{message}</p>}
          <div>
            <Button color="primary" startContent={<Save size={16} />} isLoading={loading} onPress={saveProfile}>
              保存
            </Button>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
