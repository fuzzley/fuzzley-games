# Plan: code health for Minesweeper and the shared libraries

Agreed 2026-10-25, built 2026-10-25 and 26: the user took every
recommendation ("Proceed with all suggested fixes and recommendations"), and
asked for a work log and regular commits. Each phase below ends with what was
built. The work log kept while it was built, with what was found on the way,
was deleted when the work was done; git history keeps it as
`docs/code-health-worklog.md`.

It comes from a review of
`frontend/games/minesweeper/` and `frontend/lib/`, asked for to raise the code's
quality and keep it high: code that is easy to read, extend, maintain and
test, in folders that leave room for what comes next. Paths are relative to
`frontend/`.

## Where things stand

The code is in good health, so this plan tidies; it does not rescue.

- **Minesweeper** keeps its rules in `src/game/`, free of any framework and
  fenced off by ESLint, as pure functions over an immutable `Field`. The shell
  is built on signals, `inject()`, `input()` and `output()`, computed view
  models and zoneless change detection. Randomness and storage come through
  injection tokens, every stored entry carries a version, and the board is an
  accessible grid. Its 336 tests cover 98.8% of the lines and 93.7% of the
  branches, and they draw fields as pictures rather than dealing at random.
- **The libraries** keep clear rules (everything carries `fz`, imports go one
  way, a component reads no viewport), one entry point per folder, and 400
  tests between them (`@fz/ui` 151, `@fz/game-ui` 34, `@fz/style` 215).

What the review found is of three kinds:

1. **A check that doesn't run.** CI never checks the coverage floors.
2. **Copies that will drift.** The two games keep the same code in step by
   hand, the three contrast specs repeat the same math, and every workspace
   copies the lint and compiler settings. The comments admit it: "Mirrors …
   change the two together".
3. **Shape.** Minesweeper's folders group code by kind, not by feature, the
   word "game" means three things, and `GameService` and `BoardComponent`
   each do several jobs.

## Findings

### 1. The coverage floors are never checked

`games/minesweeper/vitest.config.ts` holds the rules to 100% of their lines,
and the Solitaire Collection's config holds its code to 95% and over; the
`vitest-testing` skills say never to drop below them. But `yarn verify`, which
CI runs, runs each workspace's `test`, which is `vitest run` without
`--coverage`, and Vitest checks thresholds only when it collects coverage. A
change that drops below a floor passes CI. The floors live only in
`yarn test:coverage`, which nothing runs. The libraries, which every app
depends on, have no floor at all.

**Change:** a workspace with a floor collects coverage on every run, and the
three libraries get floors a little under their real figures, as the
Solitaire Collection's config sets its own.

