"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, Input } from "@heroui/react";
import { Link as LinkIcon, Loader2 } from "lucide-react";
import { api, type Participant } from "@/web/lib/api";

export default function IdentityPage() {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [checkinId, setCheckinId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.me()
      .then(setParticipant)
      .catch((err) => setMessage(err instanceof Error ? err.message : "无法读取身份信息"));
  }, []);

  async function bindCheckinId() {
    setLoading(true);
    setMessage("");
    try {
      const result = await api.bindCheckin(checkinId);
      setParticipant(result);
      setMessage("CheckinID 绑定成功");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "绑定失败");
    } finally {
      setLoading(false);
    }
  }

  const hasCheckin = participant?.checkinId;

  return (
    <section className="grid gap-5">
      <div>
        <p className="text-sm text-foreground/60">签到身份</p>
        <h2 className="text-2xl font-semibold">绑定 CheckinID</h2>
      </div>

      <Card className="rounded-md">
        <CardHeader className="block">
          <h3 className="font-semibold">当前状态</h3>
        </CardHeader>
        <CardBody className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-foreground/60">邮箱</p>
            <p className="font-medium">{participant?.email || "未登录"}</p>
          </div>
          <div>
            <p className="text-sm text-foreground/60">CheckinID</p>
            <p className="font-medium">{hasCheckin || "未绑定"}</p>
          </div>
          <div>
            <p className="text-sm text-foreground/60">状态</p>
            <Chip color={hasCheckin ? "success" : "warning"} variant="flat">
              {hasCheckin ? "已绑定" : "待绑定"}
            </Chip>
          </div>
        </CardBody>
      </Card>

      {!hasCheckin && (
        <Card className="rounded-md">
          <CardHeader className="block">
            <h3 className="font-semibold">现场绑定</h3>
            <p className="text-sm text-foreground/60">签到后输入你收到的 CheckinID 来绑定账户。</p>
          </CardHeader>
          <CardBody className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input
              label="CheckinID"
              placeholder="请输入签到时分配的 ID"
              value={checkinId}
              onValueChange={setCheckinId}
            />
            <Button
              color="primary"
              className="md:self-end"
              startContent={loading ? <Loader2 size={16} className="animate-spin" /> : <LinkIcon size={16} />}
              isLoading={loading}
              onPress={bindCheckinId}
            >
              绑定
            </Button>
          </CardBody>
        </Card>
      )}

      {message && <p className="text-sm text-foreground/70">{message}</p>}
    </section>
  );
}
