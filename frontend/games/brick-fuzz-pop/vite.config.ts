import { gameConfig } from "@fz/dev/vite";
import { defineConfig } from "vite";

export default defineConfig(gameConfig({ port: 9006, name: "Brick Fuzz Pop" }));
