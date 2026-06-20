"use client";

import { Button, Card, CardBody, CardHeader, Chip, Input, Spinner } from "@heroui/react";
import { Copy, ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { DocSection } from "@/components/markdown";
import { StatusChip } from "@/components/status-chip";
import { errorText, notify } from "@/components/toast";
import {
  api,
  type ResourceAssignment,
  type ResourceEligibility,
  type ResourcePool,
  type ResourceRequest,
} from "@/web/lib/api";
import {
  resourceRequestStatusLabels,
  resourceTypeLabels,
} from "@/web/lib/resource-labels";

const URL_PATTERN = /^https?:\/\//i;

const REQUEST_STATUS_COLORS: Record<string, "warning" | "success" | "danger" | "default"> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

export default function ResourcesPage() {
  const [resources, setResources] = useState<ResourceAssignment[]>([]);
  const [pools, setPools] = useState<ResourcePool[]>([]);
  const [eligibility, setEligibility] = useState<ResourceEligibility | null>(null);
  const [myRequests, setMyRequests] = useState<ResourceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  async function refresh() {
    try {
      const [nextResources, nextPools, nextEligibility, nextRequests] = await Promise.all([
        api.resources().catch(() => [] as ResourceAssignment[]),
        api.visiblePools().catch(() => [] as ResourcePool[]),
        api.myEligibility().catch(() => null),
        api.myRequests().catch(() => [] as ResourceRequest[]),
      ]);
      setResources(nextResources);
      setPools(nextPools);
      setEligibility(nextEligibility);
      setMyRequests(nextRequests);
    } catch (err) {
      notify.error(errorText(err, "无法读取资源"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const eligibilityByPool = useMemo(() => {
    const map: Record<string, ResourceEligibility["pools"][number] | undefined> = {};
    eligibility?.pools.forEach((item) => {
      map[item.poolId] = item;
    });
    return map;
  }, [eligibility]);

  const claimedPoolIds = useMemo(
    () => new Set(resources.map((resource) => resource.poolId)),
    [resources],
  );

  async function claim(pool: ResourcePool) {
    setActing(pool.id);
    try {
      await api.claimResource(pool.id);
      notify.success("领取成功，请查看「我的凭证」");
      await refresh();
    } catch (err) {
      notify.error(errorText(err, "领取失败"));
    } finally {
      setActing(null);
    }
  }

  async function apply(pool: ResourcePool) {
    setActing(pool.id);
    try {
      await api.applyResource(pool.id);
      notify.success("申请已提交，请等待审核");
      await refresh();
    } catch (err) {
      notify.error(errorText(err, "申请失败"));
    } finally {
      setActing(null);
    }
  }

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
              const elig = eligibilityByPool[pool.id];
              const claimed = elig?.alreadyClaimed ?? claimedPoolIds.has(pool.id);
              const pending = elig?.hasPendingRequest ?? false;
              const isAdminOnly = pool.claimMode === "admin_only";
              const noMatch =
                !isAdminOnly &&
                !elig?.canClaim &&
                !elig?.canApply &&
                !claimed &&
                !pending &&
                (pool.allowedTags?.length ?? 0) > 0;
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
                    {pending && <Chip size="sm" color="warning" variant="flat">申请审核中</Chip>}
                  </CardHeader>
                  <CardBody className="grid gap-2 px-5 pb-5">
                    <DocSection url={pool.docUrl} markdown={pool.docMarkdown} />
                    {!pool.docUrl && !pool.docMarkdown && (
                      <p className="text-sm text-foreground/40">暂无说明文档。</p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {elig?.canClaim && (
                        <Button
                          size="sm"
                          color="primary"
                          isLoading={acting === pool.id}
                          onPress={() => claim(pool)}
                        >
                          领取
                        </Button>
                      )}
                      {elig?.canApply && (
                        <Button
                          size="sm"
                          color="primary"
                          variant="flat"
                          isLoading={acting === pool.id}
                          onPress={() => apply(pool)}
                        >
                          申请领取
                        </Button>
                      )}
                      {isAdminOnly && (
                        <p className="text-xs text-foreground/40">该资源仅由管理员发放。</p>
                      )}
                      {noMatch && (
                        <p className="text-xs text-foreground/40">
                          当前不满足领取条件（需指定角色）。
                        </p>
                      )}
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* 我的申请段 */}
      {!loading && myRequests.length > 0 && (
        <div className="grid gap-3">
          <h3 className="text-sm font-semibold text-foreground/70">我的申请</h3>
          <div className="grid gap-3 lg:grid-cols-2">
            {myRequests.map((request) => (
              <Card key={request.id} classNames={{ base: "rounded-card shadow-sm" }}>
                <CardHeader className="items-center justify-between px-5 py-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    {request.poolName || request.poolId}
                  </h3>
                  <Chip
                    size="sm"
                    color={REQUEST_STATUS_COLORS[request.status] ?? "default"}
                    variant="flat"
                  >
                    {resourceRequestStatusLabels[request.status] ?? request.status}
                  </Chip>
                </CardHeader>
                <CardBody className="px-5 pb-5 text-sm text-foreground/60">
                  <p>提交时间：{new Date(request.createdAt).toLocaleString()}</p>
                  {request.status === "approved" && (
                    <p className="text-foreground/50">已通过审核，请到「我的凭证」查看。</p>
                  )}
                  {request.status === "rejected" && request.reviewNote && (
                    <p className="text-danger">拒绝原因：{request.reviewNote}</p>
                  )}
                </CardBody>
              </Card>
            ))}
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
