import { defineConfig } from "vite";

export default defineConfig({
  // path relatif supaya hasil build tetap jalan saat di-host di subfolder
  // (GitHub Pages project site) maupun dibuka langsung dari disk.
  base: "./",
  server: { port: 5173 },
  build: { outDir: "dist", assetsDir: "assets" }
});
