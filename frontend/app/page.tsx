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
          <p className="text-sm font-semibold text-foreground/80">{config?.eventName || "Hackathon"}</p>
          <div className="flex items-center gap-2">
            <Button as={Link} href="/login" color="primary" size="sm" startContent={<LogIn size={16} />}>
              进入
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-5 py-16">
        {loading && <Spinner label="加载中" />}

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
          <div className="grid gap-4 text-center">
            <p className="text-foreground/60">欢迎来到黑客松服务系统</p>
            <div className="flex justify-center gap-3">
              <Button as={Link} href="/login" color="primary" startContent={<LogIn size={17} />}>
                进入
              </Button>
            </div>
          </div>
        )}
      </section>
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
  return (
    <section className="grid w-full gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((item) => {
          const external = item.url.startsWith("http");
          return (
            <Card key={item.id} className="rounded-md">
              <CardBody className="grid gap-3">
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  {item.description && <p className="text-sm text-foreground/60">{item.description}</p>}
                </div>
                <Button
                  as={Link}
                  href={item.url}
                  color="primary"
                  variant="flat"
                  className="justify-between"
                  endContent={external ? <ExternalLink size={16} /> : <ArrowRight size={16} />}
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
