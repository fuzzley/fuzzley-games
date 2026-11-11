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

Its skills, in `.agents/skills/`, cover how its specs run and what they
share
([`brick-fuzz-pop-testing`](.agents/skills/brick-fuzz-pop-testing/SKILL.md)),
and what adding a level, a set, a brick kind or a brick trait takes
([`brick-fuzz-pop-content`](.agents/skills/brick-fuzz-pop-content/SKILL.md)).

The game is being built from `docs/brick-fuzz-pop/implementation-plan.md`,
package by package, the design in `docs/brick-fuzz-pop/plan.md`, each
stream's work logged under `docs/brick-fuzz-pop/worklog/`. So far the shell
places the board, the bar, the dialogs, the settings drawer and the result
card, each wired to the game, so a run can be played in the page, through
Warm-up's, Sparks' and Tricks' twenty-seven levels. The site lists it as
in development, its screenshots taken on level 18, the last of Sparks.
What the plan's packages still to come build (Y3, D1, F1, Z1 and Z2) isn't
here yet.

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
rules are, to their fence and their exact arithmetic:
`src/testing/wall_picture.ts`, `src/testing/wall_score.ts`,
`src/testing/solver.ts`, `src/testing/casual.ts`,
`src/testing/kept_run.ts`, and the scripts' `src/testing/script_api.ts`,
`src/testing/certify_api.ts`, `src/testing/report_api.ts` and
`src/testing/screenshot_api.ts`. `tools/eslint_config.spec.ts` holds each
to every pattern of the rules' import fence, which the helpers' block
after it, setting the same rule, would otherwise replace. Every other file
of `src/testing/` takes Angular by type alone.

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
  `src/rules/catalog/kinds/warm_up.ts`; Sparks' five, the bomb, the cross
  and X zappers, wool and the cage, in
  `src/rules/catalog/kinds/sparks.ts`; Tricks' four, the bumper, the
  prism, the portal and the plated brick, in
  `src/rules/catalog/kinds/tricks.ts`; and Thick walls' two, the shell and
  moss, in `src/rules/catalog/kinds/thick_walls.ts`.
  `castField()` and `shapesOf()` take the kinds as `BrickKinds`, so a spec
  can hand them stand-ins; the rest of the rules read the catalog's
  (`brickKind()`), and `kindIntroducedAt()` names the kind a level brings
  in. `catalog.spec.ts` holds every kind to the catalog's rules.
- **`src/rules/levels/`** — the levels. `legend.ts` is the characters a
  wall's picture is drawn in (`LEGEND`), the portals' marks and a brick's
  tint (`tintOf()`). A file a set, `warm-up.json`, `sparks.json` and
  `tricks.json`, holds its nine levels, each an id, a name, a boon and a
  picture of its wall, as the file of its name in
  `docs/brick-fuzz-pop/levels/` drafts them; `levels.ts` lists the sets
  (`LEVEL_SETS`), numbers every level from 1 (`LEVELS`, `levelEntryOf()`),
  and `parseLevel()` turns one into a `Level` (`level.ts`) or throws an
  error naming the level and what is wrong; and `level.ts`'s
  `levelStart()` is where a level's first round starts on a depth.
  `certificate.ts` is a certificate's line as its file keeps it, pairs of
  an aim's index and a charge (`CertifiedShot`, `Line`), and turns a
  pair into a shot (`shotOf()`). `certificates/` holds each set's
  certificates, a line that clears each level on each depth, and `par.json`
  each level's par on each depth, half as many rounds again as its line,
  both written by `yarn certify:levels`. The specs in `every_level/`, a file
  a depth, replay every line, and those in `every_floor/`, a file a set and
  depth, hold the careless player to each set's floor. `levels.spec.ts`
  holds every level to the rules `plan.md` says a level keeps, finding a
  needed brick sealed in by a flood fill of its own.
- **`src/rules/flight/`** — the flight. `events.ts` describes what happens
  in one (`FlightEvent`, in the order its doc gives) and each fuzzball's
  path (`BallTrack`, `positionAt()`). `cast.ts`'s `cast()` writes into a
  `Contacts` record, made once, what a fuzzball flying from a place along a
  heading meets first, within a limit: a side wall, the ceiling, the floor,
  a brick's exposed face or corner or a bumper, each with its way out,
  everything met within `AT_ONCE` of the earliest gathered once and put in
  one order. It walks moves of a unit, each sweeping only the cells the
  fuzzball can touch, not every brick; `castField()` is what each cast of a
  flight reads. `flight.ts`'s `fly()` flies a round's fuzzballs from the
  floor along an aim on one clock, by the kinds and the trait rules it is
  handed (`FlightRules`), and returns the `Flight` with the wall it leaves
  and the bricks the player's fuzzball punched through (`Flown`); given a
  stop (`FlightStop`), it flies only so far past the player's first turn.
  `hooks.ts` says what a brick's trait rules may do to a flight (`Hooks`),
  and at which moments `fly()` runs them (`TraitRule`, `TraitRules`).
  `guide.ts`'s `guideOf()` is the guide (`Guide`): the player's fuzzball
  flown as the round flies it, without the mates and friends behind it,
  stopped as far past its first turn as it is handed, `GUIDE_PAST_TURN`
  unless the debug menu retunes it; its dots `GUIDE_DOT_GAP` apart; and the
  bricks it would punch through on the way. `src/rules/flight/benchmarks/`
  times `cast()`, `fly()`, `guideOf()` and `playRound()`, and plays ten
  thousand random shots along `playRound()`'s own path.
