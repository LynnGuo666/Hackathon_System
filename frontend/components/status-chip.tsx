import { Chip } from "@heroui/react";

const colorMap = {
  pending: "warning",
  active: "success",
  failed: "danger",
  fulfilled: "success",
  assigned: "primary",
  default: "default",
} as const;

export function StatusChip({ status }: { status: string }) {
  const color = colorMap[status as keyof typeof colorMap] ?? "default";
  return (
    <Chip color={color} variant="flat" size="sm">
      {status}
    </Chip>
  );
}
