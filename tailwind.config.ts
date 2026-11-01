import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1D4ED8",
          dark: "#0F2A5C",
          50: "#EFF4FF",
        },
        ink: "#0F172A",
        muted: "#64748B",
        border: "#E5E9F0",
        canvas: "#F7F9FC",
        surface: "#FFFFFF",
        success: {
          DEFAULT: "#15803D",
          50: "#E8F5EC",
        },
        warning: {
          DEFAULT: "#B45309",
          50: "#FEF3E2",
        },
        danger: {
          DEFAULT: "#B91C1C",
          50: "#FDECEC",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.04)",
        pop: "0 8px 24px rgba(15,23,42,.08)",
      },
    },
  },
  plugins: [],
};

export default config;

