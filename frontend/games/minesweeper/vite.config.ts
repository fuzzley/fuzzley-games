import angular from "@analogjs/vite-plugin-angular";
import { fuzzleyStyle } from "@fz/style/vite";
import { defineConfig, type Plugin } from "vite";

/** Answers the dev server's favicon requests with no content, rather than a 404. */
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
  plugins: [angular(), silenceFavicon(), fuzzleyStyle()],
  server: {
    port: 9000,
    open: true,
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
});
