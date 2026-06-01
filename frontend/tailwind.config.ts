import { heroui } from "@heroui/react";
import type { Config } from "tailwindcss";
import type { PluginAPI } from "tailwindcss/types/config";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        paper: "#f6f4ef",
        field: "#e7f0ef",
        signal: "#cc4836",
        moss: "#4f6f52",
      },
    },
  },
  plugins: [heroui() as unknown as { handler: (api: PluginAPI) => void }],
};

export default config;
