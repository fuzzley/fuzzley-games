import { DOCUMENT } from "@angular/common";
import { InjectionToken, inject } from "@angular/core";

/** Says which commit a game was built from, and when. */
export interface BuildInfo {
  /** The short commit hash, or "dev" when the build couldn't tell which. */
  readonly commit: string;
  /** An ISO timestamp. */
  readonly buildTime: string;
}

/**
 * The names of the meta tags a game's page carries its stamp in, as
 * `@fz/dev/build-info`'s `STAMP_META` writes them.
 */
const STAMP_META = {
  commit: "fz-build-commit",
  buildTime: "fz-build-time",
} as const satisfies Record<keyof BuildInfo, string>;

/** Returns what a page's meta tag of a name says, or "" where it has none. */
function metaContent(document: Document, name: string): string {
  return (
    document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content ??
    ""
  );
}

/**
 * Which commit the game was built from, and when, as `@fz/dev/vite`'s
 * `gameConfig()` stamps it in the page, unless a spec provides another, or
 * null where the page carries no stamp, as in a spec.
 */
export const BUILD_INFO = new InjectionToken<BuildInfo | null>("BUILD_INFO", {
  providedIn: "root",
  factory: () => {
    const document = inject(DOCUMENT);
    const commit = metaContent(document, STAMP_META.commit);
    const buildTime = metaContent(document, STAMP_META.buildTime);
    return commit && buildTime ? { commit, buildTime } : null;
  },
});
