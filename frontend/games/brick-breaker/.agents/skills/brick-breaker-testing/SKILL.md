---
name: brick-breaker-testing
description: How to run and write Brick Breaker's specs, with its three Vitest projects, its coverage floor and the fixtures its rules', scene's and shell's specs share. Triggers on: frontend/games/brick-breaker spec, vitest project, coverage, fieldFrom, playLevel, FakeShell, provideSpecLevels, keptRun, saved_game.spec.ts.
---

# Testing Brick Breaker

How Brick Breaker runs its specs, and the fixtures they share. What every
Angular workspace's specs share is the `angular-testing` skill's, the
headless Phaser harness is the `phaser-core` skill's, under "Testing", and
the rules every spec follows are in `.agents/AGENTS.md`, under "Writing Unit
Tests". Paths are relative to `frontend/games/brick-breaker/`.

## Commands and Coverage

Run these from `frontend/games/brick-breaker/`.

- **Run one spec with `yarn vitest run --project <project> <path>`,** its
  project the one its folder sets, under "Setup". Without `--project`,
  Vitest starts all three.
- **`yarn test` runs the whole suite once, which takes minutes,** most of
  them the `sim` project's. `yarn test:coverage` runs `dom` and `pure`
  with coverage, then `sim` without.
- **The floor is on `src/rules/` and `src/view/`:** 100% of statements,
  functions and lines and 95% of branches, in `vitest.config.ts`. The
  scene and the shell have none.
- **Coverage counts `dom` and `pure`, not `sim`.** What only the
  autopilot's plays of every level reach counts as untested, so a rule
  gets a spec of its own.

## Setup

- **A spec's folder sets its project:**

  | Project | Its specs                                                                 | Runs in                                          |
  | ------- | ------------------------------------------------------------------------- | ------------------------------------------------ |
  | `pure`  | `src/rules/`, but for the folder below, `src/view/` and `tools/`          | Node, with no setup file and no Angular compiler |
  | `sim`   | `src/rules/levels/every_level/`                                           | Node, never with coverage                        |
  | `dom`   | Every other spec under `src/`: the scene's, the shell's, `src/testing/`'s | jsdom, after `src/test-setup.ts`                 |

- **A spec sits beside the file it tests, named after it,** but for
  `src/rules/levels/autopilot.spec.ts`, which tests
  `src/testing/autopilot.ts` in `pure`.
- **A spec of the rules or the view has no page:** no `document` and no
  TestBed. What needs one is the scene's or the shell's to test.
- **In `dom`, `src/test-setup.ts` installs headless Phaser** before
  anything imports Phaser, and gives each test's app a store of its own in
  memory.

## The Rules

- **Draw a field rather than play to it.** `fieldFrom(rows, options)`
  (`src/testing/field_picture.ts`) lays a field out from a picture of its
  bricks, a row of up to 13 characters from the top, in the characters of
  `LEGEND` (`src/rules/levels/legend.ts`). Its `PictureOptions` set what a
  picture can't show. `KEEPER` is rows that lay one brick far down the
  field, so a level doesn't clear while a spec plays on:
  `fieldFrom(["o", ...KEEPER])`.
- **A field is in play once a ball is.** `throwBall(field, x, y, degrees)`
  puts one at a place, heading at an angle from straight up, and
  `playWithoutBall(field)` puts the field in play with none, for what
  falls or rises. `stepTimes(field, n)` steps it, and `brickAt()`,
  `ballOf()`, `eventsOf()`, `lastEvent()` and `headingOf()` read it back.
- **A field changes in place,** from records made once. So a spec asserts
  on the records after the steps, and on the events the field logged, and
  copies first any value it compares with a later one.

## The Levels and the Autopilot

- **`src/testing/autopilot.ts` plays a level as a good player would.**
  `playLevel(entry, speed, options)` plays one of the game's, from its
  number as the seed, and `autoplay(level, speed, seed, options)` any
  level, such as one a spec draws (`levelOf()` in
  `src/rules/levels/autopilot.spec.ts`). Each returns an
  `AutopilotReport`.
- **`src/rules/levels/every_level/` keeps a file for each preset speed,**
  each handing its own name to `holdEveryLevel()`
  (`src/testing/every_level.ts`), since Vitest plays a file's specs one
  after another but the files side by side. Run one speed by its file:
  `yarn vitest run --project sim src/rules/levels/every_level/fast.spec.ts`.
- **A level that fails there is looked into with `yarn report:levels`,**
  which plays the same games. The `brick-breaker-content` skill's
  "A Level" says how to read it.

## The Saved Game

- **New state on a brick or the field joins the round trip** in
  `src/rules/run/saved_game.spec.ts`: the crowd, the last of its `LEVELS`,
  gains a brick that comes to the state, `statesOf()` names the state, and
  `PLAYED_STATES` lists it. The round trip keeps, reads back and takes up
  the run every 7 steps of the crowd's play, and fails for a take-up that
  differs or a state never reached.
- **A refusal is a row.** A spoiled entry is `stored()`, a stored game
  read back from JSON, with one thing changed (`withField()`,
  `withBricks()`), and `restoreGame()` is expected to refuse it.
