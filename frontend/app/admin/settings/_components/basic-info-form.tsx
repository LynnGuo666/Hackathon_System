import { Input, Select, SelectItem } from "@heroui/react";
import { DEFAULT_TIMEZONE, TIMEZONE_OPTIONS } from "@/web/lib/timezones";

export function BasicInfoForm({
  eventName,
  timezone,
  onEventNameChange,
  onTimezoneChange,
}: {
  eventName: string;
  timezone: string;
  onEventNameChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Input label="比赛名称" value={eventName} onValueChange={onEventNameChange} />
      <Select
        label="展示时区"
        selectedKeys={[timezone]}
        onSelectionChange={(keys) => onTimezoneChange(String(Array.from(keys)[0] ?? DEFAULT_TIMEZONE))}
      >
        {TIMEZONE_OPTIONS.map((item) => (
          <SelectItem key={item.value}>{item.label}</SelectItem>
        ))}
      </Select>
    </div>
  );
}
