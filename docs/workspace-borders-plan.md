# Plan: the borders between the site, the games and the libraries

Agreed 2026-10-26: the user said "Implement", taking every recommended
decision. P1 to P7 were built the same day, on the branch
`workspace-borders`, each phase its own commits with `yarn verify` green; the
"As built" notes under each phase say what came of it. P8 waits on
fSolitaire and fMinesweeper being archived, which needs the user's go-ahead.
The day's work log, deleted once P7 was done, is in git's history.

It comes from a review of where the workspaces under `frontend/` meet: the
site, the two games and the four libraries, through their `package.json`
files, configs and scripts, and through the agent instructions and skills
about them. The review was asked for to bridge the gaps between them: package
reuse, keeping versions in step, common code, lint, scripts and rules, and how
`AGENTS.md` files and skills are set up and reused. Paths are relative to
`frontend/`, except those under `.agents/`, `.github/` and `docs/`, which are
the repository's.

## Where things stand

The borders are well kept, so this plan closes gaps; it does not redraw them.

- **`yarn.config.cjs`** holds every workspace to one range per package, keeps
  the Yarn and Node settings at the root, names each workspace after its
  folder, and lets a library depend on no workspace but another library.
- **`@fz/dev`** gives every workspace its ESLint blocks, its compiler options
  and the screenshot scripts' Chrome; **`@fz/style/stylelint`** gives every
  stylesheet the palette's rules. A workspace's configs extend them and add
  only what is its own, such as the Solitaire Collection's tier fences.
- **The site takes a game's `dist/` and nothing else**, through `games.json`.
- **`.agents/check-skill-references.mjs`** fails on a path a skill names that
  doesn't exist.

What the review found is of four kinds:

1. **Checks with holes.** The lockfile holds copies `yarn dedupe` would merge,
   a library's peer ranges sit outside the sync, a workspace without a `lint`
   script is skipped without a word, and no check reads the `AGENTS.md` files.
2. **Copies the presets don't cover yet.** Four Vitest configs share one
   block, the two games' Vite configs share the game contract, and the two
   screenshot scripts each write the site's images their own way.
3. **A border kept by hand.** The site lists 41 of the Solitaire Collection's
   games, by the ids the game routes to, and learns which ids exist only from
   the screenshots the game's build ships.
4. **Agent docs that repeat themselves.** The site's and the games'
   `AGENTS.md` files share a page of rules, three skills are named
   `vitest-testing`, and 30 Phaser skills load for a game that uses a few of
   Phaser's parts.

## Findings

### 1. The lockfile holds copies `yarn dedupe` would merge

`yarn dedupe --check` lists 11 packages that resolve to an older version
beside a newer one that would satisfy the same range: among them
`@typescript-eslint/types` and `@typescript-eslint/utils` at 8.71.1 beside
8.72.0, which `@fz/dev`'s ESLint preset loads, `postcss` at 8.5.29, 8.5.30 and
8.5.31, and Angular's devkit at 22.2.2 beside 22.2.4. Nothing checks for it,
and a Dependabot pull request that raises a range leaves the old copy behind.

**Change:** `yarn dedupe` once, and `yarn dedupe --check` in the root's
`yarn lint`, after `yarn constraints`. Angular's exact pin of `vite` (8.3.0)
isn't a duplicate `dedupe` can merge, so the leftover accepted on 2026-10-25
stays.

**Why:** one range per package is what the constraints are for; the lockfile
should hold one copy to match.

### 2. A library's peer ranges are outside the sync

`sameRangeEverywhere` skips `peerDependencies`. `@fz/ui` and `@fz/game-ui`
name `@angular/core`, `@angular/common`, `@angular/cdk` and `@angular/aria`
twice, as peers and as devDependencies. The two match today, and nothing keeps
them so: a raised dev range with the peer left behind is a library claiming to
work with an Angular it is no longer tested on.

