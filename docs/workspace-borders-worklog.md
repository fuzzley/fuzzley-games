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
| P5    | `game.json`                          | next    |
| P6    | The instruction layers and skills    | to do   |
| P7    | The Phaser skills                    | to do   |
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
