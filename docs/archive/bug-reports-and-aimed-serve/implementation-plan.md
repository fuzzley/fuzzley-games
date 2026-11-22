# Report a bug and the aimed serve: the implementation plan

Written 2026-11-22, beside [`design.md`](design.md), which says what to build
and why. This file is how to build it with several agents at once, by the
`multi-agent-build` skill: thirteen packages in three streams, four agents at
a time, each in its own worktree, each commit reviewed, each package landed on
one integration branch by a rebase, a check and a fast-forward.

- the summary and the order (§1);
- the contracts packages build against before the one that makes them lands
  (§2);
- each package: its commits, what it owns, what it reads, when it is done
  (§3);
- running it: slots, ports, ownership, briefs (§4);
- checks, budgets and risks (§5, §6), and the finish (§7).

Paths are relative to `frontend/` unless they start with `docs/` or
`.github/`.

---

## 1. Summary

- **Three streams, thirteen packages, about 59 commits, and a finish:**
  - **R, the shared reporter:** R1, the reporter in `@fz/game-ui` (7); R2, the
    page's picture in `@fz/ui` and `@fz/phaser` (4); R3, the picture in the
    report, end to end (3).
  - **G, a game at a time:** G1 Solitaire (4), G2 Snake (3), G3 Minesweeper
    (3), G4 Sudoku (4), G5 Brick Breaker (5), G6 Asteroid Breaker (6), G7
    Brick Fuzz Pop (6).
  - **A, the aimed serve:** A1 the rules (4), A2 the view and the scene (6), A3
    the shell (4).
  - **Z,** the orchestrator's finish.
- **R1 is the root:** eight packages wait on it. It starts first, with R2 and
  A1, which wait on nothing.
- **The longest chain** is A1 → A2 → A3, 14 commits; R1 → G7 (or G6) and R1 →
  G2 → R3 are 13.
- **Every game's package is one agent's,** so no two agents work in one game at
  once, but Brick Breaker, where G5 and A1 to A3 meet: G5 waits on A1, and
  shares `game.service.ts` (each adds) and the board's template (G5 adds an
  attribute) with A3.

```text
R1 ──┬── G1 ───────────────────────────┐
     ├── G2 ──┬── R3 (also after R2) ──┤
     ├── G3 ──┘                        │
     ├── G4 ───────────────────────────┤
     ├── G6 ───────────────────────────┼── Z
     ├── G7 ───────────────────────────┤
     └── G5 (also after A1) ───────────┤
R2 ─────────── R3                      │
A1 ──┬── A2 ── A3 ─────────────────────┘
     └── G5
```

R3 waits on G2 and G3 so that its end-to-end check has a canvas game and a
page-only game wired to look at.

---

## 2. Contracts

Packages build against these as `design.md` §1.5 and §2.3.5 write them. A
package that finds one wrong stops at that point and says so in its report,
rather than changing it for itself; the orchestrator settles it, and the
plan's text, before the next package starts.

### 2.1 The reporter (R1 makes them; G1 to G7 and R3 use them)

- **`@fz/game-ui/bug_report`:** `packState()`, `unpackState()`,
  `encodeBase64Url()`, `decodeBase64Url()`, `gzip()`, `gunzip()` (in
  `packed.ts`, no Angular); `BugReportConfig`, `BUG_REPORT_CONFIG`;
  `ReportState`; `BugReportSource`, `BUG_REPORT_SOURCE`; `REPORT_PICTURE`
  (default: resolves null, until R3); `OpenReport` (`title`, `url`, `picture`);
  `BugReportService` (`start()`, `issueUrl(state)`, `load()`, `close()`,
  `report`); `<fz-bug-report-dialog [touch]>`;
  `<fz-report-bug-button (chosen)>`; `<fz-bug-report-loader (loaded)>`.
- **The shared drawer** shows `<fz-report-bug-button>` wherever
  `BUG_REPORT_SOURCE` is provided, closing itself on the button's `(chosen)`.
  A game provides its source in its `main.ts`'s providers (Solitaire's
  `src/ui/app/main.ts`) and puts one `<fz-bug-report-dialog
[touch]="viewport.isTouchScreen()" />` in its root template.
- **Each game's tag** is `design.md` §1.3's.
- **`data-fz-capture="skip"`** (`CAPTURE_SKIP`, R2) on a game's Paused card,
  where it has one (Snake, Brick Breaker, Asteroid Breaker, Brick Fuzz Pop).
  A game package adds the attribute as a plain string, since
  `@fz/ui/capture` may land after it.

