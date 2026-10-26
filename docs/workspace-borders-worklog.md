# Work log: the borders between the site, the games and the libraries

The log of [the workspace borders plan](workspace-borders-plan.md), kept so
the work can pause and resume. Newest entries last. It is deleted when the
work is done; git history keeps it.

## How to resume

- The work is on the branch `workspace-borders`, cut from `main` at
  `20788a2`. Nothing is pushed: a push to `main` deploys.
- The user said "Implement" (2026-10-26), taking every recommended decision:
  `game.json` checking ids and names, with the site keeping its own copy; the
  `frontend/AGENTS.md` and `frontend/games/AGENTS.md` layers; 14 Phaser
  skills deleted; the pinned-game pipeline retired after the archives; no
  catalogs yet.
- P8 waits on archiving fSolitaire and fMinesweeper, which is outside this
  repository and needs the user's go-ahead.
- Each phase ends with `yarn verify` green from `frontend/`, and a commit.
- The status table says where things stand; the entries below it say what
  was found on the way.

## Status

| Phase | What                                 | State   |
| ----- | ------------------------------------ | ------- |
| P1    | Close the checks                     | done    |
| P2    | Housekeeping                         | done    |
| P3    | Vitest and game presets in `@fz/dev` | done    |
| P4    | The site's images                    | done    |
| P5    | `game.json`                          | done    |
| P6    | The instruction layers and skills    | done    |
| P7    | The Phaser skills                    | next    |
| P8    | Retire the pinned-game pipeline      | waiting |

## Entries

### 2026-10-26: start

- Branch `workspace-borders` created; the plan and this log committed first
  (`1dae42f`).
- Baseline `yarn verify` started on the clean branch, its output kept in the
  session's scratchpad (`baseline/verify.log`) for P3's before-and-after
  comparison.

### 2026-10-26: P1, close the checks

- **The reference check reads every `AGENTS.md`** (finding 4).
  `.agents/check-skill-references.mjs` walks the repository for `AGENTS.md`
  files, skipping `node_modules`, `dist`, `coverage`, `public` and hidden
  folders but `.agents`, and finds all nine: the root pointer,
  `.agents/AGENTS.md` and the seven workspaces'. A workspace's cites paths
  from its own folder or the repository's root, as a workspace's skills do;
  `.agents/AGENTS.md` cites them from the root.
  - Two widenings came with it. Links are now every markdown link's target
    (`[text](target)`) as well as `./` and `../` paths to `.md` files, so
    the root pointer's `(.agents/AGENTS.md)` is checked too; addresses,
    anchors, server-root paths and placeholders are skipped. And a path git
    ignores passes when it is missing, since a fresh checkout hasn't built
    `dist/` or fetched `public/play/` yet when `yarn lint` runs in CI.
  - Every skill and `AGENTS.md` passed as they stand, with nothing to fix.
  - Proof it catches what it should: four references planted in
    `frontend/lib/dev/AGENTS.md` (a workspace path, a root path, a `./` link
    and a `../` link) failed all four, exit 1; two planted paths under
    `dist/` and `coverage/` passed, since git ignores them. Both files were
    restored with `git checkout`.
- **The constraints fix what they report, and cover peers and scripts**
  (findings 2 and 3), in `frontend/yarn.config.cjs`:
  - `sameRangeEverywhere` groups each package's ranges across workspaces and
    has `--fix` give every one the highest, compared by each range's lowest
    version with `semver`. Where that can't tell two apart (`^1.2.0` against
    `~1.2.0`, or a range that isn't semver) it still reports, now naming
    every other range.
  - `peersAreWhatIsTested`: a peer range is the workspace's own
    devDependency range for the package, and a peer with no devDependency
    is an error.
  - `everyWorkspaceIsChecked`: every workspace has `lint`, `typecheck` and
    `test`, and every game `build`.
  - The clean tree passes. The type-check needs `@types/semver`, and the
    root takes `semver` as a devDependency of its own rather than reaching
    the hoisted copy: both went in once the baseline finished, since changing
    a `package.json` while it ran could have broken it.
  - Proof, each on a scratch edit restored afterwards: a library's peer
    range for `@angular/core` set to `^22.2.0` against a devDependency of
    `^22.2.3` was put back to `^22.2.3` by `yarn constraints --fix`; the
    site's `rxjs` set to `~7.8.0` against `~7.8.2` elsewhere was raised to
    `~7.8.2`; `tslib` as `~2.8.1` in one workspace against `^2.8.1` in the
    rest was reported, naming both, and left alone; Minesweeper without a
    `lint` script was reported.
