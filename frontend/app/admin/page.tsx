"use client";

import Link from "next/link";
import { Card, CardBody, CardHeader, Chip } from "@heroui/react";
import { ArrowRight, Coffee, Compass, KeyRound, Mail, Settings2 } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";

const adminModules = [
  {
    href: "/admin/resources",
    title: "资源发放",
    description: "创建资源池，查看兑换码和权益发放记录。",
    group: "运营功能",
    icon: KeyRound,
  },
  {
    href: "/admin/email-outbox",
    title: "邮件队列",
    description: "查看邮件投递状态，并对失败邮件执行重试。",
    group: "运营功能",
    icon: Mail,
  },
  {
    href: "/admin/meal-orders",
    title: "餐饮补给",
    description: "管理餐食餐次、饮料补给批次和选手提交记录。",
    group: "运营功能",
    icon: Coffee,
  },
  {
    href: "/admin/features",
    title: "功能模块",
    description: "启用或禁用资料、住宿、资源、赛事地点等内置模块。",
    group: "体验配置",
    icon: Settings2,
  },
  {
    href: "/admin/navigation",
    title: "入口导航",
    description: "维护公开首页和选手端展示的快捷入口。",
    group: "体验配置",
    icon: Compass,
  },
];

export default function AdminPage() {
  return (
    <AdminAuthGuard>
      <AppShell variant="admin">
        <section className="grid gap-5">
          <div>
            <p className="text-sm text-foreground/60">admin workspace</p>
            <h2 className="text-2xl font-semibold">管理后台</h2>
            <p className="mt-1 text-sm text-foreground/60">
              左侧是后台自己的工作导航；前台入口和展示功能在体验配置里单独管理。
            </p>
          </div>

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
                  <CardBody className="pt-0 text-sm text-foreground/60">
                    {item.description}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </section>
      </AppShell>
    </AdminAuthGuard>
  );
}