The rule also only reports a mismatch ("give both the higher one"). A grouped
Dependabot pull request cut before a workspace landed fails it, and fixing it
by hand means editing each `package.json`.

**Change:** in `yarn.config.cjs`,

- a library's peer range for a package equals its own devDependency range;
- both rules fix what they report: `yarn constraints --fix` gives every
  workspace the higher range, compared with `semver`, which the root takes as
  a devDependency.

### 3. A workspace without a script is skipped without a word

The root's `test`, `typecheck` and `lint` run each workspace's own through
`yarn workspaces foreach … run <script>`, which skips a workspace that has no
such script. Checked with a script no workspace has: nothing ran, and it
exited 0. A new game without a `lint` script would pass `yarn verify`
unlinted, which is the failure the root's `eslint.config.js` is written to
prevent for a workspace without an ESLint config. The same goes for a game
without `build`, which `yarn build:games` would leave out of the image.

**Change:** a constraint that every workspace has `test`, `typecheck` and
`lint`, and every game `build`.

### 4. No check reads the `AGENTS.md` files

`.agents/check-skill-references.mjs` checks skills only. The repository's
`AGENTS.md` and the seven workspaces' cite as many paths, and agents read them
as authoritatively; the code health plan's moves had to update them by hand,
with nothing to say one was missed.

**Change:** the script checks every `AGENTS.md` too, by the same rules: every
relative link resolves, and every backticked path exists. It keeps its name
and its place in `yarn lint`.

### 5. Four Vitest configs share one block

`lib/ui/vitest.config.ts`, `lib/game-ui/vitest.config.ts`,
`games/minesweeper/vitest.config.ts` and the site's `app` project each set
Analog's `angular()` plugin, Vitest's globals, jsdom, `src/test-setup.ts`,
`src/**/*.spec.ts`, and V8 coverage over `src/**/*.ts` reported as text and
HTML. The comment saying why the globals are not optional is copied four
times. `lib/style` and `lib/dev` share the Node version of the same block. Each
differs from the others only in its floors and what it leaves out of coverage.

**Change:** `@fz/dev/vitest`, with `angularTests()` and `nodeTests()`, each
given the floors and, where they differ, the files, and returning the config's
`plugins` and `test` block. The libraries, Minesweeper and the site's two
projects take them up. The Solitaire Collection keeps its own config: its
specs live under `test/`, run in Node unless a spec asks for jsdom, start
through Analog's runner, and import through the `@/` and `@test/` aliases.
`@fz/dev` takes Analog's plugin and Vitest as peers, since each workspace
already lists and runs them.

### 6. The games' Vite configs share the game contract

`games/minesweeper/vite.config.ts` and `games/solitaire/vite.config.ts` both
set `base: "./"`, `angular()`, `fuzzleyStyle()`, `outDir: "dist"`,
`assetsDir: "assets"`, and a dev server on port 9000 that opens a browser.
`base: "./"` is what lets a build be served from `/play/<slug>/`, the contract
with the site, and neither config says so.

Both servers ask for port 9000. Vite moves the second to the next free port,
but both `tools/capture-screenshots.mjs` default `--url` to
`http://localhost:9000/`, so with both running, one game's script captures the
other game.

**Change:** `@fz/dev/vite`'s `gameConfig({ port })`, which sets the shared
part with a comment on `base`, and which a game's `vite.config.ts` extends with
`mergeConfig()`. The Solitaire Collection keeps its commit define, its `@/`
alias and its Phaser chunk. Each game gets a port of its own, the Solitaire
Collection 9000 and Minesweeper 9001, and its screenshot script defaults to
it. `@fz/dev` depends on `@fz/style` for `fuzzleyStyle()`, which the
constraints allow, one library on another.

### 7. A script for every workspace lives in one game

`games/solitaire/tools/stop-dev-servers.mjs`, 440 lines, run as
`yarn workspace solitaire stop`, force stops every Vite dev server running
from this checkout: the site's and Minesweeper's too, as its own header says.

