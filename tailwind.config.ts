import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5d9e2",
          300: "#aeb5c4",
          400: "#7d8597",
          500: "#5a6172",
          600: "#444a59",
          700: "#363b48",
          800: "#23262f",
          900: "#161820",
        },
      },
    },
  },
  plugins: [],
};

export default config;
