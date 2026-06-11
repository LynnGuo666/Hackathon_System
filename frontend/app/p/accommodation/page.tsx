"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardBody, CardHeader, Checkbox, CheckboxGroup, Input, Spinner } from "@heroui/react";
import { Save } from "lucide-react";
import { errorText, notify } from "@/components/toast";
import { api, type AccommodationOption } from "@/web/lib/api";

const OPTIONS: { value: AccommodationOption; label: string }[] = [
  { value: "sleeping_bag", label: "睡袋" },
  { value: "tent", label: "帐篷" },
  { value: "blanket", label: "毯子" },
  { value: "hotel", label: "酒店住宿（可能需要自费，请以主办方信息为准）" },
  { value: "other", label: "其他" },
];

export default function AccommodationPage() {
  const [selections, setSelections] = useState<AccommodationOption[]>([]);
  const [otherDetail, setOtherDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    api.accommodation()
      .then((req) => {
        setSelections(req.selections || []);
        setOtherDetail(req.otherDetail || "");
      })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  async function save() {
    setLoading(true);
    try {
      await api.updateAccommodation({ selections, otherDetail });
      notify.success("住宿需求已保存");
    } catch (error) {
      notify.error(errorText(error, "保存失败"));
    } finally {
      setLoading(false);
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner label="加载中" />
      </div>
    );
  }

  return (
    <section className="grid gap-6">
      <div>
        <p className="text-xs font-medium text-foreground/40">赛前需求</p>
        <h2 className="text-xl font-bold text-foreground">住宿需求</h2>
      </div>

      <Card classNames={{ base: "rounded-lg shadow-sm" }}>
        <CardHeader className="block px-5 pt-5 pb-0">
          <h3 className="text-sm font-semibold text-foreground/60">请选择你需要的住宿方式</h3>
          <p className="mt-1 text-xs text-foreground/40">可多选，请根据自己的实际情况勾选。</p>
        </CardHeader>
        <CardBody className="grid gap-4 px-5 pb-5">
          <CheckboxGroup
            value={selections}
            onValueChange={(values) => setSelections(values as AccommodationOption[])}
          >
            {OPTIONS.map((option) => (
              <Checkbox key={option.value} value={option.value}>
                {option.label}
              </Checkbox>
            ))}
          </CheckboxGroup>

          {selections.includes("other") && (
            <Input
              label="请说明其他住宿需求"
              placeholder="例如：需要无障碍房间"
              value={otherDetail}
              onValueChange={setOtherDetail}
            />
          )}

          <div>
            <Button color="primary" size="sm" startContent={<Save size={14} />} isLoading={loading} onPress={save}>
              保存
            </Button>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
