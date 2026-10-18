# Minesweeper

The `minesweeper` workspace: Minesweeper, written in 2016 and moved here from
fuzzley/fMinesweeper with its history. The repository's rules, in
[.agents/AGENTS.md](../../../.agents/AGENTS.md), say how it is built, checked
and served; this workspace keeps its own for its code. Paths are relative to
`frontend/games/minesweeper/`.

- **Classic scripts and a namespace.** jQuery 1.10, Knockout 3.4 and
  Bootstrap 3 load as classic scripts from `public/vendor/`, which the build
  copies and minifies. Vite bundles `src/main.js`, and the game's modules hang
  off the `fMinesweeper` object it exports.
- **Left as written.** Prettier skips its `index.html`, `src/` and `public/`
  (see `.prettierignore` at the repository root), and its own ESLint config,
  `eslint.config.cjs`, skips `src/fMinesweeper/` and `public/`.
- **Saved games outlive the code.** Players' settings and statistics are in
  `localStorage` under `fMinesweeper.Settings` and `fMinesweeper.Statistics`.
  Renaming those keys loses them.
- **Its screenshots are the site's.** `public/docs/screenshots/minesweeper/`
  holds the thumbnail and preview the catalog shows.
- **It knows nothing of the site.** It builds into `dist/` with relative
  URLs, and the site copies that build to `/play/minesweeper/`. Nothing here
  imports from the site, or the site from here.
- **Work on it alone** with `yarn workspace minesweeper dev`, on port 9000.
  The site's dev server serves the build `yarn start` made when it started.
