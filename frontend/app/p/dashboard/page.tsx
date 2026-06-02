"use client";

import Link from "next/link";
import { Button, Card, CardBody, Chip, Spinner } from "@heroui/react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Countdown } from "@/components/countdown";
import { api, type Participant, type SiteConfig, type NavigationLink } from "@/web/lib/api";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [links, setLinks] = useState<NavigationLink[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.me().catch((err) => { setError(err instanceof Error ? err.message : "无法读取身份信息"); return null; }),
      api.siteConfig().catch(() => null),
      api.navigationLinks().catch(() => []),
    ]).then(([p, cfg, navLinks]) => {
      setParticipant(p);
      setConfig(cfg);
      setLinks(navLinks);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm text-foreground/60">总览</p>
        <h2 className="text-2xl font-semibold">选手服务系统</h2>
      </div>

      {loading && <Spinner label="加载中" />}

      {error && (
        <Card className="rounded-md border-danger">
          <CardBody className="flex-row items-center justify-between gap-3">
            <p className="text-sm text-danger">{error}</p>
            <Button as={Link} href="/login" color="primary" size="sm">去登录</Button>
          </CardBody>
        </Card>
      )}

      {/* 倒计时卡片 */}
      {!loading && config?.countdownEnabled && config.countdownEnd && (
        <Card className="rounded-md">
          <CardBody className="flex items-center justify-center py-6">
            <Countdown endISO={config.countdownEnd} title={config.countdownTitle} />
          </CardBody>
        </Card>
      )}

      {/* 身份信息 */}
      {participant && (
        <Card className="rounded-md">
          <CardBody className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-1">
              <p className="text-xs text-foreground/50">邮箱</p>
              <p className="font-medium">{participant.email}</p>
            </div>
            <div className="grid gap-1">
              <p className="text-xs text-foreground/50">CheckinID</p>
              <p className="font-medium">{participant.checkinId || "待现场签到后绑定"}</p>
            </div>
            <div className="grid gap-1">
              <p className="text-xs text-foreground/50">状态</p>
              <Chip size="sm" color={participant.status === "active" ? "success" : "warning"} variant="flat">
                {participant.status === "active" ? "已激活" : "待签到"}
              </Chip>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 状态总览 */}
      {participant && (
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "邮箱验证", value: "已通过", ok: true },
            { label: "签到绑定", value: participant.checkinId ? "已绑定" : "待绑定", ok: !!participant.checkinId },
            { label: "资源领取", value: participant.checkinId ? "可领取" : "签到后开放", ok: !!participant.checkinId },
          ].map((item) => (
            <Card key={item.label} className="rounded-md">
              <CardBody className="grid gap-1">
                <p className="text-xs text-foreground/50">{item.label}</p>
                <Chip size="sm" color={item.ok ? "success" : "warning"} variant="flat">{item.value}</Chip>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
