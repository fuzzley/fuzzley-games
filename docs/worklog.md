# Work log: the Solitaire Collection moves to fuzzley.games

Temporary. It records the move while it is under way and is deleted in the
last commit once the move is done.

## Goal

Serve fSolitaire's Solitaire Collection from fuzzley.games instead of
fuzzley.info, list its games on the dashboard, and point the old addresses on
fuzzley.info and fuzzley.github.io at the new one.

## Decisions (2026-10-17)

1. A game opens full-page: the game page has a Play button that leads to
   `/play/solitaire/#/<id>`. No iframe.
2. No hand-off of players' saved state: fuzzley.info answers the old address
   with a plain 301.
3. fuzzley-games becomes a public repository, so fSolitaire can read its pin
   and the 15-minute update schedule costs no Actions minutes.
4. Thumbnails are fSolitaire's own screenshots, for now.
5. No difficulty in the catalogue. Tiles keep players and time.
6. No "New" badge on the games the site launches with.

## Branches

Every repository works on `solitaire-on-fuzzley-games`, merged into `main`
in this order:

1. fuzzley-games: host the build, rebuild the catalogue.
2. fSolitaire: clean-up reads fuzzley-games' pin; canonical URLs.
3. fuzzley: drop solitaire, redirect to fuzzley.games.
4. fuzzley.github.io: docs.

## Log

### 2026-10-17

- Branches created in all four repositories, all clean and level with
  `origin/main`.
- Scanned fuzzley-games' history (16 commits) for secrets before making it
  public: only the placeholder IDs `G-XXXXXXXXXX` and `G-CHECK00000`.
- fSolitaire's `thumb.webp` is 192 × 108, the board alone, which suits the
  tiles; `preview.webp` is 1280 × 720, the whole screen, which suits the
  game page's stage.

#### fuzzley-games: hosting the build

- Ported fuzzley's `games.mjs`, `fetch-games.mjs` and `update-games.mjs`, and
  its `inject-analytics.mjs`, into `frontend/tools/`, with full JSDoc types,
  linted and type-checked like the `.agents` scripts. Changes from fuzzley's:
  games unpack to `public/play/<slug>/`; a folder there that `games.json` no
  longer pins is deleted; no `PLAY_ORIGIN`; the tags are root-absolute, like
  the site's own `index.html`, and only the pinned games are instrumented.
- `frontend/games.json` pins `solitaire-a4d7808.tar.gz`, fSolitaire's newest
  build and the one fuzzley.info serves. It unpacks to 26 MB.
- `yarn build` fetches, builds, then instruments; `yarn start` fetches with
  `--optional`. Added the `tar` dev dependency.
- Vite's dev and preview servers answered `/play/solitaire/` with the site's
  `index.html` (they serve the files, not the folder), so `vite.config.ts`
  gained a middleware that serves each game's `index.html` and adds the
  missing slash with a 301, as nginx does. `version.json` now names the
  pinned build of each game.
- nginx: `location /play/` with no fallback to the site's `index.html`, and
  the assets rule nested inside it. A `^~` prefix stops nginx checking
  regex locations at its level, so a sibling assets rule would never apply.
- The Docker build needs no change: `yarn build` fetches the games. A
  separate layer for the fetch would not help in Cloud Build, whose
  `--cache-from :latest` holds only the final stage's layers.
- The image checks moved out of `verify.yml` into
  `.github/scripts/check-image.sh`, so the update workflow can run them too,
  and now cover each pinned game: 200 at `/play/<slug>/`, 301 without the
  slash, 404 for a missing file, the cache headers, the analytics tags, and
  its pin in `version.json`.
- Local image built and checked: every check passes. (`jq` isn't installed
  on this machine, so the local run used a stand-in for its three calls;
  GitHub's runners have `jq`.)
- Committed: `build: serve the Solitaire Collection at /play/solitaire/`.

#### fuzzley-games: the dashboard lists the real games

- Catalogue: the 41 games of fSolitaire's catalogue, the seven best known
  first (Klondike, Spider, FreeCell, Pyramid, TriPeaks, Golf, Yukon) and the
  rest in fSolitaire's order. Blurbs are fSolitaire's own taglines; aliases
  are its variant and other names, from its `index.html` keywords. Slugs are
  readable (`bakers-dozen`); `play` names the build and the game's id
  (`bakersdozen`).
- **Play times are my estimates**, since decision 5 kept the time chip and
  fSolitaire records none: the seven that had one keep it, and the rest are
  judged from the size of the deal.
- A game without `play` is coming soon, which replaced `comingSoon`. The
  eight placeholder card games and the Card games category are gone;
  Minesweeper is now coming soon like Sudoku and Reversi, and the Classics
  description says so.
- "New" badge: the 41 go up on the launch date, 2026-10-17, and `isNew`
  skips anything added on or before it, so only later games get the badge.
- Search ignores apostrophes ("bakers" finds Baker’s Game) and matches
  aliases ("streets" finds Forty Thieves and Beleaguered Castle).
- Thumbnails: a hosted game shows its build's `thumb.webp`; the box is now
  16:9, the screenshots' shape, so none is cropped. Only the three classics
  are drawn, so the card-drawing code (`Sketch`, the face, back and slot
  shapes) went; it is in git history should drawn thumbnails come back.
- Tiles: a hosted game links to its page; a coming-soon game is a plain
  `div`, not focusable, with its badge.
- Game page: a hosted game shows its title, blurb and a dimmed screenshot
  (`preview.webp`) with a "Play <name>" button, all one plain link to
  `/play/solitaire/#/<id>`. A coming-soon game keeps its old page.
- Bug found while checking: the filter on the screenshot gave it its own
  stacking context, which painted it over the button; the button is now
  `position: relative`.
- `vite.config.ts` fails the build if a linked game's screenshots aren't in
  the fetched build, which catches a game renamed or removed upstream.
  Tested by hiding Montana's: the build failed and named both files.
- Specs: catalogue, thumbnails and home updated; new specs for the tile, the
  thumbnail and the game page. 30 tests pass; `yarn verify` passes.
- Checked in headless Chrome against `yarn preview`: home, category (all 41
  screenshots load), search, a game page, a coming-soon page and the game
  itself at `/play/solitaire/#/canfield`, at 1280 px and at 390 px with
  phone emulation. No page is wider than its viewport.
