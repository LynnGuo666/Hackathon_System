"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, Input } from "@heroui/react";
import { Link as LinkIcon, Save } from "lucide-react";
import { errorText, notify } from "@/components/toast";
import { api, type Participant, type ParticipantProfile } from "@/web/lib/api";

export default function ProfilePage() {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [profile, setProfile] = useState<ParticipantProfile | null>(null);
  const [fullName, setFullName] = useState("");
  const [checkinId, setCheckinId] = useState("");
  const [loading, setLoading] = useState(false);
  const [bindLoading, setBindLoading] = useState(false);

  useEffect(() => {
    api.me().then(setParticipant).catch(() => {});
    api.profile()
      .then((profile) => {
        setProfile(profile);
        setFullName(profile.fullName || "");
      })
      .catch(() => {});
  }, []);

  async function saveProfile() {
    setLoading(true);
    try {
      const saved = await api.updateProfile({
        fullName,
        teamName: profile?.teamName ?? "",
        school: profile?.school ?? "",
        phone: profile?.phone ?? "",
        dietaryNeeds: profile?.dietaryNeeds ?? "",
        tshirtSize: profile?.tshirtSize ?? "",
        emergencyContact: profile?.emergencyContact ?? "",
        notes: profile?.notes ?? "",
      });
      setProfile(saved);
      notify.success("资料已保存");
    } catch (error) {
      notify.error(errorText(error, "保存失败"));
    } finally {
      setLoading(false);
    }
  }

  async function bindCheckinId() {
    if (participant?.status !== "accepted") {
      notify.warning("报名审核通过后才能现场签到");
      return;
    }
    setBindLoading(true);
    try {
      const result = await api.bindCheckin(checkinId);
      setParticipant(result);
      setCheckinId("");
      notify.success("现场签到成功");
    } catch (error) {
      notify.error(errorText(error, "绑定失败"));
    } finally {
      setBindLoading(false);
    }
  }

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-xs font-medium text-foreground/40">现场签到信息</p>
        <h2 className="text-xl font-bold text-foreground">我的资料</h2>
      </div>

      <Card classNames={{ base: "rounded-card shadow-sm" }}>
        <CardHeader className="block px-5 pt-5 pb-0">
          <h3 className="text-sm font-semibold text-foreground/60">昵称</h3>
        </CardHeader>
        <CardBody className="grid gap-4 px-5 pb-5">
          <Input label="昵称" value={fullName} onValueChange={setFullName} isRequired />
          <div>
            <Button color="primary" size="sm" startContent={<Save size={14} />} isLoading={loading} onPress={saveProfile}>
              保存
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card classNames={{ base: "rounded-card shadow-sm" }}>
        <CardHeader className="block px-5 pt-5 pb-0">
          <h3 className="text-sm font-semibold text-foreground/60">身份关联</h3>
        </CardHeader>
        <CardBody className="grid gap-4 px-5 pb-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1">
              <p className="text-xs font-medium text-foreground/40">CheckinID</p>
              <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-foreground">{participant?.checkinId || "未签到"}</p>
                {participant?.checkinId && <Chip size="sm" color="success" variant="flat">已签到</Chip>}
              </div>
            </div>
            <div className="grid gap-1">
              <p className="text-xs font-medium text-foreground/40">关联邮箱</p>
              <p className="text-sm font-medium text-foreground">{participant?.email || "—"}</p>
            </div>
          </div>

          {!participant?.checkinId && (
            <form
              className="grid gap-3 sm:grid-cols-[1fr_auto]"
              onSubmit={(e) => { e.preventDefault(); bindCheckinId(); }}
            >
              <Input
                label="CheckinID"
                placeholder="000000"
                value={checkinId}
                onValueChange={setCheckinId}
                autoComplete="off"
                inputMode="numeric"
                description={participant?.status === "accepted" ? "录取后可在现场输入签到码完成签到" : "报名审核通过后才能现场签到"}
                isDisabled={participant?.status !== "accepted"}
                isRequired
              />
              <Button
                color="primary"
                size="sm"
                className="sm:self-end"
                startContent={<LinkIcon size={14} />}
                isLoading={bindLoading}
                isDisabled={participant?.status !== "accepted"}
                type="submit"
              >
                签到
              </Button>
            </form>
          )}
        </CardBody>
      </Card>
    </section>
  );
}
