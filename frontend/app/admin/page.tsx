"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, Spinner } from "@heroui/react";
import { ArrowRight, Bed, Coffee, Compass, IdCard, KeyRound, Mail, RefreshCw, Settings2, SlidersHorizontal, UsersRound } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { errorText, notify } from "@/components/toast";
import { api, type AdminOverview } from "@/web/lib/api";

const adminModules = [
  {
    href: "/admin/accounts",
    title: "账号管理",
    description: "管理参赛者账号状态",
    group: "运营功能",
    icon: UsersRound,
  },
  {
    href: "/admin/checkins",
    title: "CheckinID",
    description: "生成和管理签到码",
    group: "运营功能",
    icon: IdCard,
  },
  {
    href: "/admin/resources",
    title: "资源发放",
    description: "管理资源池和发放记录",
    group: "运营功能",
    icon: KeyRound,
  },
  {
    href: "/admin/email-outbox",
    title: "邮件队列",
    description: "查看邮件发送状态",
    group: "运营功能",
    icon: Mail,
  },
  {
    href: "/admin/meal-orders",
    title: "餐饮补给",
    description: "管理餐食和饮料订单",
    group: "运营功能",
    icon: Coffee,
  },
  {
    href: "/admin/accommodation",
    title: "赛前需求",
    description: "审核住宿和装备需求",
    group: "运营功能",
    icon: Bed,
  },
  {
    href: "/admin/settings",
    title: "比赛基础信息",
    description: "赛事名称、时区、倒计时",
    group: "系统配置",
    icon: SlidersHorizontal,
  },
  {
    href: "/admin/features",
    title: "功能模块",
    description: "启用或禁用功能模块",
    group: "系统配置",
    icon: Settings2,
  },
  {
    href: "/admin/navigation",
    title: "入口导航",
    description: "管理导航链接",
    group: "系统配置",
    icon: Compass,
  },
];

export default function AdminPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  async function refresh() {
    setLoading(true);
    setLoadError("");
    try {
      setOverview(await api.adminOverview());
    } catch (error) {
      const message = errorText(error, "读取后台概览失败");
      setLoadError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AdminAuthGuard>
      <AppShell variant="admin">
        <section className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-foreground/40">管理后台</p>
              <h2 className="text-xl font-bold text-foreground">系统概览</h2>
            </div>
            <Button variant="flat" size="sm" startContent={<RefreshCw size={14} />} isLoading={loading} onPress={refresh}>
              刷新
            </Button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <Spinner label="正在读取后台概览" />
            </div>
          )}

          {!loading && loadError && (
            <Card classNames={{ base: "rounded-card shadow-sm" }}>
              <CardBody className="text-sm text-danger">{loadError}</CardBody>
            </Card>
          )}

          {!loading && overview && (
            <section className="grid gap-4">
              <h3 className="text-sm font-semibold text-foreground/60">数据概览</h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <OverviewCard
                  title="账号"
                  value={overview.participants.total}
                  details={[
                    `已激活 ${overview.participants.active}`,
                    `待处理 ${overview.participants.pending}`,
                    `禁用 ${overview.participants.disabled}`,
                    `已绑定 ${overview.participants.checkedIn}`,
                  ]}
                />
                <OverviewCard
                  title="CheckinID"
                  value={overview.checkinIds.total}
                  details={[
                    `可用 ${overview.checkinIds.available}`,
                    `已绑定 ${overview.checkinIds.bound}`,
                  ]}
                />
                <OverviewCard
                  title="资源"
                  value={overview.resources.items}
                  details={[
                    `资源池 ${overview.resources.pools}`,
                    `可用 ${overview.resources.availableItems}`,
                    `已发放 ${overview.resources.assignedItems}`,
                    `发放记录 ${overview.resources.assignments}`,
                  ]}
                />
                <OverviewCard
                  title="邮件"
                  value={overview.emails.total}
                  details={[
                    `待发送 ${overview.emails.pending}`,
                    `发送中 ${overview.emails.sending}`,
                    `已发送 ${overview.emails.sent}`,
                    `失败 ${overview.emails.failed}`,
                  ]}
                />
                <OverviewCard
                  title="餐饮"
                  value={overview.meals.mealOrders + overview.meals.drinkOrders}
                  details={[
                    `餐食订单 ${overview.meals.mealOrders}`,
                    `饮料订单 ${overview.meals.drinkOrders}`,
                    `餐食批次 ${overview.meals.mealSlots}`,
                    `饮料批次 ${overview.meals.drinkSlots}`,
                  ]}
                />
                <OverviewCard
                  title="配置"
                  value={overview.configuration.featureLinks + overview.configuration.navigationLinks}
                  details={[
                    overview.configuration.siteConfig.eventName,
                    overview.configuration.siteConfig.timezone,
                    `倒计时阶段 ${overview.configuration.siteConfig.countdownStages.length}`,
                    `功能模块 ${overview.configuration.featureLinks}`,
                    `导航入口 ${overview.configuration.navigationLinks}`,
                    overview.configuration.siteConfig.countdownEnabled ? "倒计时启用" : "倒计时停用",
                  ]}
                />
              </div>
            </section>
          )}

          <section className="grid gap-4">
            <h3 className="text-sm font-semibold text-foreground/60">功能模块</h3>
            <div className="grid gap-3 md:grid-cols-2">
              {adminModules.map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.href}
                    isPressable
                    classNames={{ base: "rounded-card shadow-sm transition-shadow hover:shadow-md" }}
                  >
                    <Link href={item.href} className="block">
                      <CardHeader className="items-start gap-3 px-4 py-3">
                        <div className="flex w-full items-center gap-3">
                          <span className="rounded-md border border-divider bg-content2 p-2">
                            <Icon size={16} className="text-foreground/60" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                            <p className="text-xs text-foreground/40">{item.description}</p>
                          </div>
                          <ArrowRight size={16} className="shrink-0 text-foreground/20" />
                        </div>
                        <Chip size="sm" variant="flat" className="ml-9">{item.group}</Chip>
                      </CardHeader>
                    </Link>
                  </Card>
                );
              })}
            </div>
          </section>
        </section>
      </AppShell>
    </AdminAuthGuard>
  );
}

function OverviewCard({ title, value, details }: { title: string; value: number; details: string[] }) {
  return (
    <Card classNames={{ base: "rounded-card shadow-sm" }}>
      <CardBody className="gap-3 p-4">
        <div>
          <p className="text-xs font-medium text-foreground/40">{title}</p>
          <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{value}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {details.map((detail) => (
            <Chip key={detail} size="sm" variant="flat" classNames={{ base: "text-xs" }}>{detail}</Chip>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
