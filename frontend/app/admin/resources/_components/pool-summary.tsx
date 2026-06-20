import { Card, CardBody, CardHeader } from "@heroui/react";
import { DocSection } from "@/components/markdown";
import type { ResourcePool } from "@/web/lib/api";
import {
  claimModeLabels,
  formatDateTime,
  participantTagLabels,
  typeLabels,
} from "./utils";

export function PoolStatsCards({
  pool,
  stats,
}: {
  pool: ResourcePool;
  stats: { available: number; assigned: number };
}) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard label="类型" value={typeLabels[pool.type] ?? pool.type} />
      <StatCard label="未使用" value={stats.available} />
      <StatCard label="已使用" value={stats.assigned} />
      <StatCard label="重复申请" value={pool.allowMultipleClaims ? "允许" : "不允许"} />
    </div>
  );
}

export function PoolInfoCard({ pool }: { pool: ResourcePool }) {
  const hasDoc = Boolean(pool.docUrl || pool.docMarkdown);
  const allowedTagsText =
    pool.allowedTags && pool.allowedTags.length > 0
      ? pool.allowedTags.map((tag) => participantTagLabels[tag] ?? tag).join("、")
      : "不限（任何选手）";
  return (
    <Card classNames={{ base: "rounded-card" }}>
      <CardHeader>
        <h3 className="font-semibold">资源池信息</h3>
      </CardHeader>
      <CardBody className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
        <InfoItem label="启用状态" value={pool.enabled ? "启用" : "停用"} />
        <InfoItem label="领取方式" value={claimModeLabels[pool.claimMode] ?? pool.claimMode} />
        <InfoItem
          label="需审核"
          value={pool.claimMode === "admin_only" ? "—" : pool.requireReview ? "是" : "否"}
        />
        <InfoItem label="可领取角色" value={allowedTagsText} />
        <InfoItem label="创建时间" value={formatDateTime(pool.createdAt)} />
        {hasDoc && (
          <div className="md:col-span-2 xl:col-span-4">
            <p className="mb-1 text-foreground/55">说明文档</p>
            <DocSection url={pool.docUrl} markdown={pool.docMarkdown} />
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card classNames={{ base: "rounded-card" }}>
      <CardBody>
        <p className="text-sm text-foreground/60">{label}</p>
        <p className="mt-1 text-lg font-semibold">{value}</p>
      </CardBody>
    </Card>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-foreground/55">{label}</p>
      <p className="mt-1 font-medium">{value || "-"}</p>
    </div>
  );
}