**Change:** it moves to `frontend/tools/stop-dev-servers.mjs` and runs as the
root's `yarn stop`. The root's `eslint.config.js` and `tsconfig.scripts.json`
take in `tools/*.mjs`, as they do the `.agents` scripts. The Solitaire
Collection's `AGENTS.md` loses its line; `.agents/AGENTS.md` gains it.

### 8. The two screenshot scripts write the site's images their own way

The site shows each hosted game's `thumb.webp` and `preview.webp`, from
`/play/<build>/docs/screenshots/<id>/` (`screenshotUrl()` in
`site/src/app/model/game.ts`).

- Minesweeper's `capture-screenshots.mjs` writes them itself, into
  `public/docs/screenshots/minesweeper/`: 2560 × 1440 and 576 × 324, WebP at
  quality 80.
- The Solitaire Collection's writes a lossless `overview.png` per game into
  `docs/screenshots/<id>/`, and `build-screenshot-thumbs.mjs` makes
  `overview.webp` (1600 × 900), `thumb.webp` (576 × 324, cropped to the board)
  and `preview.webp` (2560 × 1440) from it.

The names and sizes the site needs are written in those two scripts and
nowhere else. Minesweeper's script also spells the palette's storage key,
`"fuzzley-theme"`, which `@fz/style/themes` exports as `THEME_STORAGE_KEY`.

**Change:** `@fz/dev/screenshots`: the site's two images, by name and size,
and a function that writes them from a capture with sharp, cropping when
asked. Both games' scripts write them through it, and keep how they stage
their game and what else they write. Minesweeper's script imports
`THEME_STORAGE_KEY`.

### 9. The site's catalog and the Solitaire Collection's are kept equal by hand

`site/src/app/provider/games.ts` lists 41 of the Solitaire Collection's games,
each with the id the game routes to (`/play/solitaire/#/<id>`), a name and
aliases. The game's own catalog (`games/solitaire/src/ui/app/provider/`) holds
the same ids and names, and the variants the site lists as aliases.

The site learns which ids a build has only from its screenshots:
`checkGameImages()` (`site/tools/vite-plugins.ts`) fails the build when a
game's `thumb.webp` or `preview.webp` is missing from `public/play/`. A game
renamed or removed in the Solitaire Collection passes as long as its old
screenshot folder stays, and a name changed on one side isn't noticed.

Today the two agree on all 41 ids. Three names differ only in the
apostrophe: the site writes "Baker’s Game", "Baker’s Dozen" and
"Grandfather’s Clock" with a typographic one, the game with a straight one.

**Change:** each game's build writes `game.json` at the top of its `dist/`:
the ids it opens, with their names, or for a game with no ids, such as
Minesweeper, its own name. A Vite plugin in `@fz/dev`, with the manifest's
type, writes it from a module the game names, loaded with Vite's
`runnerImport()`, as `loadCatalog()` loads the site's own catalog. The site's
build reads each game's `game.json` from `public/play/` and fails when a
`play.id` isn't in its build's list, or when the name the site gives a game
isn't the name the build gives it, apostrophes aside, so each keeps its own
typography. `checkGameImages()` still checks the drawings of the games still
to come. The site keeps its blurbs, times and aliases, which are its own copy.

**Why:** the contract between the site and a game is checked rather than
inferred, and it still runs through the game's `dist/` and nothing else.

### 10. The site's and the games' `AGENTS.md` files share a page of rules

`frontend/site/AGENTS.md`, `frontend/games/minesweeper/AGENTS.md` and
`frontend/games/solitaire/AGENTS.md` each spell out the same rules for an
Angular app here:

- "Templates bind, they do not compute" (all three), and "visible state is
  announced state" (the site and the Solitaire Collection);
- Sass: `//` comments (all three), modules and never `@import` (the site and
  the Solitaire Collection), tokens by their `--fz-*` names, icons as
  `<fz-icon>`;
