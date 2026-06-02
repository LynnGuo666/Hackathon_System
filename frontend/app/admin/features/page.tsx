"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  useDisclosure,
} from "@heroui/react";
import { ExternalLink, MapPin, RefreshCw } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { errorText, notify } from "@/components/toast";
import { api, type EventLocation, type FeatureLink } from "@/web/lib/api";

export default function AdminFeaturesPage() {
  const [modules, setModules] = useState<FeatureLink[]>([]);
  const [location, setLocation] = useState<EventLocation | null>(null);
  const [manualLocationName, setManualLocationName] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const { isOpen: isLocationOpen, onOpen: openLocation, onOpenChange: onLocationOpenChange } = useDisclosure();

  async function refresh() {
    try {
      const [featureRows, currentLocation] = await Promise.all([
        api.adminFeatureLinks(),
        api.adminEventLocation(),
      ]);
      setModules(featureRows);
      setLocation(currentLocation);
      setManualLocationName(currentLocation.name);
    } catch (error) {
      notify.error(errorText(error, "读取模块配置失败"));
    }
  }

  async function toggleModule(module: FeatureLink, enabled: boolean) {
    setUpdatingId(module.id);
    try {
      const saved = await api.updateFeatureEnabled(module.id, enabled);
      setModules((current) => current.map((item) => item.id === saved.id ? saved : item));
      notify.success(`${saved.title} 已${saved.enabled ? "启用" : "禁用"}`);
    } catch (error) {
      notify.error(errorText(error, "更新模块失败"));
    } finally {
      setUpdatingId("");
    }
  }

  async function saveManualLocation() {
    if (!manualLocationName.trim()) {
      notify.error("请填写地点名称");
      return;
    }
    setSavingLocation(true);
    try {
      const saved = await api.updateEventLocation({
        id: "default",
        name: manualLocationName.trim(),
        address: manualLocationName.trim(),
        latitude: null,
        longitude: null,
        osmType: "",
        osmId: "",
        osmUrl: "",
        updatedAt: "",
      });
      setLocation(saved);
      notify.success("赛事地点已保存");
    } catch (error) {
      notify.error(errorText(error, "保存地点失败"));
    } finally {
      setSavingLocation(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AdminAuthGuard>
      <AppShell variant="admin">
        <section className="grid gap-5">
          <div>
            <h2 className="text-2xl font-semibold">功能模块</h2>
          </div>

          <div className="flex items-center justify-between gap-3">
            <Chip variant="flat">{modules.filter((item) => item.enabled).length} 个启用</Chip>
            <Button size="sm" variant="flat" startContent={<RefreshCw size={16} />} onPress={refresh}>
              刷新
            </Button>
          </div>

          <Table aria-label="功能模块配置">
            <TableHeader>
              <TableColumn>模块</TableColumn>
              <TableColumn>地址</TableColumn>
              <TableColumn>说明</TableColumn>
              <TableColumn>状态</TableColumn>
              <TableColumn>操作</TableColumn>
            </TableHeader>
            <TableBody items={modules}>
              {(row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.title}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm">
                      {row.url}
                      {row.url.startsWith("http") && <ExternalLink size={14} className="text-foreground/45" />}
                    </span>
                  </TableCell>
                  <TableCell>{row.description || "-"}</TableCell>
                  <TableCell>
                    <Switch
                      isSelected={row.enabled}
                      isDisabled={updatingId === row.id}
                      onValueChange={(enabled) => toggleModule(row, enabled)}
                    >
                      {row.enabled ? "启用" : "禁用"}
                    </Switch>
                  </TableCell>
                  <TableCell>
                    {row.id === "feat_location" ? (
                      <Button size="sm" variant="flat" startContent={<MapPin size={16} />} onPress={openLocation}>
                        详情
                      </Button>
                    ) : (
                      <span className="text-sm text-foreground/40">-</span>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <Modal isOpen={isLocationOpen} size="2xl" onOpenChange={onLocationOpenChange}>
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
                      <Input label="地点名称" placeholder="Demo Hall" value={manualLocationName} onValueChange={setManualLocationName} />
                      <Button
                        color="primary"
                        variant="flat"
                        className="justify-self-start"
                        isLoading={savingLocation}
                        onPress={saveManualLocation}
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
        </section>
      </AppShell>
    </AdminAuthGuard>
  );
}
