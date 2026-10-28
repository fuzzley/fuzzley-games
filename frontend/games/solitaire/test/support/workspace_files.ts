import { readFileSync } from "node:fs";
import path from "node:path";
import type { FileServer } from "@fz/phaser/testing";

/** The workspace's folder, which Vite serves a URL's path from. */
const ROOT = path.resolve(import.meta.dirname, "../..");

/** Each file read, by its path, so a page is read from disk once a run. */
const read = new Map<string, Uint8Array | undefined>();

/**
 * Serves a board's requests from the workspace, as Vite's server does: the
 * card atlases' pages, at the `/src/…` URLs their imports give them.
 */
export const serveWorkspace: FileServer = (url) => {
  const file = path.join(ROOT, decodeURIComponent(url.pathname));
  if (!read.has(file)) {
    let bytes: Uint8Array | undefined;
    try {
      bytes = readFileSync(file);
    } catch {
      bytes = undefined;
    }
    read.set(file, bytes);
  }
  return read.get(file);
};
