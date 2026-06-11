"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Chip } from "@heroui/react";
import { BedDouble, ClipboardList, Home, LayoutDashboard, LogOut, MapPin, Settings2, SlidersHorizontal, Ticket, UserRoundPen, Utensils } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { api, type FeatureLink } from "@/web/lib/api";
import { useEffect, useState } from "react";

const participantNavItems = [
  { href: "/p/dashboard", label: "总览", icon: Home },
  { href: "/p/services", label: "赛事服务", icon: ClipboardList },
];

const featureNavIcons = {
  "/p/profile": UserRoundPen,
  "/p/accommodation": BedDouble,
  "/p/meal-order": Utensils,
  "/p/location": MapPin,
  "/p/resources": Ticket,
};

const adminNavItems = [
  { href: "/admin", label: "后台首页", icon: LayoutDashboard },
  { href: "/admin/settings", label: "比赛基础信息", icon: SlidersHorizontal },
  { href: "/admin/features", label: "功能模块", icon: Settings2 },
];

const flatAdminNavItems = adminNavItems;

export function AppShell({
  children,
  variant = "participant",
}: {
  children: React.ReactNode;
  variant?: "participant" | "admin";
}) {
  const [apiReady, setApiReady] = useState<"checking" | "online" | "offline">("checking");
  const [featureItems, setFeatureItems] = useState<FeatureLink[]>([]);
  const [eventName, setEventName] = useState("Hackathon");
  const pathname = usePathname();
  const router = useRouter();

  const participantItems = variant === "participant"
    ? uniqueByHref([
      ...participantNavItems,
      ...featureItems.map((item) => ({
        href: item.url,
        label: item.title,
        icon: featureNavIcons[item.url as keyof typeof featureNavIcons] ?? ClipboardList,
      })),
    ])
    : [];

  useEffect(() => {
    api.health()
      .then(() => setApiReady("online"))
      .catch(() => setApiReady("offline"));
    api.siteConfig()
      .then((config) => setEventName(config.eventName || "Hackathon"))
      .catch(() => setEventName("Hackathon"));
  }, []);

  useEffect(() => {
    if (variant !== "participant") {
      return;
    }
    api.featureLinks()
      .then(setFeatureItems)
      .catch(() => setFeatureItems([]));
  }, [variant]);

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-to-content">
        跳转到内容
      </a>

      <header className="sticky top-0 z-30 border-b border-divider bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs font-medium text-foreground/50">{eventName}</p>
              <h1 className="text-base font-semibold text-foreground">
                {variant === "admin" ? "管理后台" : "选手服务系统"}
              </h1>
            </div>
          </div>

          <nav aria-label={variant === "admin" ? "管理导航" : "选手导航"} className="hidden min-w-0 flex-1 flex-wrap items-center gap-1 md:flex">
            {(variant === "admin" ? flatAdminNavItems : participantItems).map((item) => {
              const Icon = item.icon;
              const active = item.href === "/admin"
                ? pathname === "/admin"
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Button
                  key={item.href}
                  as={Link}
                  href={item.href}
                  color={active ? "primary" : "default"}
                  variant={active ? "flat" : "light"}
                  size="sm"
                  startContent={<Icon size={16} />}
                >
                  {item.label}
                </Button>
              );
            })}
            {variant === "admin" && (
              <Button
                size="sm"
                variant="light"
                className="text-danger"
                startContent={<LogOut size={16} />}
                onPress={() => {
                  sessionStorage.removeItem("admin_token");
                  router.push("/admin/login");
                }}
              >
                退出登录
              </Button>
            )}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Chip
              color={apiReady === "online" ? "success" : apiReady === "offline" ? "danger" : "default"}
              variant="flat"
              size="sm"
              className="hidden sm:inline-flex"
            >
              {apiReady === "online" ? "后端在线" : apiReady === "offline" ? "后端未连接" : "检查后端"}
            </Chip>
            <Chip
              color={apiReady === "online" ? "success" : apiReady === "offline" ? "danger" : "default"}
              variant="dot"
              size="sm"
              className="sm:hidden"
            >
              {apiReady === "online" ? "在线" : apiReady === "offline" ? "离线" : "..."}
            </Chip>
            <ThemeToggle />
          </div>
        </div>

        <nav aria-label={variant === "admin" ? "管理导航" : "选手导航"} className="flex flex-wrap items-center gap-1 border-t border-divider px-5 py-2 md:hidden">
          {(variant === "admin" ? flatAdminNavItems : participantItems).map((item) => {
            const Icon = item.icon;
            const active = item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Button
                key={item.href}
                as={Link}
                href={item.href}
                color={active ? "primary" : "default"}
                variant={active ? "flat" : "light"}
                size="sm"
                startContent={<Icon size={14} />}
              >
                {item.label}
              </Button>
            );
          })}
          {variant === "admin" && (
            <Button
              size="sm"
              variant="light"
              className="text-danger"
              startContent={<LogOut size={14} />}
              onPress={() => {
                sessionStorage.removeItem("admin_token");
                router.push("/admin/login");
              }}
            >
              退出
            </Button>
          )}
        </nav>
      </header>

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-7xl px-5 py-5">
        {children}
      </main>
    </div>
  );
}

function uniqueByHref<T extends { href: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.href)) {
      return false;
    }
    seen.add(item.href);
    return true;
  });
}