- **`src/rules/bricks/`** — what a brick does. `bricks.ts`'s `strike()`
  works out what a fuzzball's strike does to a brick and to the fuzzball, as
  `plan.md`'s "Charge" says, once the brick's rules have said whether it
  hurts and whether it earths the charge. `trait_rules.ts`'s `TRAIT_RULES`
  holds each trait's rule, typed so a trait without one fails to compile,
  each in a file of its own under `traits/`: steel's `never` and `earths`,
  the zappers' and the bomb's `zaps`, in a row, a column, both, the
  diagonals or a blast, wool's `recharges`, the cage's `frees`, freeing its
  friend in its tint, the bumper's `kicks`, the prism's `splits`, the
  portal's `teleports` and the plated brick's `plated`, a corner plated
  only where both its faces are, the shell's `shelled`, which only charge,
  a zap or a blast hurts, and moss's `regrows`, which does nothing in a
  flight.
- **`src/rules/wall/`** — the wall. `wall.ts` holds `Brick`, `Wall` and a
  field's thirds (`thirdsOf()`: the jump, the jump line and the row a level
  opens on), with every depth a field has (`DEPTHS`) and whether a value is
  one (`isDepth()`). `lower.ts` brings the wall down after a round
  (`lowerWall()`), a row, or a jump once no brick the level needs stands
  below the jump line, sinking what the level doesn't need at the floor's
  row and losing the level on what it does; and says whether a level is
  cleared (`isCleared()`) and a brick needed (`isNeeded()`), the row the
  lowest needed brick stands in (`lowestNeededRow()`), how many stand under
  a row (`neededBelow()`), and the danger: one standing in `DANGER_ROW`, the
  row over the floor's, or lower (`inDanger()`, `dangerCells()`).
  `regrow()`, which `lowerWall()` runs before the wall comes down, unless
  the level is cleared, gives worn moss back a hit, up to its full hits.
