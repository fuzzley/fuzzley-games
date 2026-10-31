import { gameConfig } from "@fz/dev/vite";
import { defineConfig } from "vite";

export default defineConfig(
  gameConfig({ port: 9005, name: "Asteroid Breaker" }),
);
