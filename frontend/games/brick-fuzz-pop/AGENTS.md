# Brick Fuzz Pop

The `brick-fuzz-pop` workspace: Brick Fuzz Pop, its field drawn with Phaser
4 through `@fz/phaser`, in an Angular shell on the shared libraries, laid
out as Brick Breaker's and Asteroid Breaker's are. What every game keeps, in
[frontend/games/AGENTS.md](../AGENTS.md), what every workspace keeps, in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's rules, in
[.agents/AGENTS.md](../../../.agents/AGENTS.md), apply here too; this
workspace keeps its own for its code. The repository's `phaser-core` skill
says how any game here is drawn with Phaser. Paths are relative to
`frontend/games/brick-fuzz-pop/`.

The game is being built from `docs/brick-fuzz-pop/implementation-plan.md`,
package by package, the design in `docs/brick-fuzz-pop/plan.md`, each
stream's work logged under `docs/brick-fuzz-pop/worklog/`. So far the shell
shows the game's name alone: the scene, the dialogs, the settings drawer,
the game and the services that keep it are written and specced, but
nothing places them yet, and the site doesn't ship it:
`frontend/site/games.json` doesn't list it. What the plan's packages still
to come build (R6, the rest of P2, P3, S2, the rest of U1, U2, T1 and T2,
then X1 to X3, Y1 to Y3, D1, F1, Z1 and Z2) isn't here yet, and
`playRound()` throws until R6 writes it.

## Technology Stack

