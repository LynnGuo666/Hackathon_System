"use client";

import Link from "next/link";
import { Button, Card, CardBody, Spinner } from "@heroui/react";
import { ArrowRight, ExternalLink, LogIn } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Countdown } from "@/components/countdown";
import { api, type FeatureLink, type NavigationLink, type SiteConfig } from "@/web/lib/api";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [features, setFeatures] = useState<FeatureLink[]>([]);
  const [links, setLinks] = useState<NavigationLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.siteConfig().catch(() => null),
      api.featureLinks().catch(() => []),
      api.navigationLinks().catch(() => []),
    ]).then(([cfg, featureRows, navLinks]) => {
      setConfig(cfg);
      setFeatures(featureRows);
      setLinks(navLinks);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen">
      <header className="border-b border-divider bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
          <div>
            <p className="text-xs font-medium text-foreground/50">欢迎参加</p>
            <p className="text-sm font-semibold text-foreground/80">{config?.eventName || "Hackathon"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button as={Link} href="/login" color="primary" size="sm" startContent={<LogIn size={16} />}>
              进入
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-5xl flex-col items-center gap-12 px-5 py-20">
        {loading && (
          <div className="flex flex-col items-center gap-3">
            <Spinner label="加载中" />
          </div>
        )}

        {!loading && config?.countdownEnabled && config.countdownStages.length > 0 && (
          <Countdown eventName={config.eventName} stages={config.countdownStages} />
        )}

        {!loading && (features.length > 0 || links.length > 0) && (
          <HomeEntryLinks features={features} links={links} />
        )}

        {!loading && !config?.countdownEnabled && features.length === 0 && links.length === 0 && (
          <div className="grid gap-6 text-center">
            <div className="grid gap-2">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">黑客松服务系统</h1>
              <p className="text-sm text-foreground/50">欢迎来到黑客松服务系统</p>
            </div>
            <div className="flex justify-center">
              <Button as={Link} href="/login" color="primary" size="lg" startContent={<LogIn size={18} />}>
                进入系统
              </Button>
            </div>
          </div>
        )}
      </section>

      <footer className="border-t border-divider py-6 text-center">
        <p className="text-xs text-foreground/30">Hackathon Service System</p>
      </footer>
    </main>
  );
}

function HomeEntryLinks({
  features,
  links,
}: {
  features: FeatureLink[];
  links: NavigationLink[];
}) {
  const allItems: Array<{ item: FeatureLink | NavigationLink; actionLabel: string }> = [
    ...features.map((item) => ({ item, actionLabel: "去办理" })),
    ...links.map((item) => ({ item, actionLabel: "查看" })),
  ];

  return (
    <Card classNames={{ base: "w-full rounded-card" }}>
      <CardBody className="grid gap-1 p-0">
        {allItems.map(({ item, actionLabel }, index) => {
          const external = item.url.startsWith("http");
          return (
            <Link
              key={item.id}
              href={item.url}
              className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-content2 ${
                index !== allItems.length - 1 ? "border-b border-divider" : ""
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-foreground/45">{item.description}</p>
                )}
              </div>
              <span className="flex shrink-0 items-center gap-1 text-xs text-primary">
                {actionLabel}
                {external ? <ExternalLink size={12} /> : <ArrowRight size={12} />}
              </span>
            </Link>
          );
        })}
      </CardBody>
    </Card>
  );
}