- **`src/rules/round/`** — `round.ts`: a round's types, where it starts
  (`RoundStart`: the wall, the depth, where the fuzzball waits, the friends
  and the boon), what it came to (`RoundOutcome`) and the round played
  (`Round`); the numbers a round is handed rather than reads (`RoundRules`,
  `tuning.ts`'s as `RULES`); and `playRound()`, which flies a shot by the
  catalog and `TRAIT_RULES`, scores each break's points and `JUMP_POINTS`
  for a jump, brings the wall down with `lowerWall()`, and says where the
  next round starts: from the player's fuzzball's landing, held
  `SIDE_MARGIN` off a side wall, the friends it freed added to the crew, and
  the level's boon after a jump. It changes nothing it is handed.
  `playRoundBy()` flies by the kinds and the rules it is handed, for a
  spec's stand-ins; `flightRulesOf()` says what a round's flight is played
  by, and `flightStartOf()` how its fuzzballs leave, which the guide shares.
- **`src/rules/run/`** — the run, after Brick Breaker's, with Asteroid
  Breaker's saved game. `run.ts`: `Run`, a value each move replaces, from
  the level it started at to its end. `createRun()`, `startLevel()`,
  `takeRound()` as a round is released, `landRound()` as its flight lands,
  the level's end waiting in `ending` till then so the last flight can be
  paused, `nextLevel()`, `takeDepth()` as the field takes a new depth,
  `pause()` and `resume()`, a move that doesn't fit returning the run as
  it is; it counts the stars its levels cleared earned (`stars`).
  `levelOf()` parses the level in play, and `openingOf()` lays it out on
  the depth it began on, which its par is set for.
  `scoring.ts` scores a break along the streak, the stars and how a cleared
  level's points add up (`tallyOf()`); `stars.ts` reads par (`parOf()`)
  and gives the stars (`starsFor()`: three within par, two within 3 rounds
  more, else one); `progress.ts` says which levels are open; `stats.ts`
  holds the records and how a run or a cleared level moves them;
  `saved_game.ts` the run under way as storage keeps it (`saveGame()`,
  `restoreGame()`, each of its checks exported); and `describe.ts` the
  announcer's words, from a level's start and a shot ("62 degrees, charge
  3", or "62 degrees, hot shot" for one carrying it) to a round, the
  wall's lowest rows (`describeRows()`: each brick's kind, its hits left,
  its plates, and a portal by its pair's badge, shut while its twin
  waits), a pause and the end.
- **`src/view/`** — what to draw and when, without Phaser, tested in Node.
  `round_play.ts` holds `RoundPlay`, which plays a round's flight back a
  frame at a time, counting its breaks' points as it reaches them
  (`scored`), and settles its wall, one for the whole game, and
  `RoundView`, the round as the scene draws it at a moment, its events
  numbered in `@fz/core/event_log`'s `EventLogView`; `run_state.ts` holds
  `RunState`, the run on the board and where its round stands, which
  `GameService` replaces whole, and `RoundPhase`; and `items.ts` finds the
  item at a place in a list made once (`itemAt()`), refusing a place the
  list hasn't, for the art and the colors.
- **`src/view/field/`** — `field_metrics.ts`: the field's shape a canvas's
  room holds (`fieldShape()`: a unit in whole device pixels, 11 to 22 rows,
  or the depth the debug menu sets, the floor's band, the lintel and
  whether panels fit beside it), where it lies on the canvas
  (`fieldMetrics()`, which keeps a shape's unit through a pixel's resize
  mid-flight, gives the cells and, in CSS pixels, the panels and the field
  from the lintel's top to the band's bottom, `framed`), whether a canvas
  has room for any field (`hasRoom()`), and `toCanvas()` and `toField()`
  between field units and device pixels, which write into a place handed
  to them. The margin is the canvas's insets (`MARGIN_CSS_PX`), and the
  field's frame lies in it.
- **`src/view/steering/`** — the player's hands. `controls.ts` holds the
  keys by `event.code`; `steering.ts`'s `Steering` turns the keys, the
  mouse, the wheel and fingers into each frame's `Steer`, the aim, the
  charge, a shot let fly, fast-forward held and whether the keys moved it,
  aiming a pointer from where the fuzzball waits: pulled back past a dead
  zone, a notch at a time, or pointed and held, each kind of pointer its
  own way. Escape calls off a charge building and otherwise passes on to
  pause, as only the steering knows a charge builds. `aiming.ts` holds how
  each kind of pointer aims (`PointerAimings`), the settings' "by the
  pointer" (`BY_POINTER`) and the aim straight up the steering starts at
  (`STRAIGHT_UP`), which the steering, the scene and the shell take from
  it, so the shell's chunk carries no `Steering`.
- **`src/view/colors/`** — the field's colors: the page's roles it is drawn
  in (`FIELD_ROLES`), the tiles' eight inks by name (`TINT`), and
  `wallPalette()`, which gives a palette's colors from those roles and its
  mode's tile and fuzzball inks: every color a rule of contrast covers,
  though not the shading the art mixes from them. `contrast.spec.ts` holds
  them to 3:1 in each of the game's four palettes, and the field's text to
  4.5:1 against the lintel, where the board counts the rows waiting.
  `brick_colors.ts` says the color each kind of brick is drawn in, which
  its shards take (`brickColor()`): its tint's ink, its pair's or its own,
  typed over the catalog's ids, so a kind without one fails to compile,
  and kept apart from the art, so the shell's Coming next reads it without
  loading the art, which only the scene's chunk carries.
- **`src/view/art/`** — the atlas's frames, drawn in `@fz/phaser/shapes`'s
  commands in device pixels. `frames.ts` names every frame (`FRAMES`).
  `art.ts`'s `BRICK_ART` says how each kind is drawn, typed over the
  catalog's ids, so a kind without art fails to compile, with the frames a
  brick stacks in its cell (`brickLayers()`); each kind's art is a file of
  `kinds/` (`brick.ts`'s tile in the eight tints, `tough.ts`'s pips and
  cracks, `steel.ts`, `zapper.ts`'s four zappers, `shell.ts`'s body and pips
  and `moss.ts`'s cap and pips, each showing its hits left, `bomb.ts`'s
  bomb, `wool.ts`'s patch and `cage.ts`'s bars, whole or hit, over the
  friend it holds, in the ink its tint picks, `bumper.ts`'s disc,
  `prism.ts`'s faceted triangle, `portal.ts`'s ring in its pair's inks and
  `plated.ts`'s plates over its tile, for each of the legend's three
  platings), on `symbols.ts`'s shared shapes and its rule that drops detail
  under 30 CSS px a unit (`detailed()`). `fuzzball_art.ts` draws the
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
- **`src/view/debug/`** — `debug_tuning.ts`: the numbers the debug menu
  tunes in play (`TunedNumbers`), starting from the game's own
  (`TUNED_NUMBERS`): the flight's speeds at Normal and Fast, how much
  faster fast-forward plays, when a long flight speeds up and by how much,
  how far the guide runs past its first turn and how far a fuzzball flies
  without a hit before it yawns. It holds the menu's sliders
  (`TUNING_SLIDERS`), each number in its unit (`formatTuning()`) and as the
  lines it would replace (`tuningLines()`), the pace a tuning would hand
  `RoundPlay` (`paceOf()`) and the rules it would hand `playRound()`
  (`rulesOf()`), and whether it leaves the certificates stale
  (`staleCertificates()`). `certificates.ts` reads a set's certificates
  file, `src/rules/levels/certificates/<set id>.json`, each level's `Line`
  on each depth by its id, dropping what it can't trust
  (`readCertificates()`, `lineOf()`, `SetCertificates`).
- **`src/scene/`** — the Phaser scene, after Brick Breaker's.
  - `wall_scene.ts` — `WallScene`, made by `makeWallScene()`, handed plain
    functions over the game (`WallSceneOptions`). It hands its `Steering`
    every key but the browser's shortcuts, the arrows and Space captured
    from the page; the mouse and its wheel; fingers, adding pointers up to
    `MOST_FINGERS`; and a pointer let go past the canvas, so a mouse let go
    there still lets the shot fly; and calls its `letGo()` as the player
    looks away (`onPlayerAway()`). A key the steering doesn't take becomes
    the view's command through `commandOfKey()`, once a press. Each frame
    it reads the steering from where the fuzzball waits (`waitingX()`), or
    last waited while it flies, and hands the shell the frame's time and
    the steer; lays the field out again as the canvas, the chrome or the
    shape changes, measuring the steering again, and bakes the atlas again
    at a new scale or palette; plays each event and beat of the view's two
    logs once, taking a log up at its latest: each launch, turn and yawn
    setting where its fuzzball looks, a friend's ink taken from `crew()` in
    the order they were freed, its sound with motion or without, and its
    flourishes (`flourishesOf()`) where the player welcomes motion, one on
    a brick placed where the brick still shows, on the wall drawn the frame
    before, as the frame that reaches a flight's last events hands over the
    wall that comes down; and has its painters draw, each in its layers of
    `LAYERS`. Its `SpritePlayer` plays each frame's sounds once, gathered
    by `createFrameSounds()`, a break's risen by `detuneOf()`, and the notch
    as the charge rises or falls, but to none, while a fuzzball waits, but
    a hot shot, whose charge is always full; and mutes the game as
    `sound()` says, its sprite in `sounds/`, which `yarn build:sounds`
    writes.
  - `atlas.ts` — bakes the art's frames, the scene's own (`field_art.ts`:
    the field's dots and the warning frame; the meter's pips and the
    guide's dot and outline, which `FRAMES` names and no art draws; and
    `FLIGHT_FRAMES`'s shard, streak, bolt and ring) and a picture of each
    kind (`pictures.ts`) into one atlas (`bakeWallAtlas()`), at 128 device
    px a unit at most; the scene hands the shell the pictures How to play
    and the panels show, `{ bricks }` by kind, through `onPictures`.
  - `painters/` — each a `Painter` (`painter.ts`), drawing from the
    `PaintContext` the scene writes over each frame, from pools made once,
    the dots on whole pixels (`dots.ts`'s `placeDot()`). `FieldPainter`
    draws the cells, the floor's band, the lintel, the frame, the grid's
    dots, and the jump and danger lines in dashes on whole pixels, counting
    in dots, over the guide, the needed bricks still under the jump line
    once they are nine or fewer (the rules' `neededBelow()`), the danger
    line solid and twice as thick while a brick the level needs stands at
    or under the row over the floor's (the rules' `inDanger()`).
    `WallPainter` stacks each cell's frames, lays the warning frame over
    each such brick (the rules' `dangerCells()`), and, where the player
    welcomes motion, eases the wall down by `RoundView.wallDrop`, which is
    1 while the wall stands still, the rows coming in cut off along the
    ceiling; it swells a struck brick.
    `BallPainter` draws the fuzzballs, 16 at most at once
    (`MOST_FUZZBALLS`): each in the air, its eyes the way its last event
    sent it, and the one waiting on the floor, its fur combed by the charge,
    looking along the aim, in its boon's look, which flares in at the jump,
    a triple shot's two mates beside it. `MeterPainter` draws the charge's
    five pips under it. `GuidePainter` draws the guide `guide()` hands over,
    the rules' `Guide` (`src/rules/flight/guide.ts`): up to 128 dots
    (`MOST_GUIDE_DOTS`), one at each of its places but where it would crowd
    the count's (`FieldPainter.crowdsCount()`), and 31 outlines
    (`MOST_PUNCHED`), one round each brick the shot would punch through.
    `EffectsPainter` draws a broken brick's shards, 216 at most
    (`MOST_SHARDS_FLYING`), a punch's streak, a zap's bolt, a blast's ring
    and a freed friend's hop, each but the shards through `@fz/core/turns`,
    the jump line's flash and a lost level's shake.
- **`src/app/`** — the shell, one folder per feature. `app.component` places
  the board in the room the bar leaves it, then the bar, the announcer, the
  result card over an ended run, the Levels dialog (every level open while
  the debug menu opens them), How to play, handed the scene's pictures only
  while it is open, the settings drawer, put away as its debug menu plays
  a certificate, and the question before a run is lost, each wired to
  `GameService`; hands the board the focus as the page loads, as each run
  begins and as the last dialog over the board closes
  (`refocusWhenUncovered()`), and after the bar's Resume; and pauses the
  level in play as the player looks away from the room (`[fzPlayRoom]`).
  - `bar/` — the game bar, `<app-bar>`, showing what it is handed and
    asking for each action: from the desktop width (`fitsActionLabels`),
    unless the window is compact, the level, the rounds against par, the
    rows left, the score and the crew; otherwise the rounds and the score
    alone, as `figures.ts`'s `showsEveryFigure()` says, which the board
    reads too, the lintel's count hidden where the bar counts the rows.
    Every action is round; Pause, Fast-forward (`button[appFastForward]`)
    and Skip (`button[appSkip]`) stay at every size, the two dimmed while
    there is no flight, and on a compact screen Sound, Levels, New game,
    How to play and Settings move into the overflow menu. `<app-crew>`
    draws a crew in a row, the player's fuzzball in the accent, then each
    friend in its ink, for the bar and the Cleared card.
  - `board/` — the board, `<app-board>`, and the cards over its field. The
    board holds `<fz-phaser-canvas>`, loading its scene only once the canvas
    asks, and, until the scene has drawn, a placeholder of the empty field
    where the scene will lay it out. It measures itself as it is first drawn
    (`canvasRoom()`) and hands `GameService` the room (`setRoom()`) before
    the scene's first layout and at each measure after; hands the scene plain
    functions over `GameService` (`WallSceneOptions`); sets the drawn gate
    from the canvas's state; and hands the game a later bake's pictures only
    once the atlas has settled (`PICTURES_SETTLE_MS`), reading them only
    while the panels or the Ready card show them. On the lintel it says how
    many rows wait ("5 rows waiting", "No rows waiting"), read as the page is
    where neither the bar's Rows left nor Coming next says it and hidden from
    assistive technology where one does; the Ready card lies under it. Only
    its `.play` element is the application, named for the level and described
    by its keys, around the canvas and the focus ring; the panels and the
    card are its siblings, read as a page is. The board puts the focus on
    `.play` for a press on it, from `focus()` after the next render, and back
    from a card's button before the game moves on. For the layout check
    (`tools/check-layout.mjs`) it publishes `data-field` (from the lintel's
    top to the band's bottom), `data-room`, `data-panels` (`""` where none
    show), `data-depth`, `--across` and `--down`, each once the scene has
    laid the field out; `--lintel` and `--band`, once the board is measured;
    and, from the start, `data-outcome`, `data-wall` and `--pixel-ratio`. It
    sets `--margin`, the canvas's insets, which the cards keep too;
    `--frame`, for the placeholder's frame and the focus ring; and
    `--lintel`, `--band` and `--band-ink`, for the placeholder, `--lintel`
    and `--frame` sizing the count of the rows too. The cards are
    `<app-board-card>`, handed the one to show (`BoardCard`) and what it
    shows: Ready, the level's number and name, what its jumps earn, the kind
    of brick it brings in and, on a phone on its side, that the game is
    larger upright; Paused, the score, then Resume; Cleared, the stars, the
    rounds against par, the tally, the score and the crew, then Next level;
    and Ended, once a run's result is closed, where the run was lost or the
    trophy, the score, then Try again from the level or New game.
    `<app-board-card>` reads the field's margin from `--margin`, which the
    board sets, shows no card of its own while the canvas's cards
    (`<fz-canvas-cards>`), projected into it, show one, keeps its buttons'
    keys from Phaser's keyboard, and hands on each press.
  - `panels/` — the two panels beside a wide room's field, each a region
    named by its heading, taking no pointer and no size of its own, to be
    laid over its room with `cssRectStyle()`: Coming next,
    `<app-coming-next>`, the level's number and name, the rows waiting over
    the ceiling as squares in each brick's ink, hidden from assistive
    technology beside a sentence counting them, and what a jump earns; and
    In this wall, `<app-in-this-wall>`, each kind of brick the wall holds,
    through `helpEntries()`, with its picture once the scene has drawn it,
    the friends freed, and the boon's badge, lit through `lit` while the
    shot being aimed carries it. `panels.ts` reads the wall for both
    (`waitingRows()`, `kindsIn()`).
  - `settings/` — the settings drawer, `<app-settings>`: how a pointer aims
    (by the pointer, a finger pulling back and a mouse pointing and holding,
    or either way for both), the flight's speed, long flights sped up, the
    aim guide, sound and the palette, each applied at once;
    `SettingsService` keeps them. Where `@fz/game-ui/debug_menu`'s
    `DEBUG_MENU` says so, in a development build and in a production one
    at `?debug`, the debug menu follows them, deferred, so a page that
    doesn't offer it never loads it; the drawer hands on the menu's Play
    the certificate (`playCertificate`), so the app can put it away.
  - `debug/` — the debug menu, `<app-debug-menu>`, `@fz/game-ui`'s
    `<fz-debug-tuning>` with a slider for each number
    `src/view/debug/debug_tuning.ts` tunes and the lines they would
    replace; whether the certificates are stale and the run keeps its
    records; the field's depth over the room's; every level open; and Play
    the certificate, shown while `CertificatesService` offers one
    (`CertificateOffer`: the level in play's, on the field's depth) and
    otherwise saying none holds, which plays it and tells the drawer
    (`playCertificate`). `DebugService` holds what the menu sets until
    the page loads again: the numbers (`tuning`), the depth (`setDepth()`,
    which throws a `RangeError` for one no field has), every level open,
    and whether the run under way keeps no records (`runOffRecord`), which
    `startRun()` begins watching; and it says whether the certificates are
    stale (`certificatesStale`). `CertificatesService` offers the menu the
    level in play's certificate on the field's depth (`offer`) and plays it
    (`play()`), loading its set's file only while `DEBUG_MENU` offers the
    menu, through `CERTIFICATE_FILES`, an `import.meta.glob()` of the
    files, each a chunk of its own, so a player's page fetches none; a set
    with no file has none. The menu provides it, so the two share a chunk
    a player's page never loads.
  - `help/` — How to play, `<app-help>`: the aim, the charge, the wall's
    step and jump, the boons, the scoring and the stars, their counts and
    points from `tuning.ts`; the controls by mouse, touch and keyboard, a letter key
    named by where it sits under the fingers, as the keys are read by
    `event.code`; and every brick in the catalog, with its picture once the
    scene hands them over (`HelpPictures`). `help_words.ts` says how often
    in words where `count()` would read wrong (`howOften()`: "once").
  - `levels/` — the Levels dialog, `<app-levels>`: each set under its name,
    each level a button named by its number and name, with its stars and
    best once cleared, "Locked" and `aria-disabled` until it opens, the
    run's own `aria-current`; it hands on the level chosen.
  - `result/` — the result card over a run's end, `<app-result>`: "Game
    over" or "Every level cleared!", the score and the best, the levels
    cleared and the stars earned, "New best" and the trophy, then Try again
    from the level or New game, Choose a level and Close. It opens on its
    title, where Enter presses the first of them and Space nothing, so a
    player still holding Space presses nothing. `end_words.ts` holds the
    words it shares with `<app-board-card>`'s Ended card: where a run was
    lost (`whereLost()`) and what Try again says (`tryAgainLabel()`).
  - `stats/` — the records: `StatsService` and `ProgressService`, which keep
    what `src/rules/run/stats.ts` and `src/rules/run/progress.ts` read, for
    the levels `GAME_LEVELS` hands them; and `levelMarksOf()`, each level's
    mark for the Levels dialog.
  - `play/` — `GameService`, the game, on `@fz/game-ui`'s `RunLifecycle`:
    it holds the run and where its round stands (`RunState`), plays each
    round released through the rules and back through one `RoundPlay`,
    lays the field out on the board's room between rounds, gives the scene
    its options and the guide (`guide()`), says what happens and keeps the
    records. The bar's rounds and score follow the playback, though the
    run takes a round in as it is released: a round counts as its flight
    lands, each break's points as the flight plays it back, and a jump's
    and the stars' as it lands. It hands the board the card to show
    (`boardCard`) and the result card the run's end (`runEnd`), and takes
    from `DebugService` the flight's pace and the rules' numbers, the
    field's depth, which lays the field out again between rounds, and
    whether a run keeps its records: none for one begun at a level not yet
    open or on numbers retuned. It plays a certificate's line
    (`playLine()`), off the record, a shot let fly as each round is aimed,
    on the rules' own numbers. And `SavedGameService`, which keeps the run
    under way through `@fz/ui/storage`'s `keepSaved()` and takes it up
    again, paused, reading the game through `KeptGame`, which it injects
    as `KEPT_GAME`, and which `provideGame()` makes `GameService`;
    `main.ts` injects it at startup.
  - `tokens.ts` — `GAME_LEVELS`, the levels a run is played through, and
    `PLAY_ROUND`, the rules' `playRound()`, which the specs replace.
  - `styles/` — `global.scss`, `@fz/game-ui`'s global stylesheet, loaded
    once from `main.ts`, and `_index.scss`, the toolkit every component
    `@use`s, which emits no CSS.
- **`src/testing/`** — what the specs share, as Tests below says. The app's
  tsconfig leaves it out.
- **`tools/`** — the scripts run from the workspace. `build-aims.mjs` writes
  the aims and `build-sounds.mjs` the sounds; `certify-levels.mjs` writes
  the certificates and the pars, and `report-levels.mjs` prints how the
  careless player plays every level; `check-layout.mjs` checks the build's
  layout in a headless Chrome, and `capture-screenshots.mjs` makes the
  screenshots the site shows, both handing a page a run kept by the rules,
  stored as the game stores one, through `stored_run.mjs`. `sound-lab.ts`
  is no script but the sound lab, mounted on `@fz/dev/sound-lab-page`'s
  page (`mountSoundLab()`), which the dev server alone serves
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
  points banked, the stars its levels cleared earned (one a level for a
  game kept before them) and the score, and whether the debug menu took it
  off the record; and where its next round starts, each brick's hits left
  by wall cell, how far the wall has come down, the field's depth, where the
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
- **Check the Layout:** `yarn check:layout` (runs `tools/check-layout.mjs`
  on the build `yarn build` made: `@fz/dev/layout`'s `checkPhaserLayout()`
  at each shape and turn, at twice the pixels, the field `--across` by
  `--down`, the panels a deck shown both or neither (`data-panels`); then
  its own inspection: a unit of 24 CSS px at least; the unit, the depth
  (`data-depth`), the floor's band (`--band`) and the lintel (`--lintel`)
  its room (`data-room`) asks for, the field lying in the room, filling its
  width where it is deeper than 11 rows and its height where it is 11; the
  panels wherever 184 CSS px are spare each side, and nowhere else;
  and the wall on the row a level opens on at the field's depth
  (`data-wall`), a turn of the window included, as a level with no round
  played begins again on a depth the field takes; then all of it again over
  a run kept by the rules, a round played on Hello, wall, which each page
  takes up paused, its wall on the row the run kept it on at every shape
  and through each turn, whatever the field's depth).
- **Capture Screenshots:** `yarn capture:screenshots` (runs
  `tools/capture-screenshots.mjs` against the running dev server in headless
  Chrome, through `@fz/dev/screenshots`' `runScreenshotScript()`: a run kept
  by the rules (`keptRun()`, in `src/testing/kept_run.ts`, which it loads
  through `src/testing/screenshot_api.ts`'s `SCREENSHOT_API`, with the
  version the shell keeps it under), begun on level 18, Powder keg, on a
  field 11 deep and played two rounds in by the first two shots of its
  certificate there, taken up and gone on with, the next shot aimed by the
  arrow keys up through a bomb, at 100 degrees and a charge of 3, which it
  waits to hear the game say, at 1280 × 720 and 2× on Midnight blue, written
  to `public/docs/screenshots/brick-fuzz-pop/` as the site's `preview.webp`
  (2560 × 1440), which `index.html` names as the link preview, and
  `thumb.webp` (576 × 324), cropped around the field; `--url` points it at
  another server than `http://localhost:9006/`).
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
- **Certify the Levels:** `yarn certify:levels` (runs
  `tools/certify-levels.mjs`, which finds a line that clears each level on
  each depth with the solver, `src/testing/solver.ts`, on a pool of worker
  threads, and writes them to `src/rules/levels/certificates/<set>.json`,
  with each level's par on each depth to `src/rules/levels/par.json`, the
  same bytes every run; `--set`, `--level` and `--depth` certify only those,
  keeping the other lines; it exits with 1 where a level has no line. The
  specs in `src/rules/levels/every_level/` fail while a line no longer
  clears its level, so run it after a change to the flight, a kind, the
  tuning or a level).
- **Report the Levels:** `yarn report:levels` (runs
  `tools/report-levels.mjs`, which plays the careless player,
  `src/testing/casual.ts`, forty games a level on fields 11, 13 and 22 deep,
  or on each `--depth` given, and prints how often it cleared each level,
  marked `!` under its set's floor, and the rounds and jumps a game took at
  the mean; `--seeds` sets the games; it exits with 1 where a level falls
  under its floor).
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
`sim`, in Node too and without coverage, for the specs in
`src/rules/levels/every_level/`, which replay every certificate with
`replayLine()`, and `src/rules/levels/every_floor/`, which hold the careless
player to each set's floor over twenty games on fields 11, 13 and 22 deep,
and for the flight's benchmarks and the round's random shots in
`src/rules/flight/benchmarks/`: `cast.spec.ts` prints `cast()`'s median and
99th percentile beside a scan of every brick's, `fly.spec.ts` `fly()`'s,
alone and with mates and friends, and `play_round.spec.ts` `playRound()`'s
over the levels' opening walls and seeded random shots, against the plan's
100 µs and 2 ms, each held to no time, as no runner times anything alike
twice; `guide.spec.ts` holds `guideOf()` under 1 ms at the 99th percentile
over the levels' opening walls, five times the plan's 0.2 ms
(`yarn vitest run --project sim --reporter=verbose src/rules/flight/benchmarks`
shows them); and
`random_rounds.spec.ts` plays ten thousand seeded random shots at random
walls along `playRound()`'s own path, none throwing, none capped and none
coming nearer a brick than a fuzzball may; and `dom`, in jsdom, for every
other spec under `src/`, the scene's and the shell's. `src/test-setup.ts`
installs `@fz/phaser/testing`'s headless Phaser first, so the scene's spec
runs real Phaser, with a fake shell over the hand-made rounds; gives each
test a store in memory; and stands in for the modal dialogs and
`document.fonts`, which jsdom lacks. Coverage measures `dom` and `pure`
together, to the floors `vitest.config.ts` sets (statements, branches,
functions and lines): the rules and the view 100, 95, 100 and 100, the scene
98, 92, 100 and 99, and the shell 98, 97, 97 and 98; `src/testing/` and the
scripts have none, so what of them goes untested shows. This workspace's
[`brick-fuzz-pop-testing`](.agents/skills/brick-fuzz-pop-testing/SKILL.md)
skill covers its setup, coverage floors and fixtures, the certificates and
the careless player's floors, what to do when a replay fails, and the
mutation pass; the repository's `angular-testing` skill the patterns every
Angular workspace's specs share, and `phaser-core` the harness.

What the specs share is in `src/testing/`:

- `flight_fixtures.ts` holds eleven rounds made by hand
  (`FLIGHT_FIXTURES`) to build the view, the scene and the shell against,
  and `orderProblemsOf()` and `trackProblemsOf()`, which hold a flight to
  the order and the paths `src/rules/flight/events.ts` describes.
- `level_picture.ts` makes a level of a pictured wall (`levelFrom()`), and
  holds rules under which no shot takes a hit (`NO_HITS`) and a level that
  loses to them after a jump (`HIGH_BRICK`), for the solver's and the
  careless player's specs.
- `wall_picture.ts` lays a wall out from a picture in the legend's
  characters (`wallFrom()`), tinted as a level's are and each portal
  twinned with the other of its mark (`twinsIn()`), so a spec draws the
  wall it plays, as the fixtures do.
- `wall_score.ts` measures a round played (`wallScore()`), as the sketch's
  `score()` did: a lost level the least, a cleared one the most less a cost
  for each round it took, and any other less each needed brick's hits and
  weight, the more the nearer the floor, less the danger, and more for each
  friend and a boon earned.
- `solver.ts` finds a line of shots that clears a level on a depth
  (`solveLevel()`): greedy at every fourth aim, then a beam of 4, then every
  aim (`SEARCHES`), within `SOLVER_ROUNDS`, keeping every needed brick out
  of the danger row, its line kept as a certificate keeps it;
  `replayLine()` plays a line through `playRound()`; and `lineHolds()` says
  whether a line played holds as a certificate: cleared, in as many rounds
  as it has shots, every needed brick kept over `DANGER_ROW`.
- `casual.ts` is the careless player (`playCasually()`): each round it
  plays the best by `wallScore()` of `CASUAL_LOOKS` shots drawn from a
  seed. `CASUAL_FLOORS` is how often it must clear a set's levels.
- `cast_reference.ts` casts by a scan of every brick (`castByScan()`),
  working each kind's shape and reach out for itself, and makes seeded
  walls and shots (`randomField()`, `randomShot()`), on which `cast.spec.ts`
  holds `cast()` to the scan and the benchmark times both.
- `stand_ins.ts` holds kinds made up for specs before their own were
  cataloged, a bumper and a portal, and
  `STAND_INS`, the catalog with them in the row and column zappers' places,
  which a spec hands the rules; a prism; `STAND_IN_RULES`, the rules they
  are flown by, each brick's own but for plates and shells, which do nothing
  there; and `struckOf()`, a strike as a brick's rules see it.
- `random_flights.ts` draws seeded flights at random walls
  (`randomFlight()`), each flown by its kinds' rules, and finds where a
  flight's fuzzballs come nearer a brick than they may
  (`clearanceProblemsOf()`), on which `flight.spec.ts` holds `fly()` to
  every flight's checks.
- `flights.ts` flies a shot at a wall drawn as a picture by the bricks' own
  rules (`flyPicture()`), picks a flight's events of a kind (`eventsOf()`),
  and matches a value as near as the flight's arithmetic finds it
  (`near()`).
- `timing.ts` reads a list of times at its median and 99th percentile
  (`described()`, `quantile()`), for the flight's benchmarks, and says how
  long a `sim` test that can run past half a second alone may take
  (`SIM_TIMEOUT_MS`), as `sim`'s specs run beside every workspace's in
  `yarn test`.
- `every_level.ts` holds what the specs in `every_level/` and `every_floor/`
  play, each file taking its depth, or its set and depth, from its name
  (`holdEveryCertificate()`, `holdEveryFloor()`): every set's certificates
  (`CERTIFICATES`, `certificateOf()`), and the floors' depths and games
  (`FLOOR_DEPTHS`, `FLOOR_SEEDS`, `FLOOR_SPECS`); its spec holds both
  folders to a file for each.
- `script_api.ts` types what the scripts take from the game, importing
  nothing, so `tsconfig.scripts.json` checks them against it;
  `certify_api.ts` (`CERTIFY_API`), `report_api.ts` (`REPORT_API`) and
  `screenshot_api.ts` (`SCREENSHOT_API`) are what `certify-levels.mjs`,
  `report-levels.mjs`, and `capture-screenshots.mjs` and
  `check-layout.mjs` load through Vite, held to those types.
- `kept_run.ts` keeps a run as the game keeps one (`keptRun()`): begun at
  a level on a field of a depth, a round played for each shot, the level
  still on, for the screenshots and the layout check to hand a page to
  take up.
- `art_frames.ts` draws the atlas in one palette at one scale for the art's
  specs (`ART_FRAMES`), lists the pixel ratios they check the art at
  (`PIXEL_RATIOS`) and every whole unit from 24 CSS px to 128 device px at
  one (`everyScale()`), and measures how far a point lies from a line or
  past a rounded rectangle, and how far a command reaches past one
  (`reachPastRoundRect()`).
- `canvases.ts` gives the canvas a board has in a window (`boardCanvas()`),
  less the bar or the rail (`CHROME_CSS_PX`, which its spec holds to
  `@fz/game-ui`'s Sass, the compact bar's through
  `src/testing/compact_bar.scss`), its insets the margin.
- `play.ts` hands `GameService` the game's first three levels, a seeded
  random and rounds played as a script says, each with a fixture's flight
  (`provideSpecPlay()`, `scriptedRounds()`), and plays them a frame at a
  time (`release()`, `playOut()`, `playRoundOut()`, `playUntilCard()`).
- `certificates.ts` gives the debug menu a set's certificates file, holding
  a line of two shots for a level on the depth the field has as it loads
  (`filesCertifying()`), and waits for what the menu loads or plays, which
  `whenStable()` doesn't (`loadsSettled()`).
- `roles.ts` reads the game's palettes from its global stylesheet
  (`PALETTES`), which `src/view/colors/contrast.spec.ts` holds the field's
  inks to contrast in, each of the four.
