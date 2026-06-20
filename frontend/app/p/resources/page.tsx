"use client";

import { Button, Card, CardBody, CardHeader, Chip, Input, Spinner } from "@heroui/react";
import { Copy, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DocSection } from "@/components/markdown";
import { StatusChip } from "@/components/status-chip";
import { errorText, notify } from "@/components/toast";
import { api, type ResourceAssignment, type ResourcePool } from "@/web/lib/api";
import { resourceTypeLabels } from "@/web/lib/resource-labels";

const URL_PATTERN = /^https?:\/\//i;

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceAssignment[]>([]);
  const [pools, setPools] = useState<ResourcePool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.resources(), api.visiblePools()])
      .then(([nextResources, nextPools]) => {
        setResources(nextResources);
        setPools(nextPools);
      })
      .catch((err) => notify.error(errorText(err, "无法读取资源")))
      .finally(() => setLoading(false));
  }, []);

  // 已领取的 poolId 集合，用于说明段标注当前选手是否已领取。
  const claimedPoolIds = useMemo(
    () => new Set(resources.map((resource) => resource.poolId)),
    [resources],
  );

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

      {/* 可领取资源说明段：所有启用池的说明对所有选手一致可见 */}
      {!loading && pools.length > 0 && (
        <div className="grid gap-3">
          <h3 className="text-sm font-semibold text-foreground/70">可领取资源说明</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {pools.map((pool) => {
              const claimed = claimedPoolIds.has(pool.id);
              return (
                <Card key={pool.id} classNames={{ base: "rounded-card shadow-sm" }}>
                  <CardHeader className="items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">{pool.name}</h3>
                      <Chip size="sm" variant="flat">
                        {resourceTypeLabels[pool.type] ?? pool.type}
                      </Chip>
                    </div>
                    {claimed && <Chip size="sm" color="success" variant="flat">已领取</Chip>}
                  </CardHeader>
                  <CardBody className="grid gap-2 px-5 pb-5">
                    <DocSection url={pool.docUrl} markdown={pool.docMarkdown} />
                    {!pool.docUrl && !pool.docMarkdown && (
                      <p className="text-sm text-foreground/40">暂无说明文档。</p>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 我的凭证段 */}
      {!loading && (
        <div className="grid gap-3">
          <h3 className="text-sm font-semibold text-foreground/70">我的凭证</h3>
          {resources.length === 0 ? (
            <Card classNames={{ base: "rounded-card shadow-sm" }}>
              <CardBody className="py-8 text-center text-sm text-foreground/40">
                暂无资源发放记录。
              </CardBody>
            </Card>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {resources.map((resource) => {
                const title = resource.poolName || resource.poolId;
                const isLink = URL_PATTERN.test(resource.plainCode ?? "");
                return (
                  <Card key={resource.id} classNames={{ base: "rounded-card shadow-sm" }}>
                    <CardHeader className="items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                        {resource.poolType && (
                          <Chip size="sm" variant="flat">
                            {resourceTypeLabels[resource.poolType] ?? resource.poolType}
                          </Chip>
                        )}
                      </div>
                      <StatusChip status={resource.status} />
                    </CardHeader>
                    <CardBody className="grid gap-3 px-5 pb-5">
                      {isLink ? (
                        <Button
                          as="a"
                          href={resource.plainCode}
                          target="_blank"
                          rel="noreferrer"
                          variant="flat"
                          startContent={<ExternalLink size={14} />}
                        >
                          打开链接
                        </Button>
                      ) : (
                        <Input
                          label="兑换码"
                          value={resource.plainCode || "已通过邮件发放或暂不可见"}
                          readOnly
                          size="sm"
                        />
                      )}
                      <DocSection url={resource.itemDocUrl} markdown={resource.itemDocMarkdown} />
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
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