- accessibility, pointing at the `web-game-accessibility` skill (all three).

The two games also each spell out that a game knows nothing of the site,
shares its palette through `theme.js`, and keeps saved games readable across
builds. Each "Technology Stack" names versions (Angular v22, Vite v8, Vitest
v5, TypeScript v6) that the next major release makes wrong, and
`package.json` already says.

Meanwhile `.agents/AGENTS.md`, 274 lines that load in every session, Docker
and nginx work included, carries the frontend's layout, Yarn commands and
workspace rules.

**Change:** two layers between the repository and a workspace, each an
`AGENTS.md` with a `CLAUDE.md` beside it that imports it, which Claude Code
loads once it reads a file beneath it:

- **`frontend/AGENTS.md`**: what every workspace keeps. The layout of
  `frontend/`, the Yarn commands and the workspace rules move here from
  `.agents/AGENTS.md`, and the Angular and Sass rules above from the three
  apps'.
- **`frontend/games/AGENTS.md`**: what every game keeps. The game contract
  (a relative `base`, `dist/` with `index.html` at its top, screenshots under
  `docs/screenshots/<id>/`, `game.json` from finding 9, `theme.js`, saved
  games that outlive the code, a port of its own) and the steps to add a game:
  a workspace, a `games.json` entry, the site's catalog entry, screenshots.

Each workspace's `AGENTS.md` keeps only what is its own, and its "Technology
Stack" drops the version numbers. The repository's `AGENTS.md` names both new
files where it lists the workspaces', and the root `AGENTS.md` pointer names
`frontend/AGENTS.md` beside the site's.

### 11. Three skills share a name and half their text

The site, Minesweeper and the Solitaire Collection each have a
`vitest-testing` skill. The site's and Minesweeper's repeat the same patterns:
`render()` and `screen` by role, never a CSS class, `userEvent.setup()`,
jest-dom's matchers, zoneless change detection (`render` and user-event leave
the template up to date, an effect runs on `TestBed.tick()`), globals that
aren't optional, and resetting what jsdom keeps for a whole file. The
libraries, whose specs are written the same way, have no testing skill.

Once an agent has touched two of those workspaces, both skills of the same
name are loaded, and only the folder at hand says which applies.

**Change:** `.agents/skills/angular-testing` for the patterns every Angular
workspace shares, and the three renamed `site-testing`, `minesweeper-testing`
and `solitaire-testing`, each keeping its setup, fixtures and floors and
linking to the shared one. `.agents/AGENTS.md`'s "Writing Unit Tests" names
them.

### 12. The Solitaire Collection's skills have names any workspace could claim

`sass-design-system`, `typescript-strict-patterns` and
`vite-bundle-optimization` are about the Solitaire Collection alone, as their
descriptions say. Once loaded they stay loaded, and their names and triggers
("vite, bundle, vite.config", "typescript, type safety, strict mode") match
work in the site or Minesweeper. `sass-design-system` also restates
`@fz/style`'s tokens, which `lib/style/AGENTS.md` and the `fuzzley-ui` skill
own.

**Change:** they become `solitaire-styles`, `solitaire-types` and
`solitaire-build`, their triggers name the Solitaire Collection, and the
token list gives way to a pointer to `fuzzley-ui`.

### 13. Thirty Phaser skills for a game that uses a few of Phaser's parts

The Solitaire Collection has 30 Phaser skills, 14,461 lines, generated from
Phaser's documentation but for `phaser-core` and `phaser-canvas-performance`,
written for the game. Its code uses the game's config, scenes, the scale
manager, input (pointers, dragging, the cursor), events, the loader, textures
(a `DynamicTexture`), sprites, graphics, one camera and a filter (the cards'
baked shadow). It uses no physics, tilemaps, particles, sound, tweens, timers,
curves, text, groups or containers, data manager, geometry helpers, actions or
animations. Every skill's description is in an agent's context whenever it
works on the game.

