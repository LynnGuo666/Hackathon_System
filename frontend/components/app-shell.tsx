"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Chip } from "@heroui/react";
import { BedDouble, ClipboardList, Home, LayoutDashboard, LogOut, MapPin, Settings2, Ticket, UserRoundPen, Utensils } from "lucide-react";
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
      <header className="sticky top-0 z-20 border-b border-divider bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3">
          <div className="shrink-0">
            <p className="text-sm text-foreground/60">Hackathon</p>
            <h1 className="text-lg font-semibold text-foreground">
              {variant === "admin" ? "管理后台" : "选手服务系统"}
            </h1>
          </div>

          {variant === "admin" && (
            <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {flatAdminNavItems.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith("/admin") && pathname !== "/admin";
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
            </nav>
          )}

          <div className="flex shrink-0 items-center gap-3">
            <Chip color={apiReady === "online" ? "success" : apiReady === "offline" ? "danger" : "default"} variant="flat">
              {apiReady === "online" ? "后端在线" : apiReady === "offline" ? "后端未连接" : "检查后端"}
            </Chip>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className={`mx-auto grid max-w-7xl grid-cols-1 gap-5 px-5 py-5 ${variant === "admin" ? "" : "lg:grid-cols-[220px_1fr]"}`}>
        {variant !== "admin" && (
          <aside className="rounded-md border border-divider bg-content1 p-2 lg:sticky lg:top-24 lg:h-fit">
            <nav className="grid gap-1">
              {participantItems.map((item) => {
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
            </nav>
          </aside>
        )}
        <main>{children}</main>
      </div>
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
