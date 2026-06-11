"use client";

import { Card, CardBody, Chip, Spinner } from "@heroui/react";
import { Check, Clock, KeyRound } from "lucide-react";
import { Countdown } from "@/components/countdown";
import { errorText, notify } from "@/components/toast";
import { api, type Participant, type SiteConfig } from "@/web/lib/api";
import { useEffect, useState } from "react";

const statusItems = [
  { label: "邮箱验证", icon: Check, getValue: () => ({ value: "已通过", ok: true }) },
  { label: "CheckinID", icon: KeyRound, getValue: (p: Participant) => ({ value: p.checkinId ? "已关联" : "待关联", ok: !!p.checkinId }) },
  { label: "资源领取", icon: Clock, getValue: (p: Participant) => ({ value: p.checkinId ? "可领取" : "关联后开放", ok: !!p.checkinId }) },
];

export default function DashboardPage() {
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.me().catch((err) => {
        notify.error(errorText(err, "无法读取身份信息"));
        return null;
      }),
      api.siteConfig().catch(() => null),
    ]).then(([p, cfg]) => {
      setParticipant(p);
      setConfig(cfg);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-xs font-medium text-foreground/40">总览</p>
        <h2 className="text-xl font-bold text-foreground">选手服务系统</h2>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner label="加载中" />
        </div>
      )}

      {!loading && config?.countdownEnabled && config.countdownStages.length > 0 && (
        <Card classNames={{ base: "rounded-card shadow-sm" }}>
          <CardBody className="flex items-center justify-center py-8">
            <Countdown eventName={config.eventName} stages={config.countdownStages} />
          </CardBody>
        </Card>
      )}

      {participant && (
        <section className="grid gap-4">
          <h3 className="text-sm font-semibold text-foreground/60">身份信息</h3>
          <Card classNames={{ base: "rounded-card shadow-sm" }}>
            <CardBody className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1">
                <p className="text-xs font-medium text-foreground/40">CheckinID</p>
                <p className="text-sm font-medium text-foreground">{participant.checkinId || "待绑定"}</p>
              </div>
              <div className="grid gap-1">
                <p className="text-xs font-medium text-foreground/40">关联邮箱</p>
                <p className="text-sm font-medium text-foreground">{participant.email}</p>
              </div>
              <div className="grid gap-1">
                <p className="text-xs font-medium text-foreground/40">状态</p>
                <Chip size="sm" color={participant.status === "active" ? "success" : "warning"} variant="flat">
                  {participant.status === "active" ? "已激活" : "待签到"}
                </Chip>
              </div>
            </CardBody>
          </Card>
        </section>
      )}

      {participant && (
        <section className="grid gap-4">
          <h3 className="text-sm font-semibold text-foreground/60">状态总览</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            {statusItems.map((item) => {
              const { value, ok } = item.getValue(participant);
              const Icon = item.icon;
              return (
                <Card key={item.label} classNames={{ base: "rounded-card shadow-sm" }}>
                  <CardBody className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <Icon size={14} className="text-foreground/30" aria-hidden="true" />
                      <p className="text-xs font-medium text-foreground/40">{item.label}</p>
                    </div>
                    <Chip size="sm" color={ok ? "success" : "warning"} variant="flat">{value}</Chip>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </section>
  );
}