The generated ones are also listed in neither `skills-lock.json` nor
`.prettierignore`, so Prettier reformats them and a regeneration can't be
compared with what is here.

**Change:** keep 16: `core`, `canvas-performance`, `game-setup-and-config`,
`scenes`, `scale-and-responsive`, `input-keyboard-mouse-touch`,
`events-system`, `loading-assets`, `sprites-and-images`,
`graphics-and-shapes`, `render-textures`, `game-object-components`,
`cameras`, `filters-and-postfx`, `v4-new-features` and
`v3-to-v4-migration`. Delete the other 14 (6,599 lines); git keeps them, and
one comes back when the game starts using its part. The generated ones kept
go into `.prettierignore`, and the check script's comment names where they
were generated from.

### 14. A dangling skill link goes unnoticed

`.claude/skills` links hold absolute paths, so after a clone or a move they
must be made again with `node .agents/link-claude-skills.mjs`, and a dangling
link drops its skill without a word, as `.agents/AGENTS.md` warns.

**Change:** `.agents/check-skill-references.mjs`, outside CI, also warns
about a skill with no link, or a dangling one, in the `.claude/skills` beside
its folder, and says to run the link script. A warning, not a failure, since
the links are machine-local.

### 15. The pinned-game pipeline outlives its games

Both games are built here, no game is pinned, and `update-games.yml` is
turned off. Still kept up: the workflow, `site/tools/update-games.mjs` (199
lines) and its spec (142), the pinned half of `site/tools/games.mjs` and
`site/tools/fetch-games.mjs` (download, retries, SHA-256, the cache,
unpacking), the `tar` dependency, the pin sections of `docs/operations.md`,
the half of the `github-actions-ci-cd` skill about pins, and
`.agents/AGENTS.md`'s paragraph on them.

The Solitaire move's last phase planned to retire it once fSolitaire and
fMinesweeper are archived, on the user's go-ahead.

**Change:** that retirement. `games.json` keeps one workspace entry per game.
Rolling `live` back to a commit from before still builds that commit's code,
so the release archive on fSolitaire stays.

### 16. CI enables a Corepack that Node 26 doesn't ship

The `Dockerfile` installs `corepack@0.36.0`, since Node 26 no longer bundles
Corepack. `verify.yml` runs `corepack enable` right after setting up Node 26,
which works because the runner image carries a Corepack of its own, of
whatever version.

**Change:** `verify.yml` installs `corepack@0.36.0` as the `Dockerfile`
does, and its step that checks the two agree on Node checks they agree on
Corepack too, since Dependabot moves neither pin.

### 17. Shipped plans sit beside the live docs

`docs/code-health-plan.md`, `docs/minesweeper-ui-plan.md` and
`docs/shared-ui-plan.md` are built and shipped. Their findings describe code
as it was (`src/game/`, copies since removed), and an agent searching `docs/`
finds them beside `docs/operations.md`.

**Change:** they move to `docs/archive/`, and this plan follows them once
built.

### 18. Yarn's catalogs could hold the shared ranges

Yarn 4.17.1, which `package.json` pins, supports catalogs: a range written
once in `.yarnrc.yml` and named as `catalog:` in each `package.json`. Each
Angular workspace repeats about 20 ranges that would each be written once.

GitHub's documentation doesn't say whether Dependabot reads Yarn's catalogs.
If it doesn't, its weekly pull requests stop proposing those packages, without
an error. Finding 2's rules already keep the ranges in step; catalogs would
only cut the repetition.

**Change:** none yet. If wanted, try it on a branch first: one package moved
to a catalog, and Dependabot's "Check for updates" run against it.

## Phases

Each phase is its own commits and keeps `yarn verify` green. None changes
what a player sees. P1 comes first because its checks guard the rest: the
`AGENTS.md` check guards P6's moves, and the constraints guard P3's new
dependencies.

