"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardBody, CardHeader, Chip, Input, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from "@heroui/react";
import { ExternalLink, Plus, RefreshCw } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { api, type FeatureLink } from "@/web/lib/api";

export default function AdminFeaturesPage() {
  const [links, setLinks] = useState<FeatureLink[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    try {
      setLinks(await api.adminFeatureLinks());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "读取功能入口失败");
    }
  }

  async function createLink() {
    setLoading(true);
    setMessage("");
    try {
      const link = await api.createFeatureLink({ title, description, url });
      setMessage(`已添加功能入口：${link.title}`);
      setTitle("");
      setDescription("");
      setUrl("");
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "添加失败");
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
            <p className="text-sm text-foreground/60">actionable features</p>
            <h2 className="text-2xl font-semibold">功能入口配置</h2>
            <p className="mt-1 text-sm text-foreground/60">
              管理选手可以办理的事项，例如需求收集、点餐、住宿需求和资源发放。
            </p>
          </div>

          <Card className="rounded-md">
            <CardHeader>
              <div>
                <h3 className="font-semibold">新增功能入口</h3>
                <p className="text-sm text-foreground/60">功能入口应指向一个可操作页面，而不是赛事文档或资料链接。</p>
              </div>
            </CardHeader>
            <CardBody className="grid gap-3 md:grid-cols-[1fr_1fr]">
              <Input label="功能名称" placeholder="点餐登记" value={title} onValueChange={setTitle} />
              <Input label="办理地址" placeholder="/p/resources 或 https://example.com/form" value={url} onValueChange={setUrl} />
              <Input className="md:col-span-2" label="说明" placeholder="告诉选手这个功能可以办理什么" value={description} onValueChange={setDescription} />
              <div className="flex gap-2 md:col-span-2">
                <Button color="primary" startContent={<Plus size={16} />} isLoading={loading} onPress={createLink}>
                  添加功能入口
                </Button>
                <Button variant="flat" startContent={<RefreshCw size={16} />} onPress={refresh}>
                  刷新
                </Button>
              </div>
              {message && <p className="text-sm text-foreground/70 md:col-span-2">{message}</p>}
            </CardBody>
          </Card>

          <Card className="rounded-md">
            <CardHeader className="justify-between gap-4">
              <div>
                <h3 className="font-semibold">已配置功能</h3>
                <p className="text-sm text-foreground/60">当前支持新增和查看；编辑、停用、排序后续再补接口。</p>
              </div>
              <Chip variant="flat">{links.length} 个功能</Chip>
            </CardHeader>
            <CardBody>
              <Table aria-label="功能入口配置">
                <TableHeader>
                  <TableColumn>名称</TableColumn>
                  <TableColumn>地址</TableColumn>
                  <TableColumn>说明</TableColumn>
                  <TableColumn>状态</TableColumn>
                  <TableColumn>排序</TableColumn>
                </TableHeader>
                <TableBody items={links}>
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
