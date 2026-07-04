import { defineConfig } from "vitest/config";
import path from "path";
import angular from "@analogjs/vite-plugin-angular";

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["test/test-setup.ts"],
    include: ["test/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
  resolve: {
    alias: [
      {
        find: /^@test\//,
        replacement: path.resolve(__dirname, "./test") + "/",
      },
      { find: /^@\//, replacement: path.resolve(__dirname, "./src") + "/" },
    ],
  },
});
