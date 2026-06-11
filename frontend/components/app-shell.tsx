"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Chip } from "@heroui/react";
import { ClipboardList } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { api, type FeatureLink } from "@/web/lib/api";
import { useEffect, useState } from "react";
import { DesktopNav } from "./navigation/desktop-nav";
import { MobileNav } from "./navigation/mobile-nav";
import {
  participantNavItems,
  adminNavItems,
  adminNavGroups,
  featureNavIcons,
} from "./navigation/nav-items";

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

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    router.push("/admin/login");
  };

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

          <DesktopNav
            items={variant === "admin" ? adminNavItems : participantItems}
            groups={variant === "admin" ? adminNavGroups : undefined}
            variant={variant}
            onLogout={variant === "admin" ? handleLogout : undefined}
          />

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
            <Chip variant="flat" size="sm" className="hidden sm:inline-flex">
              v{process.env.NEXT_PUBLIC_APP_VERSION || "0.2.0"}
            </Chip>
            <ThemeToggle />
            <MobileNav
              items={variant === "admin" ? adminNavItems : participantItems}
              groups={variant === "admin" ? adminNavGroups : undefined}
              variant={variant}
              onLogout={variant === "admin" ? handleLogout : undefined}
            />
          </div>
        </div>
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
