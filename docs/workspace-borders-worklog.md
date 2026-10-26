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
| P3    | Vitest and game presets in `@fz/dev` | next    |
| P4    | The site's images                    | to do   |
| P5    | `game.json`                          | to do   |
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
