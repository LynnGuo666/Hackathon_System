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
import { CalendarClock, ExternalLink, MapPin, RefreshCw } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { errorText, notify } from "@/components/toast";
import { api, type EventLocation, type FeatureLink, type SiteConfig } from "@/web/lib/api";

function toDateTimeLocal(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return offsetDate.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

export default function AdminFeaturesPage() {
  const [modules, setModules] = useState<FeatureLink[]>([]);
  const [location, setLocation] = useState<EventLocation | null>(null);
  const [siteConfig, setSiteConfig] = useState<SiteConfig | null>(null);
  const [manualLocationName, setManualLocationName] = useState("");
  const [countdownTitle, setCountdownTitle] = useState("");
  const [countdownEnd, setCountdownEnd] = useState("");
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [savingCountdown, setSavingCountdown] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const { isOpen: isLocationOpen, onOpen: openLocation, onOpenChange: onLocationOpenChange } = useDisclosure();
  const { isOpen: isCountdownOpen, onOpen: openCountdown, onOpenChange: onCountdownOpenChange } = useDisclosure();

  async function refresh() {
    try {
      const [featureRows, currentLocation, currentConfig] = await Promise.all([
        api.adminFeatureLinks(),
        api.adminEventLocation(),
        api.siteConfig(),
      ]);
      setModules(featureRows);
      setLocation(currentLocation);
      setSiteConfig(currentConfig);
      setManualLocationName(currentLocation.name);
      setCountdownTitle(currentConfig.countdownTitle);
      setCountdownEnd(toDateTimeLocal(currentConfig.countdownEnd));
      setCountdownEnabled(currentConfig.countdownEnabled);
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

  async function saveCountdown() {
    if (countdownEnabled && !countdownEnd) {
      notify.error("请选择结束时间");
      return;
    }
    setSavingCountdown(true);
    try {
      const saved = await api.updateSiteConfig({
        id: "default",
        countdownTitle: countdownTitle.trim(),
        countdownEnd: fromDateTimeLocal(countdownEnd),
        countdownEnabled,
        updatedAt: siteConfig?.updatedAt ?? "",
      });
      setSiteConfig(saved);
      setCountdownTitle(saved.countdownTitle);
      setCountdownEnd(toDateTimeLocal(saved.countdownEnd));
      setCountdownEnabled(saved.countdownEnabled);
      notify.success("倒计时已保存");
    } catch (error) {
      notify.error(errorText(error, "保存倒计时失败"));
    } finally {
      setSavingCountdown(false);
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
                    ) : row.id === "feat_countdown" ? (
                      <Button size="sm" variant="flat" startContent={<CalendarClock size={16} />} onPress={openCountdown}>
                        配置
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

          <Modal isOpen={isCountdownOpen} size="2xl" onOpenChange={onCountdownOpenChange}>
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
                    <Input label="标题" placeholder="距离开幕" value={countdownTitle} onValueChange={setCountdownTitle} />
                    <Input
                      type="datetime-local"
                      label="结束时间"
                      value={countdownEnd}
                      onValueChange={setCountdownEnd}
                    />
                    <Switch isSelected={countdownEnabled} onValueChange={setCountdownEnabled}>
                      {countdownEnabled ? "启用" : "禁用"}
                    </Switch>
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="flat" onPress={onClose}>
                      关闭
                    </Button>
                    <Button color="primary" isLoading={savingCountdown} onPress={saveCountdown}>
                      保存
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
