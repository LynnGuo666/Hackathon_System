import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
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
};

export default config;
