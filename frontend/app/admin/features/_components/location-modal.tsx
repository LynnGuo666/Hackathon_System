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
import { ExternalLink, MapPin } from "lucide-react";
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
                  {(location.osmType || location.osmId || location.osmUrl) && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-foreground/55">
                      {location.osmType && <span>OSM 类型：{location.osmType}</span>}
                      {location.osmId && <span>OSM ID：{location.osmId}</span>}
                      {location.osmUrl && (
                        <a className="inline-flex items-center gap-1 text-primary" href={location.osmUrl} target="_blank" rel="noreferrer">
                          地图来源
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-foreground/45">更新时间：{formatDateTime(location.updatedAt)}</p>
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

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("zh-CN", { hour12: false });
}
