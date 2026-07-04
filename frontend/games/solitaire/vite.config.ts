import { defineConfig } from "vite";
import path from "path";
import angular from "@analogjs/vite-plugin-angular";

export default defineConfig({
  base: "./",
  plugins: [angular()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 9000,
    open: true,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/phaser")) {
            return "phaser";
          }
        },
      },
    },
  },
});
