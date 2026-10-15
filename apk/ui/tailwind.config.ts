import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: "#F6C00A",
        rust: "#D4893F",
        teal: "#4B9B8E",
        cream: "#181A13",
        "bg-dark": "#0F0B1E",
        "bg-card": "#1C1638",
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
        serif: ["var(--font-playfair)"],
      },
    },
  },
  plugins: [],
};

export default config;
