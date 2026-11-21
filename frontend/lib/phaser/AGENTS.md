# @fz/phaser

These rules hold for `@fz/phaser`, the library every game drawn with Phaser
shares. The frontend's, in [frontend/AGENTS.md](../../AGENTS.md), and the
repository's apply too.

- **A pure entry reads only what it is handed, never the page.** The pure
  entries are those `eslint.config.js` fences off Phaser and every
  framework, for a game's view to import. What reads a `ResizeObserver`, a
  media query, the display's ratio or a computed style goes in
  `src/measure/`. Lint keeps a game's view off the page, and its specs run
  in Node, where there is none. Here lint fences only what a pure entry
  imports, so one that reads the page passes, and takes the page into every
  view that calls it.
- **A new entry gets its fence in `eslint.config.js` in the same change.**
  The fences there name folders, so a new folder under `src/` is held to
  none of them, and lint passes whatever it imports.