### P1: close the checks (small)

Findings 1 to 4. Proof: each new check fails on a mistake made on purpose (a
peer range left behind, a workspace without `lint`, a dead path in an
`AGENTS.md`), then passes once it is undone; `yarn constraints --fix` repairs
the range.

- **As built:** all four, each proved on a planted mistake. The reference
  check reads all nine `AGENTS.md` files and every markdown link's target,
  and lets a missing path pass when git ignores it, as it does a fresh
  checkout's `dist/`. The constraints' `--fix` gives a package the highest
  of its ranges and a peer its devDependency's. `yarn dedupe` merged eleven
  packages' second copies, none past a range a `package.json` names, and
  both games' builds came out byte for byte the same.

### P2: housekeeping (small)

Findings 7, 16 and 17. Proof: `yarn stop --dry-run` from `frontend/` lists
the servers `yarn workspace solitaire stop --dry-run` listed; Verify passes on
the branch.

- **As built:** CI installs Corepack 0.36.0, as the Dockerfile does, and
  checks that the two agree. `yarn stop` runs `tools/stop-dev-servers.mjs`,
  which takes the frontend to be its own parent folder, and stopped the
  same six processes the old script listed. Three plans are in
  `docs/archive/`.

### P3: Vitest and game presets in `@fz/dev` (medium)

Findings 5 and 6. Proof: every workspace's coverage figures are the same
before and after, and both games' `dist/` the same byte for byte.

- **As built:** `angularTests()` and `nodeTests()`, and the pieces they are
  made of, `angularSpecs()`, `nodeSpecs()` and `coverage()`, which the
  site's two projects use on their own; and `gameConfig()`, which is the
  whole of Minesweeper's `vite.config.ts` and which the Solitaire
  Collection merges its own into. Minesweeper's dev server moved to 9001,
  so both games can run at once. `@fz/dev` depends on `@fz/style`, which is
  checked with `@fz/dev`'s presets; Yarn links the cycle, and nothing in
  `lib/` is built. Coverage and both games' builds came out the same.

### P4: the site's images (small)

Finding 8. Proof: both games' scripts write images of the same names and
sizes as before; Minesweeper's byte for byte, since its settings don't change.

- **As built:** `@fz/dev/screenshots`, with `SITE_IMAGES`,
  `writeSiteImages()` and `writeImage()`, through which both scripts write,
  the Solitaire Collection's rules-page images too. All 123 of its images
  and both of Minesweeper's came out byte for byte the same. The spec
  encodes the large preview once, on one thread, since encoding it on every
  core starved the specs beside it.

### P5: `game.json` (medium)

Finding 9. Proof: the plugin's spec, and the site's build failing on a
`play.id` taken out of the Solitaire Collection's catalog, and on a name
changed on one side.

- **As built:** `@fz/dev/game-manifest`'s plugin, which `gameConfig()` adds,
  loads a collection's catalog through Vite with the build's own aliases,
  and the site's `checkGameManifests()` reads each build's `game.json`
  before the site builds, comparing names with typographic apostrophes made
  straight. Taking Baker's Game out of the Solitaire Collection's catalog
  and renaming Klondike failed the site's build on both, where the
  pictures' check, with the old build's screenshots still in place, passed
  it. The games' builds gained `game.json` and nothing else.

### P6: the instruction layers and the skills' names (medium)

Findings 10 to 12, and 14. Proof: P1's check passes over every `AGENTS.md`
and skill; the link script prunes the old names' links and makes the new
ones.

- **As built:** as planned, with the libraries' `AGENTS.md` pointing at the
  frontend's too. Claude Code loaded `frontend/CLAUDE.md` and
  `frontend/games/CLAUDE.md` once work reached a file beneath each.
  `.agents/AGENTS.md` went from 289 lines to 215, and each app's lost what
  it shared with the others. The site's rule that every `@keyframes` be
  global was out of date, since Angular scopes a component's own, so the
  shared rule is the Solitaire Collection's. After the renames the check
  warned about 13 links, and about none once the link script had run.