- **`yarn lint` runs `yarn dedupe --check`** (finding 1), after the
  constraints. `yarn dedupe` merged eleven packages that had two copies
  installed where one range covered both: `@angular-devkit/architect`,
  `core` and `schematics` (22.2.2 into 22.2.4), five `@typescript-eslint`
  packages (8.71.1 into 8.72.0), `postcss` (three copies into 8.5.31),
  `rolldown` (1.2.13 into 1.2.15, for the range `~1.2.6`) and its
  `@oxc-project/types`. Nothing moved past a range a `package.json` names.
- `.agents/AGENTS.md` says what the reference check reads now, what the
  constraints require and fix, that `yarn lint` dedupes, and that
  `semver` is a root tool.
- **`yarn verify` passed** in 4m15s, every workspace's tests and coverage
  exactly as the baseline's. Both games' `dist/` are byte for byte the
  baseline's (11 and 155 files), so the dedupe changed nothing they ship.
  The site's differs in three files, `version.json`, `index.html` and the
  script it names, only because `__BUILD_INFO__` carries the build's time:
  same size, 335.64 kB. P3's comparison takes these hashes as its baseline
  and leaves those three files out.
- Two peer warnings at install were there before and are left alone:
  `@angular/cdk` asks for `@angular/forms`, which `@fz/game-ui`, `@fz/ui`,
  the site and Solitaire don't install, and `@angular/build` asks for
  `postcss`, which Solitaire doesn't list. No workspace that lacks one
  imports it; only Minesweeper uses forms, and it lists them.

### 2026-10-26: P2, housekeeping

- **CI installs the Dockerfile's Corepack** (finding 16). The verify job
  sets `COREPACK_VERSION: 0.36.0` and installs it with npm before
  `corepack enable`, where it used whichever Corepack the runner carried.
  The step that checked the Dockerfile's Node now checks its Corepack too,
  reading `corepack@<version>` from the Dockerfile's `RUN` line; run by hand
  it matched 0.36.0 and caught a planted 0.35.0. The CI skill says so.
- **`yarn stop` is the root's** (finding 7).
  `games/solitaire/tools/stop-dev-servers.mjs` moved to
  `frontend/tools/stop-dev-servers.mjs`, run as `yarn stop` from
  `frontend/`; Solitaire's `stop` script is gone. It found the frontend
  by resolving `vite` from its own folder, a package the root doesn't
  list, so it now takes the folder above its own, which is where Yarn
  installs the Vite every workspace shares. Its usage text and header say
  `yarn stop`.
  - The root's `eslint.config.js` and `tsconfig.scripts.json` take
    `frontend/tools/*.mjs`, and `yarn lint` passes it to ESLint.
  - `.agents/AGENTS.md` lists `yarn stop` with the root's commands and
    `tools/` with the root's files; Solitaire's `AGENTS.md` no longer does.
  - Proof: with Minesweeper's dev server running on port 9123, the old
    script (restored from git into a scratch file beside its old place)
    and `yarn stop --dry-run` listed the same six processes, the shell and
    yarn that launched it, `cmd`, Vite, Dart Sass and its `conhost`.
    `yarn stop` then stopped all six, and the port stopped answering.
- **Shipped plans are archived** (finding 17). `code-health-plan.md`,
  `minesweeper-ui-plan.md` and `shared-ui-plan.md` moved to
  `docs/archive/` with `git mv`. They link only one another, so no link
  changed. `.agents/AGENTS.md` names the folder and says its paths are as
  they were. The memory notes that cited them, and `yarn stop`, were
  updated.
- The first P1 commit took in the moves staged with `git mv`; I reset the
  branch to `1dae42f` (nothing was pushed) and committed P1 again with its
  own files only, as `6e868f1` and `632473b`.
- **`yarn verify` passed** in 4m14s. Every coverage figure matched P1's but
  one: the Solitaire Collection's branches read 92.75% (1895 of 2043)
  against 92.7% (1894). Nothing it covers changed, so one branch depends on
  what a run deals; P3 compares its figures to within that branch.

