import { Chip } from "@heroui/react";
import type { DrinkOrder, MealOrder } from "@/web/lib/api";

export function ParticipantCell({ order }: { order: MealOrder | DrinkOrder }) {
  return (
    <div>
      <p className="font-medium">{order.participantName || order.email}</p>
      <p className="text-xs text-foreground/45">{order.teamName || order.email}</p>
    </div>
  );
}

export function OptionsCell({ values }: { values: string[] }) {
  if (values.length === 0) return "-";
  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <Chip key={value} size="sm" variant="flat">{value}</Chip>
      ))}
    </div>
  );
}

export function SlotStatus({ enabled, isOpen }: { enabled: boolean; isOpen: boolean }) {
  const open = enabled && isOpen;
  return (
    <Chip size="sm" color={open ? "success" : enabled ? "warning" : "default"} variant="flat">
      {open ? "开放" : enabled ? "关闭提交" : "停用"}
    </Chip>
  );
}
