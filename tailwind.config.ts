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
        // Neutrals & Structure
        sidebar: "#172B4D",
        canvas: "#F7F8F9",
        surface: "#FFFFFF",
        border: "#DDDEE1",
        ink: "#172B4D",
        subtle: "#44546F",
        muted: "#626F86",
        selected: "#E9F2FE",

        // Brand (Primary action only)
        primary: {
          DEFAULT: "#1868DB",
          hover: "#1558BC",
          soft: "#E9F2FE",
          dark: "#0F2A5C",
          50: "#E9F2FE",
        },

        // Status & Meaning tokens
        success: {
          DEFAULT: "#22A06B",
          soft: "#DCFFF1",
          text: "#216E4E",
          50: "#DCFFF1",
        },
        overlap: {
          DEFAULT: "#C75300",
          soft: "#FFF1E5",
          text: "#A54800",
          50: "#FFF1E5",
        },
        sla: {
          DEFAULT: "#CF9F02",
          soft: "#FFF7D6",
          text: "#7F5F01",
          50: "#FFF7D6",
        },
        danger: {
          DEFAULT: "#C9372C",
          soft: "#FFECEB",
          text: "#AE2E24",
          50: "#FFECEB",
        },
        info: {
          DEFAULT: "#1868DB",
          soft: "#E9F2FE",
          text: "#0C4FB0",
        },
        neutral: {
          DEFAULT: "#626F86",
          soft: "#F1F2F4",
          text: "#44546F",
        },
        warning: {
          DEFAULT: "#C75300",
          soft: "#FFF1E5",
          text: "#A54800",
          50: "#FFF1E5",
        },

        // Bureau / Cell Identity Badges
        bureau: {
          rb: "#1868DB",
          pgrc: "#803FA5",
          ab: "#2898BD",
          lc: "#C9468D",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23,43,77,.05)",
        pop: "0 8px 24px rgba(23,43,77,.12)",
      },
    },
  },
  plugins: [],
};

export default config;
