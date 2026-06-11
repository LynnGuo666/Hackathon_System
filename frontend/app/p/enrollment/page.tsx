"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Spinner,
  Textarea,
} from "@heroui/react";
import { Save } from "lucide-react";
import { errorText, notify } from "@/components/toast";
import { api, type Enrollment, type EnrollmentInput } from "@/web/lib/api";

export default function EnrollmentPage() {
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EnrollmentInput>({
    fullName: "",
    email: "",
    phone: "",
    school: "",
    teamName: "",
    personalBio: "",
    projectDesc: "",
    participationHistory: "",
    githubUrl: "",
    portfolioUrl: "",
  });

  useEffect(() => {
    api
      .getEnrollment()
      .then((e) => {
        setEnrollment(e);
        setForm({
          fullName: e.fullName || "",
          email: e.email || "",
          phone: e.phone || "",
          school: e.school || "",
          teamName: e.teamName || "",
          personalBio: e.personalBio || "",
          projectDesc: e.projectDesc || "",
          participationHistory: e.participationHistory || "",
          githubUrl: e.githubUrl || "",
          portfolioUrl: e.portfolioUrl || "",
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function updateField<K extends keyof EnrollmentInput>(key: K, value: EnrollmentInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    setSaving(true);
    try {
      const result = await api.submitEnrollment(form);
      setEnrollment(result);
      notify.success("报名已提交");
    } catch (error) {
      notify.error(errorText(error, "提交失败"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner label="加载中" />
      </div>
    );
  }

  const isSubmitted = !!enrollment;

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-xs font-medium text-foreground/40">参赛报名</p>
        <h2 className="text-xl font-bold text-foreground">报名表单</h2>
      </div>

      {isSubmitted && (
        <Card classNames={{ base: "rounded-card shadow-sm" }}>
          <CardBody className="flex items-center gap-3 py-4">
            <p className="text-sm text-foreground/60">当前状态：</p>
            <Chip
              size="sm"
              color={
                enrollment.reviewStatus === "approved"
                  ? "success"
                  : enrollment.reviewStatus === "rejected"
                    ? "danger"
                    : "warning"
              }
              variant="flat"
            >
              {statusLabels[enrollment.reviewStatus]}
            </Chip>
            {enrollment.reviewStatus === "pending" && (
              <p className="text-xs text-foreground/40">等待管理员审核</p>
            )}
            {enrollment.reviewStatus === "initial_review" && (
              <p className="text-xs text-foreground/40">初审中</p>
            )}
            {enrollment.reviewStatus === "final_review" && (
              <p className="text-xs text-foreground/40">复审中</p>
            )}
          </CardBody>
        </Card>
      )}

      <Card classNames={{ base: "rounded-card shadow-sm" }}>
        <CardHeader className="block px-5 pt-5 pb-0">
          <h3 className="text-sm font-semibold text-foreground/60">基本信息</h3>
        </CardHeader>
        <CardBody className="grid gap-4 px-5 pb-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="姓名"
              placeholder="请输入真实姓名"
              value={form.fullName}
              onValueChange={(v) => updateField("fullName", v)}
              isRequired
            />
            <Input
              label="邮箱"
              placeholder="邮箱地址"
              value={form.email}
              isReadOnly
            />
            <Input
              label="手机号"
              placeholder="请输入手机号码"
              value={form.phone}
              onValueChange={(v) => updateField("phone", v)}
            />
            <Input
              label="学校/公司"
              placeholder="学校名称或公司名称"
              value={form.school}
              onValueChange={(v) => updateField("school", v)}
            />
            <Input
              label="队伍名"
              placeholder="你的队伍名称"
              value={form.teamName}
              onValueChange={(v) => updateField("teamName", v)}
            />
          </div>
        </CardBody>
      </Card>

      <Card classNames={{ base: "rounded-card shadow-sm" }}>
        <CardHeader className="block px-5 pt-5 pb-0">
          <h3 className="text-sm font-semibold text-foreground/60">详细介绍</h3>
        </CardHeader>
        <CardBody className="grid gap-4 px-5 pb-5">
          <Textarea
            label="个人简介"
            placeholder="简单介绍一下你自己，包括技术背景、兴趣爱好等"
            value={form.personalBio}
            onValueChange={(v) => updateField("personalBio", v)}
            minRows={3}
          />
          <Textarea
            label="项目简介"
            placeholder="描述你计划在比赛中做什么项目"
            value={form.projectDesc}
            onValueChange={(v) => updateField("projectDesc", v)}
            minRows={3}
          />
          <Textarea
            label="参赛经历"
            placeholder="你之前参加过哪些比赛或活动？"
            value={form.participationHistory}
            onValueChange={(v) => updateField("participationHistory", v)}
            minRows={2}
          />
        </CardBody>
      </Card>

      <Card classNames={{ base: "rounded-card shadow-sm" }}>
        <CardHeader className="block px-5 pt-5 pb-0">
          <h3 className="text-sm font-semibold text-foreground/60">外部链接</h3>
        </CardHeader>
        <CardBody className="grid gap-4 px-5 pb-5">
          <Input
            label="GitHub"
            placeholder="https://github.com/username"
            value={form.githubUrl}
            onValueChange={(v) => updateField("githubUrl", v)}
          />
          <Input
            label="作品集"
            placeholder="https://your-portfolio.com"
            value={form.portfolioUrl}
            onValueChange={(v) => updateField("portfolioUrl", v)}
          />
        </CardBody>
      </Card>

      <div>
        <Button
          color="primary"
          size="sm"
          startContent={<Save size={14} />}
          isLoading={saving}
          onPress={submit}
        >
          {isSubmitted ? "更新报名" : "提交报名"}
        </Button>
      </div>
    </section>
  );
}

const statusLabels: Record<string, string> = {
  pending: "待审核",
  initial_review: "初审中",
  final_review: "复审中",
  approved: "已通过",
  rejected: "已拒绝",
};
