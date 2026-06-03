"use client";

import Link from "next/link";
import {
  Button,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { CalendarClock, ExternalLink, ListChecks, MapPin } from "lucide-react";
import type { FeatureLink } from "@/web/lib/api";

export function FeaturesTable({
  modules,
  loading,
  loadError,
  updatingId,
  onToggle,
  onOpenLocation,
  onOpenCountdown,
}: {
  modules: FeatureLink[];
  loading: boolean;
  loadError: string;
  updatingId: string;
  onToggle: (module: FeatureLink, enabled: boolean) => void;
  onOpenLocation: () => void;
  onOpenCountdown: () => void;
}) {
  return (
    <Table aria-label="功能模块配置">
      <TableHeader>
        <TableColumn>模块</TableColumn>
        <TableColumn>地址</TableColumn>
        <TableColumn>说明</TableColumn>
        <TableColumn>排序</TableColumn>
        <TableColumn>更新时间</TableColumn>
        <TableColumn>状态</TableColumn>
        <TableColumn>操作</TableColumn>
      </TableHeader>
      <TableBody
        items={modules}
        isLoading={loading}
        loadingContent={<Spinner size="sm" label="正在读取功能模块..." />}
        emptyContent={loadError || "暂无功能模块"}
      >
        {(row) => (
          <TableRow key={row.id}>
            <TableCell>{row.title}</TableCell>
            <TableCell>
              <span className="inline-flex items-center gap-1 text-sm">
                {row.url}
                {row.url.startsWith("http") && <ExternalLink size={14} className="text-foreground/45" />}
              </span>
            </TableCell>
            <TableCell>{row.description || "-"}</TableCell>
            <TableCell>{row.sortOrder}</TableCell>
            <TableCell>{formatDateTime(row.updatedAt)}</TableCell>
            <TableCell>
              <Switch
                isSelected={row.enabled}
                isDisabled={updatingId === row.id}
                onValueChange={(enabled) => onToggle(row, enabled)}
              >
                {row.enabled ? "启用" : "禁用"}
              </Switch>
            </TableCell>
            <TableCell>
              {row.id === "feat_location" ? (
                <Button size="sm" variant="flat" startContent={<MapPin size={16} />} onPress={onOpenLocation}>
                  详情
                </Button>
              ) : row.id === "feat_countdown" ? (
                <Button size="sm" variant="flat" startContent={<CalendarClock size={16} />} onPress={onOpenCountdown}>
                  配置
                </Button>
              ) : row.id === "feat_accommodation" || row.url === "/p/accommodation" ? (
                <Button as={Link} href="/admin/accommodation" size="sm" variant="flat" startContent={<ListChecks size={16} />}>
                  查看
                </Button>
              ) : (
                <span className="text-sm text-foreground/40">-</span>
              )}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
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