### 2026-10-26: P3, Vitest and game presets in `@fz/dev`

- **`@fz/dev/vitest`** (finding 5), `lib/dev/src/vitest.ts`:
  `angularTests()` and `nodeTests()` return a whole config from the floors
  and, where they differ, the files coverage measures or leaves out. They
  are built from three pieces the site uses on their own, since a Vitest
  project can't carry coverage: `angularSpecs()` (jsdom, globals,
  `src/test-setup.ts`, every spec under `src/`), `nodeSpecs()` and
  `coverage()` (V8, text and HTML, `src/**/*.ts` unless given). The comment
  on why the globals aren't optional, and the one on what a floor is, now
  sit there once.
  - `coverage()` leaves `exclude` out when given none, rather than passing
    an empty list, so `lib/style` and `lib/dev` keep Vitest's own
    exclusions, as before.
  - Taken up by `lib/dev` (from `./src/vitest.ts`), `lib/style`, `lib/ui`,
    `lib/game-ui`, Minesweeper and the site's two projects. The site's root
    `test` block lost its `globals: true`, which only the `app` project
    read, and now takes it from `angularSpecs()`. The Solitaire Collection
    keeps its own config, as planned.
  - Vitest 5 marks `CoverageV8Options` deprecated; the type is
    `CoverageOptions`.
- **`@fz/dev/vite`** (finding 6), `lib/dev/src/vite.ts`: `gameConfig({ port })`
  sets `base: "./"`, with the comment the plan asked for, Analog's plugin,
  `fuzzleyStyle()`, `dist/` and `assets/`, and the dev server's port with
  `open: true`. Minesweeper's `vite.config.ts` is that alone, on port 9001;
  the Solitaire Collection's merges its commit define, `@/` alias and
  Phaser chunk in with `mergeConfig()`, on port 9000, and types the chunk
  function's `id`, which the merge no longer infers.
  - Vite 8's `mergeConfig()` copies `build.rollupOptions` into
    `rolldownOptions` too. The build came out the same, so it's left as
    is; the spec merges a plain option instead.
  - Minesweeper's screenshot script defaults to `http://localhost:9001/`,
    and its `AGENTS.md` and README, the Solitaire Collection's `AGENTS.md`
    and the root README say which game has which port. Started with
    `BROWSER=none yarn workspace minesweeper dev`, it answered on 9001 with
    its page and `theme.js`; `yarn stop` stopped it.
- **`@fz/dev`'s manifest**: `exports` gains `./vitest` and `./vite`; it
  depends on `@fz/style` for `fuzzleyStyle()`; Analog's plugin, Vite and
  Vitest are optional peers, with Analog's plugin a devDependency so the
  constraints see it tested. Analog's own peers are all optional, so the
  install warns of nothing new.
  - `@fz/style` is checked with `@fz/dev`'s presets, so the two now depend
    on each other, one way as a devDependency. Yarn links the cycle, and
    nothing in `lib/` is built or run with `--topological`, so it costs
    nothing; `lib/dev/AGENTS.md` says so.
- Specs: `src/vitest.spec.ts` (10) and `src/vite.spec.ts` (4). `@fz/dev`'s
  coverage rose to 68.57 / 87.09 / 82.92 / 67.67%, and its floor with it,
  to 68 / 86 / 82 / 67.
- Docs: `lib/dev/AGENTS.md` and its `CLAUDE.md`, the line on `@fz/dev` in
  `.agents/AGENTS.md`, `fuzzley-ui`'s step 2, the Solitaire Collection's
  `vite-bundle-optimization` skill and `AGENTS.md`, and both
  `vitest-testing` skills of the apps that use the preset.
- **`yarn verify` passed** in 4m16s. Every workspace's tests and coverage
  are P2's to the figure, `@fz/dev`'s aside (44 tests, up from 30). Both
  games' `dist/` are byte for byte P2's (11 and 155 files); the site's
  differs only in its three build-time files.

### 2026-10-26: P4, the site's images

