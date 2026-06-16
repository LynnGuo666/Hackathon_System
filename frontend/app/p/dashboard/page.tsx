"use client";

import { Card, CardBody, Chip, Spinner } from "@heroui/react";
import { Check, ClipboardCheck, Clock, KeyRound } from "lucide-react";
import { Countdown } from "@/components/countdown";
import { errorText, notify } from "@/components/toast";
import { api, type Participant, type SiteConfig } from "@/web/lib/api";
import { useEffect, useState } from "react";

const statusItems = [
  {
    label: "报名",
    icon: ClipboardCheck,
    getValue: (p: Participant) => ({
      value: ["enrolled", "accepted", "checked_in", "active"].includes(p.status)
        ? "已提交"
        : "待报名",
      ok: ["enrolled", "accepted", "checked_in", "active"].includes(p.status),
    }),
  },
  {
    label: "录取",
    icon: Check,
    getValue: (p: Participant) => ({
      value: ["accepted", "checked_in", "active"].includes(p.status) ? "已通过" : "待审核",
      ok: ["accepted", "checked_in", "active"].includes(p.status),
    }),
  },
  {
    label: "现场签到",
    icon: KeyRound,
    getValue: (p: Participant) => ({
      value: ["checked_in", "active"].includes(p.status) ? "已签到" : "签到后开放",
      ok: ["checked_in", "active"].includes(p.status),
    }),
  },
];

const participantStatusLabels: Record<Participant["status"], string> = {
  pending: "待报名",
  enrolled: "已报名",
  accepted: "已录取",
  checked_in: "已签到",
  active: "已签到",
  rejected: "未通过",
  disabled: "已禁用",
};

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
                <Chip
                  size="sm"
                  color={
                    ["checked_in", "active"].includes(participant.status)
                      ? "success"
                      : participant.status === "rejected" || participant.status === "disabled"
                        ? "danger"
                        : "warning"
                  }
                  variant="flat"
                >
                  {participantStatusLabels[participant.status]}
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
