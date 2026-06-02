"use client";

import { useEffect, useState } from "react";

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

export function Countdown({ endISO, title }: { endISO: string; title?: string }) {
  const [remaining, setRemaining] = useState(() => calcRemaining(endISO));

  useEffect(() => {
    const timer = setInterval(() => setRemaining(calcRemaining(endISO)), 1000);
    return () => clearInterval(timer);
  }, [endISO]);

  const blocks = [
    { value: remaining.days, label: "天" },
    { value: remaining.hours, label: "时" },
    { value: remaining.minutes, label: "分" },
    { value: remaining.seconds, label: "秒" },
  ];

  return (
    <div className="flex flex-col items-center gap-4">
      {title && <p className="text-lg font-medium text-foreground/70">{title}</p>}
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
