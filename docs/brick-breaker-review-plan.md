# Brick Breaker's review

A review of Brick Breaker and the shared code it stands on (`@fz/phaser`,
`@fz/core`, `@fz/game-ui`'s viewport and `@fz/dev`), made on 2026-10-30
after Brick Breaker and the other games' follow-ups were merged, found no
broken game but a few robustness gaps in `@fz/phaser`, data and copies
nothing needs, and places where adding to the game touches more than it
should. The user asked for every fix. This plan lists them, in the order
they are built, and how the work runs; the log is at its end.

## How the work runs

- **One branch,** `brick-breaker-review`, cut from `e53169fa`, `main`'s tip.
- **A step is a commit,** in the repository's form (`fix(phaser): …`),
  once the workspaces it touched pass their `lint`, `typecheck` and `test`,
  and `yarn prettier:check` passes. What it adds is covered by specs, and
  the docs it makes untrue are brought up to date in the same commit.
- **Every commit is reviewed before it is made,** as the
  `commit-review-process` skill says: the step is staged, a fresh agent
  reviews the staged change and edits nothing, every finding is answered in
  the log, taken or not, with why, and the fixes go into the same commit.
- **A QA checkpoint** at the end: `yarn verify`, `yarn check:layout`, and
  Brick Breaker and Snake played in a browser, logged.
- **Nothing is pushed, and nothing reaches `main`, without the user's
  go-ahead.**

## Part 1: the shared libraries

- **R1. A scene that can't be mounted fails the canvas at once.** Phaser
  emits its game's `READY` and only then starts the loop, so a throw from
  the handler that mounts the first scene leaves the game never started,
  the canvas loading for a minute and the WebGL context never released;
  and `mount()` removes the scene on the canvas before building the next,
  so a throw there leaves the canvas blank. The host builds the next scene
  before it lets go of the last, its `READY` listener lets nothing it
  runs escape, and a mount that throws rejects the canvas's `show()`. The canvas
  hands what went wrong to Angular's `ErrorHandler` rather than dropping
  it, and its `state` and `slow` are read-only to the app.
- **R2. The harness behaves as a browser does when things go wrong.**
  `runScene()` stops the game it started and the files it served when its
  setup throws, so one failing spec doesn't spill into the next; a served
  file asked for as JSON that isn't JSON answers `null`, as an XHR does;
  and the fake canvas's `readyAtOnce` settles after the `show()` that asked,
  as the real host does, never inside it.
- **R3. The smaller fixes in `@fz/phaser`.** The scaler watches the pixel
  ratio again only when it changed, not at every resize; `onFirstFrame()`
  waits for the first frame drawn, at `RENDER`, as its callers are told;
  the canvas's surface selector starts at `fz-phaser-canvas`, as the
  library's rule says; no member is marked `public`; the canvas's template
  binds a view model; and `canvasPixelRatio()`, in `@fz/phaser/layout`,
  is the pixel ratio a canvas renders at, which Snake's and Brick
  Breaker's placeholders read rather than writing `Math.min(…, 3)`, and
  so floor at 1 as the scaler does.
- **R4. `@fz/core` takes what the games copy.** `clamp()`; `drawAt(seed,
n)`, the n-th draw of a seed, which Snake's apples and Brick Breaker's
  field draws make alike, its numbers pinned as Mulberry32's are; and
  `isCount()`, which Brick Breaker writes twice and Minesweeper and Sudoku
  inline. `shuffled()`'s order for a seed is pinned, since Sudoku's deals
  depend on it.
- **R5. A `switch` over a union names every member.** `@fz/dev`'s ESLint
  preset turns on `switch-exhaustiveness-check`, so a new member of a
  union a `switch` without a `default` handles fails to lint, as Brick
  Breaker's atlas and flourishes would have; what it finds is fixed.
- **R6. The games' viewport reads the window it is given,**
  `inject(DOCUMENT).defaultView`, rather than the global `window`.

## Part 2: Brick Breaker

- **R7. The rules say each thing once.** `BallKind.size`, which nothing
  reads, goes, and so does the `hard` trait, which only repeated
  `hits: "never"`. `isNeeded()` takes a brick's kind, and every check of
  whether a level needs a brick goes through it; a cell's middle is
  `grid.ts`'s; whether a ball overlaps a box is one function; whether a
  level is under way is `run.ts`'s; the glow's time is in `STEP_MS`; an
  ended run's title is `describe.ts`'s; the catalogs' ids and the records
  built from them go through two typed helpers rather than a cast each;
  and a brick's kept state is one list of keys that `SavedBrick`, saving
  and taking up follow.
- **R8. The stats are read in the rules,** as the progress and the saved
  game are, so `StatsService` keeps only what Angular needs.
- **R9. The painters share one interface.** Each takes one record the
  scene writes once a frame (the field, the time between steps, the
  metrics, the palette, the scene's time, whether motion is welcome and
  when the last brick broke), so the scene draws and refreshes them in a
  loop, and a new painter is a line.
- **R10. The level's frame loop is a class of its own,** with no
  framework: the field, its clock, the frame the scene draws, the events
  heard and the beat before the next serve, which `GameService` drives.
- **R11. Points are written one way,** grouped in thousands, in the bar,
  the cards, the result, the levels and what the announcer says, as How to
  play writes them.
- **R12. The Phaser boards' layout checks share their inspection.** What
  Snake's and Brick Breaker's `check-layout.mjs` both check of a canvas, a
  placeholder, a focus ring and a card moves into `@fz/dev/layout`.
- **R-Q.** `yarn verify`, `yarn check:layout`, and Brick Breaker and
  Snake played in a browser.

## Work log

### R1: a scene that can't be mounted fails the canvas at once

`PhaserHost.show()` returns a promise: it resolves once the scene is
mounted, or once a scene shown after it while the game boots, or the
host's `destroy()`, means it never will be, and rejects with what building
or mounting it threw. `mount()` builds the scene before it stops and
removes the one on the canvas, so a scene that can't be built leaves the
last one playing. The `READY` listener catches what the scaler and the
first mount throw and hands it to the waiting `show()`, so Phaser's
`start()`, which runs only once the listener returns, always runs, and a
game that never mounted a scene still tears down. `LazyPhaserHost` awaits
the host's `show()`, so the canvas fails at once rather than a minute later,
and the canvas hands the error to Angular's `ErrorHandler` before it
settles as failed. `state` and `slow` are kept in private `linkedSignal`s
and exposed with `asReadonly()`.

Specs: the host's `show()` resolving on a mount, on being replaced while
the game boots and on the host's end; rejecting with what `make` threw,
keeping the scene on the canvas; rejecting with what a scene's `create()`
threw; starting the game though the first scene can't be built; and
rejecting, the game started, when the canvas can't be measured at boot. The
lazy host fails when the scene can't be built, and the canvas hands what
kept a scene from loading to the error handler. `@fz/phaser`'s `AGENTS.md`
and the `phaser-core` skill say so.

R1's review, before the commit:

1. _Docs made untrue._ Taken: `CanvasState` says a scene fails when it
   couldn't be loaded, built or mounted; the plan's R1 bullet says the
   `READY` listener lets nothing escape, as built, rather than that the
   first mount runs outside the emit; the skill and `AGENTS.md` no longer
   read as if the minute's timeout reaches the `ErrorHandler`; and
   `show()`'s doc and `AGENTS.md` say a scene that loads files creates
   itself later, outside its reach, which is why such a scene's `create()`
   throwing still leaves the canvas loading for its minute.
2. _Doc comments._ Taken: `show()`'s first paragraph is one sentence again,
   and `PendingScene` opens with "Describes".
3. _Report before settling._ Taken: the canvas settles as failed first, so
   an `ErrorHandler` that rethrows can't leave it loading.
4. _A replaced scene's failure is reported, unpinned._ Taken, as intended: a
   chunk that failed to load is an error whichever scene asked for it, and
   a spec pins it.
5. _A failed scaler left the host half set up._ Taken: the scaler is kept
   only once it has started, and a host whose canvas couldn't be sized
   rejects every later `show()` with that error, specced.
6. _The specs' three ways of reading a settled show._ Taken: one
   `settledAs()`. The spec that proves the `READY` listener's catch, "starts
   the game though its first scene can't be built", stays.
7. _`stateSignal`/`slowSignal`._ Taken: `sceneState` and `slowState`, as
   the games' and the libraries' writable signals behind `asReadonly()` are
   mostly named.

The reviewer ran `yarn prettier --check` from `frontend/`, where the
script is `prettier . --write`, and so reformatted three files of the
steps under way, unstaged; only their formatting changed.

### R2: the harness behaves as a browser does when things go wrong

`runScene()` sets up through `setUp()`, which starts the game, readies
it, builds the scene and waits for it to run, and, if any of that throws,
stops the game, takes its parent out of the page and stops serving the
spec's files before it rethrows. A served file read as JSON that isn't
JSON, or isn't served, answers `null`, as an XHR does, rather than
throwing inside a timer. The fake canvas readies a scene shown with
`readyAtOnce` in a microtask after its `show()` returns, as the real host
never readies one inside `show()`.

That last change found what the agent who reviewed `@fz/phaser` foresaw:
Brick Breaker's and Snake's app specs, and Snake's board spec, played as
soon as `render()` returned, which worked only because the canvas was
ready inside the render that showed it, so the board's
`afterRenderEffect` saw it drawn in the same pass. Each now awaits
`fixture.whenStable()` after rendering, as it would have to for a real
canvas; the `phaser-core` skill says so. The Solitaire Collection's specs
pass unchanged.

Specs: `runScene()` rejecting with what building the scene threw and
leaving no game's parent in the page, and serving nothing once its setup
failed; a request for JSON that isn't JSON, or isn't served, answering
`null`; and the fake saying a scene is ready only once the `show()` that
asked has returned.

R2's review, before the commit:

1. _A teardown that throws stopped the cleanup halfway and hid the real
   error._ Taken: `setUp()` stops serving first, tears the game down in a
   `try` whose error it drops, since what the setup threw says more, and
   rethrows the setup's; `stopGame()` takes the game's parent out of the
   page in a `finally`, which `SceneRun.destroy()` gains too. A spec runs
   a scene that throws as it is created, with a teardown that throws, and
   holds `runScene()` to rejecting with the first error, leaving nothing
   in the page and serving nothing; it fails with the old catch.
2. _"Serves nothing once its setup has failed" passed with the fix
   removed,_ as the next run resets the server itself, and so did the
   older "serves nothing once the run is destroyed". Taken: both ask the
   server directly (`statusOf()`) for a 404.
3. _The small points._ Taken: the fake canvas's spec names its subject,
   Snake's board spec's helper says it waits only when `readyAtOnce`
   holds, and `serve`'s doc says the run stops serving when its setup
   fails too.
