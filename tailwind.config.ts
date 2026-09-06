import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#08080f",
        surface: "#0d0d16",
        raised: "#12121d",
        line: "rgba(255,255,255,0.07)",
        accent: "#f05828",
        violet: "#9272f0",
        mint: "#3dd68c",
        danger: "#f06060",
        muted: "#7d7d92",
      },
      fontFamily: {
        display: ["var(--font-display)", "Barlow Condensed", "sans-serif"],
        body: ["var(--font-body)", "Inter", "sans-serif"],
      },
      borderRadius: { card: "10px" },
      fontSize: { "2xs": "0.65rem" },
    },
  },
  plugins: [],
};
export default config;
