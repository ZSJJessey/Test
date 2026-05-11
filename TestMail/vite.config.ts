import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages project URL: https://<user>.github.io/Test/
  base: "https://zsjjessey.github.io/Test/TestMail/",
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true
  }
});
