# Asteroid Breaker

The `asteroid-breaker` workspace: Asteroid Breaker, its field drawn with
Phaser 4 through `@fz/phaser`, in an Angular shell on the shared libraries,
laid out as Brick Breaker's is. What every game keeps, in
[frontend/games/AGENTS.md](../AGENTS.md), what every workspace keeps, in
[frontend/AGENTS.md](../../AGENTS.md), and the repository's rules, in
[.agents/AGENTS.md](../../../.agents/AGENTS.md), apply here too; this
workspace keeps its own for its code. The repository's `phaser-core` skill
says how any game here is drawn with Phaser. Paths are relative to
`frontend/games/asteroid-breaker/`.

Its skills, in `.agents/skills/`, cover how its specs run and what they
share (`asteroid-breaker-testing`), and what it takes to add a wave, a
sector, a formation, a kind of rock, a pickup or a weapon, or to change
Endless (`asteroid-breaker-content`).

## Technology Stack

- **Field:** [Phaser 4](https://phaser.io/), through `@fz/phaser`'s canvas,
  host, scene helpers and sound
- **UI:** [Angular](https://angular.dev/) (standalone components, signals,
  zoneless change detection) on `@fz/style`, `@fz/ui` and `@fz/game-ui` (the
  `fuzzley-ui` skill), with `@fz/core`'s helpers in the rules and the view
- **Build Toolchain:** [Vite](https://vitejs.dev/) +
  [AnalogJS Vite Angular Plugin](https://analogjs.org/)
- **Test Framework:** [Vitest](https://vitest.dev/), in Node for the rules
  and the view, and in jsdom, with Testing Library and real Phaser run
  headless, for the scene and the shell
- **Language:** TypeScript / HTML / Sass

## Layers

Four layers, each a folder under `src/` named for it, each importing only
the layers below it, as `@fz/dev`'s `phaserGameLayers()` fences them in
`eslint.config.js`, which lets the view take `@fz/style/fuzzball` too
(`viewAllows`): the rules', `src/rules/`, the view's, `src/view/`, the
scene's, `src/scene/`, which draws the field on Phaser, and the shell's,
`src/app/`, whose board loads the scene with `import()`.

| Layer | May import                                                                                                                                                                                             | May not import                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| rules | `@fz/core`                                                                                                                                                                                             | Phaser, Angular, RxJS, any other `@fz/*`, the view, scene and shell, the specs' helpers |
| view  | the rules, `@fz/core`, `@fz/phaser/bricks`, `@fz/phaser/color`, `@fz/phaser/insets`, `@fz/phaser/layout`, `@fz/phaser/shapes`, `@fz/phaser/fuzzball`, `@fz/style/fuzzball`; `@fz/style/themes` by type | Phaser, Angular, RxJS, any other `@fz/*`, the scene and shell                           |
| scene | Phaser, `@fz/core`, `@fz/phaser`'s entries but the canvas, the view and the rules                                                                                                                      | Angular, RxJS, the shell's libraries, the shell                                         |
| app   | Angular, every `@fz/*` library, the rules and the view; the scene and `@fz/phaser`'s host, scene helpers and sound by type                                                                             | Phaser, and the scene or those three entries by a value import                          |

The physics is the rules', so the whole game plays in Node, as the
autopilot does. The fence doesn't see the board's `import()` of the scene,
which keeps Phaser out of the first download.

The rules and the view, but their specs, read only what they are handed,
as `phaserGameLayers()` holds them: no clock or timer (`Date.now()`,
`new Date()`, `performance`, `setTimeout()`), no number drawn from no seed
(`Math.random()`, `crypto`, `@fz/core/random`'s `randomSeed()`), no seed
mixed by hand (`Math.imul()`, where `@fz/core/random`'s `mixSeed()` mixes
one, but for a rock's cut, its cracks, its break and a held hit's spark,
which mix theirs as the art kit does, so each rock is the one the kit
drew), nothing of the page (`window`, `document`, `navigator`,
`matchMedia()`) and nothing stored or fetched (`localStorage`, `fetch()`).
The scene hands them the frames' time and the room, the shell what is kept,
and their numbers are drawn from a seed, so a run plays the same again from
its seed and its frames, as the autopilot, a game taken up and Endless's
waves made again from their seed rely on.

## Layout

Each layer's folder holds at its top what the rest of it builds on, and each
part of it in a folder of its own below, named for what it holds, never for
the kind of code in it; a spec sits beside the file it tests. No folder in a
layer takes a name the fences keep: a layer's, `view`, `scene` or `app`,
which they would take for the layer, or `testing`, which the rules' fence
takes for the specs' helpers.

- **`src/rules/`** — the game, with no framework, physics included.
  `tuning.ts` holds the numbers that set its feel, in field units (the
  field's short side is 40, `FIELD_SHORT_SIDE`, and its long side as many
  as its room's shape holds, up to 88, `FIELD_LONGEST_SIDE`); `speed.ts`
  the three speeds (`SPEEDS`, `SPEED_INFO`), Relaxed, Normal and Fast, each
  how fast the rocks and the comets go, how often a comet comes, how
  likely a pickup is and how far the ship draws sparks in from; and
  `stepper.ts` binds `@fz/core/clock`'s `createStepper()` to the field's
  step, 1/120 s (`STEP_MS`): `stepsIn(ms)`, a time in those steps, and the
  field's clock (`createFieldClock()`), which turns a frame's time into
  steps, twelve at most a frame.
  `torus.ts` is the wrap: the field for a room's shape
  (`torusFor()`), the shortest way and distance between two places across
  the edges (`across()`, `distance()`), and where a thing reaching past an
  edge needs a copy drawn (`copyShift()`) and how far off each copy is
  (`copyOffsets()`); `angles.ts` the turn and the degree in radians
  (`TURN`, `RADIANS_PER_DEGREE`). `draws.ts` draws the field's random
  numbers (`nextDraw()`, `drawIn()`) from its seed and how many came
  before, so a field taken up draws as it would have.
- **`src/rules/field/`** — the field. `field.ts`: `Field`, a wave in play,
  which each step changes in place, from records made once. `fieldFor()`
  lays a wave out whole on a field of a shape at a speed, its counts grown
  by the field's area (`fill.ts`'s `fillFor()`, from counts written for 40
  by 40), and its rocks laid fairly in its formation (`spawn.ts`'s
  `layOut()`): 12 units off the waiting ship at least, across the wrap, on
  courses that keep 5 units clear of it for their first 3 seconds
  (`liesFairly()`). `steerField()` takes a frame's steering, `stepField()`
  moves it on a step, and `reshapeField()` stretches a paused field to a new
  shape, every place on it moving to the same share of the way across and
  down (`stretchField()`). A wave holds still until the player's first move.
  A rock or a comet that hits the ship knocks the last in tow loose, breaks
  a size down if it is a rock and keeps the ship untouchable a while
  (`HIT_GUARD_MS`); one that hits it with no one in tow ends the run, its
  pilot bailing out home. The field counts its steps
  (`Field.steps`), and a timer is the step its thing happens at. Each part
  of the rules takes only what of the field it acts on, a type declared
  beside it (`RockField`, `CometField`, `StrayField`, `PickupField`,
  `ShotField` and the others), so a spec need build no more of a field
  than that, and a trait's step rule sees only the course its rock flies by
  (`CourseField`), so the layout flies a copy of a rock ahead without
  touching the field.
  `scoring.ts` scores each break by its kind and size, each spark
  gathered and each stray caught, more as it goes straight home, times
  static's multiplier (`src/rules/sparks/`), and a wave's clearing, more
  for one cleared without a hit taken, and says how a cleared wave's points
  add up (`tallyOf()`), each part counted as it scores, what static added
  apart from the rocks', the sparks' and the strays' own.
  `events.ts`'s `FieldEventLog` is `@fz/core/event_log`'s
  `EventLog` of 512 numbered records, which the field fills, the scene plays
  and the shell hears, each from the last one it read; a pull of fire
  names the weapon that fired it (`addFired()`), as each shot does, for its
  sound. `kept_field.ts` is the field as storage keeps it: `savedField()`
  writes it; `readField()` reads it back, dropping what fails one of its
  checks, each named and exported: its counts, its sizes, its steps
  (`hasMoved()`, `hasDroppedInTime()`, `hasSparkedInTime()`), the pilot's
  static (`isStatic()`), a rock, each of its keys by its own check
  (`isKeptRock()`, through `ROCK_CHECKS`), a rock's kind and state, and its
  fit to its wave and to what its run has scored on it (`fitsItsWave()`,
  `fitsItsRun()`, `isStrayPoints()`); and `layOutKeptField()` lays the wave
  out afresh at the size it was laid out at and stretches it to the size it
  was kept at, its rocks, counts and static as kept, its points and strays brought
  home as its run has scored them, and its ship brought waiting where it is
  safest, its line in tow behind it (`field.ts`'s `bringShip()`,
  `spawn.ts`'s `safestPlace()`).
- **`src/rules/ship/`** — the ship, its weapon and its crew. `ship.ts` flies
  the ship by a frame's `Steer`, the keys' turn, a stick's heading or the
  mouse's aim, and a push (`flyShip()`): it turns, thrusts along its
  heading, coasts, keeps under its top speed, wraps, or dashes once its
  dash is ready again (`isDashReady()`, which the pod's rim, the deck's
  dash button and `dash-ready` all read, so they agree to the step), the
  rim's gauge and the deck's ring filling as it recharges
  (`rechargeShare()`). `shots.ts`
  fires the weapon in hand from the ship's nose and sweeps each shot as a
  segment against circles (`sweepShot()`), so however fast it flies it can't
  pass through a rock between two steps. `pilots.ts` keeps the `Crew`: the
  pilot at the controls (`atControls()`), the line in tow behind, which a
  stray caught or one knocked loose caught again joins at its end
  (`joinTow()`) and a hit knocks its last out of (`knockLoose()`), the
  crew aboard (`aboard()`, `pilotsAboard()`), every fuzzball gone home
  (`goHome()`), the pilot bailing out as the run ends (`bailOut()`), and
  the color each new pilot is given, the next in turn that no pilot aboard
  or on the field wears (`nextPilot()`).
  `tow.ts` keeps the line in tow behind the ship, a link made once for each
  of the most that ride (`createTow()`), laid straight out behind a ship as
  it comes (`layTow()`, `trailLink()` for one who joins its end) and pulled
  along a step at a time, each link to its length from the one ahead, the
  first from the hook at the ship's tail, the short way across the wrap
  (`stepTow()`), so it swings as the ship turns. Nothing hits a bubble in
  tow. How many ride at most is the field's `Towing` (`TUNED_TOWING`, as
  many as the line has links), past which a stray caught goes straight home
  (`hasRoomInTow()`, `joinLine()`).
- **`src/rules/rocks/`** — the rocks and what they let go. `rocks.ts` lays
  the rocks in slots made once, as many as the field's cap (`addRock()`),
  flies them (`stepRocks()`), and hits them (`hitRock()`), each holding or
  breaking into pieces of the size after its own; it holds `TRAIT_RULES`,
  what each trait of `src/rules/catalog/rocks.ts` does, typed so that a
  trait without its rule fails to compile, and sets off the blasts
  (`setOffBlasts()`, `hitWithin()`). `drops.ts` lets a pickup go from a
  broken rock (`dropFrom()`), always from a crystal, after a drought and
  otherwise by the wave's chance, drawn by weight from the wave's pool;
  `pickups.ts` floats the pickups, draws them in to the ship and has it
  catch them, and holds `EFFECT_RULES`, what each effect of
  `src/rules/catalog/pickups.ts` does as it starts and ends, one of each
  group in play at a time.
- **`src/rules/sparks/`** — the sparks, the pilot's static, the near
  misses and the zap. `sparks.ts` sheds a broken rock's sparks into slots
  made once (`shedSparks()`, `MOST_SPARKS`, the oldest's taken past them),
  its size's in `SPARKS_SHED` and its kind's `sheds` trait's more, only
  from one a shot or a blast broke; each flies out a little way and hangs
  for its life, blinking through its last second (`sparkBlinks()`), unless
  the ship draws it in, from the field's sparking's reach, farther at
  Relaxed, or the Magnet's (`drawReach()`), and the pod or a bubble in tow
  gathers it (`stepSparks()`), which scores it, logged `sparked` with who
  gathered it (`scoring.ts`'s `scoreSpark()`), and raises static; the
  clearing lets them all go (`clearSparks()`).
  `charge.ts` holds static on the field (`Field.charge`, its level and the
  step it holds from, the last spark's or near miss's, or the last hit's
  or zap's), how sparks, static and the zap work (`Sparking`, a value
  record the field holds, from `tuning.ts`'s `TUNED_SPARKING`: the spark's
  reach, static's most and its drain, and the zap's arcs and reach, the
  debug menu tuning the spark's reach, the drain and the zap's reach), its
  rise (`raiseStatic()`), its step (`stepOf()`, from 0 at ×1 to
  `FULL_STEP` once full, `isStaticFull()`) and its multiplier
  (`multiplierOf()`, `@fz/core/math`'s `multiplierAt()` over
  `STATIC_STEPS`); it drains after `STATIC_HOLD_MS` with no spark
  (`drainStatic()`), a hit knocks it to the foot of the step below
  (`knockStaticDown()`), a zap spends it (`spendStatic()`), and each step
  it comes to, rising or falling, is logged at the ship (`stepped`).
  `grazes.ts` counts the near misses (`countGrazes()`): a whole rock, or a
  comet with its middle on the field, that comes within `GRAZE_MARGIN` of
  the pod's hit circle, from clear, and draws off untouched is logged at
  the ship (`grazed`) and adds `GRAZE_STATIC`, once a pass, each rock's and
  comet's pass (`NearPass`) spent as it is laid or warned of and as the
  field is stretched (`spendPasses()`). `zap.ts` zaps (`zap()`): a dash
  begun at full static arcs from the pod to the sparking's `arcs` whole
  rocks nearest the path the dash flies (`DASH_PATH`), their edges within
  its `zapReach`, logged as `zapped` at the pod and `arced` at each rock,
  which takes a hit, and then spends `ZAP_COST` of static; with no rock in
  reach the dash is no zap.
- **`src/rules/hazards/`** — what crosses the field once, from an edge,
  without wrapping. `strays.ts` sends the stray fuzzballs, one at a time,
  which the ship catches by touching (`stepStrays()`), into the line in tow
  or, with it full, straight home, and `comets.ts` the comets, warned of at
  their edge, which break the rocks they meet a size down and hit a ship
  (`stepComets()`, `touchingComet()`); each says what a wave sends of it
  (`StraySetup`, `CometSetup`). `loose.ts` holds the crew knocked loose, a
  slot made once for each that can be (`createLoose()`): one a hit knocks
  out of the line flies off away from the ship (`knockLastLoose()`),
  slowing to a stray's drift and wrapping, drawn in by a Magnet, until the
  ship catches it again once it has swelled or its time runs out and it
  floats home (`stepLoose()`); the clearing takes them back
  (`takeAllBack()`), the run's end floats them home (`floatAllHome()`), and
  a run kept keeps them as gone home (`withLooseGoneHome()`). `crossing.ts` holds
  what the two share, a `Crossing`: coming in off an edge by a margin,
  heading across within a tilt (`comeIn()`), flying without wrapping
  (`fly()`), leaving (`hasLeft()`), and reaching what lies on the field only
  with its middle on it (`reaches()`).
- **`src/rules/run/`** — the run. `run.ts`: `Run`, a value each change
  replaces, from the wave it started at to its end: the wave in play, the
  points banked and the score, the crew, the strays brought home, the
  pilot's static as the wave in play started, which a cleared wave hands
  the next, and the outcome. Every wave waits, `"ready"`, until the
  player's first move starts it (`startWave()`), and a wave cleared goes on
  to the next, waiting so (`nextWave()`). No run is won: Endless goes on
  until a hit with no one in tow ends it. `catchUp()` takes what the wave's field has come
  to since it last looked, its points, its crew and its strays, then its end
  or its clearing, banked once; `waveSeed()` gives each wave's field a seed
  of its own, in `@fz/core/random`'s `mixSeed()`'s `"field"` stream;
  `wavesCleared()` counts the waves a run has cleared,
  `hasClearedAWave()` says whether it has cleared any, and
  `hasClearedAll()` whether it cleared every written one from the first. A
  move that doesn't fit where the run stands returns it as it is, and so does a
  field with nothing new, so the shell can tell a frame that changed the
  run. `describe.ts` puts what happened into the words the announcer says: a
  wave's start and its rocks, a stray drifting in, caught or brought
  straight home, one of the crew knocked loose, caught again or floating
  home, with how many ride in tow, a pickup caught, static coming to full,
  a zap, a clearing, a pause, going on, a run taken up and the end; and
  `whereLost()` says where an ended run was lost. The
  announcer, the bar, the cards, the result, the sectors and How to play
  all write points grouped in thousands, "4,250", with `@fz/core/format`'s
  `formatPoints()`.
  `progress.ts` says which sectors a run may start at (`isOpen()`): the
  first, and each a run has reached, at any speed, Endless among them once a
  run has cleared the last written wave; `sectorSpans()` gives each
  sector's first and last waves, and `readReached()` reads the ids stored,
  keeping those the game still has. `stats.ts` holds the records, each
  speed's runs, best score, furthest wave, strays brought home and whether a
  run has cleared all thirty, and each sector's best at each speed, each
  best with the rules' number it was made under (`RULES_VERSION`, 2 since
  static and the sparks; one kept without it was made under the first, but
  a speed's best of nothing):
  `readStats()` reads them as stored, keeping what makes sense and the bests
  of a sector the game still has, `recordsOf()` says what a change in a run
  brings to them and to the sectors reached (`RunRecords`), from the run
  before it to the run after: a run started, the strays brought home, its
  wave's sector, Endless and every written wave cleared, and its end;
  `withRecords()` moves them on by it, through `withRunStarted()`,
  `withRunEnded()`, `withStraysHome()` and `withClearedAll()`, and
  `isNewBest()` says whether a run's score beats the best under its rules,
  as a best made under earlier rules is no longer beaten: the next run to
  score takes its place; one made under later rules, a later build's, is
  kept. `saved_game.ts`
  turns a run under way and its field into what storage keeps
  (`saveGame()`), which the shell keeps under `SAVED_GAME_VERSION`, a run
  whose wave was just cleared as the next wave not yet begun, and back
  (`restoreGame()`), paused: the run read by `readRun()`, and its field by
  `src/rules/field/kept_field.ts`'s `readField()`, each dropping what fails
  one of its checks, each named and exported, such as a wave the game
  doesn't have under that number (`hasKnownWave()`), points or a crew that
  don't add up (`hasSoundScore()`, `hasSoundCrew()`), or a wave kept as not
  yet begun that is the one the run started at or has scored
  (`hasScored()`); and `takeUpField()` lays the field kept out afresh as the
  run started its wave, with what the run has scored on it (`waveSoFar()`).
- **`src/rules/waves/`** — the waves: a JSON file for each sector, its id,
  its name, its chance of a pickup and its ten waves, each written for a
  field of 40 by 40: its id and name, its rocks by kind, size and count,
  and, where it says, its formation, its pace, the kind its boulders break
  into, its chance of a pickup, its pickups, its strays and its comets:
  `inner-belt.json`, waves 1 to 10, `iron-reach.json`, 11 to 20, and
  `storm.json`, 21 to 30. `waves.ts` lists the sectors in order
  (`SECTORS`), numbers every wave from 1 (`WAVES`, through `wavesOf()`),
  finds one by its number, one of Endless's past the last (`waveEntryOf()`),
  and `parseWave()` turns one into a `Wave` to play, or throws an error that
  names what is wrong with its data, a key no wave has among it. Its spec
  holds every wave to parsing, ids in kebab-case and names of their own, a
  pace that never slows within a sector, and each sector to ten waves, a
  boulder in its last alone.
  `endless.ts` makes Endless's waves, from wave 31 (`ENDLESS_FROM`), from
  the run's seed and the wave's number, mixed in `mixSeed()`'s `"makeup"`
  stream, apart from its field's (`endlessWave()`), so a run kept
  makes its wave again from the two: a budget of rocks, a crystal among
  them, boulders every tenth wave and comets in every one, climbing until
  wave 60 and holding there. `waveToPlay()` gives a sector's wave or
  Endless's ready to play. The specs in `every_wave/` and
  `every_endless_wave/` hold every wave to being cleared by the autopilot,
  as Tests below says.
- **`src/rules/catalog/`** — what the game can hold, each a readonly object
  written `as const satisfies`, so its ids survive as a type: `rocks.ts`
  (`ROCK_KINDS`, each kind's hits and points at each size it comes in, what
  it breaks into, its speed and its traits; and `ROCK_SIZES`, boulder,
  large, medium and small), `pickups.ts` (`PICKUPS`, each pickup's weight,
  the first wave it may come in, `from`, and its effect, whose kind is its
  group) and `weapons.ts` (`WEAPONS`, the gun and the three a pickup hands
  the ship, each one's shots a pull, how far apart, how often, how many in
  flight and how many rocks a shot breaks). The rocks and the pickups have
  their ids in How to play's order and a function that returns an entry as
  the shape every entry has (`rockKind()`, `pickup()`). `catalog.spec.ts`
  holds every entry to the catalogs' rules, the waves to laying every kind
  of rock, and every pickup to coming in the wave it joins from.
- **`src/view/`** — what to draw and when the field moves on, without
  Phaser, tested in Node.
  `wave_play.ts` holds `WavePlay`, a wave in play, which `GameService`
  makes for each wave and drives: `@fz/core/field_play`'s `FieldPlay` over
  the rules' steps and clock, which keeps the frame the scene draws, the
  events it has handed on and the wait before a card opens, and hands the
  scene the run's seed, the place its sector is shown in and, in Endless,
  the constellation. `run_frames.ts`
  holds `RunFrames`, which `GameService` hands each frame of it: it plays
  the wave on, starting it at the player's first move, catches the run up
  with what its field came to, waits out the beat before a card, counts
  the Cleared card's sum up once it shows (`countMs`, the whole at once
  where motion isn't welcome), notes what the pilot at the controls
  answers, from the field's events, the rules' near misses among them, as
  the pod's painter does (`src/view/art/faces.ts`' `hearFace()`), afresh
  for each new field, and returns what the frame changed
  (`FrameChange`), the pilot's face and its fur's lift among it
  (`faceOf()`, `liftOf()`), and how the phone buzzes for it, as the ship
  takes a hit, or else as the wave is cleared, gathering what to say of it
  (`news()`), a clearing with the wave it goes on to, a run's end last,
  with what the shell's records say it set. `run_state.ts` holds what is a
  run's own, which the shell keeps in one signal (`RunState`): as a run
  begins (`newRunState()`), and with a frame's change taken in
  (`withFrame()`), the pilot at the controls at rest, its fur flat, until a
  frame says otherwise, flown on tuned numbers from the first frame that
  moves its field on them, the Cleared card's sum counted up while the card
  shows, to `TALLY_COUNT_MS`. `tally.ts` holds what the Cleared card
  shows: how a cleared wave's points add up a time after the card opens,
  each line counting up in turn and their total (`tallyShownAt()`), and
  the wave to come (`nextWaveWords()`); and `debug_tuning.ts` the numbers
  the debug menu tunes (`Feel`, `TUNING_SLIDERS`) and the lines of
  `src/rules/tuning.ts` they would replace (`tuningLines()`).
- **`src/view/field/`** — where the field and what lies on it are drawn, and
  what of it the scene reads. `field_metrics.ts` lays the field and the deck
  on the canvas: the field's shape for its room (`fieldShape()`), the room
  it fills (`fieldRoom()`), inside the margin the board keeps around it
  (`MARGIN_CSS_PX`), where it lies (`fieldMetrics()`), a unit whatever
  fraction of a device pixel its room makes, its edges on whole device
  pixels, through `@fz/phaser/layout`'s `roomInside()`, `framePixels()`
  and `cssRectOf()`, where the deck's zones lie (`deckLayout()`), and
  `toCanvas()` and `toField()` between the two; and how the scene laid them
  out, which it hands the shell (`FieldLayout`). `frame.ts` is what the
  scene reads: `FieldView`, the field it can't change, `FieldFrame`, whose
  events are `@fz/core/event_log`'s `EventLogView` and which names the
  wave's place, and where a thing that
  wraps is drawn between its last place and its next, the shortest way across
  the wrap (`wrappedBetween()`; one that crosses, as a comet or a stray, is
  drawn with `@fz/core/math`'s `lerp()`), its turn (`angleBetween()`),
  where the ship is drawn and turned (`shipAt()`), the kind and size of
  the rock an event names (`rockKindOf()`, `rockSizeOf()`), and the weapon
  a pull of fire names (`weaponOf()`). `layers.ts` is the order
  the field is drawn in, back to front, in one list (`LAYERS`), and the camera
  that draws each layer (`LAYER_CAMERAS`, `drawnBy()`). `tags.ts` says where
  the tags of the effects in play lie, at the field's bottom left, and how
  much of each one's time is left; `warning.ts` where a comet's warning is
  drawn; and `specks.ts` where the places' stars lie, in three depths, far,
  mid and bright, as many of each as the largest field holds, each depth
  from a stream of its own of the seed (`starsOf()`), and how many a field
  shows by its area (`starCount()`), and where an Endless wave's
  constellation lies, from the run's seed mixed with the wave's number in
  `mixSeed()`'s `"scenery"` stream (`constellationAt()`).
- **`src/view/places/`** — the place behind the play in each sector, ported
  from the uplift's kit (`docs/asteroid-breaker-uplift/art/lib/backdrop.mjs`),
  its landmark cut from the same draws, so it is the kit's to the facet.
  `places.ts` names the four (`PLACE_IDS`), shows a sector in its own, or a
  sector the game doesn't write of in the first (`placeOfSector()`), and
  lays one out on a field's size (`backdropOf()`): its far wash, its one
  landmark cut off by the field's edge, its air, its vignette and the tint
  its stars take, drawn from the place alone, so its landmark is the same
  every run, and its stars and its air from the run's seed. Each place is a
  file of its own, as plain marks in field units (`marks.ts`): the Inner
  belt's ringed planet low in the right corner (`inner_belt.ts`), the Iron
  reach's cratered moon in a broken ring of girders, with filings strewn
  along its field (`iron_reach.ts`), the Storm's thunderhead up the left
  side, with two forks of lightning inside it that flicker, and streaks of
  wind (`storm.ts`), and Endless's galaxy's band from corner to corner,
  under the wave's constellation (`endless.ts`); `globes.ts` cuts their
  globes, craters, rings and forks, lit from the field's upper left as the
  rocks are, along `rock_light.ts`' `LIGHT_ACROSS`. `colors.ts` mixes every mark from the palette's own colors and
  the game's inks, a little of one into the field, held to a limit for each
  kind of mark and the palette's mode (`LIMITS`), never a color of its own
  (`placeColors()`, `tintOf()`): in a dark palette a deep wash and pale
  specks, in a light one a pale wash and dark specks on white. `paint.ts`
  paints a place for a palette at the field's scale as `@fz/phaser/shapes`'
  paint commands in device pixels (`placeArt()`): what stays, opaque, the
  field's color, the wash and the far stars (`back`); the nearer stars,
  painted again past each edge they cross so they tile as the field wraps
  (`near`); the landmark, the air and the vignette (`front`), but, where
  the place flashes, what stands before its flickers apart (`over`): the
  landmark's billows and faces from the first after its first flicker on,
  the air and the vignette; and, for each flicker, its marks lit, over the
  area they reach (`flashes`, as many as `MOST_FLASHES` at most); every
  picture but the nearer stars reaches past each edge of the field as far
  as its camera kicks and shakes (`bleed`, `BLEED_CSS_PX`), so it never
  shows past them. `placeLayers()` gives each
  layer apart, from the field's corner. `motion.ts` says what of it moves,
  from what the field hands it, never a clock: how far into a flicker a
  mark is by the field's steps (`flickerAt()`), how far the pod has flown,
  unwrapped (`Travel`), and how far the nearer stars slide against it, 3% of
  it (`nearSlide()`, `NEAR_SLIDE`). `quiet.spec.ts` holds each place's
  largest shape within 1.3 to 1 of the field in every palette.
- **`src/view/effects/`** — what each event calls for, and how it moves.
  `effects.ts` says which flourishes each event calls for, with motion and
  without (`effectsOf()`); `sounds.ts` every sound of the sprite, the plan's
  but the beds, by name, each with its family, level, takes and whether it
  is tuned, its family's (`SOUNDS`, the mix the scene hands its player, and
  `SoundTake`, a take's name in the sprite), which sound each event plays
  (`soundOf()`), a rock's break by its kind and size, a catch by its pickup,
  a pull of fire by its weapon, static rising to a step by the multiplier's
  chime it reaches or full's (`static-full`), and falling to one by its fall
  (`static-down`), a spark gathered `spark`, a near miss `near-miss`, a zap
  `zap-dash` and each of its arcs `zap-arc`, and the one after it, where it
  has one (`secondSoundOf()`: the line snapping as one is knocked loose),
  the ladder (`CHAIN_CENTS`, the kit's, copied, and `ladderCentsOf()`) and
  the note of it a break's bell rings at for static's multiplier it scored
  at (`bellCentsOf()`), what an effect plays as a pickup caught starts it
  (`startSoundOf()`: the Shield raised, the field slowing) and as its time
  runs out (`endSoundOf()`), the volume each plays at (`volumeOf()`: the
  Rapid's shot 3 dB under the gun's, and the fuzzball's calls 3 dB down),
  and the order a frame plays them in, the loudest level first
  (`PLAY_ORDER`); the thrust's hum (`THRUST`) and the lodestone's
  (`LODESTONE_HUM`) are among them, held rather than played, and so is each
  sound nothing calls for yet. `field_sounds.ts`' `FieldSounds` gathers a
  frame's: each event's sounds, where it happened across the field
  (`@fz/core/sound_mix`'s `acrossOf()`), a bell at the highest of static's
  multipliers the frame's breaks scored at, more than three breaks a frame
  as the largest two and `break-cluster`, each spark gathered the next note
  of the ladder, an octave under the bell's, in a run of sparks each within
  static's hold of the last, in the field's steps (`SPARK_RUN_STEPS`), which
  a fall of static or a new field ends, a zap in place of the dash that set
  it off, and what the field's state says by how it changed since the frame
  before (fire let go just after a burst, `shot-tail`; and at the ship the
  thrust pressed and let go, `thrust-start` and `thrust-stop`, the player's
  first move, `wave-start`, the dash ready again, `dash-ready`, by
  `isDashReady()`, a guard longer than a dash's over, `guard-end`
  (`DASH_GUARD_STEPS`), and an effect started or run out; and a comet come
  in, its warning over, `comet-pass`, where it comes in), and the fuzzball's
  call; then plays each once, at the most it rose, the loudest first, making
  nothing; and `hasLodestone()`, beside it, says whether a lodestone is on
  the field, which its hum is held for. `voice.ts`' `Voice` is the
  fuzzball's voice: the call each event calls for (`callOf()`: a dash a
  whee, a wave cleared a cheer, one knocked loose an ouch, one caught a yay,
  a stray's arrival an ooh, a near miss an eep, and one floating home or the
  run's end an aww), at one dash in three (`DASHES_A_CALL`), the rarest of a
  frame's (`CALLS_RAREST_FIRST`), where its event happened, and at most once
  in four seconds of the field's steps (`PATIENCE_MS`), a call due before
  then dropped, its patience afresh on each new field. `beds.ts` names the
  beds and the layers over them, by their files' names (`BED_NAMES`), the
  bed each place plays (`bedOf()`), which play under a place at a multiplier
  (`bedPlays()`): the place's bed always, the pulse from ×3 and the shimmer
  over it from ×4, and which are fetched ahead of a place's waves
  (`bedsAhead()`): its bed and both layers. `flourish.ts` says how each
  flourish moves over its time, beside `@fz/core/math`'s `shareDone()` and
  its curves (`easeOutCubic()`, `fadeAlpha()`), among them how far the kick
  and the shake scroll the field's camera (`cameraShift()`) and when a dash
  lays each of its outlines (`trailOutlinesLaid()`), and how the pickups
  breathe, a stray bobs, a comet's warning pulses and the pod's exhaust
  streams (`exhaustDue()`), each only where motion is welcome; `timing.ts`
  how long each flourish lasts and how long the cards wait
  (`clearedDelayMs()`, `resultDelayMs()`); and `haptics.ts` how the phone
  buzzes as the ship takes a hit or a wave is cleared (`LOST_BUZZ`,
  `CLEARED_BUZZ`).
- **`src/view/steering/`** — the player's hands. `controls.ts` holds the
  keys held to fly, by `event.code` (`heldKeyOf()`), and reads what the
  run's keys ask from `@fz/core/run`'s `RUN_KEYS` (`commandOfKey()`);
  `steering.ts` the `Steering` that turns the keys held (`@fz/core/keys`'s
  `HeldKeys`), the mouse and up to three fingers (`MOST_FINGERS`) into each
  frame's `Steer`; `stick.ts` the deck's `Stick`, which follows the one
  finger on it; and `deck.ts` where the stick, Fire and Dash lie in the
  deck's zones (`deckOf()`) and which button a finger presses
  (`buttonAt()`).
- **`src/view/colors/`** — the field's colors. `palette.ts` takes them from
  the palette's roles (`beltPalette()`), the page's among them and the
  palette's mode, which the places are mixed by, with the inks of `inks.ts`, the
  game's own for each kind of rock, in light palettes and in dark, and the
  eight pilots' from `@fz/phaser/color`'s `FUZZBALL_INKS`, and gives a
  pilot's ink to the shell too, in CSS hex (`pilotInk()`), with each kind
  of rock's tones (`rockTones`) and the light of the palette's mode
  (`rockLight`). `tones.ts`
  mixes the four tones of an ink a rock's marks are drawn in, lit, its
  own, shaded and deep, with white and the palette's field or its text
  (`tonesOf()`), each channel rounded as the art kit rounds it
  (`mixTone()`). `rock_light.ts` holds the light the rocks are lit by, far
  off to the upper left, along the way the places' landmarks are lit too
  (`LIGHT_ACROSS`), high in a light palette and low in a dark one,
  each leaving a face toward the viewer in its own ink (`ROCK_LIGHTS`,
  `lightAt()`); what it makes of an ink, at a rock's darkest face and its
  brightest (`inLight()`, `faceExtremes()`); where the scene stands it,
  as WebGL lights from a point (`farLight()`); and the light of a held
  hit's flash (`STRUCK_LIGHT`). `contrast.spec.ts` holds each kind of
  rock's ink, and its darkest and brightest faces under the palette's
  light, the pod, its hull's and its trim's darkest and brightest faces,
  the pickups, the comet, the shots, the flame and a stray's bubble's rim
  to 3:1 against the field in every palette, the outline against
  everything it outlines, the marks against every rock and every face, a
  pickup's symbol against the pickup, each pilot against the field, the
  pod's glass and its shade, a stray's bubble and the bar, the eyes
  against each pilot, and the deck's knob and its buttons' symbols
  against the deck.
- **`src/view/art/`** — the atlases' frames. `art.ts` draws every frame of
  the field's atlas (`atlasFrames()`) as plain commands in device pixels, at
  its unit rounded down to whole device pixels, 32 at most (`bakedScale()`),
  the deck's frames apart (`deckFrames()`), gathers the rocks' atlas's,
  the rocks' and then the pod's hull (`litFrames()`), and names the frames
  How to play's pictures but the rocks' are taken from (`PICTURE_FRAMES`);
  `rock_art.ts` draws the rocks' own atlas: each kind
  in each size it comes in and six outlines (`ROCK_OUTLINES`), cut in
  facets as `rocks/` cuts it (`rockShape()`), whole and with the cracks of
  each count of hits it can take and hold, in the palette's marks, its
  fine marks only where the field, as laid out, has 10 CSS pixels a unit
  or more (`isFine()`), each frame twice, in its tones' inks and as its
  normal map, each facet in the color of the way it faces, and each
  crack's two lips, which only the normal map draws, sloping into it
  (`rockFrames()`, a `LitFrame`), and How to play's picture of each kind,
  its largest whole, each facet in its ink as the palette's light falls on
  it, in SVG (`rockPictures()`); `breaks.ts` how a rock breaks and a held
  hit sparks, ported from the art kit's `makeBreak()`, `breakFx()` and
  `heldHitFx()`: each outline's break made once from its seed, the one its
  outline is cut from (`breakOf()`, a `Break`), its own facets as the
  shards that fly, as they are, as ice's slivers or as iron's plates, a
  few spread round it flying the whole time and the rest gone in a few
  frames, its sparks, its dust's puffs and an ice or crystal's glints; and
  where each piece is drawn a time after the break, in device pixels from
  its middle, written into a record the scene keeps: the rock whole and
  flashing for its first 30 ms (`wholeAt()`), each shard flying out along
  its way and the blow's (`shardPushOf()`), tumbling, shrinking, lit as the
  shader would light its facet and fading into the field's color
  (`shardAt()`), the dust's ring and puffs (`dustAt()`, `puffAt()`), the
  sparks (`sparkAt()`, in `energyOf()`'s tones) and the glints
  (`glintAt()`), all of it gone by `BREAK_MS`, 450 ms, and never farther
  from its middle than its `reach`; a held hit's sparks thrown back about
  the way the shot came from its rock's rim (`impactOf()`,
  `impactTickAt()`, `impactFlashAt()`, `rimToward()`, `towardShip()`),
  gone by `HELD_MS` and within `HELD_REACH`; and the polygons a round of
  dust is drawn as, as few corners as its size spares (`roundOf()`);
  `pod_art.ts` the pod, as the art kit's `ship.mjs` draws it: its hull,
  cut in facets as a rock is and baked into the rocks' atlas, lit, with
  its normal map (`podHullFrame()`), and its other frames in the field's
  (`podFrames()`): the canopy's glass, sized to hold its pilot
  (`PILOT_SIZE`), the rim, its gauge filling as the dash recharges
  (`gaugeFrame()`) and its flash as it comes charged (`rimFlashAlpha()`,
  `rimFlashScale()`), the glint, the Shield's wash and shell, the guard's
  dashed ring, a dash's streaks and ghosts, and the flame behind each
  engine, flickering through its frames by the field's steps
  (`flameFrame()`, `flameFlickerAt()`), its fine marks only where the
  field's unit makes them show (`isFine()`), and the exhaust's puffs, their
  colors, how they swell and fade (`puffColors()`, `puffRadius()`,
  `puffAlpha()`); `pilot_art.ts` the pilots, each `@fz/phaser/fuzzball`'s
  fuzzball, in white for the scene to tint in its ink, upright in the
  pod's canopy or adrift: the pod's pilot's fur at each lift of static
  and each push it leans from (`furFrame()`), static's sparks on end
  (`sparksFrames()`), a pilot adrift's fur and its fright
  (`ADRIFT_FRAMES`), and each seat's eyes at each face (`eyesFrame()`),
  moved the way it looks (`eyesShift()`);
  `faces.ts` the face the pilot at the controls shows as the field stands,
  as the art kit's `FACE_USES` says (`faceOf()`), from the pod's state and
  the steps at which what it answers last happened (`FaceMoments`), noted
  from the field's events, the rules' near misses (`grazed`) among them
  (`hearFace()`), a stray adrift's (`adriftFaceOf()`), each blinking now
  and then by the field's steps (`isBlinking()`), where the pilot looks,
  at the nearest rock or comet or the way the pod points (`lookOf()`),
  how far its fur lifts with static, a step a multiplier (`liftOf()`), and the push it
  leans from, eased so it lags a thrust (`pushOf()`, `easeLean()`);
  `symbols.ts` each pickup's symbol and each button's (`SYMBOLS`); they are
  drawn in `@fz/phaser/shapes`'s commands (`DrawCommand`), with its
  builders, curves and transforms, and `shapes.ts` holds the game's own
  helpers over them: the scale the atlas is baked at, the outline's width,
  the dashed rings and the outlines grown outward (`outward()`). Each piece
  that wraps says how far its frame reaches from its middle (`SHOT_REACH`,
  `PICKUP_REACH`, `ROCK_REACH`, `POD_REACH`), its own
  extent and its outline at the widest a line gets (`MOST_LINE`), a rock's
  and the pod's mitred out at a sharp corner as far as an outline may
  reach (`MOST_MITER`), and the pod's covering its rings too, which the
  scene draws its copies past the edges by, and its spec holds what it
  draws within it. `points_art.ts` letters the points scored instead, in the
  page's font, from what a canvas measures of it (`letterPoints()`), at the
  field's unit rounded down to whole device pixels, with no cap
  (`letteringUnit()`): each character but the space a frame filled in the
  shots' color and one outlined in the field's, at each quarter of a pixel a
  canvas sets a pen at, packed into an atlas of their own (`packPoints()`);
  where a label's characters are stamped from them, as a `Text` sets a line
  (`layOutPoints()`); and the sheet the labels are stamped on, a room each
  (`pointsSheet()`).
- **`src/view/art/rocks/`** — the rocks' geometry, cut from a seed, ported
  from the art kit's `docs/asteroid-breaker-uplift/art/lib/rocks.mjs` on
  `@fz/core/random`'s `createRandom()`, which draws as the kit's
  `seeded()`, so a rock is the kit's, in shares of its
  radius about its middle. `rock_shape.ts` cuts a rock of a kind and size
  from a seed (`makeRock()`, a `RockShape`): its outline, its rim, its
  facets back to front, each facing a way (`Facet`), and its marks, the
  lines, dots, glows and aura each kind adds, from how each kind is cut
  at each size it comes in (`cutOf()`); `cut.ts` the dome every kind is
  cut as, rings of corners rising to a peak or a flat top, joined in
  triangles (`dome()`, `strip()`), a stone's dents (`dent()`) and a
  crystal's gems (`prism()`); `cracks.ts` the cracks a rock shows for the
  hits it has held, one and a branch a hit, the same every time
  (`cracksOf()`); `light.ts` how brightly a light far off falls on a
  facet, as WebGL's lighting lights it (`litBy()`, `RockLight`), and the
  color a normal map holds for the way a facet faces (`normalColor()`);
  and `space.ts` the arithmetic they share. Each spec holds its part to
  the kit's numbers, copied into it to four places: one rock of each
  kind whole, and every other size in brief.
- **`src/scene/`** — the Phaser scene. `BeltScene` (`belt_scene.ts`, made
  by `makeBeltScene()`) is handed plain functions over the game
  (`BeltSceneOptions`), the font the points are written in among them, a
  new record of it as the page loads its face late: each frame it hands
  the game the time and the steering its `Steering` read from the keys, the
  mouse and the fingers, reads the frame and the palette, and has its
  painters, in `src/scene/painters/`, draw, each in its layer of `LAYERS`:
  `PlacePainter` the wave's place behind the field, its pictures painted
  into canvas textures with `@fz/phaser/scene`'s `paintTexture()` only for
  a new place, palette, field size, unit, pixel ratio, run or
  constellation, the back, the front and what stands before the flashes
  laid with their bleed past the field's edges, the nearer stars nine
  copies of their picture, three across and three down, laid as far as
  they slid against the pod's travel, so they cover the field and its
  bleed, each flash shown as strongly as its flicker is at the field's
  step, under what stands before it, and nothing moving where motion isn't
  welcome, `FieldPainter` the frame,
  `TagPainter` the tags of the effects in play, `RockPainter` the rocks,
  lit, each in the frame of the hits it has taken, and a held hit's flash,
  a light at its rock's edge toward the ship that lights the faces struck,
  and another where that edge shows past the field's own,
  `PickupPainter` the pickups,
  `StrayPainter` the stray adrift, pleading, and a lost pod's pilot
  bailing out, wide eyed, `HazardPainter` the comets and their warnings,
  `ShotPainter` the shots, `PodPainter` the pod, its flame, its pilot, its
  face as the field shows it, which it hears the field's events for
  (`hear()`), and its rings, `TrailPainter` a dash's trail of the pod's
  ghosts, `ExhaustPainter` the exhaust, a puff from each engine in turn,
  `DebrisPainter` each rock's break, from the view's `breaks.ts`: its
  dust, the rock whole and flashing and its own facets as shards, in its
  layer under the rocks (`breaks`), so none hides a piece it leaves, filled
  in triangles on two `Graphics` drawn again each frame, the dust's under
  the shards', its rounds as polygons of as few corners as their size
  spares rather than `Graphics`' circles, which take a hundred corners
  each, and its sparks and glints and each held hit's spark over all that
  moves, under the rings; each piece is worked out once and drawn about
  the break and each copy of it past an edge it reaches across; it finds
  the outline and the turn a broken rock was drawn in from its slot, or,
  once a piece has taken that, from what it last drew there; it throws a
  lost pod's burst of shards too, as particles; `RingPainter` the
  rings, `PointsPainter` the points scored, each label stamped once on a
  room of a sheet (a `DynamicTexture`), every outline and then every fill,
  as a canvas writes a line, and shown and faded as one image, and
  `DeckPainter` the deck.
  `FieldCamera` (`field_camera.ts`) points the field's camera at the field,
  fills it with the field's color and scrolls it as the field kicks and
  shakes, the one place its scroll is written. Each of them is a `Painter`
  (`painters/painter.ts`), which draws from the one `PaintContext` the scene
  writes over each frame, where the ship is drawn among it, and which holds
  the steering the deck shows, set once; and starts on each new field
  (`start()`), so the scene draws and starts them in a loop over its list
  of painters. After a bake, `@fz/phaser/scene`'s `retakeFrames()` has
  every image on either atlas take up its frame anew. The scene's painters,
  cameras and sounds are made once, as it is created, and read through its
  `kit` (`BeltKit`). A thing that wraps is
  drawn through `Copies` (`painters/copies.ts`), once, and again past each
  edge it reaches across; a flourish's records are taken in turn
  (`@fz/core/turns`'s `Turns`). Every game object is made as the scene is
  created, or as a field of more slots starts, so a frame of play makes
  none, and a new field stops what the last one set off.
  The scene plays each of the field's events once, from the last it played,
  and the flourishes an event calls for only where motion is welcome, each
  through `FlourishPlayer` (`flourish_player.ts`), which plays it on the
  painter that draws it, or on `FieldCamera`, from the context the scene
  wrote for the frame; `flourish_player.spec.ts` holds what each flourish
  plays, and `flourishes.spec.ts` what the scene draws for each event.
  `atlas.ts` bakes the view's art with `@fz/phaser/scene`'s `bakeAtlas()` and
  `atlasFrameOf()` into three atlases: the field's and the rocks', again on
  a new palette, a new pixel ratio, as the field's unit passes a whole
  device pixel, which the scene zooms the rest of the way, so a window
  dragged to another size bakes it once a device pixel rather than once a
  frame, or as it passes 10 CSS pixels, where the rocks' and the pod's
  fine marks come or go (`isFine()`, of the field's unit, not the
  atlas's), the rocks' with the pod's hull among them, and the deck's,
  white for the scene to tint, again on a new pixel ratio. The rocks'
  normal map is baked beside theirs, packed alike (`ROCK_NORMALS`), and
  the rocks' atlas (`ROCK_ATLAS`) reads it as its normal map
  (`setDataSource()`), set again at each bake; Phaser destroys a texture's
  normal map with it, so the two keys go together or not at all. The
  scene lights the rocks with Phaser's lights, which it turns on as it is
  created: the palette's light as a point far off its way
  (`farLight()`), over its ambient, set again at each layout and bake,
  and a held hit's flash; each rock's image, and the pod's hull's, is
  drawn with `setLighting(true)`. Phaser lights an image by the ten lights nearest the
  camera's middle at most (`maxLights`), so a light far off is dropped
  first once eleven are lit. At each bake the
  scene hands the shell (`onPictures()`) what returns How to play's
  pictures only as the board first asks for them, as How to play opens,
  and keeps them until the next bake: the field's encoded from its atlas
  by `@fz/phaser/scene`'s `picturesWhenAsked()`, and the rocks' drawn lit
  by the view's `rockPictures()`. `PointsAtlas`
  (`points_atlas.ts`) letters the points into an atlas of their own,
  written with a canvas's own `fillText()` and `strokeText()`, at the
  field's whole unit past the field's cap, so they stay sharp on a large
  field, again on a new palette, a new font, or as the field's unit passes
  a whole device pixel, and after a lost context, each time through
  `@fz/phaser/scene`'s `drawCanvasTexture()`, which uploads the atlas once,
  written.
  `@fz/phaser/sound`'s `SpritePlayer` plays each event's sound from the
  uplift's sprite in `sounds/`, as Ogg Vorbis, `sprite.ogg`, or, where the
  browser plays no Ogg, as Safari doesn't, M4A, `sprite.m4a`, the first the
  browser plays loaded, by its map, `sprite.json`, which the scene types by
  the view's takes (`SoundTake`), so a take the map lacks fails to compile;
  it plays by the view's mix (`SOUNDS`), each sound's takes in turn, a busy
  noisy one varied, the voices held to the mix's limits and the busy levels
  ducked under a huge one, through a limiter; each frame's sounds as the
  view's `FieldSounds` gathers them, each risen, placed across the field
  and at its volume as the view says, through the player's `playAt()`; holds
  the thrust's hum while the ship thrusts and the lodestone's while a
  lodestone is on the field, as the game says (`thrusting()`,
  `lodestoneHums()`); and mutes the game while the settings want none. Beside
  the sprite lie each take's length (`sprite_lengths.json`), which
  `yarn build:sounds` writes with it, and the beds, in `sounds/beds/`, each
  as Ogg and M4A, which `@fz/phaser/sound`'s `LayerPlayer` plays (the kit's
  `beds`): once the scene's first frame is drawn and the sprite has
  loaded, never before, so their files hold up neither the first wave's
  picture nor its sounds, and while the player wants sound, the bed of the
  place the wave is played in, and the layers over it the multiplier has
  reached (`multiplier()`), held each frame, by the view's `bedPlays()`, on
  one bar line, each fading in and out over two seconds, so a new sector's
  crosses into the last one's; and it fetches ahead the bed of the place
  the wave after is played in (`placeAfter()`) and both layers, so neither
  the crossing nor a layer waits for a download.
  The keys go back through `command()`, heard through `@fz/phaser/scene`'s
  `onKeyDown()` and `onKeyUp()`, which hand over each key event once, and
  every key and finger held is let go as the player looks away
  (`onPlayerAway()`).
- **`src/app/`** — the shell, one folder per feature, as in Brick Breaker.
  `app.component` lays the board in the room beside the bar, with the
  `<fz-announcer>` the game is announced through, the dialogs, and the
  question before a run is thrown away; through `@fz/game-ui/play_room`, it
  hands the board the focus as each run begins and whenever the last dialog
  closes (`refocusWhenUncovered()`), and pauses the wave in play when
  `[fzPlayRoom]` says the player looked away.
  - `play/` — `GameService` holds the run and what is its own, its static's
    multiplier and step, the face and the lift of the pilot at the controls
    (`face`, `lift`), its cards and what it set, in one signal (the view's
    `RunState`), replaced
    whole as a run begins or is taken up, so nothing of one run reaches the
    next, and the wave in play outside one, as the view's `WavePlay`, since the
    field changes 120 times a second; it moves the field on through `tick()`,
    which the scene's frames drive, steered as the player steers, taking what
    the view's `RunFrames` says each frame changed into the run's state
    (`withFrame()`) and the records; it pauses, goes on and starts waves and
    runs, shapes each field to the board's room (`setRoom()`), says what
    happened through `@fz/ui/announcer`, buzzes the phone as each frame
    calls for through `HapticsService`, beside it, where the browser can and
    the settings say to, shows a cleared wave's points (`tally`, counted up
    as `tallyMs` says) and the wave after it (`waveAfter`, played in
    `placeAfter`), and the card over a wave waiting at the start of the run
    or of a sector (`sectorCard`), keeps what each change in the run brings
    to the records and the sectors reached (`recordsOf()`) through `stats/`,
    in one place that keeps none of a run flown on tuned numbers, and has
    the wave in play take the numbers the debug menu tunes as `TUNING` tells
    it of them. It extends `@fz/game-ui/run_lifecycle`'s `RunLifecycle`, which
    holds what every game's run does around its play: the keys' `command()`,
    going on to the next wave as `go` asks (its `nextStage()`), the drawn gate
    (`setDrawn()`), the runs begun (`runs`, raised as each run begins) and
    the question, through `@fz/ui/confirm`, before a run is lost.
    One card lies between waves, the Cleared card, and one press goes on
    from it: Next wave or Enter lays the next wave out waiting for its first
    move with no card over it, and a flight key or a press on the field does
    the same and is that first move, as the wave takes what was held as the
    last frame was handed over as held. A wave at the start of the run, or
    of a sector the run goes on to, waits under the sector's card until the
    first move, and a key or a press that laid it out, starting the run,
    going on to the sector or going on with a run taken up there, is no
    move there: the service minds a key or a press (its `go()`) until the
    next frame, which lays such a wave out again with what it holds, so the
    card shows until a fresh one. `sector_card.ts` holds the card's words
    (`sectorCardOf()`): what it opens, "A new run" or "A new sector", the
    sector's name, its waves (`wavesInWords()`, which the Sectors dialog
    says them in too), what is new there, a sentence or two for each of the
    game's sectors by its id (`SECTOR_NEWS`), and the wave; and what the
    announcer says of it (`describeSector()`), with the wave and that it
    starts when the player flies, as each run begins, at the page's first
    too, as the run goes on into a sector, and as a run taken up there goes
    on.
    `src/app/tokens.ts` holds the waves (`GAME_WAVES`), which a spec hands
    it instead of the game's own, as it does the seeds through
    `@fz/game-ui/random`'s `GAME_RANDOM`, and `TUNING`, the numbers the debug
    menu tunes: one `createTuning()` of `TUNED` from
    `@fz/game-ui/debug_menu`, made at the root, which the drawer and
    `GameService` share. `SavedGameService`
    keeps the run under way, through `GameService.saved()`, as its outcome or
    its crew changes and as the page is hidden or goes away, never at a step,
    and forgets it once the run ends or another begins; `src/main.ts` starts
    it before the board first shows, and it takes up the run kept
    (`takeUp()`), paused.
  - `board/` — `<fz-phaser-canvas>` with the scene, loaded with `import()`
    as the page loads the face the points are written in, in the board's
    font (`document.fonts.load()`), for 1.5 s at most
    (`POINTS_FACE_WAIT_MS`), so the scene first letters them in it, and has
    the scene letter them again should the face come later, while the board
    is there;
    the empty field drawn in CSS until the scene has drawn, clear of the
    deck's room; the focus ring; a crosshair for the pointer while a ship
    flies, as the mouse aims it; and the cards, `<app-board-card>`, which
    the board tells how the ship flies, each bound to a view model the card
    computes, by its kind: the sector's, at the top of the field, clear of
    the ship waiting in its middle, while a wave waits for its first move at
    the start of the run or of a sector, with what it opens, the sector's
    name and waves, what is new there and the wave, "starts when you fly",
    and how to fly at the run's start; Paused, with the score and the strays
    waiting at home; Cleared, with how the wave's points added up, counting
    up line by line where motion is welcome and whole at once where it
    isn't, their total, the crew, the next wave by its number and name,
    Next wave and "or just start flying", and a trophy over the last
    sector's last; Ended, once an ended run's result is put away; and none
    over a wave gone on to within a sector, waiting for its first move; and,
    in their place, the canvas's own, which the board hands it
    (`@fz/phaser/canvas`'s `<fz-canvas-cards>`):
    still loading, which a status region in the page from the start says to
    a screen reader, and couldn't be drawn. The board is Phaser's keyboard
    target, so the cards' buttons keep their keys from it
    (`@fz/phaser/canvas`'s `fzKeepKeys`); Resume and Next wave hand the
    board back the focus (`handBack`). It measures the canvas it makes, as the host sizes it, at
    the ratio the host renders it at, as it is first drawn and as its size,
    the zoom or the display changes (`@fz/phaser/canvas`'s `canvasRoom()`),
    and hands the game that room until the scene lays the field out
    (`GameService.setRoom()`), so the waiting wave is shaped for the scene's
    canvas from the start, above 2× on a large window too, and again as the
    zoom changes until then; and it publishes, for the layout check, what the
    scene hands it as it lays the field out (`FieldLayout`): where it laid the
    field (`data-field`), the room it fills (`data-room`) and the deck's zones
    (`data-deck`), written with `@fz/phaser/layout`'s `rectAttribute()` and
    `namedRectsAttribute()`, which the layout check reads back with
    `@fz/dev`'s `readRect()` and `readNamedRects()`; the board's spec reads
    the field's with `readRect()`. `fieldPalette()` colors the field from
    the roles `field_roles.ts` names (`FIELD_ROLES`), through
    `ThemeService`'s `roles()`, and its `mode`. The board asks the scene for
    How to play's pictures as How to play opens (`pictures`), and keeps them
    until the scene bakes again. It is an application named for its wave,
    "Asteroid Breaker, wave 4: Thaw".
  - `bar/` — `@fz/game-ui`'s game bar: the link home, the page's `<h1>`, the
    speed's badge, whose menu asks before it starts a run at another, the
    figures, and Pause, Sound, Sectors, New game, How to play and Settings,
    all but Pause in the overflow menu on a compact screen. The ships'
    figure leads with the face cam, the pilot at the controls, and
    static's says how many times what is scored scores, as "×2" and four
    pips, one lit for each time, which only the "×2" says to a screen
    reader. Where it has room, the figures are the wave, the score, the
    ships, the line in tow beside the face cam, and static, each a card;
    else the score, the ships and static, the ships a number on the face
    cam, in one card across the bar, the face cam beside the score over
    static, as a score runs to six figures, or stacked on a rail.
    Pause and Sound are `@fz/game-ui`'s (`fzBarPause`, `fzBarSound`), which
    keep the focus on the board when pressed with a mouse or a finger. It
    hands the board back the focus as Resume goes on, and asks the app for
    the sectors, How to play and the settings.
  - `sectors/` — the Sectors dialog: each sector as a button, with its name,
    its waves ("Waves 1 to 10", or "From wave 31" for Endless) and its best
    at the speed in play, or "Locked", and the run's own marked
    `aria-current`. A sector not yet reached is `aria-disabled`, and can't
    be chosen. Choosing an open one starts a run at its first wave, asking
    first if one is under way, and closes once it has.
  - `result/` — the card over an ended run, once the last ship's burst has
    faded: the wave it was lost on and at what speed, the score and the best
    at its speed, with "New best" and the trophy when it set one and
    "Cleared all thirty" when it cleared every written wave, the wave
    reached and the waves cleared (`wavesCleared()`), and the fuzzballs it
    brought home, each in its color; Try again from the sector the run
    started in; Choose a sector, which puts it away and asks the app for the
    sectors; and Close.
  - `help/` — How to play: the aim, the scoring from `tuning.ts`'s numbers,
    the multiplier's ladder worded by `@fz/core/format`'s `tierWords()`,
    dashing, pausing, the controls by mouse, touch and keyboard, and every
    kind of rock and pickup from the catalogs, a stray and the comet, each
    with its name, its sentence and, once the scene has drawn, its picture,
    which the app asks the board for only while How to play is open.
  - `settings/` — the settings drawer (the speed, when the deck shows, which
    side holds its stick, whether the ship fires by itself, haptics, the sound
    and the palette), `SPEED_CHOICES`, the speeds as the drawer and the bar
    both offer them, and `SettingsService`, which keeps what the player chose,
    the speed of the last run started among it. Where
    `@fz/game-ui/debug_menu`'s `DEBUG_MENU` says so, in a development build
    and in a production one whose address has `?debug`, the drawer also
    offers that entry's debug menu, `<fz-debug-tuning>`, below the rest: a
    slider for each number of the ship's flight, its gunnery, the rocks'
    speed, the spark's reach, static's drain and the zap's reach
    (`TUNING_SLIDERS`), whether shots carry the ship's speed, which the
    drawer projects into it, Reset the numbers, and Copy the numbers, the
    lines of `tuning.ts` they would replace. `TUNING`, which the drawer reads
    and writes, holds them, says whether they are off `tuning.ts`'s
    (`retuned`) and tells `GameService` of each tuning as it is made
    (`onTune()`), which gives them to the field in play and every one after
    it; nothing keeps them, and a run flown on them keeps no records.
  - `pilot/` — `<app-pilot>`, a pilot drawn as the fuzzball it is, from
    `@fz/ui/fuzzball`, in its ink in the palette on the page (`pilotInk()`),
    at rest unless given another face, its fur lifted by static's step,
    and `<app-pilot-row>`, pilots in a row, which the bar, the Paused and
    Cleared cards and the result draw.
  - `face_cam/` — `<app-face-cam>`, the face cam, which the bar draws: the
    pilot at the controls behind the canopy's glass, larger than the field
    can draw it, with the face and the fur the field shows
    (`GameService.face()` and `lift()`), the glass, its rim and the rim's
    third toward the light in the pod's colors in the palette on the page
    (the view's `podTones()`), and a glint, as the art kit's face cam draws
    it, sized so the fur on end and
    its sparks reach the rim; the glass empty once no one is at the
    controls. Nothing in it moves of its own, so its face changes as the
    field's does, a blink only where motion is welcome, and it is hidden
    from assistive technology.
  - `stats/` — the records: `StatsService`, which holds and stores what
    `src/rules/run/stats.ts` reads and moves on, and `ProgressService`, the
    sectors reached, at any speed, which a run may start at; each keeps its
    part of what a change in a run brings (`record()`).
  - `styles/` — `global.scss`, loaded once from `src/main.ts`, and
    `_index.scss`, the toolkit the component stylesheets `@use`, which
    emits no CSS.

  A new feature gets a folder of its own, named for what it does, never for
  the kind of code in it.

- **`src/testing/`** — what the specs share, and what the scripts in
  `tools/` load through Vite: fields from pictures, the atlas in one
  palette, the autopilot, the scene run on a fake shell, the canvases a
  board makes, the palette's roles, the shell's small waves, a run under
  way for the saved game's specs and the run the screenshots keep, as Tests
  below says. The app's tsconfig leaves it out, and lint lets it take
  Angular by type alone, but for what the scripts load (`SCRIPT_HELPERS`),
  which `phaserGameLayers()` holds to the rules' fence and keeps off the
  clock as it does the rules (`heldAsRules`), flagging a file of
  `src/testing/` they import off that list.
- **`tools/`** — the scripts run from the workspace. `build-sounds.mjs`
  builds the sounds from their recipes in `tools/sounds/`;
  `report-waves.mjs` reports how the autopilot plays every wave;
  `check-layout.mjs` checks the build's layout in headless Chrome;
  `capture-screenshots.mjs` makes the screenshots the site shows.
  A script that takes from the game loads one entry in `src/testing/`
  through Vite (`@fz/dev/script`'s `importThroughVite()`), which exports
  one object of a type in `src/testing/script_api.ts`. The report, the
  screenshots' script and the sound build read their command lines with
  `@fz/dev/script`'s `readArgs()`, the report printing its table with
  `@fz/dev/report` and the screenshots run by `@fz/dev/screenshots`'
  `runScreenshotScript()`, export what they work out, and run as `run()`,
  given what to load, or to build, and where to print, which returns the
  code to exit with, so their specs beside them, in `pure`, hold them whole
  on an API of their own.
  `tools/sounds/` holds a module for each family of sounds (`beds`,
  `chain`, `hazards`, `pickups`, `rescue`, `rocks`, `ship`, `stingers` and
  `voice`), whose `SOUNDS` are its recipes, each a `Recipe` of
  `build-sounds.mjs`: its name, what plays it, how many takes it has, its
  level and whether it loops, and how to make a take from its seed, on
  `@fz/dev/synth`; `ship_parts.mjs` holds what the ship's, the pickups' and
  the stingers' share, the game's own instrument, kept here rather than in
  the synth, as no other game plays it. The takes the build renders go to
  `tools/sounds/wav/`, which git ignores.
  `sound-lab.ts` is no script but the sound lab's page, which the dev
  server alone serves (`@fz/dev/sound-lab`'s `soundLab()`, in
  `vite.config.ts`), compiling the modules of `tools/sound-lab/` with it:
  the uplift's sprite, played by the view's mix (`SOUNDS`) or plainly,
  each sound with its takes and what plays it in its recipe's words
  (`tools/sound-lab/plays.ts`, which `tools/build-sounds.spec.ts` holds to
  the recipes); beside the sprite the game played before the uplift,
  `tools/sound-lab/sounds.wav` and its map, `sounds.json`, which no build
  holds, with the names it plays them under (`tools/sound-lab/before.ts`);
  and scenes as the game plays them, each moment's events logged on a
  field of the rules' and heard by the view's `FieldSounds`, as the scene
  hears them, beside the same moments as the game played them before, the
  gun at `SHOT_EVERY_MS` and a chain raised a semitone a break up to a
  fifth (`beforeChainDetune()`). The app's tsconfig leaves it out;
  `tsconfig.node.json` checks it, with Vite's client types for the
  sprites' addresses.

## The Field

- **The scene follows the game; it never leads.** Each frame it hands the
  game the time and the steering (`tick()`), so the field steps in the
  scene's time, in fixed steps, and draws the frame the game hands back,
  each thing that moves between its last place and its next. A new field,
  as a wave starts or a run is taken up, is how the scene knows to stop
  what the last one set off.
- **The field fills its room.** Its short side is 40 units, and its long
  side as many as the room holds at that unit, up to 88 (`fieldShape()`).
  The room is the canvas inside its chrome, less the deck where it shows,
  inside a margin of 12 CSS px on a compact screen and 24 on a roomy one
  (`MARGIN_CSS_PX`); a room longer than 88 by 40 shows the page at the
  field's ends. The unit is whatever fraction of a device pixel that makes,
  and the field is centered on whole device pixels, so its frame is sharp.
  A wave's counts are written for a field of 40 by 40, and a larger one
  holds more by its area (`fillFor()`).
- **It takes a new shape only as a wave starts or while it is paused.** A
  wave waiting for its first move is laid out again on a new room at once, a
  paused one is stretched to it, and one in play keeps its field, fitted
  whole, until it pauses, which turning the screen does. A field stretched
  to a new shape keeps everything on it at the same share of the way across
  and down, and its ship untouchable for a second after.
- **The field wraps** (`torus.ts`): what leaves by one edge comes in by the
  other, and every distance is the shortest across the edges. A thing
  reaching past an edge is drawn on both sides of it, and at a corner four
  times (`copyOffsets()`, `Copies`). The strays and the comets cross rather
  than wrap, and a lost ship's pilot floats off, so each is drawn once, and
  the field's camera cuts it off at the edge.
- **The frame and the deck stand still.** Two cameras draw the scene, each
  the layers `LAYER_CAMERAS` gives it: the field's, whose viewport is the
  field's rectangle, and the deck's, over the whole canvas, which draws the
  frame, 2 CSS px in the field's line (`FRAME_CSS_PX`), and the deck, so
  neither moves as the field kicks or shakes.
- **The deck** shows on a touch screen, or always, or never, as the
  settings say (`DECK_SHOWINGS`). It lies at the canvas's edges, along its
  bottom, a quarter of its height, its two zones side by side, or a zone
  each side of the field, a sixth of its width, whichever leaves the field
  the larger unit. The stick's zone is the left unless the settings put it
  on the right: a finger landing there holds the stick, which turns the ship
  past its turn ring and thrusts past its thrust ring, harder toward its
  edge. The other zone holds Fire and Dash, or Dash alone where the ship
  fires by itself. The scene follows three fingers at once, so one can hold
  Fire as another dashes.
- **The board is an application** to assistive technology, focusable,
  named for its wave and described by its keys; the canvas in it is
  hidden, and the announcer says what happens. Pause and Sound keep the
  focus on the board when pressed with a mouse or a finger, so the keys go
  on working.
- **Phaser's input is the board's.** The keyboard's target is the board's
  element, so the keys reach the game only while it has the focus. Phaser
  cancels a captured key's default there, which is why the scene captures
  only Left, Right, Up, Down and Space, the keys it uses that would scroll
  the page, and ignores a key pressed with Ctrl, Alt or Meta
  (`@fz/core/keys`'s `isShortcut()`). Keys go by `event.code`, so an
  AZERTY keyboard flies with Z, Q, S and D. The mouse
  aims the ship once it moves over the field, its main button fires and its
  second thrusts, so the board keeps the browser's menu shut.
- **The wave waits for the player.** A wave holds still, its ship waiting
  in its middle, until the player's first move; a hit knocks the last in
  tow loose, and the ship is untouchable a while after, and a hit with no
  one in tow ends the run. The wave pauses when the focus
  leaves the room, the page is hidden, the screen turns or a dialog opens,
  and goes on only when the player says; one waiting for its first move has
  nothing to pause, and a run taken up after a reload starts paused. One
  card lies between waves, and one press goes on from it to the next wave
  and starts it, but at the start of a sector, whose card waits for a
  fresh move. Nothing goes on until the field is drawn
  (`GameService.setDrawn()`, which the board calls from its canvas), since a
  wave nobody can see would be lost.
- **Its colors are the palette's and its own inks'.** `beltPalette()` takes
  the field, its line, the ship, the pickups, the shots, the
  flame and the comets from the page's roles, which `ThemeService` reads,
  the rocks' inks from `src/view/colors/inks.ts`, their tones and the
  light they are lit by from `tones.ts` and `rock_light.ts` beside it, and
  the pilots' from
  `@fz/phaser/color`'s `FUZZBALL_INKS`, for light palettes and for dark;
  `src/view/colors/contrast.spec.ts` holds them apart in every palette.
- **The placeholder, the ring and the cards work out the field in CSS,** as
  `fieldMetrics()` does, from the canvas the board measures, as the host
  sizes it, at the pixel ratio the canvas renders at; they take the scene's
  own rectangle once it has drawn (`data-field`), and the layout check
  holds the placeholder to it.
- **Motion follows the player's preference** (`GameViewportService`'s
  `allowsMotion`): without it every flourish but the points is left out,
  the points showing where they were scored without rising; the pickups'
  breath, a stray's bob, a warning's pulse, the flame's flicker and the
  pilots' blinks hold still, the rim's flash fades without growing, and
  the pilot's fur leans at once rather than easing; and the cards open
  without waiting, the Cleared card's sum whole at once.

## Styling

A component stylesheet that needs the toolkit opens with
`@use "../styles" as *;`, which brings in `@fz/style`'s mixins and
`@fz/game-ui`'s breakpoints and bar mixins, and nothing else; the app's
own takes `@fz/game-ui` alone, for the page's frame (`game-frame`). The
frontend's Angular and Sass rules apply; on top of them:

- **No color is written in a stylesheet.** The field's, the rocks' and the
  pilots' are the palette's and the inks', which the scene draws, and which
  `<app-pilot>` takes as its `color` from `pilotInk()`; the placeholder
  draws with the palette's tokens.
- **The size comes from the stage,** a size container: the board fills it,
  and the component lays the field out in it as the scene does, the margin
  (`--margin`) and the frame (`--frame`) around it, clear of the deck, each
  set from the view's own (`MARGIN_CSS_PX`, `FRAME_CSS_PX`). The board is a
  size container too, and its cards set smaller on a small board, the
  canvas's too, all from the layer they show in (`board-card-small` on
  `<app-board-card>`), which gives the canvas's the margin around the field
  the others keep (`--fz-canvas-card-room`). The layer's own cards lie in
  the field's room (`.room`), a size container of its own, since the deck
  takes a share of the board's height on a phone upright: they set smaller
  on a field short of their full height, and on a field shorter still the
  Cleared card's sum shows its total alone.

## What It Keeps

Each entry is in `localStorage`, versioned
(`LocalStorageService.writeVersioned()`), and its reader drops what it
can't trust rather than failing:

- `asteroid-breaker-settings`: the speed of the last run started, when the
  deck shows, which side holds its stick, whether the ship fires by
  itself, haptics and sound.
- `asteroid-breaker-stats`: for each speed, the runs, the best run's score,
  the furthest wave reached, whether a run has cleared all thirty, from the
  first, and the strays brought home; and for each sector's id, Endless's
  among them, the score of the best run started there at each speed; each
  best with the rules' number it was made under (`bestRules`,
  `sectorRules`), read as 1 where it lacks one. Ids no sector has any more
  are dropped.
- `asteroid-breaker-progress`: the ids of the sectors reached, at any
  speed, which a run may start at, Endless's among them once a run has
  cleared the last written wave. Ids no sector has any more are dropped.
- `asteroid-breaker-game`: the run under way, by `SavedGameService`: its
  wave, by number and id, the wave it started at, its speed and seed, its
  points, its crew's colors, at the controls, in tow and gone home, the
  crew knocked loose among those gone home, so a reload gives none back,
  the strays brought home, for the result card, the pilot's static as its
  wave started, and whether it was flown on tuned numbers; and its field's
  size as laid out and as it is now, its rocks, whole or with a blast to go
  off, the counts its draws, strays, comets and points run by, and the
  pilot's static. A wave not yet moved is kept as not yet begun, a wave
  just cleared as the next not yet begun, and a stray adrift, the comets,
  the pickups, the sparks, the shots and the effects in play go. It is
  written as a wave starts, as its crew changes, as it pauses or goes on,
  and as the page is hidden or goes away, never at a step, forgotten once
  the run ends or another begins, and taken up paused at startup, fitted to
  the board's room as a pause is.

A run flown on numbers the debug menu tuned, its field stepped with them,
keeps neither the records nor the sectors it reaches. A field added to an
entry later is read as optional, so a reader never drops a player's records
for lacking it.

## In This Repository

What every game keeps is in `frontend/games/AGENTS.md`. Here:

- **The site serves it at `/play/asteroid-breaker/`,** and its `game.json`
  names it Asteroid Breaker, as the site's catalog must.
- **Its screenshots** are in `public/docs/screenshots/asteroid-breaker/`,
  and `yarn capture:screenshots` makes them again; `index.html` names the
  preview as the page's link preview.
- **The browser's toolbar takes the page's color** (`THEME_COLOR_ROLE` in
  `src/main.ts`), and the settings offer the palette.
- **The debug menu is on the site too,** at `?debug` (`DEBUG_MENU`), so the
  feel can be tuned where it is played. It tunes the player's own game
  only, and keeps nothing.
- **Accessibility.** The rules are the repository's `web-game-accessibility`
  skill's. Every overlay is an `<fz-dialog>`, the board is the application
  above, and every run and sector opened, with what is new there, wave
  begun, stray drifting in or caught, one of the crew knocked loose,
  caught again or floating home, pickup caught, static full, zap, pause,
  going on, wave cleared, with the wave to come, and end is announced.

## Development Commands

Run these from `frontend/games/asteroid-breaker/`, or as
`yarn workspace asteroid-breaker <script>` from `frontend/`. The root's
`yarn lint`, `yarn typecheck`, `yarn test` and `yarn build` run this
workspace's with the others'.

- **Run Development Server:** `yarn dev` (at `http://localhost:9005/`; the
  Solitaire Collection's uses 9000, Minesweeper's 9001, Sudoku's 9002,
  Snake's 9003 and Brick Breaker's 9004).
- **Production Build:** `yarn build`, into `dist/`; `yarn preview` serves it.
- **Run Unit Tests:** `yarn test` (the whole suite once, every project,
  without coverage), `yarn test:coverage` (Vitest's `dom` and `pure`
  projects with coverage, failing below the floors `vitest.config.ts` sets
  for the rules, the view, the scene and the shell, then its `sim` project,
  the specs that play every wave or lay every wave out, without),
  `yarn test:watch`, or
  `yarn vitest run --project <project> <path>` for one spec, which leaves
  the floors alone: `pure` for one of the rules, the view, `src/testing/`
  or `tools/`, `dom` for one of the scene or the shell, and `sim` for a
  simulation. Without `--project`, Vitest starts every project, Analog's
  plugin among them, and a spec of the rules takes three times as long.
- **Linting:** `yarn lint` (ESLint with `@fz/dev`'s blocks, `scripts()`
  among them for `tools/`, `eslint.config.js` and `stylelint.config.js`,
  and `phaserGameLayers()` for the fences between the layers and what keeps
  the rules, the view and the helpers the scripts load off the clock,
  `Math.random()` and the page, then stylelint with `@fz/style`'s preset).
- **Type Checking:** `yarn typecheck` (the app, the specs, the Vite
  config, and the scripts under `tools/` and the two lint configs from
  their JSDoc, each with `@fz/dev`'s options).
- **Report the Waves:** `yarn report:waves` (runs `tools/report-waves.mjs`:
  the autopilot in `src/testing/autopilot.ts` plays every wave at every
  speed on the narrowest field, or the widest with `--field wide` on its
  side or `--field tall` upright, from the wave's number as the seed, as
  the autopilot's spec does, through `playWave()`, which it loads with the
  rest of what it plays from `src/testing/report_api.ts` (`REPORT_API`).
  It prints the game time each took and the strays it brought home, flown
  with nothing able to take the ship, and the crew each knocked loose,
  those of them that floated home and the most static it held as the spec
  plays it, beside the waves' names, as wide as the longest, and fails if
  any play didn't clear its wave in time (`-`). It is how the climb from
  wave to wave is tuned; `--seeds <n>` plays each wave from that many
  seeds of its own, since one seed's rocks and pickups can make a wave
  look far easier or harder than it is. `--endless` plays Endless's waves
  31 to 60 instead, each made from the seed it is played from, and fails
  only on a play that didn't clear its wave in time with nothing able to
  take the ship, as Endless is held to being fair, not to what it costs.
  `--help` prints its options, and an option it can't read exits with 2,
  saying why, before anything is played).
- **Check the Layout:** `yarn check:layout` (runs
  `tools/check-layout.mjs` on the build `yarn build` made: in headless
  Chrome, at `@fz/dev/layout`'s shapes (a roomy window, and a large and a
  small phone, upright and on its side) and at 320 × 480, and turned from
  upright to its side and back, each at 2×, with the deck shown, as a
  headless Chrome is no touch screen, the page reports no error and
  doesn't scroll, the bar's controls lie in the window, and, as
  `@fz/dev/layout` holds a board drawn with Phaser, the canvas draws at its
  size times the board's pixel ratio and the field keeps its shape, its
  units across and down as the board gives them (`--across`, `--down`),
  inside the window, where the placeholder drew it and inside the focus
  ring, its card on it; the deck's stick zone and its buttons' each show,
  on the canvas and in the window, off the field, each other and the bar,
  112 CSS px across and down at least (`data-deck`); and the field's short
  side is 40 units, each 6 CSS px or more, and it fills the room the deck
  and the margin leave it, inside its frame (`data-room`), both ways, or
  one way where its long side is 88).
- **Make the Sounds:** `yarn build:sounds` (runs `tools/build-sounds.mjs`,
  which renders every take of every recipe in `tools/sounds/`, each from a
  seed of its name and its number, the same bytes every run, centered and
  faded at its ends unless it loops, brought to its level and kept under -1
  dB, says what of it is off (a phone losing most of it, the limiter pulling
  it down, a loop's seam, an end off zero), and writes it as a WAV into
  `tools/sounds/wav/<family>/`; then packs every take but the beds' with
  `@fz/dev/sounds`' `packSoundSprite()`, the sounds by name, 0.06 s apart
  and none faded (`SPRITE_LAYOUT`), into `tools/sounds/wav/sprite.wav`, its
  map, `sprite.json`, and each take's length, `sprite_lengths.json`. With
  ffmpeg on the path, it encodes the sprite as Ogg Vorbis and M4A into
  `src/scene/sounds/`, the map and the lengths beside them, and each bed
  into `src/scene/sounds/beds/`, all of them or, should an encode fail,
  none; without, it says so and leaves them as they are, as the encodes
  there are the uplift's kit's, which the user heard, made from the takes
  the build renders byte for byte. `--family` and `--only`, each given as
  often as wanted, render those families or sounds alone and pack nothing;
  `--help` prints its options, and a family or a sound it doesn't have exits
  with 2, saying why, before anything is rendered.
  `tools/build-sounds.spec.ts` holds the shipped map to the recipes, every
  take of every sound but the beds by name and in order, which loop, and
  where each lies as the packer lays out its recorded length, to the byte;
  the view's mix to the recipes, every sound but the beds by name, family,
  level and takes; the view's ladder to the kit's `CHAIN_CENTS`; the sound
  lab's words for each sound to its recipe's; the beds and the sprite to
  being encoded; five short takes, rendered, to
  the bytes of the kit's WAVs of them, their recorded lengths and their
  levels; and the build whole, on families and folders of its own, an encode
  that fails changing nothing.)
- **Open the Sound Lab:** `yarn dev`, then
  `http://localhost:9005/sound-lab/`, or
  `http://localhost:4200/play/asteroid-breaker/sound-lab/` under the root's
  `yarn dev:all` (`tools/sound-lab.ts`: the sounds the game plays, by its
  mix or plainly, each with its takes, alone and in scenes as the game
  plays them, beside those it played before the uplift, and the notes on
  its sounds; no build holds it).
- **Capture Screenshots:** `yarn capture:screenshots` (runs
  `tools/capture-screenshots.mjs` against the running dev server in headless
  Chrome, through `@fz/dev/screenshots`' `runScreenshotScript()`: it reads
  the field's shape the board lays out at 1280 × 720, then a run kept by the
  rules on it (`keptRun()`, in `src/testing/kept_run.ts`, which it loads
  through `src/testing/screenshot_api.ts`'s `SCREENSHOT_API`, with the
  version the shell keeps it under), begun on wave 9, Crowd, at Normal and
  played by the autopilot until a second before its first stray, is taken up
  and gone on with, firing, until the stray drifts in, at 2× on Casino
  night, written to `public/docs/screenshots/asteroid-breaker/` as the
  site's `preview.webp` (2560 × 1440), which `index.html` names as the link
  preview, and `thumb.webp` (576 × 324, the field whole, with the bar above
  it, as the field is wider than a thumbnail, `thumbRegionAround()`) by
  `@fz/dev/screenshots`; `--url` names another server, an http or https
  address, such as `yarn preview`'s, and `--chrome <path>` or `CHROME_PATH`
  picks the browser. `--help` prints its options; an option it can't read
  exits with 2, saying why, and a server that doesn't answer with 1, both
  before Chrome starts).

## Tests

The repository's rules for specs apply. A spec sits beside the file it
tests, named after it, but for the specs that play every wave or lay every
wave out, which test no one file: each has a folder of its own with a file
for each speed (`src/rules/waves/every_wave/`,
`src/rules/waves/every_endless_wave/`, `src/rules/field/every_layout/`), as
Vitest plays a file's specs one after another but the files side by side,
and the spec beside the folder holds it to a file for every speed and no
other. Vitest runs the specs in three projects, each starting only what its
own need. `sim` runs the specs that play every wave or lay every wave out,
in Node, without the coverage that would triple their time, as the other
rules specs alone hold the rules to their floor. `pure` runs the other specs
of the rules, the view, `src/testing/` and the scripts under `tools/` in
Node too, which has no page, as nothing they test touches one. `dom` runs
every other spec, the scene's and the shell's, in jsdom, after
`src/test-setup.ts`, which installs `@fz/phaser/testing`'s headless Phaser
first, so a scene's spec runs real Phaser through `runScene()`, with a fake
shell over a pictured field. Coverage measures `dom` and `pure` together:
the rules and the view to a floor near 100%, the scene and the shell to one
a little under what their specs reach, raised as they rise, and
`src/testing/` and the scripts with none, so what of them goes untested
shows. It can't see what the scripts load through Vite, so the entries'
own specs measure them.
This workspace's `asteroid-breaker-testing` skill covers its setup, floors
and fixtures, the repository's `angular-testing` the patterns every Angular
workspace's specs share, and `phaser-core` the harness. What the specs share
is in `src/testing/`, and each helper whose answer a spec trusts has a spec
of its own beside it:

- `field_picture.ts` lays a field out from a picture of its rocks and its
  ship (`fieldFrom()`), each character a cell 4 units across (`CELL`), on a
  field of 72 by 40 unless it says another (`PICTURE_TORUS`), lays a rock, a
  pickup, a spark, a stray, one of the crew knocked loose or a comet on it
  where a spec says (`placeRock()`, `placePickup()`, `placeSpark()`,
  `placeStray()`, `placeLoose()`, `placeComet()`), steps it and reads it
  back, from its events to how fast a thing on it flies (`speedOf()`), so a
  spec of the field reads as the field it plays.
- `crossings.ts` reads where a stray or a comet waits to come in
  (`entryOf()`), whether a run of them came in off every edge within their
  margin and tilt (`entriesOf()`), and where an event was logged against
  one (`edgePlaceOf()`), for the specs of the hazards.
- `art_frames.ts` draws the field's atlas in one palette at one scale for
  the art's specs (`ART_FRAMES`), among which `@fz/phaser/testing/pure`'s
  `frameNamed()` finds a frame by its name, and `rock_art.spec.ts` the
  rocks' in the same (`ART_PALETTE`, `ART_SCALE`); it lists the pixel ratios the
  specs check the art at (`PIXEL_RATIOS`) and the scales a field is drawn
  at, as baked, the smallest unit the layout check holds a field to at each
  among them (`ART_SCALES`), and says how far a frame's drawing reaches from
  its middle (`reachOf()`).
- `autopilot.ts` plays a wave as a fair player would (`autoplay()`,
  `playWave()`), steering each frame by `pilot()`: it flees a rock or a
  comet whose course comes near the ship, dashing when one is about to meet
  it; else catches the one of the crew knocked loose it has time and room
  in tow for, the stray adrift or the pickup it has time for, or draws in
  a spark lying a little beyond its draw before it goes; else turns toward
  the rock it can hit soonest, leading it.
  `src/rules/waves/autopilot.spec.ts` holds the autopilot itself.
- `every_wave.ts` holds every wave, at a speed, on the narrowest field and
  the widest either way up (`FIELDS`: `NARROWEST`, `WIDEST`, `TALLEST`), to
  being cleared by the autopilot within four minutes of game time
  (`AUTOPILOT_LIMIT`), meeting a comet and a stray if it sends them, its
  tally adding up to its score (`holdEveryWave()`), and Endless's waves 31
  to 60 (`ENDLESS_PLAYED`) to being cleared so with nothing able to take
  the ship (`holdEveryEndlessWave()`); each speed's spec in
  `src/rules/waves/every_wave/` and `src/rules/waves/every_endless_wave/`
  calls them with its own file, whose name is the speed it plays
  (`@fz/core/testing`'s `variantOfSpec()`, which throws for a file named for
  no speed or kept in another folder).
- `every_layout.ts` holds every wave, in every formation, on those fields, at
  a speed and from twelve seeds (`LAYOUT_SEEDS`), to being laid out fairly
  (`holdEveryLayout()`), which each speed's spec in
  `src/rules/field/every_layout/` calls with its own file, as those do;
  `src/rules/field/spawn.spec.ts` takes its `startOn()` and `nearness()` too.
- `belt_board.ts` runs the scene for a spec (`startBoard()`, through
  `@fz/phaser/testing`'s `runKeyedScene()`) on a `FakeShell` that plays the
  shell's part, and reads what it draws (`shown()`, `layersOf()`,
  `humsIn()`), beside what `@fz/phaser/testing` reads any scene with
  (`imagesIn()`, `strokesOf()`), whose specs are the library's;
  `canvases.ts` makes the canvas a board has in a window of a shape, less
  the bar and the rail at the sizes its spec compiles from the app's
  stylesheets (`boardOf()`), its viewport `@fz/phaser/testing/pure`'s
  `viewport()`, for the specs of the layout, the steering and the scene.
- `roles.ts` holds the colors the specs that color the field paint it in
  (`ROLES`), through `@fz/style/testing`'s `paintRoles()` and
  `FIELD_ROLES`, and the game's palettes as its stylesheet sets them
  (`PALETTES`, `stylesheetPalettes()`'s), which the contrast spec reads the
  field's roles from (`rolesIn()`); `pilots.ts`
  reads the pilots an element draws (`pilotsIn()`), and the face and the
  lift of the first (`poseIn()`), from its fuzzball's marks.
- `play.ts` holds the small waves the shell's specs play, each set up to
  come to one thing soon (`SPEC_WAVES` and the others), handed to
  `GameService` through `GAME_WAVES` with a seed of its own through
  `GAME_RANDOM` (`provideSpecWaves()`), and plays them through `tick()`,
  with `@fz/core/testing`'s `playUntil()`, steering the ship from the frame
  it reads (`shoot()`, `ram()`, `toPickup()`, `toStray()`, `loseShip()`,
  `endRun()`, `playToClear()`, `clearToNext()`), up to a card if a spec
  wants one (`pauseIn()`, `clearIn()`, `endIn()`), and on from the Cleared
  card by a press, as a flight key goes on and starts the next wave
  (`pressOn()`); with how the board lays the field out on a roomy screen
  with no touch (`ROOMY`), and Space as a browser sends it (`SPACE`), from
  `@fz/phaser/testing`'s `browserKey()`.
- `run_under_way.ts` holds a run under way on its third wave, with points,
  strays, a crew and static (`runUnderWay()`), how it starts its wave
  (`waveSetupOf()`), and its field laid out and played a second
  (`laidOutField()`, `playedField()`), which the saved game's specs keep and
  read back, with the shape of their spoiled entries (`Spoil`).
- `records.ts` says what a change in a run brings to the records, nothing
  but what a spec gives (`runRecords()`), for the specs of the records.
- `numbers.ts` says how much each of a list's numbers differs from the one
  before (`stepsBetween()`), for the specs that hold a table of the rules
  to rising or falling, the rocks' sizes and speeds, static's steps and
  each kind's points.
- `kept_run.ts` keeps a run begun at a wave and played by the autopilot
  until its first stray is near (`keptRun()`), for the screenshots' script.
- `report_api.ts` and `screenshot_api.ts` hold what `tools/report-waves.mjs`
  and `tools/capture-screenshots.mjs` take from the game, each in one object
  (`REPORT_API`, `SCREENSHOT_API`) the script loads through Vite, of a type
  in `script_api.ts`, which imports nothing, so the scripts' JSDoc takes its
  types and a name changed in the rules or the autopilot fails to compile;
  their specs hold each to what it hands on. Lint holds them, the autopilot
  and `kept_run.ts` (`SCRIPT_HELPERS` in `eslint.config.js`, which a file
  of `src/testing/` they import must join, as lint says) to the rules'
  fence and keeps them off the clock, as the scripts run them in Node and
  the report counts on playing the same from a seed.

The board's spec runs on `provideFakePhaserCanvas()`, and then with the real
scene it loads, and holds that its card gives way to the canvas's own; its
card's spec renders the card alone, with no canvas, told what the board would
tell it.
