import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        inisai: {
          dark: "#080A12",
          surface: "#101522",
          surfaceElevated: "#171D2C",
          card: "#121624",
          cardHover: "#181D30",
          border: "rgba(255, 255, 255, 0.08)",
          glass: "rgba(255, 255, 255, 0.05)",
          glassBorder: "rgba(255, 255, 255, 0.10)",
          muted: "#A5AABD",
          accent: "#9565FF", // Aurora Violet
          accentGlow: "rgba(149, 101, 255, 0.35)",
          teal: "#20C7E8",   // Electric Cyan
          secondary: "#20C7E8",
          emerald: "#10b981",
          rose: "#f43f5e",
          amber: "#f59e0b",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Noto Sans Tamil",
          "sans-serif",
        ],
        tamil: ["Noto Sans Tamil", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 12s linear infinite",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;

