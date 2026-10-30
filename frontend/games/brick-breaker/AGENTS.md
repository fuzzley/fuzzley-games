# Brick Breaker

The `brick-breaker` workspace: Brick Breaker, its field to be drawn with
Phaser 4 through `@fz/phaser`, in an Angular shell on the shared libraries. What
every game keeps, in [frontend/games/AGENTS.md](../AGENTS.md), what every
workspace keeps, in [frontend/AGENTS.md](../../AGENTS.md), and the
repository's rules, in [.agents/AGENTS.md](../../../.agents/AGENTS.md), apply
here too; this workspace keeps its own for its code. The repository's
`phaser-core` skill says how any game here is drawn with Phaser. Paths are
relative to `frontend/games/brick-breaker/`.

It is being built, step by step, as `docs/brick-breaker-execution-plan.md`
lays out, which also describes the game as it will be; this file describes
the code that exists.

## Technology Stack

- **Field:** [Phaser 4](https://phaser.io/), through `@fz/phaser`'s canvas,
  host and scene helpers
- **UI:** [Angular](https://angular.dev/) (standalone components, signals,
  zoneless change detection) on `@fz/style`, `@fz/ui` and `@fz/game-ui` (the
  `fuzzley-ui` skill), with `@fz/core`'s helpers in the rules
- **Build Toolchain:** [Vite](https://vitejs.dev/) + [AnalogJS Vite Angular Plugin](https://analogjs.org/)
- **Test Framework:** [Vitest](https://vitest.dev/) with jsdom, Testing
  Library, and real Phaser run headless
- **Language:** TypeScript / HTML / Sass

## Layers

`eslint.config.js` fences four folders under `src/`, as Snake's, each
importing only the layers below it: the rules, with no framework and no
library but `@fz/core`, physics included; the view, which works out what
to draw without Phaser, with `@fz/phaser`'s pure entries; the scene, the
only code that imports Phaser; and the shell, in Angular, which may take
the scene and `@fz/phaser/host` only by type. So far the rules, the view,
the scene and the shell's first files exist.

## Layout

- **`src/rules/`** — the game, with no framework, physics included.
  `tuning.ts` holds the numbers that set its feel, in field units (the
  field is 26 wide and 30 tall); `speed.ts` the three speeds, each a base
  and a top the ball climbs to, and `ballSpeed()`; and `stepper.ts` the
  clock that turns a frame's time into fixed steps of 1/120 s, twelve at
  most a frame. `grid.ts` is the bricks' grid, 13 by 16: a cell's index,
  `brickBox()`, the one place a brick's box is worked out, and
  `exposureOf()`, which faces and corners of a brick a ball can touch, so
  bricks side by side make one face and a corner is only where nothing
  touches it. `sweep.ts` finds when a ball's move first touches a face of a
  box, pushed out by its radius, or a corner, as a share of the move, so
  however fast a ball goes it can't pass through a brick; bricks, the walls
  and the paddle are all boxes.
- **The field** — `src/rules/field.ts`: `Field`, a level in play, which
  each step changes in place, from records made once, so a step makes
  nothing but a random draw's generator, for a lull or a capsule.
  `createField()` lays out a `Level` (`level.ts`), `steerField()` takes a
  frame's steering, `stepField()` moves it on a step, `launch()`
  serves the ball waiting on the paddle and `serve()` puts one there after
  the last is lost. A ball's travel gathers what it meets first, the walls,
  the paddle and the bricks' exposed faces and corners, all at one moment,
  and turns once. `paddle.ts` steers the paddle (`Steer`: a pointer's place,
  a finger's drag, held keys) and `balls.ts` turns a ball: off the paddle by
  where it landed, as a mirror, by a lull's few degrees, and back to the
  flattest it travels. `bricks.ts` holds `Brick`, `hitBrick()`, which a
  ball or a blast calls, and `TRAIT_RULES`, what each trait of
  `catalog/bricks.ts` does as a brick is hit, breaks, and at each step,
  typed so that a trait without its rule fails to compile. `capsules.ts`
  drops capsules while the level is in play (`dropFrom()`), by the level's
  chance or from a gift brick, by weight from the level's pool, from
  `draws.ts`'s seeded draws; moves them down to be caught or missed; and
  holds `EFFECT_RULES`, what each effect of `catalog/capsules.ts` does as
  it starts and ends, one of each group in play at a time. `bolts.ts` fires
  and moves the laser's bolts. The field counts its steps (`Field.steps`),
  and a timer is the step its thing happens at, `stepsIn()` steps on from
  when it was set, as milliseconds summed step by step would creep.
  `scoring.ts` scores each hit by its kind's points for the hits it took,
  times the streak's multiplier, keeps the streak, and says what clearing a
  level adds, and how a cleared level's points add up (`tallyOf()`) and come
  to (`pointsOf()`).
  `events.ts`'s `EventLog` is a ring of 256 numbered records, which the
  scene plays and the shell hears, each from the last one it read; a broken
  brick's carries the streak as it broke, as the scene plays it once the
  field has moved on.
- **The run** — `src/rules/run.ts`: `Run`, a value each change replaces, as
  Snake's is, from the first level to the end: the level in play, the points
  banked and the score, the lives and the points of the next, and the outcome.
  `catchUp()` takes what the level's field has come to since it last looked,
  its points, then the lives gained, then those lost, then its clearing, which
  it banks, the order they come in on a field, since a frame's steps can hold
  them all; `levelSeed()` gives each level's field a seed of its own;
  `levelsCleared()` counts the levels a run has cleared; and
  `gainedLifeByPoints()` says whether a frame's points brought a life, for the
  chime. A move that doesn't fit where the run stands returns it as it is, so
  a run over stays over and a level is banked once, and so does a field with
  nothing new, so the shell can tell a frame that changed the run.
  `describe.ts` puts what happened into the words the announcer says: a
  level's start, a capsule caught, the lives a frame gained and lost
  (`describeLives()`, from the run before and after), the last few bricks, a
  clearing, a pause, going on and the end. `progress.ts` says which levels a
  run may start at (`isOpen()`): the first, any cleared, and the one after a
  level cleared, at any speed; `clearedOf()` reads the ids stored, keeping
  those a level still has. `saved_game.ts` turns a run under way and its field
  into what storage keeps (`saveGame()`), a run whose level was just cleared
  as the next level not yet begun, and back (`restoreGame()`), paused,
  dropping a level the game doesn't have under that number, a field that
  doesn't fit its level, or a number out of its range; `takeUpField()` lays
  the bricks and counts kept over a new field of the level.
- **The levels** — `src/rules/levels/`: a JSON file for each set of
  levels, its name, its chance of a capsule and its levels, each a picture
  of its bricks in the characters of `legend.ts`'s shared legend, with any
  of its own, and, for a picture, a grid of tints. `src/rules/levels.ts`
  lists the sets in order (`LEVEL_SETS`), numbers every level from 1
  (`LEVELS`, through `levelsOf()`), and `parseLevel()` turns one into a
  `Level` to play, or throws an error that names what is wrong with its
  data. Its spec holds
  every level to parsing, ids and names of their own, a brick it needs that
  a ball can reach, and a pace that never falls within a set.
- **`src/rules/catalog/`** — what the game can hold, each a readonly object
  written `as const satisfies`, so its ids survive as a type: `bricks.ts`
  (`BRICK_KINDS`, each kind's hits, whether a level needs it, its points
  and its traits), `balls.ts` (`BALL_KINDS`, each kind's damage, whether it
  passes through what it breaks and reaches the bricks around) and
  `capsules.ts` (`CAPSULES`, each capsule's tone, weight, first level and
  effect, whose kind is its group). Each has its ids in How to play's order
  and a function that returns an entry as the shape every entry has.
  `src/rules/catalog.spec.ts` holds every entry to the catalogs' rules.
- **`src/view/`** — what to draw, without Phaser, tested in Node.
  `field_metrics.ts` lays the field on the canvas from `fitCells()`, a unit a
  whole number of device pixels, with `toCanvasX()`/`toCanvasY()` and
  `toFieldX()`/`toFieldY()` between the two; `frame.ts` is what the scene
  reads: `FieldView`, the field it can't change, `EventsView` and
  `FieldFrame`; `layers.ts` the order the field is drawn in, back to front, in
  one list; `timing.ts` how long each flourish lasts, how long the paddle
  stands empty after the last ball is lost (`SERVE_MS`), and how long the
  cards wait; `flourish.ts` how each flourish moves over its time, and how
  bright the last bricks a level needs glow once none has broken for a while,
  pulsing only where motion is welcome; `tags.ts` where the tags of the
  effects in play lie under the paddle, and how much of each one's time is
  left; `controls.ts` the keys by `event.code`, the commands and the held
  pushes; `steering.ts` the `Steering` that turns keys, the mouse and fingers
  into each frame's `Steer`, and a tap into a launch, and the ways a finger
  may steer (`TOUCH_STEERINGS`, `isTouchSteering()`); and `palette.ts` the
  field's colors from the palette's roles (`bricksPalette()`), with the brick
  tints from `inks.ts`, the game's own eight for light palettes and eight for
  dark, the outline every ball and capsule takes over the bricks it crosses,
  and the marks a brick's kind and state are told apart by. `art.ts` draws
  every frame of the atlas (`atlasFrames()`) as plain commands in device
  pixels, each ball (`BALL_ART`), each capsule's shape (`CAPSULE_ART`), its
  tag, the paddle and the flourishes, names the frame a ball, a capsule or a
  tag shows (`ballFrame()` and the rest), and How to play's pictures
  (`PICTURE_FRAMES`); `brick_art.ts` draws a brick kind in each tint and state
  (`BRICK_ART`), and names the frame a brick shows (`brickFrame()`) and the
  color its shards take (`brickColor()`); `symbols.ts` draws each capsule's
  symbol (`SYMBOLS`); and `shapes.ts` holds the commands they are drawn with
  (`DrawCommand`), their helpers, which take no size below nothing, since a
  canvas not yet laid out gives a unit too small for the insets, and
  `lineWidth()`; `effects.ts` says what each event calls for, its sound and
  the flourishes it plays where motion is welcome, how far a broken brick's
  sound rises along a streak (`detuneOf()`), and `FrameSounds`, which plays
  each sound once a frame at most, at the highest it was heard.
  `contrast.spec.ts` holds every tint, the steel, blast and gift bricks, every
  ball kind, both capsule tones, the paddle and the last bricks' glow to 3:1
  against the field in every palette, a tough brick's deeper tints too, each
  ball and capsule against its outline, the outline against every tint, brick
  and the paddle, and the marks against every brick, capsule and the paddle;
  its comment says why a ball isn't held against the tints.
- **`src/scene/`** — the Phaser scene. `BricksScene`
  (`bricks_scene.ts`) is handed plain functions over the game
  (`BricksSceneOptions`): each frame it hands the game the time and the
  steering its `Steering` read from the keys and the pointer, reads the
  frame and the palette, and has its painters draw, each in its layer of
  `LAYERS`: `FieldPainter` the field, its wall and the net,
  `BrickPainter` an image for each cell, made once, dropped in as a level
  starts, swollen at a hit a brick holds and grown back as it regrows,
  `GlowPainter` the frames around the last bricks a level needs,
  `EffectsPainter` a broken brick's shards, a blast's ring, a lost ball's
  fade and the field's shake, `CapsulePainter` and `BoltPainter` what
  falls and rises, `PaddlePainter` the paddle as two round ends and a
  rectangle between their middles, which keep their shape at any width on
  either renderer, with its cannons and rim, `TagPainter` the effects in
  play and their emptying rings, and `BallPainter` the balls, with a fire
  ball's embers, one for each ember's width it goes. Each thing that moves
  is drawn between its last place and its next. Every game
  object is made as the scene is created, and a new field stops what the
  last one set off. The scene plays each of the field's events once, from
  the last it played, and the flourishes an event calls for only where
  motion is welcome. `atlas.ts` plays the view's art into `@fz/phaser`'s
  `bakeAtlas()`, again on a new palette or a new unit, and the scene hands
  How to play its pictures from the atlas each time (`onPictures()`).
  `@fz/phaser/sound`'s `SpritePlayer` plays each event's sound from the sprite
  in `sounds/`, which `yarn build:sounds` writes, and mutes the game while the
  settings want none; it plays the chime, the level cleared's, each time the
  game's count of `chimes()` goes up. The keys, clicks and taps go back
  through `command()`; Phaser hands a key event over again with each new one
  in a frame, so the scene takes each once.
- **`src/app/`** — the shell, one folder per feature, as in Snake.
  `app.component` lays the board in the room beside the bar, with the
  `<fz-announcer>` the game is announced through, the dialogs, and the
  question before a run is thrown away; it hands the board the focus as each
  run begins and whenever the last dialog closes, and pauses the level in
  play when `@fz/game-ui/play_room`'s `[fzPlayRoom]` says the player
  looked away.
  - `play/` — `GameService` holds the run in a signal and the level in play's
    field outside one, moves the field on through `tick()`, which the scene's
    frames drive, steered as the player steers, launches, fires, pauses, goes
    on and starts levels and runs, says what happened through
    `@fz/ui/announcer`, adds up a cleared level's points (`tally`), keeps the
    records and the levels cleared through `stats/`, calls for the chime for a
    life the points brought and for a new best as its card opens (`chimes`),
    and asks through `@fz/ui/confirm` before a new game or speed throws a run
    away. `src/app/tokens.ts` holds what a spec hands it instead of the
    game's own: the levels (`GAME_LEVELS`) and the seeds (`GAME_RANDOM`).
    `SavedGameService` keeps the run under way, through `GameService.saved()`,
    as a level starts, as a ball is served, as the run pauses or goes on, and
    as the page goes away, never at a step, and forgets it once the run ends;
    `main.ts` starts it before the board first shows, and it takes up the run
    kept (`takeUp()`), paused with the ball on the paddle, its bricks as they
    were.
  - `board/` — `<fz-phaser-canvas>` with the scene, loaded with
    `import()`; the empty field and the paddle drawn in CSS until the
    scene has drawn; the focus ring; the pointer hidden while a ball is in
    play; and the cards: Ready, with the level and how to launch, whenever
    a ball waits on the paddle; Paused; Cleared, with how the level's
    points added up and Next level; Ended, once an ended run's result is
    put away; and still loading and couldn't be drawn. A key pressed or let
    go on a card's button stays with it, so the button takes it and hands
    the board back the focus. `fieldPalette()` colors the field from
    `ThemeService`'s roles and `mode`, and a finger steers as the settings
    say. The board keeps the scene's pictures for How to play
    (`pictures`). It is an application named for its level, "Brick
    Breaker, level 3: Pyramid", and Phaser's keyboard target.
  - `bar/` — `@fz/game-ui`'s game bar: the link home, the page's `<h1>`, the
    speed's badge, which asks before it starts a run at another, the
    figures, and Pause, Sound, Levels, New game, How to play and Settings,
    all but Pause and New game in the overflow menu on a compact screen.
    From the width the actions keep their labels at (`fitsActionLabels`),
    the figures are the level, the score, the lives as hearts and the
    streak's multiplier while it counts; below it, the score and the lives
    alone, the lives as a number, one over the other across the bar, as a
    score runs to six figures. Pause and Sound keep the focus on the board
    when pressed with a mouse or a finger. It hands the board back the focus
    as Resume goes on, and asks the app for the levels, How to play and the
    settings.
  - `levels/` — the Levels dialog: each set under its name, its levels as
    buttons in a grid, named by number and name ("3 Pyramid"), then a tick
    once cleared, with its best at the speed in play, "Cleared" or "Locked"
    under the name, and the run's own marked `aria-current`. A level not yet
    open is `aria-disabled`, and can't be chosen. Choosing an open one starts
    a run there, asking first if one is under way, and closes once it has.
  - `result/` — the card over an ended run, once the last ball has faded:
    lost or won, where and at what speed, the score and the best at its speed,
    with "New best" and the trophy when it set one, the level reached and the
    levels cleared (`levelsCleared()`); Try again from the level a lost run
    ended on, or a new game after a win; Choose a level, which puts it away
    and asks the app for the levels; and Close.
  - `help/` — How to play: the aim, the scoring from `tuning.ts`'s numbers,
    pausing, the controls, and every brick, capsule and ball from the
    catalogs, each with its name, its sentence and, once the scene has
    drawn, its picture, which the app hands it from the board.
  - `settings/` — the settings drawer (the speed, how a finger steers, the
    sound and the palette) and `SettingsService`, which keeps what the player
    chose, the speed of the last run started among it.
  - `stats/` — the records: `StatsService`, each speed's runs, best score
    and furthest level, and each level's best points at each speed; and
    `ProgressService`, the levels cleared, at any speed, which open the
    levels after them.
  - `styles/` — `global.scss`, loaded once from `main.ts`, and
    `_index.scss`, the toolkit every component `@use`s, which emits no
    CSS.

## What It Keeps

Each entry is in `localStorage`, versioned
(`LocalStorageService.writeVersioned()`), and its reader drops what it
can't trust rather than failing:

- `brick-breaker-settings`: the speed, how a finger steers the paddle, and
  whether the field plays its sounds.
- `brick-breaker-stats`: for each speed, the runs, the best run's score and
  the furthest level reached; and for each level's id, its best points at
  each speed it was cleared at. Ids no level has any more are dropped.
- `brick-breaker-progress`: the ids of the levels cleared, at any speed,
  which open the levels after them. Ids no level has any more are dropped.
- `brick-breaker-game`: the run under way and its level's bricks, each
  brick's hits left, whether it is broken or shown, and the steps its blast
  and its regrowth are due at, with the field's count of steps. The balls
  in flight, the capsules and the effects are not kept (decision 16).

## Development Commands

Run these from `frontend/games/brick-breaker/`, or as
`yarn workspace brick-breaker <script>` from `frontend/`. The root's
`yarn lint`, `yarn typecheck`, `yarn test` and `yarn build` run this
workspace's with the others'.

- **Run Development Server:** `yarn dev` (at `http://localhost:9004/`; the
  Solitaire Collection's uses 9000, Minesweeper's 9001, Sudoku's 9002 and
  Snake's 9003).
- **Production Build:** `yarn build`, into `dist/`; `yarn preview` serves it.
- **Run Unit Tests:** `yarn test` (the whole suite once, with coverage,
  failing below the floor `vitest.config.ts` sets for the rules and the
  view), `yarn test:watch`, or `yarn vitest run <path>` for one
  spec, which leaves the floor alone.
- **Linting:** `yarn lint` (ESLint with `@fz/dev`'s blocks and the fences
  between the layers, then stylelint with `@fz/style`'s preset).
- **Type Checking:** `yarn typecheck` (the app, the specs, the Vite
  config, and the scripts under `tools/` from their JSDoc).
- **Report the Levels:** `yarn report:levels` (runs `tools/report-levels.mjs`:
  the autopilot plays every level at every speed, from the level's number
  as the seed, as the autopilot's spec does, through `playLevel()`, and it
  prints the game time each took, the time spent on the last three bricks
  the level needed, the paddle's bounces and the lives lost; it fails if a
  play didn't clear its level). It is how the difficulty ramp is tuned.
- **Make the Sounds:** `yarn build:sounds` (runs `tools/build-sounds.mjs`,
  which synthesizes the ten sounds, from the paddle's bop to a level's
  chime, with `@fz/dev/sounds` into `src/scene/sounds/sounds.wav` and their
  spritemap, `sounds.json`, the same bytes every run; their names and order
  are the view's `SOUNDS`, which the scene's spec holds them to).

## Tests

The repository's rules for specs apply. A spec sits beside the file it tests,
named after it, and runs in jsdom; `src/test-setup.ts` installs
`@fz/phaser/testing`'s headless Phaser first, so the scene's spec runs real
Phaser through `runScene()`, with a fake shell over a pictured field.
`src/testing/field_picture.ts` lays a field out from a picture of its bricks
(`fieldFrom()`), throws a ball in it (`throwBall()`) or puts it in play with
none (`playWithoutBall()`), steps it and reads its events, so a spec of the
field reads as the field it plays. `src/testing/art_frames.ts` draws the atlas
in one palette at one scale for the art's specs, and finds a frame by its name
(`frameNamed()`). `src/testing/autopilot.ts` plays a level as a good player
would (`autoplay()`): it keeps the paddle under the ball that will reach it
first, lands it a seeded distance off the middle or toward a brick the level
needs that it can see, catches the good capsules it has time for, and fires,
serves and launches at once. `src/rules/autopilot.spec.ts` holds every level,
at every speed, to being cleared by it within eight minutes of game time, its
last three bricks within one, and the catalog spec holds the levels to using
every brick kind and letting every capsule first fall at the level its `from`
names, but those the sets still to come bring, which it names.
`src/testing/roles.ts` puts a palette's roles on the page (`paintRoles()`) for
the specs that color the field. `src/testing/play.ts` holds the small levels
the shell's specs play, each set up to come to one thing soon, and two sets, of
two levels and then one (`TWO_SETS`), handed to `GameService` through `GAME_LEVELS` with
a seed of its own through `GAME_RANDOM` (`provideSpecLevels()`), and plays
them through `tick()`, steering the paddle from the frame it reads (`under()`,
`awayFrom()`, `playUntil()`, `loseBall()`, `playToClear()`, `clearToNext()`).
The board's spec runs on `provideFakePhaserCanvas()`, and then with the real
scene it loads, through which it plays a level to its end.
