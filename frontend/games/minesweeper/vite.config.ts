import angular from "@analogjs/vite-plugin-angular";
import { fuzzleyStyle } from "@fz/style/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [angular(), fuzzleyStyle()],
  server: {
    port: 9000,
    open: true,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
