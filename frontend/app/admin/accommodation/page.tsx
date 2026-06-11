"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { RefreshCw } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { errorText, notify } from "@/components/toast";
import { api, type AccommodationOption, type AccommodationRequest } from "@/web/lib/api";

const optionLabels: Record<AccommodationOption, string> = {
  sleeping_bag: "睡袋",
  tent: "帐篷",
  blanket: "毯子",
  hotel: "酒店住宿",
  other: "其他",
};

export default function AdminAccommodationPage() {
  const [requests, setRequests] = useState<AccommodationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const stats = useMemo(() => {
    return requests.reduce<Record<AccommodationOption, number>>((acc, request) => {
      request.selections.forEach((selection) => {
        acc[selection] = (acc[selection] ?? 0) + 1;
      });
      return acc;
    }, {} as Record<AccommodationOption, number>);
  }, [requests]);

  async function refresh() {
    setLoading(true);
    setLoadError("");
    try {
      setRequests(await api.adminAccommodationRequests());
    } catch (error) {
      const message = errorText(error, "读取赛前需求失败");
      setLoadError(message);
      notify.error(message);
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
        <section className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-foreground/40">运营功能</p>
              <h2 className="text-xl font-bold text-foreground">住宿需求</h2>
            </div>
            <Button variant="flat" size="sm" startContent={<RefreshCw size={14} />} isLoading={loading} onPress={refresh}>
              刷新
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="提交人数" value={requests.length} />
            {(Object.keys(optionLabels) as AccommodationOption[]).map((option) => (
              <StatCard key={option} label={optionLabels[option]} value={stats[option] ?? 0} />
            ))}
          </div>

          <Card classNames={{ base: "rounded-card shadow-sm" }}>
            <CardHeader className="flex items-center justify-between gap-4 px-5 py-3">
              <h3 className="text-sm font-semibold text-foreground/60">需求明细</h3>
              <Chip size="sm" variant="flat">{requests.length} 条记录</Chip>
            </CardHeader>
            <CardBody>
              <Table aria-label="住宿需求列表">
                <TableHeader>
                  <TableColumn>邮箱</TableColumn>
                  <TableColumn>需求</TableColumn>
                  <TableColumn>其他说明</TableColumn>
                  <TableColumn>创建时间</TableColumn>
                  <TableColumn>更新时间</TableColumn>
                </TableHeader>
                <TableBody
                  items={requests}
                  isLoading={loading}
                  loadingContent={<Spinner size="sm" label="正在读取住宿需求..." />}
                  emptyContent={loadError || "暂无住宿需求记录"}
                >
                  {(row) => (
                    <TableRow key={row.email}>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>
                        {row.selections.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {row.selections.map((selection) => (
                              <Chip key={selection} size="sm" variant="flat">
                                {optionLabels[selection] ?? selection}
                              </Chip>
                            ))}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell>{row.otherDetail || "-"}</TableCell>
                      <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                      <TableCell>{formatDateTime(row.updatedAt)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        </section>
      </AppShell>
    </AdminAuthGuard>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card classNames={{ base: "rounded-card" }}>
      <CardBody>
        <p className="text-sm text-foreground/60">{label}</p>
        <p className="mt-1 text-2xl font-semibold">{value}</p>
      </CardBody>
    </Card>
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
