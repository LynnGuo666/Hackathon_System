"use client";

import Link from "next/link";
import { Card, CardHeader, Chip } from "@heroui/react";
import { ArrowRight, Coffee, Compass, IdCard, KeyRound, Mail, Settings2, UsersRound } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";

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
    href: "/admin/features",
    title: "功能模块",
    group: "体验配置",
    icon: Settings2,
  },
  {
    href: "/admin/navigation",
    title: "入口导航",
    group: "体验配置",
    icon: Compass,
  },
];

export default function AdminPage() {
  return (
    <AdminAuthGuard>
      <AppShell variant="admin">
        <section className="grid gap-5">
          <h2 className="text-2xl font-semibold">管理后台</h2>

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
