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
import { ArrowRight, BedDouble, CalendarClock, Coffee, IdCard, KeyRound, Mail, MapPin, Navigation, UsersRound } from "lucide-react";

export type ModuleAction =
  | { type: "link"; href: string }
  | { type: "modal"; modal: "location" | "countdown" }
  | { type: "none" };

export type ModuleRow = {
  id: string;
  title: string;
  description: string;
  url: string;
  sortOrder: number;
  updatedAt: string;
  enabled: boolean;
  /** 始终启用，显示灰色只读开关（仅账号管理、CheckinID） */
  alwaysOn?: boolean;
  action: ModuleAction;
  /** 对应的 API FeatureLink id，用于调用 toggle API */
  featureId?: string;
};

const moduleIcons: Record<string, typeof UsersRound> = {
  accounts: UsersRound,
  checkins: IdCard,
  resources: KeyRound,
  "meal-orders": Coffee,
  "email-outbox": Mail,
  accommodation: BedDouble,
  navigation: Navigation,
  location: MapPin,
  countdown: CalendarClock,
};

function actionLabel(action: ModuleAction): string {
  if (action.type === "link") return "查看";
  if (action.type === "modal") return action.modal === "location" ? "详情" : "配置";
  return "";
}

export function FeaturesTable({
  modules,
  loading,
  loadError,
  updatingId,
  onToggle,
  onOpenLocation,
  onOpenCountdown,
}: {
  modules: ModuleRow[];
  loading: boolean;
  loadError: string;
  updatingId: string;
  onToggle: (module: ModuleRow, enabled: boolean) => void;
  onOpenLocation: () => void;
  onOpenCountdown: () => void;
}) {
  function renderAction(row: ModuleRow) {
    const { action } = row;
    if (action.type === "none") {
      return <span className="text-sm text-foreground/40">-</span>;
    }
    if (action.type === "modal") {
      const onPress = action.modal === "location" ? onOpenLocation : onOpenCountdown;
      const Icon = action.modal === "location" ? MapPin : CalendarClock;
      return (
        <Button size="sm" variant="flat" startContent={<Icon size={16} />} onPress={onPress}>
          {actionLabel(action)}
        </Button>
      );
    }
    // link
    return (
      <Button as={Link} href={action.href} size="sm" variant="flat" endContent={<ArrowRight size={15} />}>
        {actionLabel(action)}
      </Button>
    );
  }

  return (
    <Table aria-label="功能模块配置">
      <TableHeader>
        <TableColumn>模块</TableColumn>
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
        {(row) => {
          const Icon = moduleIcons[row.id];
          return (
            <TableRow key={row.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {Icon && <Icon size={16} className="text-foreground/50" />}
                  <span className="font-medium">{row.title}</span>
                </div>
              </TableCell>
              <TableCell>{row.description || "-"}</TableCell>
              <TableCell>{row.sortOrder}</TableCell>
              <TableCell>{formatDateTime(row.updatedAt)}</TableCell>
              <TableCell>
                <Switch
                  size="sm"
                  color={row.alwaysOn ? "default" : "primary"}
                  isSelected={row.alwaysOn ? true : row.enabled}
                  isReadOnly={row.alwaysOn}
                  isDisabled={updatingId === row.id}
                  onValueChange={(enabled) => onToggle(row, enabled)}
                  classNames={{
                    wrapper: row.alwaysOn ? "bg-default-400" : undefined,
                  }}
                >
                  {row.alwaysOn ? "始终启用" : row.enabled ? "启用" : "禁用"}
                </Switch>
              </TableCell>
              <TableCell>{renderAction(row)}</TableCell>
            </TableRow>
          );
        }}
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