- **Field:** [Phaser 4](https://phaser.io/), through `@fz/phaser`'s scene
  helpers and sound
- **UI:** [Angular](https://angular.dev/) (standalone components, signals,
  zoneless change detection) on `@fz/style`, `@fz/ui` and `@fz/game-ui` (the
  `fuzzley-ui` skill), with `@fz/core`'s helpers in the rules and the view
- **Build Toolchain:** [Vite](https://vitejs.dev/) + [AnalogJS Vite Angular Plugin](https://analogjs.org/)
- **Test Framework:** [Vitest](https://vitest.dev/), in Node for the rules
  and the view, and in jsdom, with Testing Library and real Phaser run
  headless, for the scene and the shell
- **Language:** TypeScript / HTML / Sass

## Layers

Four layers, each a folder under `src/` named for it, each importing only
the layers below it, as `@fz/dev`'s `phaserGameLayers()` fences them in
`eslint.config.js`: the rules, the view, the scene, which draws the field
on Phaser, and the shell, `src/app/`, which takes the scene only by type.

| Layer | May import                                                                                                                                                  | May not import                                                                          |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| rules | `@fz/core`                                                                                                                                                  | Phaser, Angular, RxJS, any other `@fz/*`, the view, scene and shell, the specs' helpers |
| view  | the rules, `@fz/core`, `@fz/phaser/color`, `@fz/phaser/fuzzball`, `@fz/phaser/insets`, `@fz/phaser/layout`, `@fz/phaser/shapes`; `@fz/style/themes` by type | Phaser, Angular, RxJS, any other `@fz/*`, the scene and shell                           |
| scene | Phaser, `@fz/core`, `@fz/phaser`'s entries but the canvas, the view and the rules                                                                           | Angular, RxJS, the shell's libraries, the shell                                         |
| app   | Angular, every `@fz/*` library, the rules and the view; the scene and `@fz/phaser`'s host, scene helpers and sound by type                                  | Phaser, and the scene or those three entries by a value import                          |

The rules and the view, but their specs, read only what they are handed:
no clock or timer, no number drawn from no seed, no seed mixed by hand,
nothing of the page and nothing stored or fetched. The rules keep to
arithmetic every engine rounds alike besides (`exact: true`): `+`, `-`,
`*`, `/` and only the functions of `Math` whose every digit the standard
fixes, `Math.sqrt()` among them, with no `**` and no constant such as
`Math.PI`, so a certificate found in Node holds in every browser. The
specs' helpers `eslint.config.js` names in `HELD_AS_RULES` are held as the
rules are, to their fence and their exact arithmetic, from the commit that
writes each: so far `src/testing/wall_picture.ts` and
`src/testing/wall_score.ts`. Every other file of `src/testing/` takes
Angular by type alone.

## Layout

Each layer's folder holds at its top what the rest of it builds on, and
each part of it in a folder of its own below, named for what it holds; a
spec sits beside the file it tests. No folder in a layer takes a name the
fences keep: a layer's, `view`, `scene` or `app`, which they would take for
the layer, or `testing`, which the rules' fence takes for the specs'
helpers.

- **`src/rules/`** — the game, with no framework, in field units, a unit a
  brick's side, y growing up from the floor. `tuning.ts` holds the numbers
  the rules read: 9 columns, 11 to 22 rows (`LEAST_DEPTH`, `MOST_DEPTH`),
  the fuzzball, the charge, the aims, boredom, the points and the stars;
  `shot.ts` a shot's aim and charge and the boons, with their checks; and
  `aims.ts` each of the 657 aims' heading as two numbers, which
  `tools/build-aims.mjs` writes, so no engine's `Math.cos()` decides a
  flight. `grid.ts` is the field's grid: its cells (`cellAt()`,
  `fieldRowOf()`), the brick in play in one (`brickAt()`), the box a brick
  stands in (`brickBox()`), how a kind meets a fuzzball (`shapeOf()`: a
  box, round or open), the boxes
  `@fz/core/sweep`'s `exposureOf()` reads the wall through (`boxesIn()`),
  and a brick's faces and corners named for this field (`FieldFace`,
  `FieldCorner`), whose y grows up where `@fz/core/sweep`'s grows down a
  screen. It is the one place that says which of `SIDE`'s bits each face
  is; the rest of the code names a face by it.
- **`src/rules/catalog/`** — the kinds of brick. `bricks.ts` holds
  `BRICK_KINDS`, each kind's hits, whether a level needs it, its points,
  whether it is solid, the level it comes in at and its traits, spread from
  a file a set in `kinds/`: Warm-up's five, the brick, the tough brick,
  steel and the row and column zappers, in
  `src/rules/catalog/kinds/warm_up.ts`, the other sets' empty so far.
  `castField()` and `shapesOf()` take the kinds as `BrickKinds`, so a spec
  can hand them stand-ins; the rest of the rules read the catalog's
  (`brickKind()`). `catalog.spec.ts` holds every kind to the catalog's
  rules.
- **`src/rules/levels/`** — the levels. `legend.ts` is the characters a
  wall's picture is drawn in (`LEGEND`), the portals' marks and a brick's
  tint (`tintOf()`). `warm-up.json` holds Warm-up's nine levels, each an
  id, a name, a boon and a picture of its wall, as
  `docs/brick-fuzz-pop/levels/warm-up.json` drafts them; `levels.ts` lists
  the sets (`LEVEL_SETS`), numbers every level from 1 (`LEVELS`,
  `levelEntryOf()`), and `parseLevel()` turns one into a `Level`
  (`level.ts`) or throws an error naming the level and what is wrong; and
  `level.ts`'s `levelStart()` is where a level's first round starts on a
  depth.
  `par.json` is each level's par at each depth, the same at every depth for
  now. `levels.spec.ts` holds every level to the rules `plan.md` says a
  level keeps, finding a needed brick sealed in by a flood fill of its own.
- **`src/rules/flight/`** — the flight. `events.ts` describes what happens
  in one (`FlightEvent`, in the order its doc gives) and each fuzzball's
  path (`BallTrack`, `positionAt()`). `cast.ts`'s `cast()` writes into a
  `Contacts` record, made once, what a fuzzball flying from a place along a
  heading meets first, within a limit: a side wall, the ceiling, the floor,
  a brick's exposed face or corner or a bumper, each with its way out,
  everything met within `AT_ONCE` of the earliest gathered once and put in
  one order. It walks moves of a unit, each sweeping only the cells the
  fuzzball can touch, not every brick; `castField()` is what each cast of a
  flight reads. `src/rules/flight/benchmarks/cast.spec.ts` times it.
- **`src/rules/wall/`** — the wall. `wall.ts` holds `Brick`, `Wall` and a
  field's thirds (`thirdsOf()`: the jump, the jump line and the row a level
  opens on). `lower.ts` brings the wall down after a round (`lowerWall()`),
  a row, or a jump once no brick the level needs stands below the jump
  line, sinking what the level doesn't need at the floor's row and losing
  the level on what it does; and says whether a level is cleared
  (`isCleared()`) and a brick needed (`isNeeded()`). `regrow()` returns the
  wall as it is, as no kind regrows yet.
