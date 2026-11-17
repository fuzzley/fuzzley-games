// Which commit a build comes from, and when it ran: the site's footer and
// version.json say so, and so does each game's settings drawer.

import { execSync } from "node:child_process";
import type { HtmlTagDescriptor, Plugin } from "vite";

/** Says which commit a build comes from, and when it ran. */
export interface BuildStamp {
  /** The short commit hash, or "dev" when the build couldn't tell which. */
  readonly commit: string;
  /** An ISO timestamp. */
  readonly buildTime: string;
}

/**
 * The names of the meta tags a game's page carries its stamp in, which
 * `@fz/game-ui`'s `BUILD_INFO` reads.
 */
export const STAMP_META = {
  commit: "fz-build-commit",
  buildTime: "fz-build-time",
} as const satisfies Record<keyof BuildStamp, string>;

/**
 * Returns the short commit a build comes from.
 *
 * COMMIT_SHA comes first: the Docker build passes it in, and the image has no
 * .git to ask.
 */
export function commitHash(
  env: NodeJS.ProcessEnv = process.env,
  askGit: () => string = () =>
    execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    }).toString(),
): string {
  const fromEnv = env["COMMIT_SHA"];
  if (fromEnv) return fromEnv.slice(0, 7);
  try {
    return askGit().trim();
  } catch {
    return "dev";
  }
}

/** Returns the commit a build comes from, and the time it runs. */
export function buildStamp(
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date(),
): BuildStamp {
  return { commit: commitHash(env), buildTime: now.toISOString() };
}

/** Returns the meta tags that carry a stamp in a game's page. */
export function stampTags(stamp: BuildStamp): HtmlTagDescriptor[] {
  return [
    {
      tag: "meta",
      attrs: { name: STAMP_META.commit, content: stamp.commit },
      injectTo: "head",
    },
    {
      tag: "meta",
      attrs: { name: STAMP_META.buildTime, content: stamp.buildTime },
      injectTo: "head",
    },
  ];
}

/**
 * Writes a stamp into a game's page, as its build and its dev server serve
 * it.
 *
 * The page, which nginx serves uncached, carries it rather than the scripts,
 * which nginx caches for a year: a stamp in a script would rename it with
 * every commit, and a returning player would download every game again after
 * any deploy.
 */
export function stampPage(stamp: BuildStamp): Plugin {
  return {
    name: "fz-build-stamp",
    transformIndexHtml: () => stampTags(stamp),
  };
}
