"use client";

import Link from "next/link";
import { Button, Card, CardBody, Spinner } from "@heroui/react";
import { ArrowRight, ExternalLink, LogIn, UserPlus } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Countdown } from "@/components/countdown";
import { api, type NavigationLink, type SiteConfig } from "@/web/lib/api";
import { useEffect, useState } from "react";

export default function HomePage() {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [homeLinks, setHomeLinks] = useState<NavigationLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.siteConfig().catch(() => null),
      api.navigationLinks({ home: true }).catch(() => []),
    ])
      .then(([cfg, navLinks]) => {
        setConfig(cfg);
        setHomeLinks(navLinks);
      })
      .finally(() => setLoading(false));
  }, []);

  const eventName = config?.eventName || "Hackathon";
  const showCountdown = !!config?.countdownEnabled && (config?.countdownStages?.length ?? 0) > 0;

  return (
    <main className="min-h-screen">
      <header className="border-b border-divider bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3">
          <div>
            <p className="text-xs font-medium text-foreground/50">欢迎参加</p>
            <p className="text-sm font-semibold text-foreground/80">{eventName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button as={Link} href="/login" color="primary" size="sm" startContent={<LogIn size={16} />}>
              进入
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <section className="mx-auto flex max-w-5xl flex-col items-center gap-10 px-5 pt-16 pb-10 sm:pt-20">
        {loading ? (
          <Spinner label="加载中" />
        ) : (
          <>
            <div className="grid gap-3 text-center">
              <h1 className="text-3xl font-bold text-foreground sm:text-5xl">{eventName}</h1>
              <p className="text-sm text-foreground/50 sm:text-base">黑客松服务系统</p>
            </div>

            {showCountdown && (
              <div className="w-full py-6">
                <Countdown eventName={eventName} stages={config!.countdownStages} />
              </div>
            )}

            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Button
                as={Link}
                href="/login"
                color="primary"
                size="lg"
                startContent={<LogIn size={18} />}
              >
                进入系统
              </Button>
              <Button
                as={Link}
                href="/p/enrollment"
                variant="flat"
                size="lg"
                startContent={<UserPlus size={18} />}
              >
                立即报名
              </Button>
            </div>
          </>
        )}
      </section>

      {!loading && homeLinks.length > 0 && (
        <section className="mx-auto max-w-5xl px-5 pb-20">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="text-xs font-medium text-foreground/40">相关链接</p>
              <h2 className="text-lg font-semibold text-foreground">了解更多</h2>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {homeLinks.map((link) => (
              <HomeLinkCard key={link.id} link={link} />
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-divider py-6 text-center">
        <p className="text-xs text-foreground/30">Hackathon Service System</p>
      </footer>
    </main>
  );
}

function HomeLinkCard({ link }: { link: NavigationLink }) {
  const external = link.url.startsWith("http");
  return (
    <Link
      href={link.url}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer noopener" : undefined}
      className="group block"
    >
      <Card
        classNames={{
          base: "h-full rounded-card border border-divider transition-colors hover:border-primary",
        }}
        shadow="none"
      >
        <CardBody className="flex h-full flex-col gap-2 p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              {external ? <ExternalLink size={16} /> : <ArrowRight size={16} />}
            </span>
            <ArrowRight
              size={16}
              className="text-foreground/30 transition-transform group-hover:translate-x-1 group-hover:text-primary"
            />
          </div>
          <p className="text-base font-semibold text-foreground">{link.title}</p>
          {link.description && (
            <p className="text-sm leading-relaxed text-foreground/50">{link.description}</p>
          )}
        </CardBody>
      </Card>
    </Link>
  );
}