### P7: the Phaser skills (small, if decided)

Finding 13.

- **As built:** the 14 deleted, and four links to them from the skills kept
  dropped. The kept ones but `phaser-core` and `phaser-canvas-performance`
  turned out to be copies of the `skills/` folder in Phaser's package,
  renamed with `phaser-`, some links repaired by hand and the code samples
  as Prettier left them. `.prettierignore` now leaves them as they are, and
  `phaser-core` says where the deleted ones still are and how to copy one
  back.

### P8: retire the pinned-game pipeline (small, if decided)

Finding 15, after fSolitaire and fMinesweeper are archived, or on its own if
decided. Proof: `yarn build` and the image's checks pass with `games.json`
listing workspaces only.

- **Not built yet:** it waits on the archives.

## Decisions

1. **`game.json` between the site and the games** (finding 9). Recommended,
   checking ids and names. The site could take names from it as well, but its
   aliases mix the game's variants with names of its own, so it keeps its
   copy and the build checks the two agree. Turned down, P5 drops out and the
   screenshots stay the only check.
2. **`frontend/AGENTS.md` and `frontend/games/AGENTS.md`** (finding 10).
   Recommended. The repository's `AGENTS.md` keeps what holds for the whole
   repository, as it says a rule should be written "here instead, once"; the
   rules shared by every Angular app are one level down, where only work on
   them loads them.
3. **Fourteen Phaser skills deleted** (finding 13). Recommended. Turned down,
   they all stay and are only put in `.prettierignore`.
4. **The pinned-game pipeline retired** (finding 15). Recommended, after the
   archives, as the Solitaire move planned. It can go first: rolling back to
   a commit that pins an archive still works, since that commit carries its
   own fetch code.
5. **Catalogs** (finding 18). Not yet; only once Dependabot is shown to read
   them.

## Considered, not recommended

- **The test and lint tools as `@fz/dev`'s dependencies,** so a workspace
  lists only `@fz/dev`. A workspace runs `vitest`, `eslint`, `stylelint` and
  `tsc` itself, and with them only in `@fz/dev` it would find them only
  because `node_modules` is hoisted. Each workspace keeps listing what it runs.
- **A shared spec setup file.** The code health plan turned it down: each is
  12 to 21 lines, mostly Angular's own. The Solitaire Collection's starts
  another way on purpose, through Analog's runner in Node.
- **The stylelint preset in `@fz/dev`.** Its rules are the palette's (no
  color written outside it), so it stays with the palette in `@fz/style`.
- **Building the image once.** The `verify` job, the `docker` job and Cloud
  Build each build a commit. Pushing the checked image to Artifact Registry
  and deploying it would build it once, but needs Workload Identity Federation
  and a new deploy path, for a Verify run of about two and a half minutes.
- **Build caching across workspaces** (Turborepo, Nx). Seven workspaces don't
  need it.

## Risks

- **A preset changes every workspace at once.** That is the point, and
  `yarn verify` covers each one; P3 also compares coverage and builds before
  and after.
- **A renamed skill leaves a dangling link.** The link script prunes links to
  skills that are gone, and P6 runs it; a Claude Code session started before
  needs a restart.
- **A tool that doesn't read nested `AGENTS.md` files misses the new
  layers.** The root `AGENTS.md` pointer names `frontend/AGENTS.md`, as it
  names the site's.
- **Loading a game's catalog at build time pulls in more than its data.** The
  Solitaire Collection's profiles import Angular's `InjectionToken`. If
  `runnerImport()` can't load them cleanly, the ids and names move into a
  module of plain data that both the catalog and the plugin import.
- **Dependabot pull requests cut before P1 fail its constraints.**
  `@dependabot recreate` fixes them, as it has before.
