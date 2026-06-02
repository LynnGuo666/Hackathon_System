"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, Input } from "@heroui/react";
import { Link as LinkIcon, Save } from "lucide-react";
import { errorText, notify } from "@/components/toast";
import { api, type Participant, type ParticipantProfile } from "@/web/lib/api";

export default function ProfilePage() {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [fullName, setFullName] = useState("");
  const [checkinId, setCheckinId] = useState("");
  const [loading, setLoading] = useState(false);
  const [bindLoading, setBindLoading] = useState(false);

  useEffect(() => {
    api.me().then(setParticipant).catch(() => {});
    api.profile()
      .then((profile) => setFullName(profile.fullName || ""))
      .catch(() => {});
  }, []);

  async function saveProfile() {
    setLoading(true);
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
      notify.success("资料已保存");
    } catch (error) {
      notify.error(errorText(error, "保存失败"));
    } finally {
      setLoading(false);
    }
  }

  async function bindCheckinId() {
    setBindLoading(true);
    try {
      const result = await api.bindCheckin(checkinId);
      setParticipant(result);
      setCheckinId("");
      notify.success("CheckinID 绑定成功");
    } catch (error) {
      notify.error(errorText(error, "绑定失败"));
    } finally {
      setBindLoading(false);
    }
  }

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm text-foreground/60">参赛信息</p>
        <h2 className="text-2xl font-semibold">我的资料</h2>
      </div>

      {/* 基础信息 */}
      <Card className="rounded-md">
        <CardHeader className="block">
          <h3 className="font-semibold">基础信息</h3>
          <p className="text-sm text-foreground/60">只需填写姓名即可完成报名。</p>
        </CardHeader>
        <CardBody className="grid gap-4">
          <Input label="姓名" value={fullName} onValueChange={setFullName} isRequired />
          <div>
            <Button color="primary" startContent={<Save size={16} />} isLoading={loading} onPress={saveProfile}>
              保存
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* 签到身份 */}
      <Card className="rounded-md">
        <CardHeader className="block">
          <h3 className="font-semibold">签到身份</h3>
          <p className="text-sm text-foreground/60">现场签到后绑定 CheckinID。</p>
        </CardHeader>
        <CardBody className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <p className="text-xs text-foreground/50">邮箱</p>
              <p className="font-medium">{participant?.email || "—"}</p>
            </div>
            <div className="grid gap-1">
              <p className="text-xs text-foreground/50">CheckinID</p>
              <div className="flex items-center gap-2">
                <p className="font-medium">{participant?.checkinId || "未绑定"}</p>
                {participant?.checkinId && <Chip size="sm" color="success" variant="flat">已绑定</Chip>}
              </div>
            </div>
          </div>

          {!participant?.checkinId && (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <Input
                label="CheckinID"
                placeholder="000001"
                value={checkinId}
                onValueChange={setCheckinId}
              />
              <Button
                color="primary"
                className="sm:self-end"
                startContent={<LinkIcon size={16} />}
                isLoading={bindLoading}
                onPress={bindCheckinId}
              >
                绑定
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </section>
  );
}