**Why:** a standard that CI doesn't check wears away. This one costs about a
second a run (Minesweeper's suite takes 6.1s without coverage, 7.3s with).

### 2. The games' viewport is kept in step by hand

`games/minesweeper/src/app/service/viewport.service.ts` and
`games/solitaire/src/ui/app/service/viewport.service.ts` run the same four
media queries on the same widths (720px and 500px for the compact chrome,
1280px for the wordmark, 360px for the home button) through the same
`follow()`. Each game keeps a `_breakpoints.scss` "so the two games change
shape together", and a `matchMedia` fake for its specs
(`games/minesweeper/src/testing/fake_viewport.ts`, "the Solitaire
Collection's, which the two games may one day share", and
`games/solitaire/test/support/ui/viewport.ts`). That is one rule in four
copies, kept equal by hand, two in TypeScript and two in Sass.

The wordmark and home-button widths say what fits in `<fz-game-bar>`, which
is the bar's own content, so they belong with the bar.

**Change:** `@fz/game-ui` takes them:

- `@fz/game-ui/viewport`: `GameViewportService`, with the form factor,
  whether the screen is compact and upright, and whether the bar fits its
  wordmark and its home button;
- `@fz/game-ui/breakpoints`: the widths as plain constants, with no Angular
  import, so the Solitaire Collection's Phaser engine can read them too;
- in its Sass, `below()`, `from()`, `compact`, `phone-portrait` and
  `phone-landscape`, the two games' mixins together;
- `installFakeViewport` in `@fz/game-ui/testing`;
- a spec that compiles the Sass and checks it against the constants, in place
  of the "change the two together" comments.

The bar still reads no viewport: the service sits beside it, and the app
binds what it says to the bar's inputs, as now.

**Why:** a rule both games must keep is one rule. A third game would get the
same shapes for free.

### 3. The contrast specs do the same math three times

`lib/style/src/tokens/contrast.spec.ts`,
`games/minesweeper/src/app/board/contrast.spec.ts` and
`games/solitaire/test/ui/app/styles/contrast.spec.ts` each carry their own
`channels()`, `luminance()` and `contrast()`. The two games' specs also share,
almost word for word, about 120 lines that compile the global stylesheet with
the libraries' `sass` exports and read each palette's roles out of the CSS.

**Change:** `@fz/style/testing`, for specs, which run in Node: compiling a
stylesheet the way Vite resolves `@fz/*`, reading the palettes' roles from
the CSS, and the WCAG math (mixing, laying a color over a surface, luminance,
the contrast ratio), with a spec of its own. Each contrast spec keeps only its
pairs and thresholds.

**Why:** "Contrast is checked, not hoped for" is one of the libraries' rules.
The math that checks it should exist once and be tested once, so that a fix to
one copy can't miss the others.

### 4. The screenshot scripts share 200 lines of Chrome

`games/minesweeper/tools/capture-screenshots.mjs` (614 lines) and the
Solitaire Collection's (403) carry the same `DevToolsConnection`,
`CHROME_PATHS`, `findChrome()` and `launchChrome()`.

**Change:** one copy, in finding 5's library, as `@fz/dev/chrome`. Each script
keeps only how it stages its game and what it captures.

### 5. Every workspace copies the lint and compiler settings

- `eslint.config.js` is the same file in `@fz/ui` and `@fz/game-ui`;
  Minesweeper's and the site's repeat its rules with their own additions, and
  the Solitaire Collection's is CommonJS (`eslint.config.cjs`). The block for
  the `.mjs` scripts, which requires their JSDoc types, is in four configs:
  the root's, the site's, Minesweeper's and the Solitaire Collection's.
- The strict compiler options are in six `tsconfig.json` files. Minesweeper's
  says why they must match: the app compiles the libraries' sources, "so a
  flag beyond these would be one their code must also pass". Only a comment
  holds them together.

A rule added to one workspace silently misses the rest. The repository has
already solved this for one tool: every app's stylelint config extends
`@fz/style/stylelint`.

**Change:** a library for what the workspaces share to build, check and
script themselves, which no app code imports: `lib/dev`, `@fz/dev`, with

- `@fz/dev/eslint`: the TypeScript, template and spec blocks, given the
  selector prefix (`app` or `fz`), and the scripts block;
- `@fz/dev/tsconfig.json`: the strict compiler and Angular options, which each
  workspace's `tsconfig.json` extends;
- `@fz/dev/chrome`, from finding 4.

Each workspace keeps its own config files, cut to a few lines that extend the
presets and add what is its own, such as Minesweeper's fence around its rules.
The presets can add a fence of their own: nothing but a spec imports
`@fz/ui/testing` or `@fz/game-ui/testing`.

**Why:** one place to raise the bar, and every workspace rises with it.

### 6. Minesweeper's folders group code by kind

- `src/app/service/` holds five services that have little to do with each
  other: the game, the saved game, the settings, the stats and the viewport.
  `settings.service.ts` sits apart from the settings, and `stats.service.ts`
  from the card that shows the stats. Angular's style guide asks for folders
  by feature, and against folders named for a kind of code, such as
  `services`; a sixth service would join the drawer.
- "Game" names three things: the rules (`src/game/`), `GameService`, and the
  bar (`src/app/game_bar/`), whose `GameBarComponent` has the same name as
  `@fz/game-ui`'s, so it imports that one as `FzGameBarComponent`.
- `format.ts` sits loose in `src/app/`, and `count()`, which the bar and the
  help use, lives in `describe.ts` with the screen reader's words.

**Change:** moves and renames only, in one commit:

```text
src/
  rules/        the rules, as src/game/ is now; the ESLint fence moves with it
    format.ts   count() and formatTime()
  app/
    app.component.*
    play/       game.service.ts, saved_game.service.ts, and finding 7's pieces
    board/      board.component.*, _inks.scss, contrast.spec.ts, finding 8's directive
    bar/        bar.component.* (BarComponent, app-bar), from game_bar/
    settings/   settings.component.*, settings.service.ts
    stats/      stats.service.ts
    result/     result.component.*
    help/       help.component.*
    styles/
  testing/
```

`viewport.service.ts` moves into `@fz/game-ui` by finding 2; if that is turned
down, it gets a `layout/` folder.

**Why:** a feature's code sits in one folder, a new feature gets a folder of
its own rather than a share of a drawer, and each name means one thing. Moves
are cheapest now, before more code arrives.

### 7. `GameService` does seven jobs

It holds the field, makes the moves, asks before a game is lost, keeps score,
runs the clock (an interval, and a `visibilitychange` listener that pauses
it), speaks through the live region (with the trailing no-break space that
makes a repeat heard), and holds the state of the result card and Flag mode.

The clock and the live region aren't Minesweeper's, and each has a twin: the
Solitaire Collection's `TimerService` is a stopwatch, and its game browser
keeps an `aria-live` paragraph of its own.

**Change:**

- `@fz/game-ui/stopwatch`: a `Stopwatch` with `start()`, `stop()`,
  `reset(seconds)` and a `seconds` signal, which pauses while the page is
  hidden. It counts from timestamps, not ticks: today each pause drops the
  part of a second under way, and a busy page delays ticks.
- `@fz/ui/announcer`: an `Announcer` with `say(text)`, and the live region it
  speaks through, which an app puts in its root template once, as it does
  `<fz-confirm-dialog>`.

`GameService` keeps the game: the field, the moves, the confirmation and the
score.

**Why:** each piece can be tested alone, with fake timers, and without
`GameService`'s specs patching `document.visibilityState`; and each is written
once for every game.

### 8. The board recognizes gestures itself

About 60 of `BoardComponent`'s 215 lines are a long-press recognizer: three
mutable fields (`press`, `pressed`, `touching`), a timer, the distance a
finger may drift, and the flag that swallows the click after a long press.

**Change:** a directive beside the board, `long_press.directive.ts`, which
emits a long press on the element pressed and stops the click that follows.
The board only turns events into moves on squares.

**Why:** the gesture gets specs of its own, and the board's read as what the
board does.

### 9. Small things

- **The rules repeat themselves.** `reveal()` and `toggleFlag()` spell out
  `isOver()`; `settle()` and `clearedShare()` each work out the safe squares;
  `settle()` counts the revealed squares by hand beside `revealedCount()`.
- **Two lists restate two types.** `saved_field.ts` lists `SQUARES` and
  `OUTCOMES` beside the `Square` and `Outcome` unions in `field.ts`. Declared
  once, `as const`, with the types taken from them, as `@fz/ui`'s `ICON_NAMES`
  and `@fz/style`'s `THEMES` are, a new state can't be added to one and missed
  in the other.
- **Guards should take `unknown`.** `isValidLives(lives: number)` makes
  `settings.service.ts` check `typeof lives === "number"` first, and its
  `sizeFrom()` checks `typeof` where the other readers use `isWhole()`. A
  guard that takes `unknown` and narrows, as `isDifficultyId()` does, ends
  both.
- **Three services check a stored version, each its own way.** The settings,
  the stats and the saved game each check
  `isRecord(saved) && saved["version"] === 1` and write `{ version: 1, … }`.
  `LocalStorageService` can do it once (`readVersioned(key, version)` and
  `writeVersioned(key, version, value)`), and the Solitaire Collection's recent
  games and presentation settings, which store no version, can take it up.
- **The saved game is written every second.** `SavedGameService`'s effect
  reads `seconds()`, so it writes the whole field to `localStorage` every
  second of a game. Reading the time with `untracked()`, and writing it as
  well when the page hides, writes once a move instead.
- **`changeDetection: ChangeDetectionStrategy.OnPush` is the default.**
  Angular 22 makes OnPush the default, and its compiler drops the setting
  unless it names another strategy. Minesweeper's 6 components and the
  Solitaire Collection's 10 set it; the libraries' 8 and the site's 9 don't.
  Leave it out everywhere.
- **The overflow menu's ids are strings.** `BarOverflowComponent` emits a
  `string`, so `chooseFromMenu()` switches over strings no compiler checks. A
  generic `BarOverflowItem<Id extends string>` turns a misspelled id into a
  type error and makes the switch exhaustive.
- **The theme menu and the theme picker build the same options.** Both map
  `THEMES` to `{ ...theme, modeName, checked }`, which `ThemeService` can
  offer once. It also writes its key through `BROWSER_STORAGE` with a `try` of
  its own, beside `LocalStorageService`, which does the same.
- **`@fz/style`'s TypeScript mixes where it runs.** `src/` holds browser code
  (`themes.ts`, `fuzzball.ts`), Node build code (`vite.ts`, `theme_script.ts`,
  and `fuzzball_raster.ts`, which needs sharp) and a lint preset
  (`stylelint.ts`), with finding 3's helpers to come. Folders `build/`,
  `lint/` and `testing/` draw the line, and an ESLint rule can keep `node:*`,
  `sass` and `sharp` out of what a page loads. The names in `exports` don't
  change.

### 10. The custom field's form is wired by hand

The vendored `angular-developer` skill, which agents follow, says to use
Signal Forms for every form. The settings' custom field wires `[value]`,
`(input)` into `type()`, `aria-invalid` and the check on submit by hand. On
`form()`, with `sizeProblem()` as its validator, the code would match what an
agent changing it is told to write. It adds `@angular/forms`, which isn't a
dependency yet, and Signal Forms may still be experimental in 22.2.

## Phases

Each phase is its own commits, keeps `yarn verify` green, and changes nothing
a player sees but where it says so. P1 and P2 come first because the rest
lean on them: the floors guard the refactors, and the moves put the later
changes in their final folders.

### P1: check the floors (small)

Finding 1. Coverage on every test run in Minesweeper and the Solitaire
Collection; floors for `@fz/ui`, `@fz/game-ui` and `@fz/style` at their
figures on the day, rounded down, each with `@vitest/coverage-v8`. The
`vitest-testing` skills and the `AGENTS.md` files say that `yarn test` checks
the floor.

- **As built:** every library's and game's `test` runs with coverage, so a
  floor holds for the whole suite and one spec runs with
  `yarn vitest run <path>`. The site has no coverage set up, which was left
  for a floor of its own later.

### P2: Minesweeper by feature (small)

Finding 6, moves and renames only, with `git mv` so history follows. The
workspace's `AGENTS.md`, its `vitest-testing` skill and the ESLint fence take
the new paths; `node .agents/check-skill-references.mjs` fails on a path a
skill still names.

- **As built:** `src/game/` is `src/rules/`, the services sit in `play/`,
  `settings/` and `stats/`, and `game_bar/` is `bar/`. The same 336 tests
  passed at the same coverage.

### P3: `@fz/dev` (medium)

Finding 5, then finding 4. Taken up by the three libraries, Minesweeper, the
site, the Solitaire Collection (its configs and its screenshot script) and the
root's config for `.agents`. The repository's `AGENTS.md` names the library
and says a workspace's configs extend its presets. Proof: `yarn verify`, and
both screenshot scripts still write their images, at the same sizes.

- **As built:** `@fz/dev/eslint`, `@fz/dev/tsconfig/*.json` and
  `@fz/dev/chrome`, adopted everywhere. The Solitaire Collection was the long
  part: the strict set found 21 compiler errors and 1113 lint problems, and
  its app config had never typechecked `import.meta`. A workspace's own import
  fences use `@typescript-eslint/no-restricted-imports`, since a second
  `no-restricted-imports` would replace the preset's. Minesweeper's
  screenshots came out byte for byte the same.

### P4: `@fz/style/testing` (small)

Finding 3. The three contrast specs take it up. Each must still fail when a
pair drops below its threshold, which is checked by breaking an ink on
purpose, then restoring it.

- **As built:** `compileStylesheet()`, `paletteRoles()` and `paint()` with
  the contrast math; a translucent color with nothing under it throws rather
  than landing on black. Breaking a palette's `muted` and a dark ink failed
  the pairs they should.

### P5: the games' viewport in `@fz/game-ui` (medium)

Finding 2. Minesweeper takes it up and drops its own. It must look the same:
screenshots before and after at 1440 × 900, 1280 × 720, 1000 × 800,
700 × 900, 390 × 844 and 844 × 390, compared pixel for pixel. The Solitaire
Collection takes it up in P9.

- **As built:** `@fz/game-ui/viewport` (`GameViewportService`),
  `@fz/game-ui/breakpoints` (the widths, `formFactorAt()` and the Sass
  mixins, each checked against the constants by a spec) and
  `installFakeViewport()` in `@fz/game-ui/testing`. No pixel differed, at
  340 × 720 too.

### P6: `Stopwatch` and `Announcer` (medium)

Finding 7, taken up by Minesweeper. The one change a player could notice: the
clock no longer drops part-seconds, so a time can come out a second longer
than before.

- **As built:** named `StopwatchService` and `AnnouncerService`, since every
  injectable in the libraries ends in `Service`. The stopwatch reads
  `Date.now()` and pauses while the page is hidden. The site's home-page
  search keeps its own live region, and could take `<fz-announcer>` up later.

### P7: the long press (small)

Finding 8. The board's specs pass unchanged, which shows the gesture works as
before.

- **As built:** `LongPressDirective`, which also keeps the click and a
  finger's `contextmenu` that follow a long press from the board, with
  listeners in the capture phase. The board's specs passed untouched.

### P8: small things (small)

Finding 9, a commit each.

- **As built:** all of finding 9, including `readVersioned()` and
  `writeVersioned()` in `LocalStorageService`, the generic
  `<fz-bar-overflow>` (its template checker infers the ids from `[items]`),
  `ThemeService.options`, and `@fz/style`'s TypeScript sorted into `build/`
  and `lint/` with an ESLint fence. `OnPush` went from Minesweeper's
  components, since Angular 22 makes it the default.

### P9: the Solitaire Collection takes up the shared pieces (medium, optional)

Its `ViewportService`, `_breakpoints.scss` and spec fake give way to P5's, its
`TimerService` to the `Stopwatch`, and its game browser's live region to the
`Announcer`; its stored entries gain versions, and its components drop
`OnPush`. Its engine's `form_factor.ts` reads `@fz/game-ui/breakpoints`. The
same screenshot check as P5.

- **As built:** all of it, with no pixel differing. Its `phone` width (480px)
  stays its own. The game browser's `<fz-announcer>` sits inside its dialog,
  since a modal hides the page behind it from a screen reader; `@fz/ui`'s
  docs say an app puts one in each modal that speaks while open. The recent
  games and presentation settings carry a version and still read the bare
  entries earlier builds stored. `emitDecoratorMetadata`, `removeComments` and
  `sourceMap` left its tsconfig, which changed no byte of the build but made
  28 imports `import type`.

### P10: Signal Forms (small, if decided)

Finding 10.

- **As built:** Signal Forms are stable since Angular 22.0, so Minesweeper's
  custom field is a `form()` with `sizeProblem()` as its validator, its
  bounds set by `min()` and `max()` rules. A problem now shows once the
  player leaves an input, as well as on pressing Start. A number input
  holding no number ("1e") carries a `parse` error, which the message reads
  as empty.

## Decisions

1. **A tooling library, `@fz/dev`** (finding 5). Recommended. The
   repository's `AGENTS.md` says a workspace's configs "sit in its folder and
   cover only it"; they still would, and would extend presets, as the
   stylelint configs already do. The alternative is the copies, which nothing
   checks against each other.
2. **The games' breakpoints and viewport in `@fz/game-ui`** (finding 2).
   Recommended. `@fz/game-ui`'s `AGENTS.md` says each app binds the bar to
   "its own breakpoints"; both games use the same ones on purpose, and the bar
   would still read no viewport. Turned down, P5 and P9's viewport part drop
   out.
3. **`src/game/` becomes `src/rules/`** (finding 6). Recommended, in P2's one
   move; the workspace's `AGENTS.md` already calls it "the rules". Turned
   down, P2 does the rest.
4. **The Solitaire Collection in this plan.** Recommended for the mechanical
   part (P1's coverage, P3's configs and screenshot script, P4's spec), so no
   copy survives. P9 is optional, since it touches the engine.
5. **Signal Forms** (finding 10). Recommended only if Signal Forms is stable
   in Angular 22.2. If it isn't, Minesweeper's `AGENTS.md` records the
   exception, so an agent following the skill doesn't half-migrate the form.

## Considered, not recommended

- **Angular's file names** (`board.ts` and `Board` for `board.component.ts`
  and `BoardComponent`, hyphens for underscores). The repository follows
  Google's TypeScript style throughout, and renaming every file in every
  workspace buys no clarity.
- **The screen reader's words out of the rules.** `describe.ts` needs no
  framework, sits under the 100% floor, and the workspace's `AGENTS.md` puts
  it there on purpose.
- **A framework-free `@fz/core`** for `isRecord()` and `isWhole()`. They are
  nine lines, and the Solitaire Collection reads JSON another way
  (`json_reader.ts` throws, naming the path). Not worth a library before a
  third reader.
- **A leaner board view model.** Each move rebuilds up to 900 cell views, but
  Angular only touches the DOM that changed, and no slow move has been
  measured. Measure before changing it.
- **A shared spec setup file.** Each is 12 to 21 lines, mostly Angular's own
  boilerplate.

## Risks

- **A move breaks a path an agent reads.** `check-skill-references.mjs` fails
  on a skill's dead path; the `AGENTS.md` files change in the same commit as
  the move.
- **A shared preset changes every workspace at once.** That is the point, and
  `yarn verify` covers each one. A workspace that must differ overrides the
  rule in its own config, with a comment saying why.
- **The viewport move shifts a layout.** The widths are equal today, and the
  Solitaire Collection's extra `phone` width (480px) and `from()` come along
  in the shared Sass. P5's and P9's pixel comparisons catch a shift.
- **A floor fails its first run.** Each is set from the figures measured in
  P1, a little under them.