### 2.2 The picture (R2 makes them; R3 uses them)

- **`@fz/ui/capture`:** `CaptureSurface`, `CAPTURE_SKIP`, `PageCaptureService`
  (`register()`, `capture()`).
- **`@fz/phaser`:** `PhaserHost.frame()`, and the canvas component's
  registration, which no game sees.

### 2.3 The aim (A1 makes them; A2, A3 and G5 use them)

- `Steer.aim: number | null` (`src/rules/paddle/paddle.ts`), whole degrees.
- `Field.aim: number | null`; `serveAim(field)`; `launch(field)` unchanged in
  its signature; `serveBall(ball, degrees)`.
- `ServeGuide` and `serveGuide(field, guide)` (`src/rules/field/guide.ts`):
  `dots` (places, field units, with a `count`) and `marked` (cells, with a
  `count`), written into a record made once by `createServeGuide()`.
- `AIM_MOST`, `GUIDE_DOT_GAP`, `GUIDE_PAST_TURN`, `MOST_GUIDE_DOTS` in
  `src/rules/tuning.ts`; the view's own numbers (`AIM_KEY_SPEED`,
  `AIM_FINE_SPEED`, `AIM_DEAD_CSS_PX`, `AIM_UPWARD`, `GUIDE_DELAY_MS`,
  `GUIDE_FADE_MS`, `GUIDE_DOT`) where the view keeps its numbers.
- `FieldFrame.guide: Readonly<ServeGuide> | null` (A2), and
  `GameService.aiming: Signal<boolean>` (A3).

---

## 3. Work packages

Each package is one fresh agent's run, ending with its commits made and
reviewed, its checks passing and its report written (§4). Each changes the
skill or `AGENTS.md` that describes what it changed, in the same commit, as
`.agents/AGENTS.md` asks.

### R: the shared reporter

**R1. The reporter, in `@fz/game-ui` (waits on nothing).** `design.md` §1.2,
§1.3, §1.5. Seven commits:

1. _The codec._ `lib/game-ui/src/bug_report/packed.ts`: Solitaire's
   `base64url.ts` and `gzip.ts` brought over whole with their specs, and
   `packState()` and `unpackState()`, whose messages keep Solitaire's ("There
   is no game state in that text.", "The game state is corrupt.", "The game
   state unpacks to over N bytes.") and add another game's tag and a newer
   version. Solitaire's copies stay until G1.
2. _The link._ `BugReportConfig`, `ReportState`, `BugReportSource` and their
   tokens; `issue_link.ts`, pure: the issue's link from a report, the state
   fitted by Solitaire's binary search over `trim`, and the field reading
   "too large" where nothing fits; `environment.ts`, the Environment list.
