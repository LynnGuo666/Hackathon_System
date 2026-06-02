"use client";

import Link from "next/link";
import { Button, Card, CardBody, Spinner } from "@heroui/react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { api, type NavigationLink } from "@/web/lib/api";
import { useEffect, useState } from "react";

export default function ServicesPage() {
  const [links, setLinks] = useState<NavigationLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.navigationLinks()
      .then(setLinks)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm text-foreground/60">赛事服务</p>
        <h2 className="text-2xl font-semibold">赛事服务与快捷入口</h2>
      </div>

      {loading && <Spinner label="加载中" />}

      {!loading && links.length === 0 && (
        <Card className="rounded-md">
          <CardBody className="text-sm text-foreground/60">
            暂无可用的赛事服务入口，请稍后再来。
          </CardBody>
        </Card>
      )}

      {!loading && links.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {links.map((item) => {
            const external = item.url.startsWith("http");
            return (
              <Card key={item.id} as={Link} href={item.url} className="rounded-md transition-transform hover:scale-[1.01]">
                <CardBody className="grid gap-3">
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    {item.description && (
                      <p className="text-sm text-foreground/60">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-end text-primary text-sm">
                    {external ? <ExternalLink size={16} /> : <ArrowRight size={16} />}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
