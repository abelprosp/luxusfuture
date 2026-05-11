import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        luxus: {
          bg: "#F2F2F0",
          primary: "#5D7365",
          "primary-dark": "#4a5e52",
          card: "#FFFFFF",
          muted: "#6B7280",
          border: "#E8E8E4",
        },
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      boxShadow: {
        card: "0 4px 24px rgba(45, 55, 50, 0.06)",
        soft: "0 2px 12px rgba(45, 55, 50, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
