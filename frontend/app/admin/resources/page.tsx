"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Select,
  SelectItem,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
  useDisclosure,
} from "@heroui/react";
import { ArrowLeft, ArrowRight, Pencil, PackagePlus, Plus, RefreshCw, Send } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { StatusChip } from "@/components/status-chip";
import { errorText, notify } from "@/components/toast";
import { api, type AllowedTagOption, type ResourceAssignment, type ResourceItem, type ResourcePool } from "@/web/lib/api";
import { InventoryActions, ManualAssignmentForm } from "./_components/actions";
import { ImportInventoryModal } from "./_components/import-modal";
import { InventoryTable } from "./_components/inventory-table";
import { PoolEditModal } from "./_components/pool-edit-modal";
import { PoolInfoCard, PoolStatsCards } from "./_components/pool-summary";
import { RequestsPanel } from "./_components/requests-panel";
import { resourceStats } from "./_components/utils";

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

const claimModeLabels: Record<string, string> = {
  self_claim: "自助领取",
  self_apply_review: "自助申请审核",
  admin_only: "仅管理员发放",
};

const participantTagLabels: Record<string, string> = {
  approved: "已通过审核",
  checked_in: "已签到",
};

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

export default function AdminResourcesPage() {
  return (
    <Suspense>
      <AdminResourcesContent />
    </Suspense>
  );
}

function AdminResourcesContent() {
  const searchParams = useSearchParams();
  const poolId = searchParams.get("poolId") ?? undefined;

  if (poolId) {
    return <PoolDetail poolId={poolId} />;
  }
  return <PoolList />;
}

