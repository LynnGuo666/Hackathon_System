const { heroui } = require("@heroui/theme");

module.exports = heroui({
  themes: {
    light: {
      colors: {
        primary: "#2563eb",
        secondary: "#0f766e",
        background: "#f8fafc",
        foreground: "#172026",
        content1: "#ffffff",
        content2: "#eef4f3",
        divider: "#1f2937",
      },
    },
    dark: {
      colors: {
        primary: "#60a5fa",
        secondary: "#2dd4bf",
        background: "#0f172a",
        foreground: "#e5eef8",
        content1: "#182235",
        content2: "#223047",
        divider: "#ffffff",
      },
    },
  },
});