- **`@fz/dev/screenshots`** (finding 8), `lib/dev/src/screenshots.ts`:
  `SITE_IMAGES` names the site's two images and their sizes, `thumb.webp`
  at 576 × 324 and `preview.webp` at 2560 × 1440, at `SITE_IMAGE_QUALITY` 80. `writeSiteImages(capture, folder, { thumbRegion, resize })` writes
  both, making the folder, and returns each file's size;
  `writeImage(capture, target, image, { region, resize, quality })` writes
  one, and is what it is built on. Both write WebP with smart subsampling,
  as both scripts did. `@fz/dev` depends on `sharp` (`^0.35.5`, the range
  the games and `@fz/style` use).
- **Minesweeper's `capture-screenshots.mjs`** writes through
  `writeSiteImages()` and imports `THEME_STORAGE_KEY` from
  `@fz/style/themes` rather than spelling `"fuzzley-theme"`. It no longer
  imports sharp, so its `package.json` no longer lists it.
- **The Solitaire Collection's `build-screenshot-thumbs.mjs`** keeps finding
  the board and the felt itself, and writes the site's two images through
  `writeSiteImages()`, the thumbnail cropped to the board, and its rules
  page's `overview.webp` (1600 × 900, quality 90) through `writeImage()`,
  all three contained on the felt as before.
- **Proof, byte for byte:**
  - `yarn build:thumbs` rewrote all 123 of the Solitaire Collection's WebP
    files (41 games × 3) from the committed captures; every file's time
    moved and git saw no change.
  - With Minesweeper's dev server on 9001, `yarn capture:screenshots`, run
    without `--url`, captured the seeded game (48% cleared, 12 flags, the
    clock at 1:24) and rewrote `thumb.webp` (14 KB) and `preview.webp`
    (70 KB); git saw no change.
- Specs: `src/screenshots.spec.ts` (6) makes a capture with sharp, red
  above a green board, writes the site's images from it once, into a folder
  that doesn't exist yet, and checks their sizes and format, the sizes
  returned, and that only the thumbnail is cropped; one more writes an
  image of another size and fit.
  - Sharp keeps a file it opened by path locked on Windows, so the spec
    opens what it checks from a buffer, or the temporary folder can't be
    removed.
  - The first verify failed: `eslint.spec.ts`'s first typed lint, which
    builds a TypeScript program from cold, ran past Vitest's 5 s while this
    spec's first version encoded the 2560 × 1440 preview four times on
    every core. It now encodes it once, with `sharp.concurrency(1)`, and
    `@fz/dev`'s suite passed three runs in a row at 3.9 s.
  - `@fz/dev`'s coverage rose to 71.79 / 89.47 / 83.72 / 71.17%, and its
    floor to 71 / 88 / 83 / 70.
- Docs: `lib/dev/AGENTS.md` says what the module holds and that a game's
  screenshot script uses it; both games' `AGENTS.md` say their images go
  through it.
- **`yarn verify` passed** on the second run, in 5m13s. Every workspace's
  tests and coverage are P3's, `@fz/dev`'s aside (50 tests), with the
  Solitaire Collection's branches back at 1894 of 2043. Both games' `dist/`
  are byte for byte P3's.

### 2026-10-26: P5, `game.json`

- **`@fz/dev/game-manifest`** (finding 9), `lib/dev/src/game_manifest.ts`:
  a game's build says what it holds in `game.json` at the top of its
  `dist/`: `{ name }`, and for a collection `games`, the `id` and `name` of
  every game it opens. `gameManifest({ name, catalog })` is the plugin that
  writes it, in `generateBundle`, during builds only; `isGameManifest()` is
  the guard a reader checks it with.
  - A collection's games come from its catalog module, named by path and
    export (`{ module, export }`), loaded with Vite's `runnerImport()` as
    the site's `loadCatalog()` loads the site's. It is given the build's
    own root and `resolve.alias`, from `this.environment.config`, since the
    Solitaire Collection's catalog imports through `@/`; with
    `configFile: false`, so it doesn't load the game's config again. A
    module whose export isn't a list of `{ id, name }` fails the build,
    naming the module and the export.
  - `gameConfig()` takes `name` and `catalog` beside `port` and adds the
    plugin: Minesweeper's is `{ port: 9001, name: "Minesweeper" }`, the
    Solitaire Collection's names `GAME_CATALOG` in
    `src/ui/app/provider/game_catalog.ts`.
