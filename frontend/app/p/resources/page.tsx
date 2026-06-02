"use client";

import { Button, Card, CardBody, CardHeader, Input, Spinner } from "@heroui/react";
import { Copy } from "lucide-react";
import { StatusChip } from "@/components/status-chip";
import { errorText, notify } from "@/components/toast";
import { api, type ResourceAssignment } from "@/web/lib/api";
import { useEffect, useState } from "react";

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.resources()
      .then(setResources)
      .catch((err) => notify.error(errorText(err, "无法读取资源")))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="grid gap-5">
      <div>
        <p className="text-sm text-foreground/60">唯一资源</p>
        <h2 className="text-2xl font-semibold">我的兑换码与领取凭证</h2>
      </div>
      {loading && <Spinner label="正在读取后端资源" />}
      {!loading && resources.length === 0 && (
        <Card className="rounded-md">
          <CardBody className="text-sm text-foreground/65">暂无资源发放记录。</CardBody>
        </Card>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        {resources.map((resource) => (
          <Card key={resource.id} className="rounded-md">
            <CardHeader className="justify-between">
              <h3 className="font-semibold">{resource.poolId}</h3>
              <StatusChip status={resource.status} />
            </CardHeader>
            <CardBody className="gap-3">
              <Input label="兑换码" value={resource.plainCode || "已通过邮件发放或暂不可见"} readOnly />
              <div className="flex items-center justify-between">
                <p className="text-sm text-foreground/60">创建时间：{new Date(resource.createdAt).toLocaleString()}</p>
                <Button size="sm" variant="flat" startContent={<Copy size={16} />}>复制</Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
