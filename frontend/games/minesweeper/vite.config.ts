import { gameConfig } from "@fz/dev/vite";
import { defineConfig } from "vite";

export default defineConfig(gameConfig({ port: 9001, name: "Minesweeper" }));