function PoolDetail({ poolId }: { poolId: string }) {
  const [pool, setPool] = useState<ResourcePool | null>(null);
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([]);
  const [bulkValues, setBulkValues] = useState("");
  const [checkinId, setCheckinId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const { isOpen: isImportOpen, onOpen: openImport, onOpenChange: onImportOpenChange } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: openEdit, onOpenChange: onEditOpenChange } = useDisclosure();

  const stats = useMemo(() => resourceStats(items), [items]);

  const assignmentByItem = useMemo(() => {
    return Object.fromEntries(assignments.map((assignment) => [assignment.resourceItemId, assignment]));
  }, [assignments]);

  async function refresh() {
    setLoading(true);
    setLoadError("");
    try {
      const [nextPool, nextItems, nextAssignments] = await Promise.all([
        api.pool(poolId),
        api.resourceItems(poolId),
        api.assignments(poolId),
      ]);
      setPool(nextPool);
      setItems(nextItems);
      setAssignments(nextAssignments);
    } catch (error) {
      const message = errorText(error, "读取资源条目失败");
      setLoadError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function importItems() {
    const values = bulkValues
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (values.length === 0) {
      notify.error("请先输入至少一行 Key 或链接");
      return;
    }
    setSaving(true);
    try {
      const imported = await api.importResourceItems(poolId, values);
      notify.success(`已导入 ${imported.length} 条资源`);
      setBulkValues("");
      onImportOpenChange();
      await refresh();
    } catch (error) {
      notify.error(errorText(error, "导入失败"));
    } finally {
      setSaving(false);
    }
  }

  async function approveAssignment() {
    if (!checkinId.trim()) {
      notify.error("请填写选手 CheckinID");
      return;
    }
    setSaving(true);
    try {
      await api.assignResource(poolId, checkinId.trim());
      notify.success("已批准并发放资源");
      setCheckinId("");
      await refresh();
    } catch (error) {
      notify.error(errorText(error, "发放失败"));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [poolId]);

  return (
    <AppShell variant="admin">
      <section className="grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Button
              as={Link}
              href="/admin/resources"
              size="sm"
              variant="light"
              className="mb-2 px-0"
              startContent={<ArrowLeft size={16} />}
            >
              返回资源条目
            </Button>
            <h2 className="text-2xl font-semibold">{pool?.name ?? "资源条目"}</h2>
          </div>
          <div className="flex gap-2">
            {pool && (
              <Button variant="flat" startContent={<Pencil size={16} />} onPress={openEdit}>
                编辑信息
              </Button>
            )}
            <Button variant="flat" startContent={<RefreshCw size={16} />} isLoading={loading} onPress={refresh}>
              刷新
            </Button>
          </div>
        </div>

        {loading && <Spinner label="正在读取资源详情" />}

        {!loading && loadError && (
          <Card classNames={{ base: "rounded-card" }}>
            <CardBody className="text-sm text-danger">{loadError}</CardBody>
          </Card>
        )}

        {!loading && pool && (
          <>
            <PoolStatsCards pool={pool} stats={stats} />
            <PoolInfoCard pool={pool} />

            <div className="grid gap-5 xl:grid-cols-2">
              <InventoryActions onOpenImport={openImport} />
              <ManualAssignmentForm
                checkinId={checkinId}
                saving={saving}
                onCheckinIdChange={setCheckinId}
                onAssign={approveAssignment}
              />
            </div>

            <ImportInventoryModal
              isOpen={isImportOpen}
              values={bulkValues}
              saving={saving}
              onOpenChange={onImportOpenChange}
              onValuesChange={setBulkValues}
              onImport={importItems}
            />

            {pool && (
              <PoolEditModal
                isOpen={isEditOpen}
                pool={pool}
                onOpenChange={onEditOpenChange}
                onSaved={(updated) => {
                  setPool(updated);
                  onEditOpenChange();
                }}
              />
            )}

            <InventoryTable
              items={items}
              assignmentByItem={assignmentByItem}
              total={stats.total}
              onItemUpdated={(updated) =>
                setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
              }
            />

            <RequestsPanel poolId={poolId} />
          </>
        )}

        {!loading && !loadError && !pool && (
          <Card classNames={{ base: "rounded-card" }}>
            <CardBody className="text-sm text-foreground/65">
              未找到资源条目，请从资源条目列表进入详情页。
            </CardBody>
          </Card>
        )}
      </section>
    </AppShell>
  );
}

function PoolList() {
  const [name, setName] = useState("");
  const [type, setType] = useState("code");
  const [claimMode, setClaimMode] = useState("self_claim");
  const [requireReview, setRequireReview] = useState(false);
  const [allowedTags, setAllowedTags] = useState<string[]>([]);
  const [tagOptions, setTagOptions] = useState<AllowedTagOption[]>([]);
  const [allowMultipleClaims, setAllowMultipleClaims] = useState(false);
  const [docUrl, setDocUrl] = useState("");
  const [docMarkdown, setDocMarkdown] = useState("");
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
        type,
        claimMode,
        requireReview: claimMode === "self_apply_review" ? true : requireReview,
        allowedTags,
        allowMultipleClaims,
        docUrl: docUrl.trim(),
        docMarkdown,
      });
      notify.success(`已创建资源池：${pool.name}`);
      setName("");
      setType("code");
      setClaimMode("self_claim");
      setRequireReview(false);
      setAllowedTags([]);
      setAllowMultipleClaims(false);
      setDocUrl("");
      setDocMarkdown("");
      await refresh();
    } catch (error) {
      notify.error(errorText(error, "创建失败"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    api.allowedTagOptions().then(setTagOptions).catch(() => setTagOptions([]));
  }, []);

  return (
    <AppShell variant="admin">
      <section className="grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-foreground/40">运营功能</p>
            <h2 className="text-xl font-bold text-foreground">资源条目</h2>
          </div>
          <Button size="sm" variant="flat" startContent={<RefreshCw size={16} />} isLoading={listLoading} onPress={refresh}>
            刷新
          </Button>
        </div>

        <Card classNames={{ base: "rounded-card" }}>
          <CardHeader>
            <h3 className="font-semibold">创建资源条目</h3>
          </CardHeader>
          <CardBody className="grid gap-3 md:grid-cols-[1fr_180px]">
            <Input label="资源名称" placeholder="AI 工具兑换码" value={name} onValueChange={setName} />
            <Select
              label="类型"
              selectedKeys={[type]}
              onSelectionChange={(keys) => setType(String(Array.from(keys)[0] ?? "code"))}
            >
              {Object.entries(typeLabels).map(([value, label]) => (
                <SelectItem key={value}>{label}</SelectItem>
              ))}
            </Select>
            <Select
              label="领取方式"
              selectedKeys={[claimMode]}
              onSelectionChange={(keys) => {
                const next = String(Array.from(keys)[0] ?? "self_claim");
                setClaimMode(next);
                if (next === "self_apply_review") setRequireReview(true);
                if (next === "admin_only") setRequireReview(false);
              }}
            >
              {Object.entries(claimModeLabels).map(([value, label]) => (
                <SelectItem key={value}>{label}</SelectItem>
              ))}
            </Select>
            <Select
              label="可领取角色（白名单）"
              selectionMode="multiple"
              selectedKeys={new Set(allowedTags)}
              onSelectionChange={(keys) => setAllowedTags(Array.from(keys).map(String))}
              description="空 = 任何登录选手可领"
            >
              {tagOptions.map((option) => (
                <SelectItem key={option.tag} isDisabled={!option.systemEnabled}>
                  {participantTagLabels[option.tag] ?? option.tag}
                  {!option.systemEnabled ? "（系统未开启）" : ""}
                </SelectItem>
              ))}
            </Select>
            {claimMode !== "admin_only" && (
              <Switch
                isDisabled={claimMode === "self_apply_review"}
                isSelected={claimMode === "self_apply_review" ? true : requireReview}
                onValueChange={setRequireReview}
              >
                {claimMode === "self_apply_review" ? "需审核（申请方式已锁定）" : "领取需审核"}
              </Switch>
            )}
            <Switch className="md:col-span-2" isSelected={allowMultipleClaims} onValueChange={setAllowMultipleClaims}>
              允许同一选手多次申请/发放
            </Switch>
            <Input
              className="md:col-span-2"
              label="说明文档链接"
              placeholder="https://..."
              value={docUrl}
              onValueChange={setDocUrl}
            />
            <Textarea
              className="md:col-span-2"
              label="说明文档（Markdown）"
              minRows={6}
              placeholder={"# 标题\n- 列表项\n`代码`"}
              value={docMarkdown}
              onValueChange={setDocMarkdown}
            />
            <div className="flex gap-2 md:col-span-2">
              <Button color="primary" startContent={<Plus size={16} />} isLoading={loading} onPress={createPool}>
                创建条目
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card classNames={{ base: "rounded-card" }}>
          <CardHeader className="justify-between gap-4">
            <h3 className="font-semibold">已建立条目</h3>
            <Chip variant="flat">{pools.length} 个条目</Chip>
          </CardHeader>
          <CardBody>
            <Table aria-label="资源条目列表">
              <TableHeader>
                <TableColumn>名称</TableColumn>
                <TableColumn>类型</TableColumn>
                <TableColumn>领取方式</TableColumn>
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
                      <TableCell>{claimModeLabels[row.claimMode] ?? row.claimMode}</TableCell>
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
                          href={`/admin/resources?poolId=${encodeURIComponent(row.id)}`}
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
  );
}
