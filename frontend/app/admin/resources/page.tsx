"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { ArrowRight, Plus, RefreshCw } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { StatusChip } from "@/components/status-chip";
import { errorText, notify } from "@/components/toast";
import { api, type ResourceItem, type ResourcePool } from "@/web/lib/api";

type PoolStats = {
  total: number;
  available: number;
  assigned: number;
};

const typeLabels: Record<string, string> = {
  code: "Key",
  link: "链接",
  credential: "凭证",
  physical: "实体物资",
};

const distributionLabels: Record<string, string> = {
  one_per_participant: "每人一次",
  role_based: "按角色",
  manual: "手动发放",
};

const phaseLabels: Record<string, string> = {
  pre_event: "赛前",
  in_event: "赛中",
  all: "全阶段",
};

export default function AdminResourcesPage() {
  const [name, setName] = useState("");
  const [type, setType] = useState("code");
  const [allowMultipleClaims, setAllowMultipleClaims] = useState(false);
  const [pools, setPools] = useState<ResourcePool[]>([]);
  const [itemsByPool, setItemsByPool] = useState<Record<string, ResourceItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const statsByPool = useMemo(() => {
    return Object.fromEntries(
      pools.map((pool) => {
        const items = itemsByPool[pool.id] ?? [];
        const stats: PoolStats = {
          total: items.length,
          available: items.filter((item) => item.status === "available").length,
          assigned: items.filter((item) => item.status === "assigned" || item.status === "used").length,
        };
        return [pool.id, stats];
      }),
    );
  }, [itemsByPool, pools]);

  async function refresh() {
    setListLoading(true);
    setLoadError("");
    try {
      const nextPools = await api.pools();
      setPools(nextPools);
      const entries = await Promise.all(
        nextPools.map(async (pool) => [pool.id, await api.resourceItems(pool.id)] as const),
      );
      setItemsByPool(Object.fromEntries(entries));
    } catch (error) {
      const message = errorText(error, "读取资源池失败");
      setLoadError(message);
      notify.error(message);
    } finally {
      setListLoading(false);
    }
  }

  async function createPool() {
    if (!name.trim()) {
      notify.error("请先填写资源名称");
      return;
    }
    setLoading(true);
    try {
      const pool = await api.createPool({
        name: name.trim(),
        type: type.trim() || "code",
        allowMultipleClaims,
      });
      notify.success(`已创建资源池：${pool.name}`);
      setName("");
      setType("code");
      setAllowMultipleClaims(false);
      await refresh();
    } catch (error) {
      notify.error(errorText(error, "创建失败"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AdminAuthGuard>
      <AppShell variant="admin">
        <section className="grid gap-5">
          <div>
            <h2 className="text-2xl font-semibold">资源条目</h2>
          </div>

          <Card className="rounded-md">
            <CardHeader>
              <h3 className="font-semibold">创建资源条目</h3>
            </CardHeader>
            <CardBody className="grid gap-3 md:grid-cols-[1fr_180px]">
              <Input label="资源名称" placeholder="AI 工具兑换码" value={name} onValueChange={setName} />
              <Input label="类型" placeholder="code / link / credential" value={type} onValueChange={setType} />
              <Switch className="md:col-span-2" isSelected={allowMultipleClaims} onValueChange={setAllowMultipleClaims}>
                允许同一选手多次申请/发放
              </Switch>
              <div className="flex gap-2 md:col-span-2">
                <Button color="primary" startContent={<Plus size={16} />} isLoading={loading} onPress={createPool}>
                  创建条目
                </Button>
                <Button variant="flat" startContent={<RefreshCw size={16} />} isLoading={listLoading} onPress={refresh}>
                  刷新
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card className="rounded-md">
            <CardHeader className="justify-between gap-4">
              <h3 className="font-semibold">已建立条目</h3>
              <Chip variant="flat">{pools.length} 个条目</Chip>
            </CardHeader>
            <CardBody>
              <Table aria-label="资源条目列表">
                <TableHeader>
                  <TableColumn>名称</TableColumn>
                  <TableColumn>类型</TableColumn>
                  <TableColumn>规则</TableColumn>
                  <TableColumn>阶段</TableColumn>
                  <TableColumn>库存</TableColumn>
                  <TableColumn>重复申请</TableColumn>
                  <TableColumn>状态</TableColumn>
                  <TableColumn>创建时间</TableColumn>
                  <TableColumn>操作</TableColumn>
                </TableHeader>
                <TableBody
                  items={pools}
                  isLoading={listLoading}
                  loadingContent={<Spinner size="sm" label="正在读取资源条目..." />}
                  emptyContent={loadError || "暂无资源条目"}
                >
                  {(row) => {
                    const stats = statsByPool[row.id] ?? { total: 0, available: 0, assigned: 0 };
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{row.name}</p>
                            <p className="text-xs text-foreground/45">{row.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>{typeLabels[row.type] ?? row.type}</TableCell>
                        <TableCell>{distributionLabels[row.distributionRule] ?? row.distributionRule}</TableCell>
                        <TableCell>{phaseLabels[row.visiblePhase] ?? row.visiblePhase}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Chip size="sm" variant="flat">未使用 {stats.available}</Chip>
                            <Chip size="sm" variant="flat">已发放 {stats.assigned}</Chip>
                            <Chip size="sm" variant="flat">总数 {stats.total}</Chip>
                          </div>
                        </TableCell>
                        <TableCell>{row.allowMultipleClaims ? "允许" : "不允许"}</TableCell>
                        <TableCell><StatusChip status={row.enabled ? "active" : "disabled"} /></TableCell>
                        <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                        <TableCell>
                          <Button
                            as={Link}
                            href={`/admin/resources/${encodeURIComponent(row.id)}`}
                            size="sm"
                            variant="flat"
                            endContent={<ArrowRight size={15} />}
                          >
                            管理
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  }}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        </section>
      </AppShell>
    </AdminAuthGuard>
  );
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", { hour12: false });
}
