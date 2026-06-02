"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
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
import { ExternalLink, MapPin, RefreshCw, Search } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { errorText, notify } from "@/components/toast";
import { api, type EventLocation, type FeatureLink, type OSMSearchResult } from "@/web/lib/api";

export default function AdminFeaturesPage() {
  const [modules, setModules] = useState<FeatureLink[]>([]);
  const [location, setLocation] = useState<EventLocation | null>(null);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<OSMSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
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

  async function searchLocations() {
    setSearching(true);
    try {
      setLocationResults(await api.searchLocations(locationQuery));
    } catch (error) {
      notify.error(errorText(error, "搜索地点失败"));
    } finally {
      setSearching(false);
    }
  }

  async function saveLocation(result: OSMSearchResult) {
    const osmUrl = result.osmType && result.osmId
      ? `https://www.openstreetmap.org/${result.osmType}/${result.osmId}`
      : "";
    try {
      const saved = await api.updateEventLocation({
        id: "default",
        name: result.displayName.split(",")[0] || result.displayName,
        address: result.displayName,
        latitude: result.latitude,
        longitude: result.longitude,
        osmType: result.osmType,
        osmId: result.osmId,
        osmUrl,
        updatedAt: "",
      });
      setLocation(saved);
      setLocationResults([]);
      notify.success("赛事地点已保存");
    } catch (error) {
      notify.error(errorText(error, "保存地点失败"));
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
            <p className="text-sm text-foreground/60">feature modules</p>
            <h2 className="text-2xl font-semibold">功能模块</h2>
            <p className="mt-1 text-sm text-foreground/60">
              启用或禁用系统内置模块。禁用后，选手端不会展示对应功能入口。
            </p>
          </div>

          <Card className="rounded-md">
            <CardHeader className="justify-between gap-4">
              <div>
                <h3 className="font-semibold">模块列表</h3>
                <p className="text-sm text-foreground/60">功能模块由系统提供；赛事文档和资料链接请到导航页添加。</p>
              </div>
              <div className="flex items-center gap-2">
                <Chip variant="flat">{modules.filter((item) => item.enabled).length} 个启用</Chip>
                <Button size="sm" variant="flat" startContent={<RefreshCw size={16} />} onPress={refresh}>
                  刷新
                </Button>
              </div>
            </CardHeader>
            <CardBody className="grid gap-3">
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
            </CardBody>
          </Card>

          <Modal isOpen={isLocationOpen} size="2xl" onOpenChange={onLocationOpenChange}>
            <ModalContent>
              {(onClose) => (
                <>
                  <ModalHeader className="flex items-start gap-3">
                    <MapPin size={20} className="mt-1 text-foreground/50" />
                    <div>
                      <h3 className="font-semibold">赛事地点详情</h3>
                      <p className="text-sm font-normal text-foreground/60">
                        搜索 OpenStreetMap 地点并保存到选手端地图页面。
                      </p>
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
                    <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                      <Input
                        label="搜索地点"
                        placeholder="输入场馆、学校、酒店或地址"
                        value={locationQuery}
                        onValueChange={setLocationQuery}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && locationQuery.trim()) {
                            searchLocations();
                          }
                        }}
                      />
                      <Button
                        className="self-end"
                        variant="flat"
                        startContent={<Search size={16} />}
                        isDisabled={!locationQuery.trim()}
                        isLoading={searching}
                        onPress={searchLocations}
                      >
                        搜索
                      </Button>
                    </div>
                    {locationResults.length > 0 && (
                      <div className="grid max-h-72 gap-2 overflow-y-auto pr-1">
                        {locationResults.map((result) => (
                          <div key={result.placeId} className="flex items-start justify-between gap-3 rounded-md border border-divider p-3">
                            <div>
                              <p className="text-sm font-medium">{result.displayName}</p>
                              <p className="text-xs text-foreground/50">
                                {result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}
                              </p>
                            </div>
                            <Button size="sm" color="primary" variant="flat" onPress={() => saveLocation(result)}>
                              保存
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
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
