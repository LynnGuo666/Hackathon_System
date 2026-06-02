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
      notify.error(errorText(error, "读取资源条目失败"));
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
              <p className="text-sm text-foreground/60">resource detail</p>
              <h2 className="text-2xl font-semibold">{pool?.name ?? "资源条目"}</h2>
              <p className="mt-1 text-sm text-foreground/60">
                在这里维护库存，一行一个 Key、链接或凭证；发放后会关联到选手 CheckinID。
              </p>
            </div>
            <Button variant="flat" startContent={<RefreshCw size={16} />} onPress={refresh}>
              刷新
            </Button>
          </div>

          {loading && <Spinner label="正在读取资源详情" />}

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

              <div className="grid gap-5 xl:grid-cols-2">
                <Card className="rounded-md">
                  <CardHeader>
                    <div>
                      <h3 className="font-semibold">添加库存</h3>
                      <p className="text-sm text-foreground/60">打开导入窗口后，一行一个添加 Key、链接或账号凭证。</p>
                    </div>
                  </CardHeader>
                  <CardBody className="gap-3 text-sm text-foreground/65">
                    <p>当前未使用库存 {stats.available} 条，已使用 {stats.assigned} 条。</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        color="primary"
                        startContent={<PackagePlus size={16} />}
                        onPress={openImport}
                      >
                        添加库存
                      </Button>
                      <Chip variant="flat">空行会自动忽略</Chip>
                    </div>
                  </CardBody>
                </Card>

                <Card className="rounded-md">
                  <CardHeader>
                    <div>
                      <h3 className="font-semibold">批准并发放</h3>
                      <p className="text-sm text-foreground/60">
                        选手申请通过后，在这里输入 CheckinID 发放一个未使用库存。
                      </p>
                    </div>
                  </CardHeader>
                  <CardBody className="gap-3">
                    <Input label="CheckinID" placeholder="CHECKIN-001" value={checkinId} onValueChange={setCheckinId} />
                    <Button
                      color="primary"
                      startContent={<Send size={16} />}
                      isLoading={saving}
                      onPress={approveAssignment}
                    >
                      批准发放
                    </Button>
                    <p className="text-xs text-foreground/50">
                      当前版本使用管理员直发承接批准动作；完整待审批申请队列需要新增申请表。
                    </p>
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
                          <p className="text-sm font-normal text-foreground/60">
                            每行一条，可粘贴 Key、链接或账号凭证。
                          </p>
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
                        <div className="rounded-md border border-divider bg-content2 p-3 text-sm text-foreground/60">
                          空行会自动忽略；导入成功后会刷新库存明细。
                        </div>
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
                  <div>
                    <h3 className="font-semibold">库存明细</h3>
                    <p className="text-sm text-foreground/60">已使用的资源会显示关联选手和发放记录。</p>
                  </div>
                  <Chip variant="flat">{stats.total} 条库存</Chip>
                </CardHeader>
                <CardBody>
                  <Table aria-label="资源库存明细">
                    <TableHeader>
                      <TableColumn>资源项</TableColumn>
                      <TableColumn>状态</TableColumn>
                      <TableColumn>关联选手</TableColumn>
                      <TableColumn>发放时间</TableColumn>
                      <TableColumn>发放记录</TableColumn>
                    </TableHeader>
                    <TableBody items={items}>
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
                              {row.assignedAt ? new Date(row.assignedAt).toLocaleString() : "-"}
                            </TableCell>
                            <TableCell>{assignment?.id ?? "-"}</TableCell>
                          </TableRow>
                        );
                      }}
                    </TableBody>
                  </Table>
                </CardBody>
              </Card>
            </>
          )}

          {!loading && !pool && (
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

export default function AdminResourcePoolDetailPage() {
  return (
    <Suspense fallback={null}>
      <AdminResourcePoolDetailContent />
    </Suspense>
  );
}
