import { defineConfig, type Plugin } from "vite";
import path from "path";
import angular from "@analogjs/vite-plugin-angular";

/** Intercepts browser requests for favicon.ico in dev server to prevent 404 console errors. */
function silenceFavicon(): Plugin {
  return {
    name: "silence-favicon-404",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] === "/favicon.ico") {
          res.statusCode = 204;
          res.end();
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: "./",
  plugins: [angular(), silenceFavicon()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
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
