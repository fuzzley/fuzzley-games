# Work log: Brick Fuzz Pop, the start (K1–K3)

The start of Part 2, from [`implementation-plan.md`](../implementation-plan.md)'s
§6: the workspace (K1), the contracts every stream codes against (K2) and
the aims (K3), built by one agent standing in for the integrator.

## Part 2's start

### K1: the workspace

**2026-11-10.**

**What was built.** `frontend/games/brick-fuzz-pop/`, from Brick Breaker's
and Asteroid Breaker's:

- `package.json` (`brick-fuzz-pop`, private, the same dependencies as the
  breakers) with only the scripts whose tools exist: `dev`, `start`, the
  three builds, `preview`, `test`, `test:coverage`, `test:watch`,
  `typecheck`, `lint` and `lint:styles`. `build:aims` and the rest join with
  the packages that write their tools.
- `vite.config.ts`: `gameConfig({ port: 9006, name: "Brick Fuzz Pop" })`.
- `vitest.config.ts`: Asteroid Breaker's four floors, on the rules and the
  view (100/95/100/100), the scene (98/92/100/99) and the shell
  (98/97/97/98); coverage over `src/**/*.ts` and `tools/**/*.mjs`, as
  Asteroid Breaker's measures its helpers and scripts with no floor; `pure`
  over `src/rules`, `src/view`, `src/testing` and `tools`; `sim` over
  `src/rules/levels/every_level` and `src/rules/levels/every_floor`.
- `eslint.config.js`: Asteroid Breaker's blocks, with
  `phaserGameLayers({ heldAsRules, exact: true })` and the nine held files
  §5.1 names, and Asteroid Breaker's block that holds the other specs'
  helpers to Angular by type alone.
- The tsconfig solution (app, spec, node, scripts) and
  `stylelint.config.js`, as Brick Breaker's.
- `src/test-setup.ts`: the headless Phaser, TestBed, the dialog polyfill,
  Asteroid Breaker's `document.fonts` stub and a store in memory for each
  test.
- `index.html`, with the game's description and its structured data but no
  link preview image, which T2 captures.
- `src/main.ts` and an `AppComponent` whose `<main>` holds the game's name
  as its heading, on `@fz/game-ui`'s global stylesheet, and its spec.
- `LICENSE`, `README.md`, a short `AGENTS.md` describing only what exists
  (the layers' fences, the exact arithmetic, the commands, the projects and
  the floors), and `CLAUDE.md`.
- `frontend/yarn.lock` gains the workspace. `games.json` doesn't list it,
  and the site's catalog doesn't name it, until U2.

**Choices the plan didn't make.**

1. **The held files are filtered to those that exist.**
   `phaserGameLayers()` throws for a held file the workspace doesn't have,
   so `eslint.config.js` lists all nine of §5.1's (`HELD_AS_RULES`) and
   holds those written so far (`HELD`). Each is held from the commit that
   writes it, with no edit to the config. The cost is the library's check
   for a missing file: a helper written under a name the list doesn't have
   is held by nothing, and lints as quietly as a held one. So the
   integrator checks each new file of `src/testing/` against the list as
   it merges the package that writes it, and once all nine exist (the last
   is `screenshot_api.ts`, at T2) the filter goes and `HELD_AS_RULES` is
   handed on as it is.
2. **`test:coverage` runs `sim` with `--passWithNoTests`.** Vitest exits
   with 1 when a project it is asked for finds no spec, and the two `sim`
   folders don't exist until P3. `yarn test` runs every project at once and
   passes with `dom`'s spec alone. P3 drops the flag in the commit that
   writes the first `sim` spec, so a folder renamed on one side only fails
   again rather than running the replays in `pure`, under coverage.
3. **`lint` names no `tools` folder yet.** ESLint fails on a path that
   matches nothing, so K3 adds `tools` with its first script.
4. **`tsconfig.spec.json` is Brick Breaker's,** without Asteroid Breaker's
   `rewriteRelativeImportExtensions`, which only a spec importing
   `@fz/dev/layout` needs. V1 asks for it with its layout spec.
5. **The repository's and the frontend's lists of games don't name it
   yet.** D1 does, as `frontend/games/AGENTS.md`'s "Adding a game" asks
   once the game is one.
6. **The shell is Asteroid Breaker's first one,** its name in a `<main>`
   at the middle of the page, on `@fz/game-ui`'s global stylesheet, as
   Brick Breaker's is now, rather than `@fz/style`'s alone.
7. **`frontend/games/AGENTS.md` gives 9006 to Brick Fuzz Pop** and
   says the next game takes 9007, since the workspace now takes 9006. The
   rest of that file's list of games waits for D1.

**Checks.** The workspace's `lint`, `typecheck`, `test` and
`test:coverage` pass: one spec, 100% of the shell's two statements; `sim`
finds no spec and passes. `build` writes `dist/` with `game.json` naming
"Brick Fuzz Pop", 95 KB of script (31 KB gzipped). `yarn workspace
brick-fuzz-pop dev` served the page on port 9006 (on `localhost`, which is
`::1` here), and headless Chrome found the `main` landmark and its heading
"Brick Fuzz Pop", with no error in the console. The root's `yarn lint`
passes.

**The mutation pass.** K1 has no logic of its own to break: the shell is
a template, and the configs are the presets'. The checks themselves were
tried instead: `sim` without `--passWithNoTests` exits with 1, as the
second choice says.

**The review:**

1. **The filter of held files turns the library's check for a missing
   file off, with no end.** Fixed: the config's comment and the first
   choice now say a misnamed file is held by nothing, that the integrator
   checks each new helper against the list as it merges, and that the
   filter goes once all nine exist.
2. **`--passWithNoTests` has no end either.** Fixed: the second choice
   says P3 drops it with the first `sim` spec, and why.
3. **The names were the wrong way round.** `HELD` named the nine and
   `SCRIPT_HELPERS`, Asteroid Breaker's name for what its scripts load, the
   files held. Fixed: `HELD_AS_RULES` is §5.1's list and `HELD` those
   written.
4. **`frontend/games/AGENTS.md` still said the next game takes 9006.**
   Fixed in this commit (the seventh choice).
5. **The entry lacked its commit and its review.** The review is this
   list. The task this log is kept for asks for no commit hashes, so the
   entries leave them out; the commits are found by their subjects.