- **A run for a page to take up is `keptRun()`'s**
  (`src/testing/kept_run.ts`): begun at a level, with the bricks it names
  broken or worn through the rules. The screenshots' and the layout
  check's scripts take it through `SCREENSHOT_API`
  (`src/testing/screenshot_api.ts`), whose types are
  `src/testing/script_api.ts`'s, and `tools/stored_run.mjs` stores it
  under the rules' `SAVED_GAME_VERSION`. So the scripts store whatever
  shape the rules keep. Only `SAVED_GAME_KEY` there is a copy of the
  shell's.
- **Each script's run has a spec in `pure`:**
  `tools/capture-screenshots.spec.ts` holds `RUN` to being taken up by the
  rules, and `tools/stored_run.spec.ts` holds `CLEARING_RUN` to clearing
  its level, Fuse, with double pay and every star. A change to that level
  or to the blasts fails there, not only in the browser.

## The View

- **The art's specs check the commands a frame is drawn with.**
  `ART_FRAMES` (`src/testing/art_frames.ts`) is the atlas in one palette
  (`ART_PALETTE`) at one scale (`ART_SCALE`), in full detail. Find a frame
  by its name with `@fz/phaser/testing/pure`'s `frameNamed()`, and its
  commands by their kind and color with `drawnIn()`. `SMALL_SCALE` is a
  scale a brick is too small at for its cracks, rivets and sheen, and
  `FIELD_SCALES` the scales a field is drawn at, from the smallest the
  layout allows.
- **A spec of every palette reads the roles from the game's stylesheet,**
  by the names the board reads them by:
  `bricksPalette(PALETTES.rolesIn(id, FIELD_ROLES), mode)`, with
  `PALETTES` from `src/testing/roles.ts` and `FIELD_ROLES` from
  `src/app/board/field_roles.ts`, for each of `@fz/style`'s `THEMES`.
  `src/view/colors/contrast.spec.ts` and `src/view/places/places.spec.ts`
  show it.
- **The contrast spec names most of its colors by hand.** It takes the
  palette's `balls`, `capsules` and `bricks` and its lists of tints whole,
  so only a color outside those is added to it. What tells a thing apart
  is held to 3:1 against what it is drawn on, a hidden ghost to 2:1, and
  two looks told apart by ink alone by their hue, with `deltaE()`.

## The Scene

`src/scene/bricks_scene.spec.ts` runs the real scene in a headless Phaser
game through `@fz/phaser/testing`'s `runKeyedScene()`. It is long, so
search it for a helper before writing one. Those every spec there shares
are at its top:

- **`FakeShell` plays the shell's part of `BricksSceneOptions`.** It hands
  the scene a field, a palette, a place and the settings, each a property
  a spec sets, and keeps what the scene hands back: the frames' times and
  steering (`ticks`), the layouts, the commands, and what pictures How to
  play's art (`bakes`, `askPictures()`). `showField(rows)` shows a new
  field, as a level starts.
- **`startBoard(setUp, prepare)` runs the scene for a new `FakeShell`,**
  its first frame drawn, and returns the shell, the run, the scene and the
  element Phaser's keyboard listens on (`keys`). `setUp` readies the shell
  first, as `stillness` does for a player who prefers less motion, and
  `prepare` the game.
- **Drive it** with the run's `advance(ms)`, `key()`, `pointer()` and
  `touch()`, and by changing the shell's field as the rules would. Assert
  on the game objects, read through `@fz/phaser/testing`, or on what the
  shell kept. A headless game draws no pixels and plays no sound.

## The Shell

- **A component that shows the board runs on `provideFakePhaserCanvas()`,**
  which loads no Phaser. The board's spec, and the app's for How to play's
  pictures, also run the scene the board hands its canvas, through
  `runShownScene()`.
- **A spec that draws from the palette paints the field's roles first:**
  `paintRoles(FIELD_ROLES, ROLES)`, from `@fz/style/testing` and
  `src/testing/roles.ts`, in a `beforeEach`, as the board's does. jsdom
  loads no stylesheet to give them.
- **`GameService` plays the small levels of `src/testing/play.ts`,** handed
  to it with a seed of its own by `provideSpecLevels()`. `SPEC_LEVELS` are
  each set up to come to one thing soon, and `SPEC_LEVEL` gives each one's
  number by that thing (`SPEC_LEVEL.laser`). `TWO_SETS` and `TWO_PLACES`
  are for what a set or a place changes.
- **The game runs on the time it is given:** `game.tick(FRAME_MS, steer)`,
  steered `STILL`, `under()` the ball, `awayFrom()` it or
  `underCapsule()`. `playUntil()` and `playFor()`, from
  `@fz/core/testing`, and `loseBall()`, `playToClear()` and
  `clearToNext()` play on to a point.
- **A panel's spec renders the panel alone** and finds a part by its
  heading with `partHeaded()` (`src/testing/heard.ts`). `heardIn()` and
  `starsHeard()` return what a screen reader hears, leaving out what is
  `aria-hidden`. A query for text a screen reader hears leaves that out
  too, with `ignore`.
- **Without a fake viewport, motion isn't welcome and the board is no
  touch screen,** as jsdom has no `matchMedia`: the cards open at the next
  frame. A spec of the waits, or of a finger, installs
  `@fz/game-ui/testing`'s `installFakeViewport()`, with
  `setCoarsePointer(true)` for a touch screen.
- **A spec of what the live region says** fakes `setTimeout` and
  `clearTimeout` alone, and moves them on by `@fz/ui/announcer`'s
  `ARRIVAL_MS`, as `src/app/app.component.spec.ts` does.
