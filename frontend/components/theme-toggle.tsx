"use client";

import { Button, Tooltip } from "@heroui/react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Tooltip content={isDark ? "切换浅色模式" : "切换深色模式"}>
      <Button
        isIconOnly
        aria-label={isDark ? "切换浅色模式" : "切换深色模式"}
        size="sm"
        variant="flat"
        onPress={() => setTheme(isDark ? "light" : "dark")}
        className="transition-colors"
      >
        <span className="transition-transform duration-200" style={{ transform: mounted ? "rotate(0deg)" : "rotate(-90deg)" }}>
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </span>
      </Button>
    </Tooltip>
  );
}
