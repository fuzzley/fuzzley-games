import type { BuildInfo } from "./app/model/build";

declare global {
  /** This build's info, which vite.config.ts writes in through Vite's `define`. */
  const __BUILD_INFO__: BuildInfo;
}
