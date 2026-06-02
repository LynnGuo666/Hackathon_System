"use client";

import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { Hash, Link as LinkIcon, Mail } from "lucide-react";
import type { Participant } from "@/web/lib/api";

export function CheckinBindModal({
  participant,
  fallbackEmail,
  checkinId,
  loading,
  onCheckinIdChange,
  onSubmit,
}: {
  participant: Participant | null;
  fallbackEmail: string;
  checkinId: string;
  loading: boolean;
  onCheckinIdChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <Modal
      isDismissable={false}
      isKeyboardDismissDisabled
      isOpen={Boolean(participant)}
      onOpenChange={() => {}}
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <LinkIcon size={18} />
          绑定 CheckinID
        </ModalHeader>
        <ModalBody className="grid gap-4">
          <Input
            label="邮箱"
            value={participant?.email ?? fallbackEmail}
            isReadOnly
            startContent={<Mail size={16} />}
          />
          <Input
            label="CheckinID"
            placeholder="000001"
            value={checkinId}
            onValueChange={onCheckinIdChange}
            startContent={<Hash size={16} />}
          />
        </ModalBody>
        <ModalFooter>
          <Button color="primary" isLoading={loading} onPress={onSubmit}>
            绑定进入
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
