import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages: https://zjljessey.github.io/Test/TestMail/
  base: "/Test/TestMail/",
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true
  }
});
