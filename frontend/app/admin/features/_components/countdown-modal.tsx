"use client";

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Switch,
} from "@heroui/react";
import { CalendarClock } from "lucide-react";

export function CountdownModal({
  isOpen,
  title,
  end,
  enabled,
  saving,
  onOpenChange,
  onTitleChange,
  onEndChange,
  onEnabledChange,
  onSave,
}: {
  isOpen: boolean;
  title: string;
  end: string;
  enabled: boolean;
  saving: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onTitleChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onEnabledChange: (value: boolean) => void;
  onSave: () => void;
}) {
  return (
    <Modal isOpen={isOpen} size="2xl" onOpenChange={onOpenChange}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-start gap-3">
              <CalendarClock size={20} className="mt-1 text-foreground/50" />
              <div>
                <h3 className="font-semibold">倒计时配置</h3>
              </div>
            </ModalHeader>
            <ModalBody className="grid gap-4">
              <Input label="标题" placeholder="距离开幕" value={title} onValueChange={onTitleChange} />
              <Input
                type="datetime-local"
                label="结束时间"
                value={end}
                onValueChange={onEndChange}
              />
              <Switch isSelected={enabled} onValueChange={onEnabledChange}>
                {enabled ? "启用" : "禁用"}
              </Switch>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                关闭
              </Button>
              <Button color="primary" isLoading={saving} onPress={onSave}>
                保存
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
