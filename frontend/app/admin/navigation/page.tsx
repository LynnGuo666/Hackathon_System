"use client";

import { Button, Card, CardBody, CardHeader, Chip, Input, Spinner, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { ExternalLink, Plus, RefreshCw } from "lucide-react";
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
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

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
      const link = await api.createNavigationLink({ title: nextTitle, description: nextDescription, url: nextUrl });
      notify.success(`已添加导航链接：${link.title}`);
      setTitle("");
      setDescription("");
      setUrl("");
      await refresh();
    } catch (error) {
      notify.error(errorText(error, "添加失败"));
    } finally {
      setLoading(false);
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
          <h2 className="text-2xl font-semibold">赛事导航</h2>
        </div>

        <Card className="rounded-md">
          <CardHeader>
            <h3 className="font-semibold">新增导航链接</h3>
          </CardHeader>
          <CardBody className="grid gap-3 md:grid-cols-[1fr_1fr]">
            <Input label="链接名称" placeholder="赛程安排" value={title} onValueChange={setTitle} />
            <Input label="跳转地址" placeholder="/p/dashboard 或 https://example.com" value={url} onValueChange={setUrl} />
            <Input className="md:col-span-2" label="说明" placeholder="显示在导航卡片上的简短说明" value={description} onValueChange={setDescription} />
            <div className="flex gap-2 md:col-span-2">
              <Button color="primary" startContent={<Plus size={16} />} isLoading={loading} onPress={createLink}>
                添加导航链接
              </Button>
              <Button variant="flat" startContent={<RefreshCw size={16} />} isLoading={listLoading} onPress={refresh}>
                刷新
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card className="rounded-md">
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
                <TableColumn>状态</TableColumn>
                <TableColumn>排序</TableColumn>
                <TableColumn>创建时间</TableColumn>
                <TableColumn>更新时间</TableColumn>
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
                      <Chip size="sm" color={row.enabled ? "success" : "default"} variant="flat">
                        {row.enabled ? "启用" : "停用"}
                      </Chip>
                    </TableCell>
                    <TableCell>{row.sortOrder}</TableCell>
                    <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                    <TableCell>{formatDateTime(row.updatedAt)}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      </section>
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