- **The site's `checkGameManifests()`**, in `tools/vite-plugins.ts`, runs
  at `buildStart` after `checkGameImages()`. For every catalog entry with a
  `play` whose build is a workspace's, it reads
  `public/play/<build>/game.json` and reports, one line each: a build with
  no manifest it can read, a single game the build calls by another name, an
  id the collection doesn't open, or an entry the collection calls by
  another name. Names are compared with typographic apostrophes made
  straight: the site sets Baker's Game, Baker's Dozen and Grandfather's
  Clock in type, the Solitaire Collection doesn't. A pinned archive predates the
  manifest, so it is skipped, and `checkGameImages()` stays as it was for
  every game.
- **Proof:**
  - Both games' builds write `game.json`: Minesweeper's names it, the
    Solitaire Collection's lists its 41 games, and the site's build passes
    with both.
  - With BAKERS taken out of the Solitaire Collection's `CATALOG_ENTRIES`
    and Klondike renamed "Klondike Patience", rebuilt, the site's build
    failed with `Klondike: /play/solitaire/#/klondike calls it Klondike
Patience` and `Baker’s Game: /play/solitaire/ opens no game bakers`. The
    pictures' check passed it, since the old build's screenshots of Baker's
    Game were still in `public/play/solitaire/`, which is the gap the plan
    found. The catalog was restored and both rebuilt clean.
  - `game.json` is served too, at `/play/<slug>/game.json`. It says only
    what the catalog page already does, so it is left there.
- Specs:
  - `lib/dev/src/game_manifest.spec.ts` (8): three run a real `vite build`
    in a temporary folder, a single game, a collection whose catalog
    imports through an `@` alias, and a module whose export lists no games;
    five cover the guard.
  - The site's `tools/vite-plugins.spec.ts` (24, up from 14): seven for
    `manifestProblems()` (agreement, apostrophes, a game still to come, a
    missing id, a renamed entry, a renamed single game, no manifest), three
    for `readGameManifest()` (reads one, none, an invalid one).
  - `vite.spec.ts` passes names and expects the manifest's plugin.
- Docs: `.agents/AGENTS.md` (the production build, and what a game's build
  holds), `docs/operations.md` (the catalog, and adding a game built here),
  the `github-actions-ci-cd` skill, the site's, both games' and `@fz/dev`'s
  `AGENTS.md`, and the `add-solitaire-game` skill, which now says a new
  game reaches the site only once the site's catalog lists it, and that
  renaming one fails the site's build until it follows.
- `@fz/dev`'s coverage rose to 75.18 / 93.44 / 85.71 / 74.19%, and its
  floor to 75 / 92 / 85 / 74. Its `AGENTS.md` now names the manifest's and
  the screenshots' specs among its checks.
- The site's `AGENTS.md` said Angular leaves `@keyframes` names alone, the
  Solitaire Collection's that it renames them after the component. The
  compiler does rename them (`_scopeKeyframesRelatedCss` in
  `@angular/compiler`), so P6's shared rule is the Solitaire Collection's.
- **`yarn verify` passed** in 4m16s. Every workspace's tests and coverage
  are P4's but `@fz/dev`'s (58 tests) and the site's tools (177 tests, up
  from 167, at 69.57 / 71.3 / 78.57 / 68.19%: the functions fell from
  80.17%, since the plugin's hook, like `checkGameImages()`'s, runs only in
  a real build). Both games' `dist/` are P4's byte for byte, plus
  `game.json`; the site's differs in its three build-time files and the two
  `game.json` under `play/`.

### 2026-10-26: P6, the instruction layers and the skills' names

- P5 was committed as `366e037`.
- **`frontend/AGENTS.md`** (finding 10), with a `CLAUDE.md` that imports
  it: the frontend's layout (the root, the constraints, self-contained
  workspaces, `site/`, `lib/`, `games/`), Yarn and Node, every command, and
  running and debugging, moved from `.agents/AGENTS.md`; and the Angular and
  Sass rules the three apps each spelled out: templates bind, visible state
  is announced, the libraries' pieces first (with icons hidden from
  assistive technology), tokens by their `--fz-*` names, runtime values as
  custom properties, Sass modules, breakpoints by name, nesting, shared
  `@keyframes` once, and `//` comments.
- **`frontend/games/AGENTS.md`**, with its `CLAUDE.md`: what every game
  keeps (it knows nothing of the site, `gameConfig()` and `game.json`, a
  port of its own, the site's screenshots, the shared palette, the games'
  chrome, saved games that outlive the code) and the five steps to add one.
