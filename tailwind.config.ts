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
          dark: "#0B0A10",
          surface: "#13111B",
          surfaceElevated: "#1C1928",
          card: "#13111B",
          cardHover: "#1C1928",
          border: "rgba(255, 255, 255, 0.08)",
          glass: "rgba(255, 255, 255, 0.06)",
          glassBorder: "rgba(255, 255, 255, 0.12)",
          muted: "#B9B2C6",
          subtle: "#7C7690",
          accent: "#7A5CFF", // Indigo Brand Accent
          turmeric: "#FF8A3D",
          rose: "#FF3D77",
          teal: "#20C7E8",
          secondary: "#FF3D77",
          emerald: "#10b981",
          amber: "#FF8A3D",
        },
      },
      fontFamily: {
        display: [
          "Plus Jakarta Sans",
          "Inter",
          "Noto Sans Tamil",
          "sans-serif",
        ],
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Noto Sans Tamil",
          "sans-serif",
        ],
        tamil: ["Noto Sans Tamil", "Inter", "sans-serif"],
      },
      transitionTimingFunction: {
        editorial: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 12s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
