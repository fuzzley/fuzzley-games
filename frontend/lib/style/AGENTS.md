# @fz/style

These rules hold for `@fz/style`, the palettes, tokens and styles every app
shares, with no framework; the frontend's, in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's apply too.

- **`src/themes.ts`, `src/fuzzball.ts` and `src/testing/index.ts` import no
  other file of the library's, and `src/testing/contrast.ts` imports them
  only by their package names** (`@fz/style/themes`, `@fz/style/testing`).
  An app compiles each into its own program, where an import may not end in
  `.ts`, and Node loads the first two as they are, for the Vite plugin,
  where a relative import must. So each stays one file, or reaches another
  as an app does. With the `.ts`, every check here passes and each app's
  typecheck fails.
- **A new or changed mixin gets its case in `src/toolkit.spec.ts`.**
  Coverage counts only TypeScript, so a mixin with no case still clears
  every floor.