- **Proof that the layers load:** this session's Claude Code loaded
  `frontend/CLAUDE.md` once its work reached `frontend/`, and
  `frontend/games/CLAUDE.md` once it touched a file in a game, each with
  its `AGENTS.md`, beside the workspace's own.
- **What moved out:** `.agents/AGENTS.md` went from 289 lines to 215; its
  "Building and Checking" now says only where to run Yarn, what
  `yarn start` and `yarn verify` do, and that `frontend/AGENTS.md` lists the
  rest. The site's went from 178 to 142, Minesweeper's from 168 to 153, the
  Solitaire Collection's from 320 to 292, each keeping what is its own: the
  site its wording, color and accessibility means; Minesweeper its inks,
  viewport use, keys and screenshots; the Solitaire Collection its tokens,
  mixins, breakpoints, felt and keys. Their "Technology Stack" lists name
  no versions. The libraries' four `AGENTS.md` and the root `AGENTS.md`
  pointer name `frontend/AGENTS.md`.
- **The `@keyframes` rule:** the site's `AGENTS.md` said Angular leaves
  their names alone, so all must be global; Angular's compiler renames a
  component's own (`_scopeKeyframesRelatedCss`), so the shared rule is the
  Solitaire Collection's: one used by several components is declared once,
  globally.
- **`angular-testing`** (finding 11), in `.agents/skills/`: the setup from
  `@fz/dev/vitest`, Testing Library by role, user-event, jest-dom,
  `TestBed.inject`, zoneless change detection, fake timers after `render`,
  what jsdom keeps and lacks, and the libraries' testing entry points. The
  site's and Minesweeper's `vitest-testing` became `site-testing` (72 lines
  to 53) and `minesweeper-testing` (82 to 61), keeping their setup,
  fixtures and floors; the Solitaire Collection's became
  `solitaire-testing`, which had none of the shared patterns to give up.
  `@fz/ui`'s `AGENTS.md` points its specs at `angular-testing`.
  `.agents/AGENTS.md`'s "Writing Unit Tests" names all four.
- **The Solitaire Collection's skills** (finding 12):
  `sass-design-system`, `typescript-strict-patterns` and
  `vite-bundle-optimization` became `solitaire-styles`, `solitaire-types`
  and `solitaire-build`, their triggers naming the game's own files and
  terms. `solitaire-styles` points at `fuzzley-ui` and
  `lib/style/AGENTS.md` for `@fz/style`'s tokens rather than listing them,
  and drops the overlay and keyframe rules the frontend's `AGENTS.md` now
  holds. `phaser-core`, `phaser-canvas-performance` and
  `add-solitaire-game` cite the new names. The game's
  `docs/phone-board-layouts-log.md` keeps the old one, as history.
- **The links** (finding 14): `check-skill-references.mjs`, unless `CI` is
  set, warns about each skill whose link in the `.claude/skills` beside it
  is missing or leads somewhere else, and each link there that leads
  nowhere, and says to run the link script; it never fails for them. Before
  the link script ran, it warned about 13: the seven new skills unlinked
  and the six old names' links left dangling (three of them
  `vitest-testing`).
  With `CI=true` it said nothing. `node .agents/link-claude-skills.mjs`
  then linked the seven, pruned the six, and the check came back clean.
- **For P7:** the generated Phaser skills are copies of the `skills/`
  folder Phaser's npm package ships (`frontend/node_modules/phaser/skills/`,
  4.2.1 installed), each renamed with a `phaser-` prefix, in its name and
  its "Related skills" links, and with its code samples reformatted by
  Prettier. Copying all 28 from the package that way, through this
  repository's Prettier, gave the same files but for twelve: in ten the
  copy here repaired the package's cross-references by hand (bare names
  such as `sprites-and-images.md` made links, links from `references/`
  given their depth, and two links to a reference guide the package breaks
  as `references/REFERENCE..//SKILL.md`), and in the rest Prettier escaped
  a `*` in a table, as this one no longer does. Several kept ones link to
  skills P7 deletes, which the reference check will catch.
- **`yarn verify` passed** in 4m16s, the reference check silent about
  links once they were made. Every workspace's tests and coverage are P5's
  but the Solitaire Collection's branches, at 1895 of 2043, its usual
  wobble with what a run deals.
