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
    <Tooltip content={isDark ? "切换浅色" : "切换深色"}>
      <Button
        isIconOnly
        aria-label={isDark ? "切换浅色" : "切换深色"}
        size="sm"
        variant="flat"
        onPress={() => setTheme(isDark ? "light" : "dark")}
      >
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
      </Button>
    </Tooltip>
  );
}
