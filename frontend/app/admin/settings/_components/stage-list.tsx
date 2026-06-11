import { Button, Card, CardBody, Input } from "@heroui/react";
import { Plus, Trash2 } from "lucide-react";
import type { EditableStage } from "./use-site-config-form";

export function StageList({
  stages,
  onAdd,
  onRemove,
  onUpdate,
}: {
  stages: EditableStage[];
  onAdd: () => void;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<EditableStage>) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">倒计时阶段</h3>
        <Button size="sm" variant="flat" startContent={<Plus size={16} />} onPress={onAdd}>
          添加阶段
        </Button>
      </div>

      {stages.length === 0 && (
        <Card classNames={{ base: "rounded-md border border-dashed border-divider shadow-none" }}>
          <CardBody className="items-start gap-3">
            <p className="text-sm text-foreground/60">还没有阶段，可以添加开赛、提交、完赛等时间点。</p>
            <Button size="sm" color="primary" variant="flat" startContent={<Plus size={16} />} onPress={onAdd}>
              添加阶段
            </Button>
          </CardBody>
        </Card>
      )}

      {stages.map((stage, index) => (
        <div key={stage.id} className="grid gap-3 rounded-md border border-divider p-3 md:grid-cols-[1fr_1fr_auto]">
          <Input
            label={`阶段 ${index + 1}`}
            value={stage.label}
            onValueChange={(value) => onUpdate(stage.id, { label: value })}
          />
          <Input
            type="datetime-local"
            label="阶段时间"
            value={stage.localTime}
            onValueChange={(value) => onUpdate(stage.id, { localTime: value })}
          />
          <Button
            isIconOnly
            className="self-end"
            variant="light"
            color="danger"
            aria-label="删除阶段"
            onPress={() => onRemove(stage.id)}
          >
            <Trash2 size={17} />
          </Button>
        </div>
      ))}
    </div>
  );
}
