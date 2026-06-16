"use client";

import { useEffect, useMemo, useState } from "react";
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
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
} from "@heroui/react";
import { CheckCircle, RefreshCw, XCircle } from "lucide-react";
import { AdminAuthGuard } from "@/components/admin-auth-guard";
import { AppShell } from "@/components/app-shell";
import { errorText, notify } from "@/components/toast";
import { api, type Enrollment, type EnrollmentReviewStatus } from "@/web/lib/api";

const statusFilters = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待审核" },
  { key: "initial_review", label: "初审中" },
  { key: "final_review", label: "复审中" },
  { key: "approved", label: "已通过" },
  { key: "rejected", label: "已拒绝" },
];

const statusLabels: Record<EnrollmentReviewStatus, string> = {
  pending: "待审核",
  initial_review: "初审中",
  final_review: "复审中",
  approved: "已通过",
  rejected: "已拒绝",
};

const statusColors: Record<EnrollmentReviewStatus, "default" | "primary" | "warning" | "success" | "danger"> = {
  pending: "default",
  initial_review: "primary",
  final_review: "warning",
  approved: "success",
  rejected: "danger",
};

export default function AdminEnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [detail, setDetail] = useState<Enrollment | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);

  async function refresh() {
    setLoading(true);
    setLoadError("");
    try {
      setEnrollments(await api.listEnrollments(filter));
    } catch (error) {
      const message = errorText(error, "读取报名列表失败");
      setLoadError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [filter]);

  async function review(approve: boolean) {
    if (!detail) return;
    setReviewing(true);
    try {
      const isInitialReview = detail.reviewStatus === "pending";
      if (isInitialReview) {
        await api.initialReview(detail.id, approve, reviewNote);
      } else {
        await api.finalReview(detail.id, approve, reviewNote);
      }
      notify.success(approve ? "通过" : "已拒绝");
      setDetail(null);
      setReviewNote("");
      await refresh();
    } catch (error) {
      notify.error(errorText(error, "审核操作失败"));
    } finally {
      setReviewing(false);
    }
  }

  const rows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return enrollments.filter((e) => {
      const matchesQuery =
        !keyword ||
        [e.fullName, e.email, e.school, e.teamName, e.phone].some((v) =>
          v.toLowerCase().includes(keyword),
        );
      return matchesQuery;
    });
  }, [enrollments, query]);

  return (
    <AdminAuthGuard>
      <AppShell variant="admin">
        <section className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-foreground/40">运营功能</p>
              <h2 className="text-xl font-bold text-foreground">报名审核</h2>
            </div>
            <Button variant="flat" size="sm" startContent={<RefreshCw size={16} />} isLoading={loading} onPress={refresh}>
              刷新
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <Input label="搜索" value={query} onValueChange={setQuery} />
            <Select
              label="状态筛选"
              selectedKeys={[filter]}
              onSelectionChange={(keys) => setFilter(Array.from(keys)[0]?.toString() || "all")}
            >
              {statusFilters.map((item) => <SelectItem key={item.key}>{item.label}</SelectItem>)}
            </Select>
          </div>

          <Table aria-label="报名列表">
            <TableHeader>
              <TableColumn>姓名</TableColumn>
              <TableColumn>邮箱</TableColumn>
              <TableColumn>学校/公司</TableColumn>
              <TableColumn>队伍</TableColumn>
              <TableColumn>状态</TableColumn>
              <TableColumn>提交时间</TableColumn>
              <TableColumn>操作</TableColumn>
            </TableHeader>
            <TableBody
              items={rows}
              isLoading={loading}
              loadingContent={<Spinner size="sm" label="正在读取报名列表..." />}
              emptyContent={loadError || (query || filter !== "all" ? "没有匹配的报名记录" : "暂无报名记录")}
            >
              {(row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.fullName || "-"}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.school || "-"}</TableCell>
                  <TableCell>{row.teamName || "-"}</TableCell>
                  <TableCell>
                    <Chip size="sm" color={statusColors[row.reviewStatus]} variant="flat">
                      {statusLabels[row.reviewStatus]}
                    </Chip>
                  </TableCell>
                  <TableCell>{formatDateTime(row.createdAt)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="flat" onPress={() => setDetail(row)}>
                      详情
                    </Button>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </section>

        <Modal isOpen={!!detail} onClose={() => setDetail(null)} size="2xl">
          <ModalContent>
            {detail && (
              <>
                <ModalHeader>
                  <div className="flex items-center gap-2">
                    <span>{detail.fullName || detail.email}</span>
                    <Chip size="sm" color={statusColors[detail.reviewStatus]} variant="flat">
                      {statusLabels[detail.reviewStatus]}
                    </Chip>
                  </div>
                </ModalHeader>
                <ModalBody>
                  <div className="grid gap-4">
                    <Section title="基本信息">
                      <InfoRow label="姓名" value={detail.fullName} />
                      <InfoRow label="邮箱" value={detail.email} />
                      <InfoRow label="手机" value={detail.phone} />
                      <InfoRow label="学校/公司" value={detail.school} />
                      <InfoRow label="队伍" value={detail.teamName} />
                    </Section>
                    <Section title="详细介绍">
                      <InfoRow label="个人简介" value={detail.personalBio} />
                      <InfoRow label="项目简介" value={detail.projectDesc} />
                      <InfoRow label="参赛经历" value={detail.participationHistory} />
                    </Section>
                    <Section title="外部链接">
                      <InfoRow label="GitHub" value={detail.githubUrl} />
                      <InfoRow label="作品集" value={detail.portfolioUrl} />
                    </Section>
                    <Section title="审核信息">
                      {detail.reviewStatus !== "pending" && (
                        <>
                          <InfoRow label="初审人" value={detail.initialReviewer} />
                          <InfoRow label="初审时间" value={formatDateTime(detail.initialReviewAt)} />
                          <InfoRow label="初审备注" value={detail.initialReviewNote} />
                        </>
                      )}
                      {detail.reviewStatus === "approved" || detail.reviewStatus === "rejected" ? (
                        <>
                          <InfoRow label="复审人" value={detail.finalReviewer} />
                          <InfoRow label="复审时间" value={formatDateTime(detail.finalReviewAt)} />
                          <InfoRow label="复审备注" value={detail.finalReviewNote} />
                        </>
                      ) : null}
                    </Section>
                    {(detail.reviewStatus === "pending" || detail.reviewStatus === "initial_review" || detail.reviewStatus === "final_review") && (
                      <div className="grid gap-2">
                        <Textarea
                          label="审核备注"
                          placeholder="填写审核意见（可选）"
                          value={reviewNote}
                          onValueChange={setReviewNote}
                          minRows={2}
                        />
                      </div>
                    )}
                  </div>
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={() => setDetail(null)}>
                    关闭
                  </Button>
                  {(detail.reviewStatus === "pending" || detail.reviewStatus === "initial_review" || detail.reviewStatus === "final_review") && (
                    <>
                      <Button
                        color="danger"
                        variant="flat"
                        startContent={<XCircle size={14} />}
                        isLoading={reviewing}
                        onPress={() => review(false)}
                      >
                        拒绝
                      </Button>
                      <Button
                        color="success"
                        startContent={<CheckCircle size={14} />}
                        isLoading={reviewing}
                        onPress={() => review(true)}
                      >
                        通过
                      </Button>
                    </>
                  )}
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </AppShell>
    </AdminAuthGuard>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1">
      <h4 className="text-xs font-semibold text-foreground/40">{title}</h4>
      <div className="grid gap-1">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 text-xs text-foreground/40">{label}</span>
      <span className="text-sm text-foreground">{value || "-"}</span>
    </div>
  );
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}
