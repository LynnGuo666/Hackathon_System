import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Textarea,
} from "@heroui/react";
import { Download, PackagePlus } from "lucide-react";

export function ImportInventoryModal({
  isOpen,
  values,
  saving,
  onOpenChange,
  onValuesChange,
  onImport,
}: {
  isOpen: boolean;
  values: string;
  saving: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onValuesChange: (value: string) => void;
  onImport: () => void;
}) {
  return (
    <Modal isOpen={isOpen} size="2xl" onOpenChange={onOpenChange}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-start gap-3">
              <PackagePlus size={20} className="mt-1 text-foreground/50" />
              <div>
                <h3 className="font-semibold">添加库存</h3>
              </div>
            </ModalHeader>
            <ModalBody className="grid gap-3">
              <Textarea
                minRows={10}
                label="批量导入"
                placeholder={"KEY-001\nhttps://example.com/invite\nuser@example.com / password"}
                value={values}
                onValueChange={onValuesChange}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                取消
              </Button>
              <Button color="primary" startContent={<Download size={16} />} isLoading={saving} onPress={onImport}>
                导入库存
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
