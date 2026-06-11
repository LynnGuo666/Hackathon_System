"use client";

import Link from "next/link";
import { Button, Card, CardBody, Spinner } from "@heroui/react";
import { ArrowRight, ClipboardList, ExternalLink, LogIn, MapPin } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Countdown } from "@/components/countdown";
import { api, type FeatureLink, type NavigationLink, type SiteConfig } from "@/web/lib/api";
import { useEffect, useState } from "react";

const sectionIcons: Record<string, typeof ClipboardList> = {
  "功能办理": ClipboardList,
  "赛事导航": MapPin,
};

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

        {!loading && features.length > 0 && (
          <HomeEntrySection title="功能办理" actionLabel="去办理" entries={features} />
        )}

        {!loading && links.length > 0 && (
          <HomeEntrySection title="赛事导航" actionLabel="查看" entries={links} />
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

function HomeEntrySection({
  title,
  actionLabel,
  entries,
}: {
  title: string;
  actionLabel: string;
  entries: Array<FeatureLink | NavigationLink>;
}) {
  const Icon = sectionIcons[title] ?? ClipboardList;
  return (
    <section className="grid w-full gap-4">
      <div className="flex items-center gap-2">
        <Icon size={18} className="text-foreground/40" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((item) => {
          const external = item.url.startsWith("http");
          return (
            <Card
              key={item.id}
              isPressable
              classNames={{ base: "rounded-md transition-shadow hover:shadow-md" }}
            >
              <CardBody className="grid gap-3 p-4">
                <div className="grid gap-1">
                  <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                  {item.description && (
                    <p className="text-xs leading-relaxed text-foreground/50">{item.description}</p>
                  )}
                </div>
                <Button
                  as={Link}
                  href={item.url}
                  color="primary"
                  variant="flat"
                  size="sm"
                  className="justify-between"
                  endContent={external ? <ExternalLink size={14} /> : <ArrowRight size={14} />}
                >
                  {actionLabel}
                </Button>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
