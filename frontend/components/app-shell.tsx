"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Chip } from "@heroui/react";
import { Activity, BedDouble, ClipboardList, Compass, Home, KeyRound, LayoutDashboard, LogOut, Mail, Settings2, Ticket, UserRoundPen } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { api } from "@/web/lib/api";
import { useEffect, useState } from "react";

const participantNavItems = [
  { href: "/p/dashboard", label: "总览", icon: Home },
  { href: "/p/services", label: "赛事服务", icon: ClipboardList },
  { href: "/p/profile", label: "我的资料", icon: UserRoundPen },
  { href: "/p/accommodation", label: "住宿需求", icon: BedDouble },
  { href: "/p/resources", label: "我的资源", icon: Ticket },
];

const adminNavItems = [
  {
    title: "运营功能",
    items: [
      { href: "/admin/resources", label: "资源发放", icon: KeyRound },
      { href: "/admin/email-outbox", label: "邮件队列", icon: Mail },
    ],
  },
  {
    title: "体验配置",
    items: [
      { href: "/admin/features", label: "功能入口", icon: Settings2 },
      { href: "/admin/navigation", label: "入口导航", icon: Compass },
    ],
  },
];

export function AppShell({
  children,
  variant = "participant",
}: {
  children: React.ReactNode;
  variant?: "participant" | "admin";
}) {
  const [apiReady, setApiReady] = useState<"checking" | "online" | "offline">("checking");
  const pathname = usePathname();
  const router = useRouter();
  const participantItems = variant === "participant" ? participantNavItems : [];

  useEffect(() => {
    api.health()
      .then(() => setApiReady("online"))
      .catch(() => setApiReady("offline"));
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-divider bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3">
          <div>
            <p className="text-sm text-foreground/60">Hackathon</p>
            <h1 className="text-lg font-semibold text-foreground">
              {variant === "admin" ? "管理后台" : "选手服务系统"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Chip color={apiReady === "online" ? "success" : apiReady === "offline" ? "danger" : "default"} variant="flat">
              {apiReady === "online" ? "后端在线" : apiReady === "offline" ? "后端未连接" : "检查后端"}
            </Chip>
            <div className="hidden items-center gap-2 rounded-md border border-divider bg-content1 px-3 py-2 text-sm sm:flex">
              <Activity size={16} />
              <span>API</span>
              <strong>{apiReady}</strong>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-5 px-5 py-5 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-md border border-divider bg-content1 p-2 lg:sticky lg:top-24 lg:h-fit">
          <nav className="grid gap-1">
            {variant === "admin" && (
              <Button
                as={Link}
                href="/admin"
                color={pathname === "/admin" ? "primary" : "default"}
                variant={pathname === "/admin" ? "flat" : "light"}
                className="justify-start"
                startContent={<LayoutDashboard size={17} />}
              >
                后台首页
              </Button>
            )}

            {variant === "admin" ? (
              adminNavItems.map((group) => (
                <div key={group.title} className="grid gap-1 pt-3 first:pt-1">
                  <p className="px-3 text-xs font-medium text-foreground/45">{group.title}</p>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                      <Button
                        key={item.href}
                        as={Link}
                        href={item.href}
                        color={active ? "primary" : "default"}
                        variant={active ? "flat" : "light"}
                        className="justify-start"
                        startContent={<Icon size={17} />}
                      >
                        {item.label}
                      </Button>
                    );
                  })}
                </div>
              ))
            ) : (
              participantItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Button
                    key={item.href}
                    as={Link}
                    href={item.href}
                    color={active ? "primary" : "default"}
                    variant={active ? "flat" : "light"}
                    className="justify-start"
                    startContent={<Icon size={17} />}
                  >
                    {item.label}
                  </Button>
                );
              })
            )}
            {variant === "admin" && (
              <Button
                variant="light"
                className="justify-start text-danger"
                startContent={<LogOut size={17} />}
                onPress={() => {
                  sessionStorage.removeItem("admin_token");
                  router.push("/admin/login");
                }}
              >
                退出登录
              </Button>
            )}
          </nav>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
