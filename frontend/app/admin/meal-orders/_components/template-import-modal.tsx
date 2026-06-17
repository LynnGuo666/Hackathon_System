"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Chip,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tab,
  Tabs,
  Textarea,
} from "@heroui/react";
import { FilePenLine, Plus, Trash2, Upload } from "lucide-react";
import { errorText, notify } from "@/components/toast";
import { api, type MealSupplyTemplatePreview } from "@/web/lib/api";
import { defaultDrinkOptions, defaultMealOptions, splitLines } from "./utils";

type SupplyKind = "meal" | "drink";

type SupplyDraft = {
  kind: SupplyKind;
  title: string;
  description: string;
  serviceDate: string;
  serviceTime: string;
  orderDeadline: string;
  optionsText: string;
  sortOrder: string;
};

const emptySupply = (kind: SupplyKind, index: number): SupplyDraft => ({
  kind,
  title: kind === "meal" ? `Day ${index} 午餐` : `Day ${index} 饮料补给`,
  description: "",
  serviceDate: "",
  serviceTime: "",
  orderDeadline: "",
  optionsText: kind === "meal" ? defaultMealOptions : defaultDrinkOptions,
  sortOrder: String(index * 10),
});

export function TemplateImportModal({
  isOpen,
  onOpenChange,
  onImported,
}: {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onImported: () => Promise<void>;
}) {
  const [supplies, setSupplies] = useState<SupplyDraft[]>([emptySupply("meal", 1), emptySupply("drink", 2)]);
  const [yaml, setYaml] = useState("");
  const [preview, setPreview] = useState<MealSupplyTemplatePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"visual" | "yaml">("visual");

  const generatedYaml = useMemo(() => buildTemplateYaml(supplies), [supplies]);

  useEffect(() => {
    if (isOpen) {
      setYaml(generatedYaml);
      setPreview(null);
      setMode("visual");
    }
  }, [generatedYaml, isOpen]);

  function updateSupply(index: number, patch: Partial<SupplyDraft>) {
    setSupplies((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
    setPreview(null);
  }

  function removeSupply(index: number) {
    setSupplies((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setPreview(null);
  }

  function addSupply(kind: SupplyKind) {
    setSupplies((current) => [...current, emptySupply(kind, current.length + 1)]);
    setPreview(null);
  }

  function syncYamlFromVisual() {
    setYaml(generatedYaml);
    setPreview(null);
    setMode("yaml");
  }

  function syncVisualFromYaml() {
    const parsed = parseTemplateYaml(yaml);
    if (parsed.length === 0) {
      notify.error("未解析到 supplies，请检查 YAML 模板格式");
      return;
    }
    setSupplies(parsed);
    setPreview(null);
    setMode("visual");
  }

  async function runPreview() {
    const content = mode === "visual" ? generatedYaml : yaml;
    if (!content.trim()) {
      notify.error("请填写导入模板");
      return;
    }
    setLoading(true);
    try {
      const result = await api.previewMealSupplyTemplate({ content });
      setYaml(content);
      setPreview(result);
      notify.success("模板预览完成");
    } catch (error) {
      notify.error(errorText(error, "模板预览失败"));
    } finally {
      setLoading(false);
    }
  }

  async function importTemplate(onClose: () => void) {
    if (!preview) {
      notify.error("请先预览模板");
      return;
    }
    const content = mode === "visual" ? generatedYaml : yaml;
    setLoading(true);
    try {
      const result = await api.importMealSupplyTemplate({ content });
      setPreview(result);
      notify.success("模板已导入");
      await onImported();
      onClose();
    } catch (error) {
      notify.error(errorText(error, "模板导入失败"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} size="5xl" scrollBehavior="inside" onOpenChange={onOpenChange}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex items-start gap-3">
              <Upload size={20} className="mt-1 text-foreground/50" />
              <div>
                <h3 className="font-semibold">导入餐饮模板</h3>
                <p className="text-sm font-normal text-foreground/50">先预览变更，再确认导入。</p>
              </div>
            </ModalHeader>
            <ModalBody className="grid gap-4">
              <Tabs selectedKey={mode} variant="underlined" onSelectionChange={(key) => setMode(key as "visual" | "yaml")}>
                <Tab key="visual" title="可视化编辑">
                  <div className="grid gap-4 pt-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="flat" startContent={<Plus size={15} />} onPress={() => addSupply("meal")}>
                        餐食
                      </Button>
                      <Button size="sm" variant="flat" startContent={<Plus size={15} />} onPress={() => addSupply("drink")}>
                        饮料
                      </Button>
                      <Button size="sm" variant="flat" startContent={<FilePenLine size={15} />} onPress={syncYamlFromVisual}>
                        生成 YAML
                      </Button>
                    </div>
                    {supplies.map((item, index) => (
                      <div key={`${item.kind}-${index}`} className="grid gap-3 rounded-card border border-divider p-3 md:grid-cols-2">
                        <div className="md:col-span-2 flex items-center justify-between gap-3">
                          <Chip size="sm" variant="flat" color={item.kind === "meal" ? "primary" : "secondary"}>
                            {item.kind === "meal" ? "餐食" : "饮料"}
                          </Chip>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            color="danger"
                            aria-label="删除补给"
                            onPress={() => removeSupply(index)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                        <Input label="标题" value={item.title} onValueChange={(title) => updateSupply(index, { title })} />
                        <Input label="排序" type="number" value={item.sortOrder} onValueChange={(sortOrder) => updateSupply(index, { sortOrder })} />
                        <Input label="供应日期" type="date" value={item.serviceDate} onValueChange={(serviceDate) => updateSupply(index, { serviceDate })} />
                        <Input label="供应时间" type="time" value={item.serviceTime} onValueChange={(serviceTime) => updateSupply(index, { serviceTime })} />
                        <Input
                          label="提交截止时间"
                          type="datetime-local"
                          value={item.orderDeadline}
                          onValueChange={(orderDeadline) => updateSupply(index, { orderDeadline })}
                        />
                        <Textarea
                          label={item.kind === "meal" ? "忌口选项" : "饮料选项"}
                          description="每行一个选项"
                          minRows={3}
                          value={item.optionsText}
                          onValueChange={(optionsText) => updateSupply(index, { optionsText })}
                        />
                        <Textarea
                          className="md:col-span-2"
                          label="说明"
                          minRows={2}
                          value={item.description}
                          onValueChange={(description) => updateSupply(index, { description })}
                        />
                      </div>
                    ))}
                  </div>
                </Tab>
                <Tab key="yaml" title="YAML 源码">
                  <div className="grid gap-3 pt-3">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="flat" startContent={<FilePenLine size={15} />} onPress={syncVisualFromYaml}>
                        解析到表单
                      </Button>
                    </div>
                    <Textarea
                      minRows={18}
                      label="模板 YAML"
                      value={yaml}
                      onValueChange={(value) => {
                        setYaml(value);
                        setPreview(null);
                      }}
                    />
                  </div>
                </Tab>
              </Tabs>

              {preview && (
                <>
                  <Divider />
                  <div className="grid gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Chip color="success" variant="flat">创建 {preview.created}</Chip>
                      <Chip color="primary" variant="flat">更新 {preview.updated}</Chip>
                      <Chip variant="flat">跳过 {preview.skipped}</Chip>
                      <Chip color={preview.errors.length ? "danger" : "default"} variant="flat">错误 {preview.errors.length}</Chip>
                    </div>
                    {preview.errors.length > 0 && (
                      <div className="rounded-card border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                        {preview.errors.map((item) => (
                          <p key={item}>{item}</p>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                取消
              </Button>
              <Button variant="flat" isLoading={loading} onPress={runPreview}>
                预览
              </Button>
              <Button color="primary" startContent={<Upload size={16} />} isDisabled={!preview} isLoading={loading} onPress={() => importTemplate(onClose)}>
                确认导入
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

function buildTemplateYaml(supplies: SupplyDraft[]) {
  const lines = ["supplies:"];
  for (const item of supplies) {
    const optionsKey = item.kind === "meal" ? "dietaryOptions" : "drinkOptions";
    lines.push(`  - kind: ${item.kind}`);
    lines.push(`    title: ${quoteYaml(item.title)}`);
    lines.push(`    description: ${quoteYaml(item.description)}`);
    lines.push(`    serviceDate: ${quoteYaml(item.serviceDate)}`);
    lines.push(`    serviceTime: ${quoteYaml(item.serviceTime)}`);
    lines.push(`    orderDeadline: ${quoteYaml(item.orderDeadline)}`);
    lines.push(`    enabled: true`);
    lines.push(`    isOpen: true`);
    lines.push(`    sortOrder: ${Number.parseInt(item.sortOrder, 10) || 0}`);
    lines.push(`    ${optionsKey}:`);
    for (const option of splitLines(item.optionsText)) {
      lines.push(`      - ${quoteYaml(option)}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function quoteYaml(value: string) {
  return JSON.stringify(value.trim());
}

function parseTemplateYaml(value: string): SupplyDraft[] {
  const supplies: SupplyDraft[] = [];
  let current: Partial<SupplyDraft> | null = null;
  let optionKey: "dietaryOptions" | "drinkOptions" | null = null;
  let options: string[] = [];

  function flush() {
    if (!current?.title) {
      return;
    }
    supplies.push({
      kind: current.kind ?? (optionKey === "drinkOptions" ? "drink" : "meal"),
      title: current.title ?? "",
      description: current.description ?? "",
      serviceDate: current.serviceDate ?? "",
      serviceTime: current.serviceTime ?? "",
      orderDeadline: current.orderDeadline ?? "",
      optionsText: options.join("\n"),
      sortOrder: current.sortOrder ?? "0",
    });
  }

  for (const rawLine of value.split("\n")) {
    const line = rawLine.trim();
    if (!line || line === "supplies:") {
      continue;
    }
    if (line.startsWith("- kind:")) {
      flush();
      current = { kind: parseScalar(line.slice("- kind:".length)) === "drink" ? "drink" : "meal" };
      optionKey = null;
      options = [];
      continue;
    }
    if (!current) {
      continue;
    }
    if (line === "dietaryOptions:" || line === "drinkOptions:") {
      optionKey = line === "drinkOptions:" ? "drinkOptions" : "dietaryOptions";
      current.kind = optionKey === "drinkOptions" ? "drink" : "meal";
      options = [];
      continue;
    }
    if (line.startsWith("- ") && optionKey) {
      options.push(parseScalar(line.slice(2)));
      continue;
    }
    const separator = line.indexOf(":");
    if (separator < 0) {
      continue;
    }
    const key = line.slice(0, separator);
    const scalar = parseScalar(line.slice(separator + 1));
    if (key === "title" || key === "description" || key === "serviceDate" || key === "serviceTime" || key === "orderDeadline") {
      current[key] = scalar;
    }
    if (key === "sortOrder") {
      current.sortOrder = scalar || "0";
    }
  }
  flush();
  return supplies;
}

function parseScalar(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}
