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
    <section className="grid gap-6">
      <div>
        <p className="text-xs font-medium text-foreground/40">唯一资源</p>
        <h2 className="text-xl font-bold text-foreground">兑换码与领取凭证</h2>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner label="正在读取后端资源" />
        </div>
      )}

      {!loading && resources.length === 0 && (
        <Card classNames={{ base: "rounded-card shadow-sm" }}>
          <CardBody className="py-8 text-center text-sm text-foreground/40">
            暂无资源发放记录。
          </CardBody>
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {resources.map((resource) => (
          <Card key={resource.id} classNames={{ base: "rounded-card shadow-sm" }}>
            <CardHeader className="items-center justify-between px-5 py-3">
              <h3 className="text-sm font-semibold text-foreground">{resource.poolId}</h3>
              <StatusChip status={resource.status} />
            </CardHeader>
            <CardBody className="grid gap-3 px-5 pb-5">
              <Input
                label="兑换码"
                value={resource.plainCode || "已通过邮件发放或暂不可见"}
                readOnly
                size="sm"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-foreground/30">
                  {new Date(resource.createdAt).toLocaleString()}
                </p>
                <Button
                  size="sm"
                  variant="flat"
                  startContent={<Copy size={12} />}
                  onPress={() => {
                    if (resource.plainCode) {
                      navigator.clipboard.writeText(resource.plainCode);
                      notify.success("已复制到剪贴板");
                    }
                  }}
                >
                  复制
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