3. _The form._ `.github/ISSUE_TEMPLATE/game_bug_report.yml` (design §1.5), and
   a spec reading it (`?raw`, as Solitaire's does) that every field the link
   fills is a field of the form.
4. _The service._ `BugReportService`: `start()` takes the source's state at
   once, waits two animation frames, asks `REPORT_PICTURE` with a 3-second
   limit, and opens the report; `issueUrl()`; `load()`; `close()`. Specs over
   a source and a picture of their own.
5. _The dialog._ `<fz-bug-report-dialog>`, by design §1.2 and §1.4.2: the
   picture, Save picture (share sheet, else download), Open GitHub (a link,
   copying the picture in its click with a mouse), "Couldn't copy the
   picture", spoken through its own `<fz-announcer />`. Words by the
   `player-text` skill. Specs with a fake clipboard and share.
6. _The drawer's row and the loader._ `<fz-report-bug-button>`, shown by
   `fz-settings-drawer` where a source is provided, which closes the drawer
   and starts the report; `<fz-bug-report-loader>`, by Solitaire's debug
   panel's markup. Specs.
7. _Read it in Node, and the skill._ `tools/read-report.mjs` (imports
   `packed.ts`, prints the JSON; its logic exported and run only as the file
   Node started), and the `fuzzley-ui` skill's rows for every new piece.

- **Owns:** `lib/game-ui/src/bug_report/`, `.github/ISSUE_TEMPLATE/game_bug_report.yml`,
  `tools/read-report.mjs`.
- **Adds to:** `lib/game-ui/src/settings_drawer/`, `lib/game-ui/package.json`,
  `.agents/skills/fuzzley-ui/SKILL.md`.
- **Read first:** `games/solitaire/src/ui/app/service/bug_report.service.ts`,
  `provider/bug_report_config.ts`, `model/game_position.ts`,
  `component/debug_panel/`, `engine/core/common/{base64url,gzip}.ts` and
  `test/ui/app/service/bug_report.service.spec.ts`;
  `lib/game-ui/src/settings_drawer/`, `debug_menu/tokens.ts`,
  `build_info/build_info.ts`, `bar_overflow/menu_actions.ts`;
  `lib/ui/src/dialog/`, `lib/ui/src/announcer/`.
- **Skills:** `fuzzley-ui`, `angular-developer`, `angular-testing`,
  `player-text`, `web-game-accessibility`.
- **Done when** `@fz/game-ui`'s checks pass with its coverage floor, and the
  read-report tool prints a state packed by its spec.

**R2. The page's picture (waits on nothing).** `design.md` §1.4.1, §1.4.4.
Four commits:

1. _The library, chosen._ A script under
   `docs/archive/bug-reports-and-aimed-serve/spike/` that draws Brick Breaker,
   Sudoku and the Solitaire Collection (each on port 9102 in turn) with
   modern-screenshot and with snapdom, its frames swapped in, and a note of
   what each drew wrong, with WebP pictures. It picks modern-screenshot unless
   that draws a game wrong.
2. _`@fz/ui/capture`._ `PageCaptureService`, `CaptureSurface`, `CAPTURE_SKIP`:
   register and unregister; leave out every open `<dialog>` and each marked
   element; swap each surface's element for an image of its frame in the
   clone; CSS pixel size; a limit; null on any failure. The library added to
   `lib/ui/package.json`, loaded by a dynamic `import()` behind an injectable
   loader that specs replace. Specs.
3. _The canvas's frame._ `PhaserHost.frame()`: at the next `POST_RENDER`, the
   canvas drawn into a 2D canvas, else null within a limit or once the host
   ends; `PhaserCanvasComponent` registers a surface once its host starts and
   removes it as it ends. `@fz/ui` added to `lib/phaser/package.json`. Specs
   with `@fz/phaser/testing`.
4. _The skills._ The `fuzzley-ui` row for `@fz/ui/capture`; the `phaser-core`
   skill's line on `frame()`.

- **Owns:** `lib/ui/src/capture/`,
  `docs/archive/bug-reports-and-aimed-serve/spike/`.
- **Adds to:** `lib/phaser/src/host/phaser_host.ts`,
  `lib/phaser/src/canvas/phaser_canvas.component.ts`, both libraries'
  `package.json`, `yarn.lock`, the two skills.
- **Read first:** `lib/phaser/src/host/phaser_host.ts`,
  `lib/phaser/src/canvas/`, `lib/phaser/src/testing/`, `lib/ui/src/dialog/`;
  `design.md` §1.4.4.
- **Skills:** `fuzzley-ui`, `phaser-core`, `angular-testing`.
- **Done when** both libraries' checks pass with their floors, and a
  development page of Snake, opened in headless Chrome, gives a picture whose
  board isn't blank (said in the report, the script not committed).

**R3. The picture in the report, end to end (waits on R1, R2, G2, G3).**
Three commits:

1. `REPORT_PICTURE`'s default becomes `PageCaptureService.capture()`. Specs.
2. `tools/check-report.mjs`: for each game wired so far, open its build in
   headless Chrome, start a report from the drawer, and check the dialog
   shows, the picture isn't blank, Open GitHub's link unpacks to a state its
   tag reads, and the loader at `?debug` takes that state back without an
   error. Exported logic, run only as the file Node started.
3. What the check finds, mended in the shared pieces; a game's own fault goes
   back to the orchestrator for that game's package or Z.

- **Owns:** `lib/game-ui/src/bug_report/` (after R1), `tools/check-report.mjs`.
- **Done when** the check passes on Snake and Minesweeper. Z runs it on all
  seven.

### G: a game at a time (each waits on R1; G5 on A1 too)

Every game's package takes this shape, in its own commits:

1. **The state:** its type, a reader through `@fz/core/json`, taken from the
   live game (never storage), with a summary and, where it can grow, a `trim`.
   Where the game's layers allow, the pure parts sit in its rules; the packing
   is its shell's. Specs: a state read back is the state packed; the largest
   likely state fits the link (6,000 characters, measured by the shared
   `issueUrl()`).
2. **The load:** by the path the game takes up a saved game by, then what its
   save leaves out laid on, paused, asking first where a game in progress is
   lost. Specs: what the game shows after a load is what was reported.
3. **The source and the wiring:** its `BugReportSource` in
   `src/app/bug_report/` (Solitaire's under `src/ui/app/`), provided in its
   `main.ts`; `<fz-bug-report-dialog>` in the root template; the loader
   where `design.md` §1.6 puts it; `data-fz-capture="skip"` on its Paused
   card, where it has one. Specs: the drawer offers Report a bug; the loader
   shows only at `DEBUG_MENU`.
4. **A look at it:** the game on its port, a report started from the drawer,
   the link's state loaded back at `?debug`, through headless Chrome, from a
   script not committed.

**G1. Solitaire (4).** Its codec onto `packed.ts`, its own copies and their
specs removed; `SolitaireReportSource` (`fs1`, the history as its `trim`),
replacing its service and config; the header button, the compact menu's item
and its drawer onto `BugReportService.start()` and `<fz-report-bug-button>`;
its debug panel onto `<fz-bug-report-loader>` at `DEBUG_MENU` (D5);
`solitaire_bug_report.yml`, the `VITE_COMMIT_SHA` define and its type removed
(the build line from `BUILD_INFO`). Its summary line stays as it is, so a
report reads as before. **Owns** `games/solitaire/`, and removes
`.github/ISSUE_TEMPLATE/solitaire_bug_report.yml`. Its skill
`add-solitaire-game` says where a game's report comes from, if it names it.

**G2. Snake (3).** The state: the run (an ended one too, with its crash), the
stage, the settings. Load through `restoreRun()` and `takeUp()`. The loader in
its settings drawer. **Owns** `games/snake/src/app/bug_report/` and its state's
file; adds to the game service, the settings component, the root template and
the board's Paused card.

**G3. Minesweeper (3).** The state: the live field in any outcome, the
difficulty, the seconds, flag mode, the lives and custom size, whether the
board is turned, the stage's scroll. Load through `restoreField()` and
`resume()`, which shows an ended board without its card. The loader in its
drawer. **Owns** `games/minesweeper/src/app/bug_report/`; adds as G2 does.

**G4. Sudoku (4).** The state: the grid with its history (`trim`: the newest
moves kept, which `restoreGrid()` accepts), the seconds, the selected square,
notes mode, the hint showing, the settings, the replay flag. A debug take-up
that accepts a solved grid, which `restoreGrid()` refuses. The loader in its
drawer. Its `check-layout` passes with the drawer's new row. **Owns**
`games/sudoku/src/app/bug_report/`; adds as G2 does.

**G5. Brick Breaker (5, after A1).** The field's moment
(`src/rules/run/report_state.ts`): every live part of `Field` the saved game
leaves out (`design.md` §1.6), taken and laid back, with no aim (an aim lives
only while a press does). The spec that holds it: a field played some steps,
its moment laid on the field its saved game takes up, and both played on the
same steering, step for step alike. Then the state (the moment its `trim`),
the load (`takeUp()`, the moment, the ball speed's tuning, paused), the
wiring with the loader in its debug menu, and a look. **Owns**
`src/rules/run/report_state.ts` and `src/app/bug_report/`; adds to the game
service, the settings component, the root template, and the board's Paused
card only its `data-fz-capture="skip"` (A3 owns `src/app/board/`). Reads
the `brick-breaker-testing` skill first.

**G6. Asteroid Breaker (6).** The moment (the ship's place, speed and heading,
the shots, pickups, sparks, comets, burrs, a stray adrift, crew knocked
loose), with the same step-for-step spec as G5's; the state (the tuning's
numbers, the torus, the settings; `trim`: sparks and shots, then the moment);
the load (`takeUp()`, the torus forced, the moment, the tuning); the wiring,
the loader in its debug menu; a look. **Owns**
`games/asteroid-breaker/src/app/bug_report/` and its moment's file in its
rules; adds as G5 does. Reads `asteroid-breaker-testing` first.

**G7. Brick Fuzz Pop (6).** The level's shots, recorded in memory by the game
service as a `[aim, charge]` line, cleared as a level starts; the round in the
air (its start, shot, boon, bored and moment), taken before a look-away can
land it; the state (`trim`: the shots, then the round); the load, off the
record, the depth forced (`DebugService.setDepth()`), the level replayed shot
by shot as a certificate is, a round in the air flown to its moment and
paused; the wiring, the dialog and the loader loaded `onDemand()` as its
`AGENTS.md` asks of what a page may never show; a look. **Owns**
`games/brick-fuzz-pop/src/app/bug_report/`; adds to the game service, the debug
menu, the root template, the board's Paused card. Reads
`brick-fuzz-pop-testing` first, and ends with the mutation pass it asks for.

### A: the aimed serve (Brick Breaker)

Paths below are relative to `games/brick-breaker/`. Every package reads the
`brick-breaker-testing` skill before its first spec.

**A1. The aim in the rules (waits on nothing).** `design.md` §2.3.5's rules.
Four commits:

1. _The aimed serve._ `Steer.aim`, `Field.aim`, `serveAim()`,
   `serveBall(ball, degrees)`, `AIM_MOST`; the paddle staying put while an aim
   is held; the waiting ball's direction kept on `serveAim()`; every `Steer`
   written in the specs and `src/testing/` given `aim: null`. Specs, and above
   all: a launch with no aim serves exactly as before.
2. _The contact, apart from its effects._ `firstContact()` out of
   `travel.ts`, finding what a ball meets with no hit, event or draw, and
   `mirror()`'s turn apart from its lull and event, both used by `travel()`
   itself, so the ball and the guide can't differ. Every spec of `travel()`
   passes unchanged.
3. _The guide._ `src/rules/field/guide.ts`: `createServeGuide()`,
   `serveGuide()`, by design §2.3.2 (the first contact, the turn, 3 units on
   or to the next contact, whichever comes first; a fire ball's passes
   marked; a portal ends it), writing nothing new per call. Specs drawn as
   field pictures, the case of `mocks/aim-steep.webp` among them.
4. _The numbers' docs and the proof._ `tuning.ts`'s entries; `yarn report:levels`
   and the specs that play every level (the `sim` project) run, their figures
   unchanged, in the commit's body.

- **Owns:** `src/rules/paddle/`, `src/rules/field/field.ts`,
  `src/rules/field/travel.ts`, `src/rules/field/guide.ts`.
- **Adds to:** `src/rules/tuning.ts`, `src/testing/` (the `aim: null`s).
- **Done when** every project's specs pass and the levels' report is
  unchanged.

**A2. Aiming in the view and the scene (after A1).** Six commits:

1. _The steering._ `Steering` holds the aim as design §2.3.1 says: a mouse's
   press, a finger's upward drag, a launch key held; the dead zone; the turn
   by held keys, Shift's too; each way of calling it off; the aim written into
   each frame's `Steer`, and whether the guide shows (held 150 ms, or turned).
   Specs.
2. _The keys and the pointer._ `src/view/steering/controls.ts`: which keys
   launch, for their key-up; the scene's `listen()`: whether a press may aim
   (the scene's options ask the shell), a held press's end launching, a
   mouse's press launching at once everywhere but a serve. Specs.
3. _The frame._ `FieldFrame.guide`, filled by `LevelPlay` while the guide
   shows, from a record made once.
4. _The art._ The guide's dot and outline frames (`src/view/art/`), the
   guide's ink (the text's) in the palette, and the pair in the contrast spec
   at 3:1 against the field in every palette. The atlas within its budget.
5. _The painter._ `src/scene/painters/guide_painter.ts`, after Brick Fuzz
   Pop's: pools made once, drawn again only as the guide changes, faded in
   where motion is welcome. Scene specs.
6. _A look, and the feel._ Desktop and phone, mouse, touch and keys, through
   headless Chrome with touch emulated; the numbers tuned where the look says
   so, each change and its reason in the commit's body.

- **Owns:** `src/view/steering/`, `src/view/field/frame.ts`,
  `src/view/level_play.ts`, `src/view/art/`, `src/view/colors/`, `src/scene/`.
- **Read first:** `games/brick-fuzz-pop/src/view/steering/steering.ts`,
  `src/scene/painters/guide_painter.ts` and `src/scene/field_art.ts` there
  (the guide's look), and this game's `src/scene/bricks_scene.ts`,
  `src/scene/painters/ball_painter.ts`.
- **Skills:** `phaser-core`, `phaser-canvas-performance`, `brick-breaker-testing`.

**A3. Aiming in the shell (after A2).** Four commits:

1. `GameService.aiming`, and the scene's option that says a press may aim;
   `describeAim()` in `src/rules/run/describe.ts` and what is spoken (design
   §2.3.3). Specs.
2. The board: the Ready card stepping aside while aiming, its new words, the
   screen reader's keys. Specs, found by their new words.
3. How to play: the row and the section. Specs.
4. `yarn check:layout`, and the screenshots taken again
   (`yarn capture:screenshots`), the preview's Ready card now carrying the new
   words; a look at the whole flow.

- **Owns:** `src/app/board/`, `src/app/help/`.
- **Adds to:** `src/app/play/game.service.ts`, `src/rules/run/describe.ts`,
  `public/docs/screenshots/brick-breaker/`.
- **Skills:** `player-text`, `web-game-accessibility`, `angular-testing`.

### Z: the finish (the orchestrator)

Once the last package lands: the integration branch rebased onto
`origin/main`; `yarn verify:changed` with no `--base`, then
`yarn check:layout`; `node tools/check-report.mjs` over all seven games; the
image built and served as `docs/operations.md` shows, each game's report
started there and the console read for "Refused to load"; and `design.md`'s
"As built", with what only a person's hands and devices can judge listed for
you (§7).

---

## 4. Running it

### 4.1 Before it starts

- **The budget (D9).** About 59 commits at about 0.6% of a week each is about
  35% of a week. The week stood at 50% used when this plan was written, and
  resets Wed Nov 25, 02:00 UTC. Start after the reset; or start now with three
  workers and start no new package once the week passes 85%.
- **Measure it:** `/measure start bug-reports-and-aimed-serve --trying
multi-agent-build`, and `/measure stop` after Z.
- **Reviews:** `commit-reviewer` is among the agent types offered here, so
  every commit is reviewed as `commit-review-process` says, each reviewer's
  description opening `[review pkg=<id>]`.
- **The integration branch:** `bug-reports-and-aimed-serve`, cut from
  `origin/main` in `.claude/worktrees/bug-reports-and-aimed-serve`, installed
  (`yarn install --immutable`, `node .agents/link-claude-skills.mjs`). Only
  the orchestrator moves it.

### 4.2 Slots and order

Four at once. When one finishes, the orchestrator lands it and starts the
next ready package in this order: what most packages wait on, then the longest
chains, then the rest.

| Starts first | Then, as slots free and their waits end |
| ------------ | --------------------------------------- |
| R1, R2, A1   | A2, G2, G3, G7, G6, G5, A3, G1, G4, R3  |

The fourth slot stays empty at the start on purpose: everything else waits on
R1 or A1. A2 heads the longest chain, so it goes first; G2 and G3 next, since
R3 waits on them and its third commit mends the shared pieces, best before
most games are built on them.

### 4.3 Ports

Each package that opens a page serves its game on its own port, with
`yarn dev --port <n> --strictPort` from the game's folder:

| Package | Port | Package | Port |
| ------- | ---- | ------- | ---- |
| R2      | 9102 | G5      | 9107 |
| R3      | 9113 | G6      | 9108 |
| G1      | 9103 | G7      | 9109 |
| G2      | 9104 | A2      | 9111 |
| G3      | 9105 | A3      | 9112 |
| G4      | 9106 |         |      |

R3's check builds and serves each game on 9113 in turn.

### 4.4 Who owns what

A package changes what it owns freely (§3's "Owns") and only adds to the rest:
an entry, a field, a member, a line. Files more than one package adds to:

- `.agents/skills/fuzzley-ui/SKILL.md` (R1, R2): rows in different tables.
- `lib/game-ui/src/bug_report/` (R1 owns it, then R3).
- Brick Breaker's `src/app/play/game.service.ts` (G5, A3) and
  `src/rules/run/` (G5's file, A3's line in `describe.ts`), and its
  `src/app/board/board.component.html` (A3 owns it; G5 adds only the Paused
  card's `data-fz-capture="skip"`).
- Each game's root template and settings component, by its one G package
  only.

The orchestrator settles what collides as it rebases, sending anything beyond
a list or a paragraph back to a fresh agent, as the skill says.

### 4.5 The briefs

Each brief follows `multi-agent-build`'s §3: the package's section of §3 above
quoted whole, with the parts of `design.md` it cites quoted too (each game's
row and paragraph of §1.6; §2.3's subsections for A), the reports of the
packages before it, and the rules that bear, quoted. These are the rules a
brief quotes, beside a workspace's own `AGENTS.md`, which the harness loads:

- From `frontend/games/AGENTS.md`: "Saved games outlive the code" (whole), for
  any package that reads a game's saved state; "In a game drawn with Phaser,
  work goes in the lowest layer that can hold it" (whole), for A1 to A3, G5,
  G6, G7; "A color the player must tell from what it lies on joins the game's
  `contrast.spec.ts`", for A2; "A change to a game's layout is checked in a
  browser", for every G and A3.
- From `frontend/AGENTS.md`: "The libraries' pieces first", "Visible state is
  announced state" and "An icon-only button has one name", for R1 and every G;
  "Before changing a library, read the `fuzzley-ui` skill's 'Changing a
  library'", for R1 to R3.
- From `.agents/AGENTS.md`: "Writing for Players" (whole), for R1, A3 and every
  G; "A raster picture kept with a plan under `docs/` is WebP", for R2.
- From `lib/ui/AGENTS.md`: "What differs between apps is an injection token
  with a default", for R1 and R3 (R2 edits `lib/ui`, whose own `AGENTS.md`
  the harness loads).

---

## 5. Checks and budgets

- **A commit's check** is `yarn verify:changed --base
bug-reports-and-aimed-serve` from `frontend/` in the package's worktree, after
  the last edit, with `--coverage` at a package's last commit that touches code
  a floor holds. Nothing else that takes the machine: it queues itself, and
  `yarn verify`, `yarn verify:full` and the whole `yarn test` don't (the
  devbox ran out of memory with four full checks at once).
- **A package that changes a library** (R1 to R3) checks every app that
  depends on it, which `verify:changed` does by itself: about three minutes a
  run.
- **Budgets:**
  - **First download:** no game's main chunk grows by more than the report's
    dialog and service, a few kilobytes; the picture's library loads only as a
    picture is taken; Brick Fuzz Pop's report loads `onDemand()`. R2 and G7
    measure their game's main chunk before and after, and say it in the
    commit's body, since no check weighs a chunk.
  - **A picture** takes under a second on the devbox for every game, and its
    PNG at 1280×720 stays under 300 KB (R3 measures).
  - **A frame** while aiming allocates nothing: the guide, its record and its
    painter's pools are made once (A1, A2).
  - **The coverage floors** hold as each `vitest.config.ts` sets them.

---

## 6. Risks to the build, and what answers them

| Risk                                                   | What answers it                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| R1's contracts prove wrong once a game uses them       | §2's rule: the package stops and says so; the orchestrator settles the contract before the next starts |
| A game's moment, laid back, plays on differently       | G5's and G6's step-for-step specs; what they find is a missing field of the moment                     |
| A1 changes a ball's path where no aim is held          | A1's first commit's spec, and the levels' report unchanged in its fourth                               |
| The picture's library draws a game wrong               | R2's first commit compares two on three games before one is chosen                                     |
| The library or its loader lands in a game's main chunk | A dynamic `import()`; R2 and G7 measure the main chunk, before and after                               |
| Two packages edit one file                             | §4.4; small additions, the rebase, a review of what it settled                                         |
| The devbox runs out of memory                          | One queued check at a time, as the skill says; workers run single spec files as they go                |
| The week's limit runs short                            | D9; `/measure`'s watchdog warns as it nears, and no new package starts past 85%                        |
| What only hands and devices can judge                  | Z lists it for you: §7                                                                                 |

---

## 7. Finishing

The build ends on `bug-reports-and-aimed-serve`, every commit reviewed, Z's
checks passing on its tip, and `design.md`'s "As built" written. Merging into
`main` waits for you to ask, and then follows `merge-to-main`; a push to
`main` deploys.

What Z leaves for a person, with the branch built and served:

- **On an iPhone (Safari) and an Android phone (Chrome):** Save picture from
  the report dialog, GitHub opened, the picture attached from the photos in the
  Screenshot field; and whether a long press pastes it there.
- **On desktop Safari and Firefox:** Open GitHub, then ⌘V or Ctrl+V into the
  Screenshot field.
- **Brick Breaker's aim, by hand:** mouse, touch and keys; whether a finger
  meant to steer ever aims; the numbers in `design.md` §2.3.4.
- **A report filed for real,** and its state loaded back from the issue at
  `?debug`.