- **`src/rules/round/`** — `round.ts`: a round's types, where it starts
  (`RoundStart`: the wall, the depth, where the fuzzball waits, the friends
  and the boon), what it came to (`RoundOutcome`) and the round played
  (`Round`); the numbers a round is handed rather than reads
  (`RoundRules`, `tuning.ts`'s as `RULES`); and `playRound()`'s
  signature.
- **`src/rules/run/`** — the run, after Brick Breaker's, with Asteroid
  Breaker's saved game. `run.ts`: `Run`, a value each move replaces, from
  the level it started at to its end. `createRun()`, `startLevel()`,
  `takeRound()` as a round is released, `landRound()` as its flight lands,
  the level's end waiting in `ending` till then so the last flight can be
  paused, `nextLevel()`, `pause()` and `resume()`, a move that doesn't fit
  returning the run as it is; `levelOf()` parses the level in play, and
  `openingOf()` lays it out on the depth it began on, which its par is set
  for.
  `scoring.ts` scores a break along the streak, the stars and how a cleared
  level's points add up (`tallyOf()`); `stars.ts` reads par (`parOf()`)
  and gives the stars (`starsFor()`: three within par, two within 3 rounds
  more, else one); `progress.ts` says which levels are open; `stats.ts`
  holds the records and how a run or a cleared level moves them;
  `saved_game.ts` the run under way as storage keeps it (`saveGame()`,
  `restoreGame()`, each of its checks exported); and `describe.ts` the
  announcer's words, from a level's start and a shot ("62 degrees, charge
  3") to a round, the wall's lowest rows (`describeRows()`), a pause and
  the end.
- **`src/view/`** — what to draw and when, without Phaser, tested in Node.
  `round_play.ts` holds `RoundPlay`, which plays a round's flight back a
  frame at a time and settles its wall, one for the whole game, and
  `RoundView`, the round as the scene draws it at a moment, its events
  numbered in `@fz/core/event_log`'s `EventLogView`; `run_state.ts` holds
  `RunState`, the run on the board and where its round stands, which
  `GameService` replaces whole, and `RoundPhase`.
- **`src/view/field/`** — `field_metrics.ts`: the field's shape a canvas's
  room holds (`fieldShape()`: a unit in whole device pixels, 11 to 22 rows,
  the floor's band, the lintel and whether panels fit beside it), where it
  lies on the canvas (`fieldMetrics()`, which keeps a shape's unit through
  a pixel's resize mid-flight), whether a canvas has room for any field
  (`hasRoom()`), and `toCanvas()` and `toField()` between field units and
  device pixels, which write into a place handed to them. The margin is the
  canvas's insets (`MARGIN_CSS_PX`), and the field's frame lies in it.
- **`src/view/steering/`** — the player's hands. `controls.ts` holds the
  keys by `event.code`; `steering.ts`'s `Steering` turns the keys, the
  mouse, the wheel and fingers into each frame's `Steer`, the aim, the
  charge, a shot let fly, fast-forward held and whether the keys moved it,
  aiming a pointer from where the fuzzball waits: pulled back past a dead
  zone, a notch at a time, or pointed and held, each kind of pointer its
  own way (`PointerAimings`). Escape calls off a charge building and
  otherwise passes on to pause, as only the steering knows a charge builds.
- **`src/view/colors/`** — the field's colors: the page's roles it is drawn
  in (`FIELD_ROLES`), the tiles' eight inks by name (`TINT`), and
  `wallPalette()`, which gives a palette's colors from those roles and its
  mode's tile and fuzzball inks: every color a rule of contrast covers,
  though not the shading the art mixes from them. `contrast.spec.ts` holds
  them to 3:1 in each of the game's four palettes.
- **`src/view/art/`** — the atlas's frames, drawn in `@fz/phaser/shapes`'s
  commands in device pixels. `frames.ts` names every frame (`FRAMES`).
  `art.ts`'s `BRICK_ART` says how each kind is drawn, typed over the
  catalog's ids, so a kind without art fails to compile, with the frames a
  brick stacks in its cell (`brickLayers()`) and its shards' color
  (`brickColor()`); each kind's art is a file of `kinds/` (`brick.ts`'s tile
  in the eight tints, `tough.ts`'s pips and cracks, `steel.ts`,
  `zapper.ts`), on `symbols.ts`'s shared shapes and its rule that drops
  detail under 30 CSS px a unit (`detailed()`). `fuzzball_art.ts` draws the
  fuzzballs (`fuzzballFrames()`): the player's at each charge, its fur
  combed out as it charges (`furOf()`) and sparking at a full one, the hot
  shot under its flames, a friend in each of the eight inks, and the eyes
  every fuzzball wears, a frame of their own. `atlas_frames.ts`'s
  `atlasFrames()` is every frame the atlas holds, the kinds' in the
  catalog's order, then the fuzzballs'.
- **`src/view/effects/`** — what each moment calls for, and how long it
  lasts. `effects.ts` names the twenty sounds (`SOUNDS`, in the sprite's
  order); its `FlightEffects` reads a flight in order (`begin()`, then
  `effectsOf()` for each event) and gives each event's sound and
  flourishes, a punch told from a break by its fuzzball's turn at the
  strike's moment; `beatEffectsOf()` does so for the moments past a
  flight's events, a notch, the wall's step or jump, the danger line, a
  level cleared or lost; `detuneOf()` raises a break 100 cents a brick of
  the round, to an octave; and `createFrameSounds()` plays each sound once
  a frame. `flourish.ts` is how each flourish moves, from the swell to a
  lost level's shake (`shakeOf()`, in device pixels), and `timing.ts` how
  long each lasts, the wall's step and jump (`STEP_MS`, `JUMP_MS`) and how
  long the cards wait.
- **`src/scene/`** — the Phaser scene, after Brick Breaker's. `WallScene`
  (`wall_scene.ts`, made by `makeWallScene()`) is handed plain functions
  over the game (`WallSceneOptions`): each frame it hands the shell the
  frame's time and the steering, for now the same unsteered shot, lays the
  field out again as the canvas, the chrome or the shape changes, bakes the
  atlas again at a new scale or palette, and has its painters draw, each in
  its layer of `LAYERS`; a key becomes the view's command through
  `commandOfKey()`. `atlas.ts` bakes the art's frames, the scene's own dots
  (`field_art.ts`) and a picture of each kind (`pictures.ts`) into one
  atlas (`bakeWallAtlas()`), at 128 device px a unit at most, and the scene
  hands the shell How to play's pictures, `{ bricks }` by kind, through
  `onPictures`. In `painters/`, `FieldPainter` draws the cells, the floor's
  band, the lintel, the frame, the grid's dots, and the jump and danger
  lines in dashes on whole pixels, counting in dots the needed bricks still
  under the jump line once they are nine or fewer; `WallPainter` stacks each
  cell's frames from a pool of images made once, and, where the player
  welcomes motion, eases the wall down by `RoundView.wallDrop`, which is 1
  while the wall stands still, the rows coming in cut off along the
  ceiling. `stand_ins.ts` holds `Guide`, a type
  standing in for the guide, which the scene doesn't draw. The scene's
  `SpritePlayer` mutes the game as `sound()` says, its sprite in `sounds/`,
  which `yarn build:sounds` writes, but plays nothing yet.
- **`src/app/`** — the shell, one folder per feature. `app.component`
  shows the game's name alone for now.
  - `settings/` — the settings drawer, `<app-settings>`: how a pointer aims
    (by the pointer, a finger pulling back and a mouse pointing and holding,
    or either way for both), the flight's speed, long flights sped up, the
    aim guide, sound and the palette, each applied at once;
    `SettingsService` keeps them.
  - `help/` — How to play, `<app-help>`: the aim, the charge, the wall's
    step and jump, the boons, the scoring and the stars, their counts and
    points from `tuning.ts`; the controls by mouse, touch and keyboard, a letter key
    named by where it sits under the fingers, as the keys are read by
    `event.code`; and every brick in the catalog, with its picture once the
    scene hands them over (`HelpPictures`).
  - `levels/` — the Levels dialog, `<app-levels>`: each set under its name,
    each level a button named by its number and name, with its stars and
    best once cleared, "Locked" and `aria-disabled` until it opens, the
    run's own `aria-current`; it hands on the level chosen.
  - `result/` — the result card over a run's end, `<app-result>`: "Game
    over" or "Every level cleared!", the score and the best, the levels
    cleared and the stars earned, "New best" and the trophy, then Try again
    from the level or New game, Choose a level and Close. It opens on its
    title, so a player still holding Space presses nothing.
  - `stats/` — the records: `StatsService` and `ProgressService`, which keep
    what `src/rules/run/stats.ts` and `src/rules/run/progress.ts` read, for
    the levels `GAME_LEVELS` hands them; and `levelMarksOf()`, each level's
    mark for the Levels dialog.
  - `play/` — `GameService`, the game, on `@fz/game-ui`'s `RunLifecycle`:
    it holds the run and where its round stands (`RunState`), plays each
    round released through the rules and back through one `RoundPlay`,
    lays the field out on the board's room between rounds, gives the scene
    its options, says what happens and keeps the records. And
    `SavedGameService`, which keeps the run under way through
    `@fz/ui/storage`'s `keepSaved()` and takes it up again, paused, reading
    the game through `KeptGame`, which it injects as `KEPT_GAME`, and which
    `provideGame()` makes `GameService`; `main.ts` injects it at startup.
  - `tokens.ts` — `GAME_LEVELS`, the levels a run is played through, and
    `PLAY_ROUND`, the rules' `playRound()`, which the specs replace.
  - `styles/` — `global.scss`, `@fz/game-ui`'s global stylesheet, loaded
    once from `main.ts`, and `_index.scss`, the toolkit every component
    `@use`s, which emits no CSS.
- **`src/testing/`** — what the specs share, as Tests below says. The app's
  tsconfig leaves it out.
- **`tools/`** — the scripts run from the workspace. `build-aims.mjs`
  writes the aims and `build-sounds.mjs` the sounds. `sound-lab.ts` is no
  script but the sound lab, mounted on `@fz/dev/sound-lab-page`'s page
  (`mountSoundLab()`), which the dev server alone serves
  (`@fz/dev/sound-lab`'s `soundLab()`, in `vite.config.ts`).

## What It Keeps

Each entry is in `localStorage`, versioned, through `@fz/ui/storage`, and
its reader drops what it can't trust rather than failing:

- `brick-fuzz-pop-settings` (version 1): how a pointer aims, the flight's
  speed, whether long flights speed up, the aim guide and sound.
- `brick-fuzz-pop-stats` (version 1): the runs, the best run's score and
  the furthest level reached; and for each level's id, its best points,
  its stars' among them, its fewest rounds and its most stars. Ids no
  level has any more are dropped.
- `brick-fuzz-pop-progress` (version 1): the ids of the levels cleared,
  which open the levels after them. Ids no level has any more are dropped.
- `brick-fuzz-pop-game` (version 1, `SAVED_GAME_VERSION`): the run under
  way, by `SavedGameService`: its level by number and id, the level it
  started at, the depth the level began on, its rounds and jumps, the
  points banked and the score, and whether it was played on retuned
  numbers; and where its next round starts, each brick's hits left by
  wall cell, how far the wall has come down, the field's depth, where the
  fuzzball waits, the friends' inks and the boon, or nothing for a level
  with no round played, which is laid out afresh. It is written as a round
  is released, as the run will stand once the round lands, so a page
  reloaded mid-flight comes back after it; as the run changes course or a
  new one begins; and as the page is hidden, never at a frame. A run on its
  first level with no round played, or one ended, keeps nothing. A key
  added to it later is read as optional.

## Development Commands

Run these from `frontend/games/brick-fuzz-pop/`, or as
`yarn workspace brick-fuzz-pop <script>` from `frontend/`. The root's
`yarn lint`, `yarn typecheck`, `yarn test`, `yarn test:coverage` and
`yarn build` run this workspace's with the others'.

- **Run Development Server:** `yarn dev` (at `http://localhost:9006/`; the
  Solitaire Collection's uses 9000, Minesweeper's 9001, Sudoku's 9002,
  Snake's 9003, Brick Breaker's 9004 and Asteroid Breaker's 9005).
- **Production Build:** `yarn build`, into `dist/`; `yarn preview` serves it.
- **Write the Aims:** `yarn build:aims` (writes `src/rules/aims.ts`, each
  aim's heading as two numbers, from `tools/build-aims.mjs`;
  `src/rules/aims.spec.ts` fails while the file isn't what the script
  writes, so change the script and run it rather than edit the file).
- **Make the Sounds:** `yarn build:sounds` (runs `tools/build-sounds.mjs`,
  which synthesizes the twenty sounds, from the charge's notch to a lost
  level's, with `@fz/dev/sounds` into `src/scene/sounds/sounds.wav` and
  their spritemap, `sounds.json`, the same bytes every run; their names and
  order are the view's `SOUNDS`, which the scene's spec holds them to, and
  `tools/build-sounds.spec.ts` fails while the sprite isn't what the
  recipes make, so change a recipe and run the script rather than edit the
  sprite).
- **Open the Sound Lab:** `yarn dev`, then
  `http://localhost:9006/sound-lab/` (`tools/sound-lab.ts`: each sound in
  the sprite, and eight scenes of a round played as the game would play
  them, its breaks raised by the view's `breakDetune()`; no build holds it).
- **Run Unit Tests:** `yarn test` (the whole suite once, every project,
  without coverage), `yarn test:coverage` (`dom` and `pure` with coverage,
  failing below the floors `vitest.config.ts` sets, then `sim` without it),
  `yarn test:watch`, or `yarn vitest run --project <project> <path>` for
  one spec, which leaves the floors alone.
- **Linting:** `yarn lint` (ESLint with `@fz/dev`'s blocks, `scripts()`
  among them for the scripts in `tools/` and the lint configs, and the
  fences between the layers, then stylelint with `@fz/style`'s preset).
- **Type Checking:** `yarn typecheck` (the app, the specs, the Vite and
  Vitest configs, the sound lab and the scripts' spec, and the scripts and
  the lint configs from their JSDoc).

## Tests

The repository's rules for specs apply. A spec sits beside the file it
tests, named after it. `vitest.config.ts` runs them in three projects:
`pure`, in Node, for the rules, the view, `src/testing/` and `tools/`;
`sim`, in Node too and without coverage, for the flight's benchmark,
`src/rules/flight/benchmarks/cast.spec.ts`, which prints `cast()`'s median
and 99th percentile beside a scan of every brick's and holds it to no
time, as no runner times anything alike twice
(`yarn vitest run --project sim --reporter=verbose` shows it); and `dom`,
in jsdom, for every other spec under `src/`, the scene's and the shell's.
`src/test-setup.ts` installs `@fz/phaser/testing`'s headless Phaser first,
so the scene's spec runs real Phaser, with a fake shell over the
hand-made rounds; gives each test a store in memory; and stands in for
the modal dialogs and `document.fonts`, which jsdom lacks. Coverage
measures `dom` and `pure` together, to the floors `vitest.config.ts` sets
(statements, branches, functions and lines): the rules and the view 100,
95, 100 and 100, the scene 98, 92, 100 and 99, and the shell 98, 97, 97
and 98; `src/testing/` and the scripts have none, so what of them goes
untested shows. The
repository's `angular-testing` skill covers the patterns every Angular
workspace's specs share, and `phaser-core` the harness.

What the specs share is in `src/testing/`:

- `flight_fixtures.ts` holds eleven rounds made by hand
  (`FLIGHT_FIXTURES`) to build the view, the scene and the shell against,
  and `orderProblemsOf()` and `trackProblemsOf()`, which hold a flight to
  the order and the paths `src/rules/flight/events.ts` describes.
- `wall_picture.ts` lays a wall out from a picture in the legend's
  characters (`wallFrom()`), tinted as a level's are, so a spec draws the
  wall it plays, as the fixtures do.
- `wall_score.ts` measures a round played (`wallScore()`), as the sketch's
  `score()` did: a lost level the least, a cleared one the most less a cost
  for each round it took, and any other less each needed brick's hits and
  weight, the more the nearer the floor, less the danger, and more for each
  friend and a boon earned.
- `cast_reference.ts` casts by a scan of every brick (`castByScan()`),
  working each kind's shape and reach out for itself, and makes seeded
  walls and shots (`randomField()`, `randomShot()`), on which `cast.spec.ts`
  holds `cast()` to the scan and the benchmark times both.
- `stand_ins.ts` holds kinds made up for specs, a bumper and a portal, and
  `STAND_INS`, the catalog with them in the row and column zappers' places,
  which a spec hands the rules.
- `art_frames.ts` draws the atlas in one palette at one scale for the art's
  specs (`ART_FRAMES`), lists the pixel ratios they check the art at
  (`PIXEL_RATIOS`), and measures how far a point lies from a line or past a
  rounded rectangle.
- `canvases.ts` gives the canvas a board has in a window (`boardCanvas()`),
  less the bar or the rail (`CHROME_CSS_PX`, which its spec holds to
  `@fz/game-ui`'s Sass, the compact bar's through
  `src/testing/compact_bar.scss`), its insets the margin.
- `play.ts` hands `GameService` the game's first three levels, a seeded
  random and rounds played as a script says, each with a fixture's flight
  (`provideSpecPlay()`, `scriptedRounds()`), and plays them a frame at a
  time (`release()`, `playOut()`, `playRoundOut()`, `playUntilCard()`).
- `roles.ts` reads the game's palettes from its global stylesheet
  (`PALETTES`), which `src/view/colors/contrast.spec.ts` holds the field's
  inks to contrast in, each of the four.
