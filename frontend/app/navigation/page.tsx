"use client";

import { Card, CardBody, CardHeader, Chip } from "@heroui/react";
import { AppShell } from "@/components/app-shell";

const navs = [
  ["签到台", "一层主入口右侧", "现场绑定 CheckinID、领取手环"],
  ["主会场", "三层 A 厅", "开幕、路演、答辩都在这里"],
  ["餐饮区", "二层连廊", "凭点餐记录领取餐食"],
];

export default function NavigationPage() {
  return (
    <AppShell>
      <section className="grid gap-4">
        <div>
          <p className="text-sm text-ink/60">后台配置</p>
          <h2 className="text-2xl font-semibold">现场导航</h2>
        </div>
        {navs.map(([title, location, detail]) => (
          <Card key={title} className="rounded-md">
            <CardHeader className="justify-between">
              <h3 className="font-semibold">{title}</h3>
              <Chip size="sm" color="primary" variant="flat">{location}</Chip>
            </CardHeader>
            <CardBody className="text-sm text-ink/70">{detail}</CardBody>
          </Card>
        ))}
      </section>
    </AppShell>
  );
}
