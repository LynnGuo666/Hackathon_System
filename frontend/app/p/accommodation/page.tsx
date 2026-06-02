"use client";

import { useEffect, useState } from "react";
import { Button, Card, CardBody, CardHeader, Checkbox, CheckboxGroup, Input, Spinner } from "@heroui/react";
import { Save } from "lucide-react";
import { errorText, notify } from "@/components/toast";
import { api, type AccommodationOption, type AccommodationRequest } from "@/web/lib/api";

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
      .catch(() => {
        // no existing record
      })
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
    return <Spinner label="加载中" />;
  }

  return (
    <section className="grid gap-5">
      <div>
        <p className="text-sm text-foreground/60">赛前需求</p>
        <h2 className="text-2xl font-semibold">住宿需求</h2>
      </div>

      <Card className="rounded-md">
        <CardHeader className="block">
          <h3 className="font-semibold">请选择你需要的住宿方式</h3>
          <p className="text-sm text-foreground/60">可多选，请根据自己的实际情况勾选。</p>
        </CardHeader>
        <CardBody className="grid gap-4">
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
            <Button color="primary" startContent={<Save size={16} />} isLoading={loading} onPress={save}>
              保存
            </Button>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
