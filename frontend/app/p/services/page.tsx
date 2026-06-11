"use client";

import Link from "next/link";
import { Button, Card, CardBody, Spinner } from "@heroui/react";
import { ArrowRight, ClipboardList, ExternalLink, MapPin } from "lucide-react";
import { api, type FeatureLink, type NavigationLink } from "@/web/lib/api";
import { useEffect, useState } from "react";

const sectionIcons: Record<string, typeof ClipboardList> = {
  "功能办理": ClipboardList,
  "赛事导航": MapPin,
};

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
        <p className="text-xs font-medium text-foreground/40">赛事服务</p>
        <h2 className="text-xl font-bold text-foreground">功能办理与赛事导航</h2>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner label="加载中" />
        </div>
      )}

      {!loading && features.length === 0 && links.length === 0 && (
        <Card classNames={{ base: "rounded-lg shadow-sm" }}>
          <CardBody className="py-8 text-center text-sm text-foreground/40">
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
  const Icon = sectionIcons[title] ?? ClipboardList;
  return (
    <section className="grid gap-4">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-foreground/30" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-foreground/60">{title}</h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((item) => {
          const external = item.url.startsWith("http");
          return (
            <Card
              key={item.id}
              isPressable
              classNames={{ base: "rounded-lg shadow-sm transition-shadow hover:shadow-md" }}
            >
              <Link href={item.url} className="block">
                <CardBody className="grid gap-3 p-4">
                  <div className="grid gap-1">
                    <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                    {item.description && (
                      <p className="text-xs leading-relaxed text-foreground/40">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium text-primary">
                    <span>{actionLabel}</span>
                    {external ? <ExternalLink size={12} /> : <ArrowRight size={12} />}
                  </div>
                </CardBody>
              </Link>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
