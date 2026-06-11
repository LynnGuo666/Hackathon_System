import { Button, Card, CardBody, CardHeader, Input } from "@heroui/react";
import { PackagePlus, Send } from "lucide-react";

export function InventoryActions({ onOpenImport }: { onOpenImport: () => void }) {
  return (
    <Card classNames={{ base: "rounded-md" }}>
      <CardHeader>
        <h3 className="font-semibold">添加库存</h3>
      </CardHeader>
      <CardBody className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button color="primary" startContent={<PackagePlus size={16} />} onPress={onOpenImport}>
            添加库存
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export function ManualAssignmentForm({
  checkinId,
  saving,
  onCheckinIdChange,
  onAssign,
}: {
  checkinId: string;
  saving: boolean;
  onCheckinIdChange: (value: string) => void;
  onAssign: () => void;
}) {
  return (
    <Card classNames={{ base: "rounded-md" }}>
      <CardHeader>
        <h3 className="font-semibold">批准并发放</h3>
      </CardHeader>
      <CardBody className="gap-3">
        <Input label="CheckinID" placeholder="000001" value={checkinId} onValueChange={onCheckinIdChange} />
        <Button color="primary" startContent={<Send size={16} />} isLoading={saving} onPress={onAssign}>
          批准发放
        </Button>
      </CardBody>
    </Card>
  );
}
