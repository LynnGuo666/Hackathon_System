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
import { MapPin } from "lucide-react";
import type { EventLocation } from "@/web/lib/api";

export function LocationModal({
  isOpen,
  location,
  locationName,
  saving,
  onOpenChange,
  onLocationNameChange,
  onSave,
}: {
  isOpen: boolean;
  location: EventLocation | null;
  locationName: string;
  saving: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onLocationNameChange: (value: string) => void;
  onSave: () => void;
}) {
  return (
    <Modal isOpen={isOpen} size="2xl" onOpenChange={onOpenChange}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-start gap-3">
              <MapPin size={20} className="mt-1 text-foreground/50" />
              <div>
                <h3 className="font-semibold">赛事地点详情</h3>
              </div>
            </ModalHeader>
            <ModalBody className="grid gap-4">
              {location?.name ? (
                <div className="rounded-md border border-divider bg-content2 p-3 text-sm">
                  <p className="font-medium">{location.name}</p>
                  <p className="text-foreground/60">{location.address}</p>
                  {location.latitude !== null && location.longitude !== null && (
                    <p className="text-foreground/50">
                      {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-md border border-divider bg-content2 p-3 text-sm text-foreground/60">
                  暂未配置赛事地点。
                </div>
              )}
              <div className="grid gap-3 rounded-md border border-divider bg-content2 p-3">
                <Input label="地点名称" placeholder="Demo Hall" value={locationName} onValueChange={onLocationNameChange} />
                <Button
                  color="primary"
                  variant="flat"
                  className="justify-self-start"
                  isLoading={saving}
                  onPress={onSave}
                >
                  保存地点
                </Button>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                关闭
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
