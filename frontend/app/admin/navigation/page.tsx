"use client";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Spinner,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { ExternalLink, Plus, RefreshCw, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { errorText, notify } from "@/components/toast";
import { api, type NavigationLink } from "@/web/lib/api";
import { useEffect, useState } from "react";

export default function AdminNavigationPage() {
  const [links, setLinks] = useState<NavigationLink[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [showOnHome, setShowOnHome] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  // 表格里的开关在切换瞬间会进入 pending 状态，避免重复点击；按 id 标记。
  const [pendingIds, setPendingIds] = useState<Record<string, boolean>>({});
  const [pendingDelete, setPendingDelete] = useState<NavigationLink | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function refresh() {
    setListLoading(true);
    setLoadError("");
    try {
      setLinks(await api.adminNavigationLinks());
    } catch (error) {
      const message = errorText(error, "读取导航配置失败");
      setLoadError(message);
      notify.error(message);
    } finally {
      setListLoading(false);
    }
  }

  async function createLink() {
    const nextTitle = title.trim();
    const nextDescription = description.trim();
    const nextUrl = url.trim();

    if (!nextTitle) {
      notify.error("请填写链接名称");
      return;
    }
    if (!nextUrl) {
      notify.error("请填写跳转地址");
      return;
    }

    setLoading(true);
    try {
      const link = await api.createNavigationLink({
        title: nextTitle,
        description: nextDescription,
        url: nextUrl,
        showOnHome,
      });
      notify.success(`已添加导航链接：${link.title}`);
      setTitle("");
      setDescription("");
      setUrl("");
      setShowOnHome(false);
      await refresh();
    } catch (error) {
      notify.error(errorText(error, "添加失败"));
    } finally {
      setLoading(false);
    }
  }

  async function patchLink(id: string, patch: Partial<Pick<NavigationLink, "enabled" | "showOnHome">>) {
    setPendingIds((prev) => ({ ...prev, [id]: true }));
    // 乐观更新：先把界面调整到目标状态，请求失败再回滚，避免开关跳动。
    const previous = links;
    setLinks((rows) =>
      rows.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
    try {
      const updated = await api.updateNavigationLink(id, patch);
      setLinks((rows) => rows.map((row) => (row.id === id ? updated : row)));
    } catch (error) {
      setLinks(previous);
      notify.error(errorText(error, "更新失败"));
    } finally {
      setPendingIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.deleteNavigationLink(pendingDelete.id);
      notify.success(`已删除：${pendingDelete.title}`);
      setPendingDelete(null);
      await refresh();
    } catch (error) {
      notify.error(errorText(error, "删除失败"));
    } finally {
      setDeleting(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  return (
    <AdminAuthGuard>
    <AppShell variant="admin">
      <section className="grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-foreground/40">系统配置</p>
            <h2 className="text-xl font-bold text-foreground">赛事导航</h2>
          </div>
          <Button size="sm" variant="flat" startContent={<RefreshCw size={16} />} isLoading={listLoading} onPress={refresh}>
            刷新
          </Button>
        </div>

        <Card classNames={{ base: "rounded-card" }}>
          <CardHeader>
            <h3 className="font-semibold">新增导航链接</h3>
          </CardHeader>
          <CardBody className="grid gap-3 md:grid-cols-[1fr_1fr]">
            <Input label="链接名称" placeholder="赛程安排" value={title} onValueChange={setTitle} />
            <Input label="跳转地址" placeholder="/p/dashboard 或 https://example.com" value={url} onValueChange={setUrl} />
            <Input className="md:col-span-2" label="说明" placeholder="显示在导航卡片上的简短说明" value={description} onValueChange={setDescription} />
            <div className="flex items-center md:col-span-2">
              <Checkbox isSelected={showOnHome} onValueChange={setShowOnHome}>
                在公开首页展示
              </Checkbox>
            </div>
            <div className="flex gap-2 md:col-span-2">
              <Button color="primary" startContent={<Plus size={16} />} isLoading={loading} onPress={createLink}>
                添加导航链接
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card classNames={{ base: "rounded-card" }}>
          <CardHeader className="justify-between gap-4">
            <h3 className="font-semibold">已配置导航</h3>
            <Chip variant="flat">{links.length} 个链接</Chip>
          </CardHeader>
          <CardBody>
            <Table aria-label="导航按钮配置">
              <TableHeader>
                <TableColumn>名称</TableColumn>
                <TableColumn>地址</TableColumn>
                <TableColumn>说明</TableColumn>
                <TableColumn>启用</TableColumn>
                <TableColumn>首页展示</TableColumn>
                <TableColumn>排序</TableColumn>
                <TableColumn>更新时间</TableColumn>
                <TableColumn>操作</TableColumn>
              </TableHeader>
              <TableBody
                items={links}
                isLoading={listLoading}
                loadingContent={<Spinner size="sm" label="正在读取导航配置..." />}
                emptyContent={loadError || "暂无导航链接"}
              >
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
                        size="sm"
                        isSelected={row.enabled}
                        isDisabled={pendingIds[row.id]}
                        onValueChange={(value) => patchLink(row.id, { enabled: value })}
                        aria-label={`切换启用 ${row.title}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        size="sm"
                        isSelected={row.showOnHome}
                        isDisabled={pendingIds[row.id]}
                        onValueChange={(value) => patchLink(row.id, { showOnHome: value })}
                        aria-label={`切换首页展示 ${row.title}`}
                      />
                    </TableCell>
                    <TableCell>{row.sortOrder}</TableCell>
                    <TableCell>{formatDateTime(row.updatedAt)}</TableCell>
                    <TableCell>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                        aria-label={`删除 ${row.title}`}
                        onPress={() => setPendingDelete(row)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </section>

      <Modal isOpen={!!pendingDelete} onClose={() => (deleting ? null : setPendingDelete(null))}>
        <ModalContent>
          {() => (
            <>
              <ModalHeader>确认删除</ModalHeader>
              <ModalBody>
                <p className="text-sm text-foreground/70">
                  确定要删除导航链接「{pendingDelete?.title}」吗？删除后无法恢复。
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" isDisabled={deleting} onPress={() => setPendingDelete(null)}>
                  取消
                </Button>
                <Button color="danger" isLoading={deleting} onPress={confirmDelete}>
                  删除
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </AppShell>
    </AdminAuthGuard>
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
