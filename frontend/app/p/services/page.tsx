"use client";

import Link from "next/link";
import { Button, Card, CardBody, Spinner } from "@heroui/react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { api, type FeatureLink, type NavigationLink } from "@/web/lib/api";
import { useEffect, useState } from "react";

export default function ServicesPage() {
  const [features, setFeatures] = useState<FeatureLink[]>([]);
  const [links, setLinks] = useState<NavigationLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.featureLinks().catch(() => []),
      api.navigationLinks().catch(() => []),
    ]).then(([featureRows, navRows]) => {
      setFeatures(featureRows);
      setLinks(navRows);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm text-foreground/60">赛事服务</p>
        <h2 className="text-2xl font-semibold">功能办理与赛事导航</h2>
      </div>

      {loading && <Spinner label="加载中" />}

      {!loading && features.length === 0 && links.length === 0 && (
        <Card className="rounded-md">
          <CardBody className="text-sm text-foreground/60">
            暂无可用的功能或赛事导航，请稍后再来。
          </CardBody>
        </Card>
      )}

      {!loading && features.length > 0 && (
        <EntrySection title="功能办理" actionLabel="去办理" entries={features} />
      )}

      {!loading && links.length > 0 && (
        <EntrySection title="赛事导航" actionLabel="查看" entries={links} />
      )}
    </section>
  );
}

function EntrySection({
  title,
  actionLabel,
  entries,
}: {
  title: string;
  actionLabel: string;
  entries: Array<FeatureLink | NavigationLink>;
}) {
  return (
    <section className="grid gap-3">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((item) => {
          const external = item.url.startsWith("http");
          return (
            <Card key={item.id} as={Link} href={item.url} className="rounded-md transition-transform hover:scale-[1.01]">
              <CardBody className="grid gap-3">
                <div>
                  <h4 className="font-semibold">{item.title}</h4>
                  {item.description && (
                    <p className="text-sm text-foreground/60">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center justify-between text-primary text-sm">
                  <span>{actionLabel}</span>
                  {external ? <ExternalLink size={16} /> : <ArrowRight size={16} />}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
