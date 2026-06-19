import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        marrow: "#fff4df",
        plasma: "#fef7ed",
        antibody: "#27c5d8",
        cytokine: "#f4b740",
        lymph: "#6f64ff",
        danger: "#f05454",
        organ: "#ff7aa2",
        tissue: "#ffe1e9"
      },
      boxShadow: {
        soft: "0 18px 50px rgba(31, 45, 92, 0.12)"
      }
    }
  },
  plugins: []
} satisfies Config;
