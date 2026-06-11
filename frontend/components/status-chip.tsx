import { Chip } from "@heroui/react";
import { Check, Clock, Minus, X } from "lucide-react";

const statusConfig = {
  pending: { color: "warning" as const, icon: Clock },
  active: { color: "success" as const, icon: Check },
  disabled: { color: "default" as const, icon: Minus },
  available: { color: "success" as const, icon: Check },
  failed: { color: "danger" as const, icon: X },
  fulfilled: { color: "success" as const, icon: Check },
  assigned: { color: "primary" as const, icon: Check },
  used: { color: "primary" as const, icon: Check },
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
