import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  base: mode === "github-pages" ? "/cell-game/" : "/",
  plugins: [react()],
  server: {
    port: 5173
  },
  build: {
    target: "es2020"
  }
}));
