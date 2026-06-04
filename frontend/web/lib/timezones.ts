export const TIMEZONE_OPTIONS = [
  { value: "Asia/Shanghai", label: "北京时间 UTC+8" },
  { value: "UTC", label: "协调世界时 UTC+0" },
  { value: "Asia/Tokyo", label: "东京时间 UTC+9" },
  { value: "Asia/Singapore", label: "新加坡时间 UTC+8" },
  { value: "Europe/London", label: "伦敦时间 UTC+0/UTC+1" },
  { value: "America/Los_Angeles", label: "洛杉矶时间 UTC-8/UTC-7" },
  { value: "America/New_York", label: "纽约时间 UTC-5/UTC-4" },
];

export const DEFAULT_TIMEZONE = "Asia/Shanghai";

export function isAllowedTimezone(value: string) {
  return TIMEZONE_OPTIONS.some((item) => item.value === value);
}

export function normalizeTimezone(value?: string) {
  return value && isAllowedTimezone(value) ? value : DEFAULT_TIMEZONE;
}

export function toZonedDateTimeLocal(value: string, timezone: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const parts = zonedParts(date, timezone);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function fromZonedDateTimeLocal(value: string, timezone: string) {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  let utcTime = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );

  // 用两轮偏移修正处理日期跨天和夏令时边界。
  for (let i = 0; i < 2; i += 1) {
    const offset = getTimezoneOffsetMs(new Date(utcTime), timezone);
    utcTime = Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    ) - offset;
  }
  return new Date(utcTime).toISOString();
}

function getTimezoneOffsetMs(date: Date, timezone: string) {
  const parts = zonedParts(date, timezone);
  const zonedAsUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return zonedAsUTC - date.getTime();
}

function zonedParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizeTimezone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour,
    minute: parts.minute,
    second: parts.second,
  };
}
