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
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
  useDisclosure,
} from "@heroui/react";
import { ArrowLeft, CheckCircle2, Download, PackagePlus, RefreshCw, Send } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { StatusChip } from "@/components/status-chip";
import { errorText, notify } from "@/components/toast";
import { api, type ResourceAssignment, type ResourceItem, type ResourcePool } from "@/web/lib/api";

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

function displayItemStatus(status: string) {
  if (status === "available") {
    return "未使用";
  }
  if (status === "assigned" || status === "used") {
    return "已使用";
  }
  return status;
}

function AdminResourcePoolDetailContent() {
  const searchParams = useSearchParams();
  const poolId = searchParams.get("poolId") ?? "";
  const [pool, setPool] = useState<ResourcePool | null>(null);
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([]);
  const [bulkValues, setBulkValues] = useState("");
  const [checkinId, setCheckinId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const { isOpen: isImportOpen, onOpen: openImport, onOpenChange: onImportOpenChange } = useDisclosure();

  const stats = useMemo(() => {
    return {
      total: items.length,
      available: items.filter((item) => item.status === "available").length,
      assigned: items.filter((item) => item.status === "assigned" || item.status === "used").length,
    };
  }, [items]);

  const assignmentByItem = useMemo(() => {
    return Object.fromEntries(assignments.map((assignment) => [assignment.resourceItemId, assignment]));
  }, [assignments]);

  async function refresh() {
    if (!poolId) {
      setLoading(false);
      return;
    }
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
    <AdminAuthGuard>
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
            <Button variant="flat" startContent={<RefreshCw size={16} />} isLoading={loading} onPress={refresh}>
              刷新
            </Button>
          </div>

          {loading && <Spinner label="正在读取资源详情" />}

          {!loading && loadError && (
            <Card className="rounded-md">
              <CardBody className="text-sm text-danger">{loadError}</CardBody>
            </Card>
          )}

          {!loading && pool && (
            <>
              <div className="grid gap-4 md:grid-cols-4">
                <Card className="rounded-md">
                  <CardBody>
                    <p className="text-sm text-foreground/60">类型</p>
                    <p className="mt-1 text-lg font-semibold">{typeLabels[pool.type] ?? pool.type}</p>
                  </CardBody>
                </Card>
                <Card className="rounded-md">
                  <CardBody>
                    <p className="text-sm text-foreground/60">未使用</p>
                    <p className="mt-1 text-lg font-semibold">{stats.available}</p>
                  </CardBody>
                </Card>
                <Card className="rounded-md">
                  <CardBody>
                    <p className="text-sm text-foreground/60">已使用</p>
                    <p className="mt-1 text-lg font-semibold">{stats.assigned}</p>
                  </CardBody>
                </Card>
                <Card className="rounded-md">
                  <CardBody>
                    <p className="text-sm text-foreground/60">重复申请</p>
                    <p className="mt-1 text-lg font-semibold">{pool.allowMultipleClaims ? "允许" : "不允许"}</p>
                  </CardBody>
                </Card>
              </div>

              <Card className="rounded-md">
                <CardHeader>
                  <h3 className="font-semibold">资源池信息</h3>
                </CardHeader>
                <CardBody className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                  <InfoItem label="启用状态" value={pool.enabled ? "启用" : "停用"} />
                  <InfoItem label="发放规则" value={distributionLabels[pool.distributionRule] ?? pool.distributionRule} />
                  <InfoItem label="可见阶段" value={phaseLabels[pool.visiblePhase] ?? pool.visiblePhase} />
                  <InfoItem label="创建时间" value={formatDateTime(pool.createdAt)} />
                </CardBody>
              </Card>

              <div className="grid gap-5 xl:grid-cols-2">
                <Card className="rounded-md">
                  <CardHeader>
                    <h3 className="font-semibold">添加库存</h3>
                  </CardHeader>
                  <CardBody className="gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        color="primary"
                        startContent={<PackagePlus size={16} />}
                        onPress={openImport}
                      >
                        添加库存
                      </Button>
                    </div>
                  </CardBody>
                </Card>

                <Card className="rounded-md">
                  <CardHeader>
                    <h3 className="font-semibold">批准并发放</h3>
                  </CardHeader>
                  <CardBody className="gap-3">
                    <Input label="CheckinID" placeholder="000001" value={checkinId} onValueChange={setCheckinId} />
                    <Button
                      color="primary"
                      startContent={<Send size={16} />}
                      isLoading={saving}
                      onPress={approveAssignment}
                    >
                      批准发放
                    </Button>
                  </CardBody>
                </Card>
              </div>

              <Modal isOpen={isImportOpen} size="2xl" onOpenChange={onImportOpenChange}>
                <ModalContent>
                  {(onClose) => (
                    <>
                      <ModalHeader className="flex items-start gap-3">
                        <PackagePlus size={20} className="mt-1 text-foreground/50" />
                        <div>
                          <h3 className="font-semibold">添加库存</h3>
                        </div>
                      </ModalHeader>
                      <ModalBody className="grid gap-3">
                        <Textarea
                          minRows={10}
                          label="批量导入"
                          placeholder={"KEY-001\nhttps://example.com/invite\nuser@example.com / password"}
                          value={bulkValues}
                          onValueChange={setBulkValues}
                        />
                      </ModalBody>
                      <ModalFooter>
                        <Button variant="flat" onPress={onClose}>
                          取消
                        </Button>
                        <Button
                          color="primary"
                          startContent={<Download size={16} />}
                          isLoading={saving}
                          onPress={importItems}
                        >
                          导入库存
                        </Button>
                      </ModalFooter>
                    </>
                  )}
                </ModalContent>
              </Modal>

              <Card className="rounded-md">
                <CardHeader className="justify-between gap-4">
                  <h3 className="font-semibold">库存明细</h3>
                  <Chip variant="flat">{stats.total} 条库存</Chip>
                </CardHeader>
                <CardBody>
                  <Table aria-label="资源库存明细">
                    <TableHeader>
                      <TableColumn>资源项</TableColumn>
                      <TableColumn>状态</TableColumn>
                      <TableColumn>关联选手</TableColumn>
                      <TableColumn>发放时间</TableColumn>
                      <TableColumn>过期时间</TableColumn>
                      <TableColumn>发放记录</TableColumn>
                      <TableColumn>发放状态</TableColumn>
                      <TableColumn>邮件送达</TableColumn>
                      <TableColumn>记录创建</TableColumn>
                      <TableColumn>明文码</TableColumn>
                    </TableHeader>
                    <TableBody items={items} emptyContent="暂无库存数据">
                      {(row) => {
                        const assignment = assignmentByItem[row.id];
                        return (
                          <TableRow key={row.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-foreground/45" />
                                <span>{row.publicLabel}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <StatusChip status={displayItemStatus(row.status)} />
                            </TableCell>
                            <TableCell>{row.assignedCheckinId || assignment?.checkinId || "-"}</TableCell>
                            <TableCell>
                              {formatDateTime(row.assignedAt)}
                            </TableCell>
                            <TableCell>{formatDateTime(row.expiresAt)}</TableCell>
                            <TableCell>{assignment?.id ?? "-"}</TableCell>
                            <TableCell>{assignment ? <StatusChip status={assignment.status} /> : "-"}</TableCell>
                            <TableCell>{assignment ? (assignment.deliveredByEmail ? "已送达" : "未送达") : "-"}</TableCell>
                            <TableCell>{formatDateTime(assignment?.createdAt)}</TableCell>
                            <TableCell>{assignment?.plainCode || "-"}</TableCell>
                          </TableRow>
                        );
                      }}
                    </TableBody>
                  </Table>
                </CardBody>
              </Card>
            </>
          )}

          {!loading && !loadError && !pool && (
            <Card className="rounded-md">
              <CardBody className="text-sm text-foreground/65">
                未找到资源条目，请从资源条目列表进入详情页。
              </CardBody>
            </Card>
          )}
        </section>
      </AppShell>
    </AdminAuthGuard>
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

export default function AdminResourcePoolDetailPage() {
  return (
    <Suspense fallback={null}>
      <AdminResourcePoolDetailContent />
    </Suspense>
  );
}
