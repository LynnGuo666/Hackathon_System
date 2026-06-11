"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Chip } from "@heroui/react";
import { BedDouble, ClipboardList, Home, LayoutDashboard, LogOut, MapPin, Menu, Settings2, SlidersHorizontal, Ticket, UserRoundPen, Utensils, X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { api, type FeatureLink } from "@/web/lib/api";
import { useEffect, useState, useCallback } from "react";

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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

  const closeMobileNav = useCallback(() => setMobileNavOpen(false), []);

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

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="skip-to-content">
        跳转到内容
      </a>

      <header className="sticky top-0 z-30 border-b border-divider bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-3">
            {variant === "participant" && (
              <Button
                isIconOnly
                variant="light"
                size="sm"
                className="lg:hidden"
                onPress={() => setMobileNavOpen(!mobileNavOpen)}
                aria-label={mobileNavOpen ? "关闭导航" : "打开导航"}
              >
                {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
              </Button>
            )}
            <div>
              <p className="text-xs font-medium text-foreground/50">{eventName}</p>
              <h1 className="text-base font-semibold text-foreground">
                {variant === "admin" ? "管理后台" : "选手服务系统"}
              </h1>
            </div>
          </div>

          {variant === "admin" && (
            <nav aria-label="管理导航" className="hidden min-w-0 flex-1 flex-wrap items-center gap-1 md:flex">
              {flatAdminNavItems.map((item) => {
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

        {variant === "admin" && (
          <nav aria-label="管理导航" className="flex flex-wrap items-center gap-1 border-t border-divider px-5 py-2 md:hidden">
            {flatAdminNavItems.map((item) => {
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
          </nav>
        )}
      </header>

      {variant !== "admin" && mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={closeMobileNav}
          aria-hidden="true"
        />
      )}

      <div className={`mx-auto grid max-w-7xl grid-cols-1 gap-5 px-5 py-5 ${variant === "admin" ? "" : "lg:grid-cols-[220px_1fr]"}`}>
        {variant !== "admin" && (
          <>
            <aside
              className={`
                rounded-md border border-divider bg-content1 p-2
                lg:sticky lg:top-24 lg:h-fit
                fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-200 ease-out
                ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}
                lg:translate-x-0 lg:static lg:z-auto
              `}
            >
              <nav aria-label="选手导航" className="grid gap-1">
                <div className="mb-2 flex items-center justify-between px-2 py-1 lg:hidden">
                  <span className="text-sm font-medium text-foreground/60">导航</span>
                  <Button isIconOnly variant="light" size="sm" onPress={closeMobileNav} aria-label="关闭导航">
                    <X size={18} />
                  </Button>
                </div>
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
          </>
        )}
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
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
