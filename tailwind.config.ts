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
          dark: "#08090d",
          card: "#12141c",
          cardHover: "#1b1e2a",
          border: "#232738",
          muted: "#8e95ab",
          accent: "#8b5cf6", // Purple/violet primary
          accentGlow: "rgba(139, 92, 246, 0.35)",
          teal: "#06b6d4",
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
