"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Spinner,
  useDisclosure,
} from "@heroui/react";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { errorText, notify } from "@/components/toast";
import { api, type ResourceAssignment, type ResourceItem, type ResourcePool } from "@/web/lib/api";
import { InventoryActions, ManualAssignmentForm } from "./_components/actions";
import { ImportInventoryModal } from "./_components/import-modal";
import { InventoryTable } from "./_components/inventory-table";
import { PoolInfoCard, PoolStatsCards } from "./_components/pool-summary";
import { resourceStats } from "./_components/utils";

export default function AdminResourcePoolDetailPage() {
  const params = useParams();
  const poolId = (params.poolId as string) ?? "";
  const [pool, setPool] = useState<ResourcePool | null>(null);
  const [items, setItems] = useState<ResourceItem[]>([]);
  const [assignments, setAssignments] = useState<ResourceAssignment[]>([]);
  const [bulkValues, setBulkValues] = useState("");
  const [checkinId, setCheckinId] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const { isOpen: isImportOpen, onOpen: openImport, onOpenChange: onImportOpenChange } = useDisclosure();

  const stats = useMemo(() => resourceStats(items), [items]);

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

              <InventoryTable items={items} assignmentByItem={assignmentByItem} total={stats.total} />
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
