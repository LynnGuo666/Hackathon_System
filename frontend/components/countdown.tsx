"use client";

import { useEffect, useState } from "react";
import type { CountdownStage } from "@/web/lib/api";

function calcRemaining(endISO: string) {
  const end = new Date(endISO).getTime();
  const now = Date.now();
  const diff = Math.max(0, end - now);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, finished: diff === 0 };
}

function findCurrentStage(stages: CountdownStage[]) {
  const now = Date.now();
  return stages
    .filter((stage) => stage.time && new Date(stage.time).getTime() > now)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())[0] ?? null;
}

export function Countdown({
  eventName = "Hackathon",
  stages,
  endISO = "",
  title,
}: {
  eventName?: string;
  stages?: CountdownStage[];
  endISO?: string;
  title?: string;
}) {
  const normalizedStages = stages?.length
    ? stages
    : endISO
      ? [{ id: "legacy", label: title || "开赛", time: endISO }]
      : [];
  const [currentStage, setCurrentStage] = useState(() => findCurrentStage(normalizedStages));
  const [remaining, setRemaining] = useState(() => calcRemaining(currentStage?.time ?? ""));

  useEffect(() => {
    const tick = () => {
      const nextStage = findCurrentStage(normalizedStages);
      setCurrentStage(nextStage);
      setRemaining(calcRemaining(nextStage?.time ?? ""));
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [JSON.stringify(normalizedStages)]);

  const blocks = [
    { value: remaining.days, label: "天" },
    { value: remaining.hours, label: "时" },
    { value: remaining.minutes, label: "分" },
    { value: remaining.seconds, label: "秒" },
  ];

  if (normalizedStages.length === 0) {
    return null;
  }

  if (!currentStage) {
    return (
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-lg font-medium text-foreground/70">{eventName} 已完赛</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-lg font-medium text-foreground/70">
        距离 {eventName}@{currentStage.label} 还有
      </p>
      <div className="flex items-center gap-3 sm:gap-5">
        {blocks.map((block, i) => (
          <div key={block.label} className="flex items-center gap-3 sm:gap-5">
            <div className="flex flex-col items-center">
              <span className="text-4xl font-bold tabular-nums sm:text-6xl">
                {String(block.value).padStart(2, "0")}
              </span>
              <span className="mt-1 text-xs text-foreground/50 sm:text-sm">{block.label}</span>
            </div>
            {i < blocks.length - 1 && (
              <span className="mb-5 text-2xl font-light text-foreground/30">:</span>
            )}
          </div>
        ))}
      </div>
      {remaining.finished && (
        <p className="text-sm text-foreground/60">倒计时已结束</p>
      )}
    </div>
  );
}
