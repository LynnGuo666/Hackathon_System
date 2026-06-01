"use client";

import Link from "next/link";
import { Button, Card, CardBody, Spinner } from "@heroui/react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { api, type NavigationLink } from "@/web/lib/api";
import { useEffect, useState } from "react";

export default function NavigationPage() {
  const [links, setLinks] = useState<NavigationLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.navigationLinks()
      .then((rows) => {
        setLinks(rows);
        setMessage("");
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "读取导航失败"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <section className="grid gap-5">
        <div>
          <p className="text-sm text-foreground/60">快捷入口</p>
          <h2 className="text-2xl font-semibold">现场导航</h2>
        </div>

        {loading && <Spinner label="正在读取导航入口" />}
        {message && <p className="text-sm text-danger">{message}</p>}

        <div className="grid gap-3 md:grid-cols-2">
          {links.map((item) => {
            const external = item.url.startsWith("http");
            return (
              <Card key={item.id} className="rounded-md">
                <CardBody className="grid gap-3">
                  <div>
                    <h3 className="font-semibold">{item.title}</h3>
                    {item.description && <p className="text-sm text-foreground/65">{item.description}</p>}
                  </div>
                  <Button
                    as={Link}
                    href={item.url}
                    color="primary"
                    variant="flat"
                    className="justify-between"
                    endContent={external ? <ExternalLink size={16} /> : <ArrowRight size={16} />}
                  >
                    进入
                  </Button>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
