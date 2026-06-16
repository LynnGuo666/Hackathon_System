import { Chip } from "@heroui/react";
import { Check, Clock, Minus, X } from "lucide-react";

const statusConfig = {
  pending: { color: "warning" as const, icon: Clock },
  enrolled: { color: "warning" as const, icon: Clock },
  accepted: { color: "primary" as const, icon: Check },
  checked_in: { color: "success" as const, icon: Check },
  active: { color: "success" as const, icon: Check },
  rejected: { color: "danger" as const, icon: X },
  disabled: { color: "default" as const, icon: Minus },
  available: { color: "success" as const, icon: Check },
  failed: { color: "danger" as const, icon: X },
  fulfilled: { color: "success" as const, icon: Check },
  assigned: { color: "primary" as const, icon: Check },
  used: { color: "primary" as const, icon: Check },
  sending: { color: "primary" as const, icon: Clock },
  succeeded: { color: "success" as const, icon: Check },
  dead: { color: "danger" as const, icon: X },
  "未使用": { color: "success" as const, icon: Check },
  "已使用": { color: "primary" as const, icon: Check },
} as const;

const defaultConfig = { color: "default" as const, icon: Minus };

export function StatusChip({ status }: { status: string }) {
  const config = statusConfig[status as keyof typeof statusConfig] ?? defaultConfig;
  const Icon = config.icon;
  return (
    <Chip
      color={config.color}
      variant="flat"
      size="sm"
      startContent={<Icon size={12} className="shrink-0" aria-hidden="true" />}
      aria-label={`状态: ${status}`}
    >
      {status}
    </Chip>
  );
}
