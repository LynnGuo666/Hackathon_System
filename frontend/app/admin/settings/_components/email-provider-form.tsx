"use client";

import { useEffect, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Spinner,
  Switch,
} from "@heroui/react";
import { Save } from "lucide-react";
import { errorText, notify } from "@/components/toast";
import { api, type SiteConfig } from "@/web/lib/api";

const PROVIDER_OPTIONS = [
  { value: "disabled", label: "禁用（不发送邮件）" },
  { value: "smtp", label: "SMTP" },
  { value: "http", label: "HTTP 邮件服务" },
];

const SECURITY_OPTIONS = [
  { value: "starttls", label: "STARTTLS" },
  { value: "ssl", label: "SSL" },
  { value: "none", label: "无加密" },
];

export function EmailProviderForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [provider, setProvider] = useState("disabled");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [smtpSecurity, setSmtpSecurity] = useState("starttls");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpPasswordSet, setSmtpPasswordSet] = useState(false);
  const [serviceUrl, setServiceUrl] = useState("");
  const [serviceAccountId, setServiceAccountId] = useState("");
  const [serviceSync, setServiceSync] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiKeySet, setApiKeySet] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const [config, secretsResp] = await Promise.all([
        api.siteConfig(),
        api.emailSecrets(),
      ]);
      setProvider(config.emailProvider || "disabled");
      setSmtpHost(config.smtpHost || "");
      setSmtpPort(String(config.smtpPort || 587));
      setSmtpUsername(config.smtpUsername || "");
      setSmtpFrom(config.smtpFrom || "");
      setSmtpSecurity(config.smtpSecurity || "starttls");
      setServiceUrl(config.emailServiceUrl || "");
      setServiceAccountId(config.emailServiceAccountId || "");
      setServiceSync(config.emailServiceSync ?? false);

      const secretKeys = secretsResp.keys || [];
      setSmtpPasswordSet(secretKeys.includes("smtp_password"));
      setApiKeySet(secretKeys.includes("email_service_api_key"));
    } catch (error) {
      notify.error(errorText(error, "读取邮件配置失败"));
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const current = await api.siteConfig();
      await api.updateSiteConfig({
        ...current,
        emailProvider: provider,
        smtpHost,
        smtpPort: parseInt(smtpPort, 10) || 587,
        smtpUsername,
        smtpFrom,
        smtpSecurity,
        emailServiceUrl: serviceUrl,
        emailServiceAccountId: serviceAccountId,
        emailServiceSync: serviceSync,
      });

      if (smtpPassword) {
        await api.setEmailSecret("smtp_password", smtpPassword);
        setSmtpPassword("");
        setSmtpPasswordSet(true);
      }
      if (apiKey) {
        await api.setEmailSecret("email_service_api_key", apiKey);
        setApiKey("");
        setApiKeySet(true);
      }

      notify.success("邮件配置已保存");
    } catch (error) {
      notify.error(errorText(error, "保存邮件配置失败"));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  if (loading) return <Spinner label="正在读取邮件配置" />;

  return (
    <Card classNames={{ base: "rounded-card" }}>
      <CardBody className="grid gap-5">
        <h3 className="font-semibold">邮件发送配置</h3>

        <Select
          label="邮件 Provider"
          selectedKeys={[provider]}
          onSelectionChange={(keys) => setProvider(String(Array.from(keys)[0] ?? "disabled"))}
        >
          {PROVIDER_OPTIONS.map((item) => (
            <SelectItem key={item.value}>{item.label}</SelectItem>
          ))}
        </Select>

        {provider === "smtp" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="SMTP 主机" value={smtpHost} onValueChange={setSmtpHost} placeholder="smtp.example.com" />
            <Input label="SMTP 端口" type="number" value={smtpPort} onValueChange={setSmtpPort} />
            <Input label="SMTP 用户名" value={smtpUsername} onValueChange={setSmtpUsername} />
            <Input label="发件人地址" value={smtpFrom} onValueChange={setSmtpFrom} placeholder="noreply@example.com" />
            <Select
              label="安全方式"
              selectedKeys={[smtpSecurity]}
              onSelectionChange={(keys) => setSmtpSecurity(String(Array.from(keys)[0] ?? "starttls"))}
            >
              {SECURITY_OPTIONS.map((item) => (
                <SelectItem key={item.value}>{item.label}</SelectItem>
              ))}
            </Select>
            <Input
              label="SMTP 密码"
              type="password"
              value={smtpPassword}
              onValueChange={setSmtpPassword}
              placeholder={smtpPasswordSet ? "已设置（留空则不修改）" : "未设置"}
            />
          </div>
        )}

        {provider === "http" && (
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="邮件服务 URL"
              value={serviceUrl}
              onValueChange={setServiceUrl}
              placeholder="http://localhost:8080"
              className="md:col-span-2"
            />
            <Input label="Account ID" value={serviceAccountId} onValueChange={setServiceAccountId} placeholder="acc_demo01" />
            <div className="flex items-center">
              <Switch isSelected={serviceSync} onValueChange={setServiceSync}>
                同步模式
              </Switch>
            </div>
            <Input
              label="API Key"
              type="password"
              value={apiKey}
              onValueChange={setApiKey}
              placeholder={apiKeySet ? "已设置（留空则不修改）" : "未设置"}
              className="md:col-span-2"
            />
          </div>
        )}

        <div className="flex justify-end">
          <Button color="primary" startContent={<Save size={16} />} isLoading={saving} onPress={save}>
            保存
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
