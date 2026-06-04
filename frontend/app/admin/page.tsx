"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, Spinner } from "@heroui/react";
import { ArrowRight, Bed, Coffee, Compass, IdCard, KeyRound, Mail, RefreshCw, Settings2, UsersRound } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { errorText, notify } from "@/components/toast";
import { api, type AdminOverview } from "@/web/lib/api";

const adminModules = [
  {
    href: "/admin/accounts",
    title: "账号管理",
    group: "运营功能",
    icon: UsersRound,
  },
  {
    href: "/admin/checkins",
    title: "CheckinID",
    group: "运营功能",
    icon: IdCard,
  },
  {
    href: "/admin/resources",
    title: "资源发放",
    group: "运营功能",
    icon: KeyRound,
  },
  {
    href: "/admin/email-outbox",
    title: "邮件队列",
    group: "运营功能",
    icon: Mail,
  },
  {
    href: "/admin/meal-orders",
    title: "餐饮补给",
    group: "运营功能",
    icon: Coffee,
  },
  {
    href: "/admin/accommodation",
    title: "赛前需求",
    group: "运营功能",
    icon: Bed,
  },
  {
    href: "/admin/features",
    title: "功能模块",
    group: "系统配置",
    icon: Settings2,
  },
  {
    href: "/admin/navigation",
    title: "入口导航",
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
        <section className="grid gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold">管理后台</h2>
            <Button variant="flat" startContent={<RefreshCw size={16} />} isLoading={loading} onPress={refresh}>
              刷新
            </Button>
          </div>

          {loading && <Spinner label="正在读取后台概览" />}

          {!loading && loadError && (
            <Card className="rounded-md">
              <CardBody className="text-sm text-danger">{loadError}</CardBody>
            </Card>
          )}

          {!loading && overview && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                  `功能模块 ${overview.configuration.featureLinks}`,
                  `导航入口 ${overview.configuration.navigationLinks}`,
                  overview.configuration.siteConfig.countdownEnabled ? "倒计时启用" : "倒计时停用",
                ]}
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {adminModules.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.href}
                  as={Link}
                  href={item.href}
                  className="rounded-md transition-transform hover:scale-[1.01]"
                >
                  <CardHeader className="justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="rounded-md border border-divider bg-content2 p-2">
                        <Icon size={18} />
                      </span>
                      <div>
                        <h3 className="font-semibold">{item.title}</h3>
                        <Chip size="sm" variant="flat">{item.group}</Chip>
                      </div>
                    </div>
                    <ArrowRight size={18} className="text-foreground/45" />
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>
      </AppShell>
    </AdminAuthGuard>
  );
}

function OverviewCard({ title, value, details }: { title: string; value: number; details: string[] }) {
  return (
    <Card className="rounded-md">
      <CardBody className="gap-3">
        <div>
          <p className="text-sm text-foreground/60">{title}</p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {details.map((detail) => (
            <Chip key={detail} size="sm" variant="flat">{detail}</Chip>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
