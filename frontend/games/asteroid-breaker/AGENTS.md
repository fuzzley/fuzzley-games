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
- **Build Toolchain:** [Vite](https://vitejs.dev/) + [AnalogJS Vite Angular Plugin](https://analogjs.org/)
- **Test Framework:** [Vitest](https://vitest.dev/) with jsdom, Testing
  Library, and real Phaser run headless
- **Language:** TypeScript / HTML / Sass

## Layers

Four layers, each a folder under `src/` named for it, each importing only
the layers below it, as `eslint.config.js` fences them: the rules',
`src/rules/`, the view's, `src/view/`, the scene's, `src/scene/`, which
draws the field on Phaser, and the shell's, `src/app/`, whose board loads
the scene with `import()`.

| Layer | May import                                                                                                                     | May not import                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| rules | `@fz/core`                                                                                                                     | Phaser, Angular, RxJS, any other `@fz/*`, the view, scene and shell |
| view  | the rules, `@fz/core`, `@fz/phaser/color`, `@fz/phaser/insets`, `@fz/phaser/layout`, `@fz/phaser/shapes`, `@fz/style/fuzzball` | Phaser, Angular, RxJS, the shell's libraries, the scene and shell   |
| scene | Phaser, `@fz/phaser`'s entries but the canvas, the view and the rules                                                          | Angular, RxJS, the shell's libraries, the shell                     |
| app   | Angular, every `@fz/*` library, the rules and the view; the scene and `@fz/phaser`'s host, scene helpers and sound by type     | Phaser, and the scene or those three entries by a value import      |

The physics is the rules', so the whole game plays in Node, as the
autopilot does. The fence doesn't see the board's `import()` of the scene,
which keeps Phaser out of the first download.

## Layout

- **`src/rules/`** — the game, with no framework, physics included.
  `tuning.ts` holds the numbers that set its feel, in field units (the
  field's short side is 40, `FIELD_SHORT_SIDE`, and its long side as many
  as its room's shape holds, up to 88, `FIELD_LONGEST_SIDE`); `speed.ts`
  the three speeds (`SPEEDS`, `SPEED_INFO`), Relaxed, Normal and Fast, each
  how fast the rocks and the comets go, how often a comet comes and how
  likely a pickup is; and `stepper.ts` the field's step, 1/120 s
  (`STEP_MS`), `stepsIn(ms)`, a time in those steps, and the field's clock
  (`createFieldClock()`), which turns a frame's time into steps, twelve at
  most a frame. `torus.ts` is the wrap: the field for a room's shape
  (`torusFor()`), the shortest way and distance between two places across
  the edges (`across()`, `distance()`), and where a thing reaching past an
  edge needs a copy drawn (`copyShift()`). `draws.ts` draws the field's
  random numbers (`nextDraw()`, `drawIn()`) from its seed and how many came
  before, so a field taken up draws as it would have.
- **The field** — `src/rules/field.ts`: `Field`, a wave in play, which each
  step changes in place, from records made once. `fieldFor()` lays a wave
  out whole on a field of a shape at a speed, its counts grown by the
  field's area (`fill.ts`'s `fillFor()`, from counts written for 40 by 40),
  and its rocks laid fairly in its formation (`spawn.ts`'s `layOut()`): 12
  units off the waiting ship at least, across the wrap, on courses that keep
  5 units clear of it for their first 3 seconds (`liesFairly()`).
  `steerField()` takes a frame's steering, `stepField()` moves it on a step,
  and `reshapeField()` stretches a paused field to a new shape, every place
  on it moving to the same share of the way across and down
  (`stretchField()`). A wave holds still until the player's first move, and
  a ship lost is followed a second later by the next in line, waiting where
  it is safest (`safestPlace()`).
  `ship.ts` flies the ship by a frame's `Steer`, the keys' turn, a stick's
  heading or the mouse's aim, and a push (`flyShip()`): it turns, thrusts
  along its heading, coasts, keeps under its top speed, wraps, or dashes.
  `shots.ts` fires the weapon in hand from the ship's nose and sweeps each
  shot as a segment against circles (`sweepShot()`), so however fast it
  flies it can't pass through a rock between two steps. `rocks.ts` lays the
  rocks in slots made once, as many as the field's cap (`addRock()`), flies
  them (`stepRocks()`), and hits them (`hitRock()`), each holding or
  breaking into pieces of the size after its own; it holds `TRAIT_RULES`,
  what each trait of `catalog/rocks.ts` does, typed so that a trait without
  its rule fails to compile, and sets off the blasts (`setOffBlasts()`,
  `hitWithin()`). `drops.ts` lets a pickup go from a broken rock
  (`dropFrom()`), always from a crystal, after a drought and otherwise by
  the wave's chance, drawn by weight from the wave's pool; `pickups.ts`
  floats the pickups, draws them in to the ship and has it catch them, and
  holds `EFFECT_RULES`, what each effect of `catalog/pickups.ts` does as it
  starts and ends, one of each group in play at a time. `hazards.ts` sends
  what crosses the field once, from an edge, without wrapping: the stray
  fuzzballs, which the ship brings home by touching, and the comets, warned
  of at their edge, which break the rocks they meet a size down and take a
  ship. `pilots.ts` keeps the `Crew`, who flies the run's ships, who waits at
  home to fly the next and the color each new pilot is given, the next in
  turn that no pilot wears (`nextPilot()`). `scoring.ts` scores each break
  by its kind and size, times the chain's multiplier (`CHAIN`), a stray
  brought home and a wave's clearing, gains the crew a ship as the points
  pass each mark (`gainShipsByPoints()`), and says how a cleared wave's
  points add up (`tallyOf()`) and come to (`pointsOf()`). The field counts
  its steps (`Field.steps`), and a timer is the step its thing happens at.
  `events.ts`'s `FieldEventLog` is `@fz/core/event_log`'s `EventLog` of 512
  numbered records, which the field fills, the scene plays and the shell
  hears, each from the last one it read.
- **The run** — `src/rules/run.ts`: `Run`, a value each change replaces,
  from the wave it started at to its end: the wave in play, the points
  banked and the score, the crew, the next ship's mark, the strays brought
  home and the outcome. No run is won: Endless goes on until the ships run
  out. `catchUp()` takes what the wave's field has come to since it last
  looked, its points, its crew and its strays, then its end or its
  clearing, banked once; `waveSeed()` gives each wave's field a seed of its
  own; `wavesCleared()` counts the waves a run has cleared, and
  `hasClearedAll()` says whether it cleared every written one from the
  first; and `nextShipAfter()` gives the mark the next ship comes at. A move
  that doesn't fit where the run stands returns it as it is, and so does a
  field with nothing new, so the shell can tell a frame that changed the
  run. `describe.ts` puts what happened into the words the announcer says: a
  wave's start and its rocks, a stray drifting in or brought home, a ship
  gained or lost, a pickup caught, a clearing, a pause, going on, a run taken
  up and the end; and `whereLost()` says where an ended run was lost. The
  announcer, the bar, the cards, the result, the sectors and How to play
  all write points grouped in thousands, "4,250", with `@fz/core/format`'s
  `formatPoints()`.
  `progress.ts` says which sectors a run may start at (`isOpen()`): the
  first, and each a run has reached, at any speed, Endless among them once a
  run has cleared the last written wave; `sectorSpans()` gives each
  sector's first and last waves, and `reachedOf()` reads the ids stored,
  keeping those the game still has. `stats.ts` holds the records, each
  speed's runs, best score, furthest wave, strays brought home and whether a
  run has cleared all thirty, and each sector's best at each speed:
  `statsOf()` reads them as stored, keeping what makes sense and the bests
  of a sector the game still has, `withRunStarted()`, `withRunEnded()`,
  `withStraysHome()` and `withClearedAll()` move them on, and `isNewBest()`
  says whether a run's score beats the best. `saved_game.ts` turns a run
  under way and its field into what storage keeps (`saveGame()`), a run
  whose wave was just cleared as the next wave not yet begun, and back
  (`restoreGame()`), paused, dropping a wave the game doesn't have under
  that number, a field that doesn't fit its wave, a number out of its range,
  or a state no run comes to; `takeUpField()` lays the wave out afresh at
  the size it was laid out at and stretches it to the size it was kept at,
  its rocks and counts as kept.
- **The waves** — `src/rules/waves/`: a JSON file for each sector, its id,
  its name, its chance of a pickup and its ten waves, each written for a
  field of 40 by 40: its id and name, its rocks by kind, size and count,
  and, where it says, its formation, its pace, the kind its boulders break
  into, its chance of a pickup, its pickups, its strays and its comets:
  `inner-belt.json`, waves 1 to 10, `iron-reach.json`, 11 to 20, and
  `storm.json`, 21 to 30. `src/rules/waves.ts` lists the sectors in order
  (`SECTORS`), numbers every wave from 1 (`WAVES`, through `wavesOf()`),
  finds one by its number, one of Endless's past the last (`waveEntryOf()`),
  and `parseWave()` turns one into a `Wave` to play, or throws an error that
  names what is wrong with its data, a key no wave has among it. Its spec
  holds every wave to parsing, ids in kebab-case and names of their own, a
  pace that never slows within a sector, and each sector to ten waves, a
  boulder in its last alone.
  `src/rules/endless.ts` makes Endless's waves, from wave 31
  (`ENDLESS_FROM`), from the run's seed and the wave's number
  (`endlessWave()`), so a run kept makes its wave again from the two: a
  budget of rocks, a crystal among them, boulders every tenth wave and
  comets in every one, climbing until wave 60 and holding there.
  `waveToPlay()` gives a sector's wave or Endless's ready to play.
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
  the shape every entry has (`rockKind()`, `pickup()`).
  `src/rules/catalog.spec.ts` holds every entry to the catalogs' rules, the
  waves to laying every kind of rock, and every pickup to coming in the
  wave it joins from.
- **`src/view/`** — what to draw and when the field moves on, without
  Phaser, tested in Node.
  `wave_play.ts` holds `WavePlay`, a wave in play, which `GameService`
  makes for each wave and drives: `@fz/core/field_play`'s `FieldPlay` over
  the rules' steps and clock, which keeps the frame the scene draws, the
  events it has handed on and the wait before a card opens, and hands the
  scene the run's seed and, in Endless, the constellation.
  `field_metrics.ts` lays the field and the deck on the canvas: the field's
  shape for its room (`fieldShape()`), the room it fills (`fieldRoom()`),
  where it lies (`fieldMetrics()`), a unit whatever fraction of a device
  pixel its room makes, its edges on whole device pixels, where the deck's
  zones lie (`deckLayout()`), and `toCanvas()` and `toField()` between the
  two. `frame.ts` is what the scene reads: `FieldView`, the field it can't
  change, `EventsView` and `FieldFrame`, and where a thing is drawn between
  its last place and its next (`between()`), the shortest way across the
  wrap for one that wraps (`betweenOnAxis()`), and its turn
  (`angleBetween()`). `layers.ts` is the order the field is drawn in, back
  to front, in one list (`LAYERS`); `timing.ts` how long each flourish lasts
  and how long the cards wait (`clearedDelayMs()`, `resultDelayMs()`); and
  `flourish.ts` how each flourish moves over its time, and how the pickups
  breathe, a stray bobs, a comet's warning pulses, the flame flickers and
  the pilots blink, each only where motion is welcome. `effects.ts` says
  what each event calls for, its sound and its flourishes (`effectsOf()`),
  how far a broken rock's sound rises along a chain (`detuneOf()`), and
  `createFrameSounds()`, `@fz/core/frame_sounds`'s `FrameSounds` of its
  `SOUNDS`, which plays each sound once a frame at most, at the highest it
  was heard; the thrust's hum (`THRUST`) is one of them, which no event
  plays.
  `controls.ts` holds the keys by `event.code`, the commands and the keys
  held to fly; `steering.ts` the `Steering` that turns the keys, the mouse
  and up to three fingers (`MOST_FINGERS`) into each frame's `Steer`;
  `stick.ts` the deck's `Stick`, which follows the one finger on it; and
  `deck.ts` where the stick, Fire and Dash lie (`deckOf()`) and which button
  a finger presses (`buttonAt()`). `tags.ts` says where the tags of the
  lasting effects lie, at the field's bottom left, and how much of each
  one's time is left; `warning.ts` where a comet's warning is drawn;
  `specks.ts` where the specks lie, from the run's seed, and where an
  Endless wave's constellation lies (`constellationAt()`); `tally.ts` the
  Cleared card's lines (`tallyLines()`); `haptics.ts` how the phone buzzes
  as a ship is lost or a wave cleared (`buzzOf()`); and `debug_tuning.ts`
  the numbers the debug menu tunes (`Tuning`, `TUNING_SLIDERS`) and the
  lines of `tuning.ts` they would replace (`tuningLines()`).
  `palette.ts` takes the field's colors from the palette's roles
  (`beltPalette()`), with the inks of `inks.ts`, the game's own for each
  kind of rock and for eight pilots, in light palettes and in dark, and
  gives a pilot's ink to the shell too (`pilotInk()`). `art.ts` draws every
  frame of the field's atlas (`atlasFrames()`) as plain commands in device
  pixels, at a unit of 32 device pixels at most (`bakedScale()`), the
  deck's frames apart (`deckFrames()`), and names How to play's pictures
  (`PICTURE_FRAMES`); `rock_art.ts` draws each kind of rock in each size it
  comes in and six outlines (`ROCK_OUTLINES`), and the hits it has taken;
  `ship_art.ts` the ship, its flame and its rings; `pilot_art.ts` the
  pilots, each the fuzzball in its ink, in the ship's window or adrift;
  `symbols.ts` each pickup's symbol and each button's (`SYMBOLS`); they are
  drawn in `@fz/phaser/shapes`'s commands (`DrawCommand`), and `shapes.ts`
  holds the game's own helpers over them, `lineWidth()` and `stroke()`
  among them.
  `contrast.spec.ts` holds each kind of rock's ink, the ship, the pickups,
  the comet, the shots, the flame and a stray's bubble's rim to 3:1 against
  the field in every palette, the outline against everything it outlines,
  the marks against every rock, a pickup's symbol against the pickup, each
  pilot against the field, a stray's bubble and the bar, the eyes against
  each pilot, and the deck's knob and its buttons' symbols against the
  deck.
- **`src/scene/`** — the Phaser scene. `BeltScene` (`belt_scene.ts`, made
  by `makeBeltScene()`) is handed plain functions over the game
  (`BeltSceneOptions`): each frame it hands the game the time and the
  steering its `Steering` read from the keys, the mouse and the fingers,
  reads the frame and the palette, and has its painters draw, each in its
  layer of `LAYERS`: `FieldPainter` the specks, an Endless wave's
  constellation and the frame, `TagPainter` the tags of the effects in play,
  `RockPainter` the rocks, the hits they have taken and a held hit's flash,
  `PickupPainter` the pickups, `StrayPainter` the stray adrift and a lost
  ship's pilot bailing out, `HazardPainter` the comets and their warnings,
  `ShotPainter` the shots, `ShipPainter` the ship, its flame, its pilot and
  its rings, `EffectsPainter` the shards, the dust, the sparks, the rings, a
  dash's trail, the exhaust and the field's kick and shake, `PointsPainter`
  the points scored, and `DeckPainter` the deck. Each is a `Painter`
  (`painter.ts`), which draws from the one `PaintContext` the scene writes
  over each frame and takes up its frames again after a bake, so the scene
  draws and refreshes them in a loop over its list of painters. A thing
  that wraps is drawn through `Copies` (`copies.ts`), once, and again past
  each edge it reaches across; a flourish's records are taken in turn
  (`Turns`, `turns.ts`). Every game object is made as the scene is created,
  or as a field of more slots is shown (`fit()`), so a frame of play makes
  none, and a new field stops what the last one set off. The scene plays
  each of the field's events once, from the last it played, and the
  flourishes an event calls for only where motion is welcome. `atlas.ts`
  bakes the view's art with `@fz/phaser/scene`'s `bakeAtlas()` and
  `atlasFrameOf()` into two atlases: the field's, again on a new palette or
  a new unit, and the deck's, white for the scene to tint, again on a new
  pixel ratio; and the scene hands How to play its pictures from the
  field's each time (`onPictures()`).
  `@fz/phaser/sound`'s `SpritePlayer` plays each event's sound from the
  sprite in `sounds/`, which `yarn build:sounds` writes, a broken rock's
  risen along its chain, holds the thrust's hum while the ship thrusts, and
  mutes the game while the settings want none. The keys go back through
  `command()`, heard through `@fz/phaser/scene`'s `onKeyDown()` and
  `onKeyUp()`, which hand over each key event once.
- **`src/app/`** — the shell, one folder per feature, as in Brick Breaker.
  `app.component` lays the board in the room beside the bar, with the
  `<fz-announcer>` the game is announced through, the dialogs, and the
  question before a run is thrown away; it hands the board the focus as each
  run begins and whenever the last dialog closes, and pauses the wave in
  play when `@fz/game-ui/play_room`'s `[fzPlayRoom]` says the player looked
  away.
  - `play/` — `GameService` holds the run in a signal and the wave in play
    outside one, as the view's `WavePlay`, since the field changes 120 times
    a second, and moves the field on through `tick()`, which the scene's
    frames drive, steered as the player steers; it starts the run's first
    wave at the player's first move, pauses, goes on and starts waves and
    runs, shapes each field to the board's room (`setRoom()`), says what
    happened through `@fz/ui/announcer`, adds up a cleared wave's points
    (`tally`), keeps the records and the sectors reached through `stats/`,
    tunes the field as the debug menu says (`tune()`, `resetTuning()`), and
    asks through `@fz/ui/confirm` before a new game or speed throws a run
    away. `src/app/tokens.ts` holds what a spec hands it instead of the
    game's own: the waves (`GAME_WAVES`) and the seeds (`GAME_RANDOM`), and
    whether the build is a development one (`DEV_BUILD`) and the settings
    offer the debug menu (`DEBUG_MENU`). `SavedGameService` keeps the run
    under way, through `GameService.saved()`, as its outcome, its first move
    or its crew changes and as the page is hidden or goes away, never at a
    step, and forgets it once the run ends or another begins; `src/main.ts`
    starts it before the board first shows, and it takes up the run kept
    (`takeUp()`), paused.
  - `board/` — `<fz-phaser-canvas>` with the scene, loaded with `import()`;
    the empty field drawn in CSS until the scene has drawn, clear of the
    deck's room; the focus ring; a crosshair for the pointer while a ship
    flies, as the mouse aims it; and the cards: Ready, with the wave and how
    to fly, while a wave waits for its first move; Paused, with the score and
    the strays waiting at home; Cleared, with how the wave's points added up
    and Next wave, and a trophy over the last sector's last; Ended, once an
    ended run's result is put away; and still loading and couldn't be
    drawn. The board is Phaser's keyboard target, so the cards' buttons keep
    their keys from it (`@fz/phaser/canvas`'s `fzKeepKeys`); Resume and Next
    wave hand the board back the focus. It measures its own size and hands
    the game the room the field is laid out in (`GameService.setRoom()`),
    and publishes, for the layout check, where the scene laid the field
    (`data-field`), the room it fills (`data-room`) and the deck's zones
    (`data-deck`). `fieldPalette()` colors the field from `ThemeService`'s
    roles and `mode`. It buzzes the phone as a ship is lost and as a wave is
    cleared, where it can and the settings say to. The board keeps the
    scene's pictures for How to play (`pictures`). It is an application
    named for its wave, "Asteroid Breaker, wave 4: Thaw".
  - `bar/` — `@fz/game-ui`'s game bar: the link home, the page's `<h1>`, the
    speed's badge, whose menu asks before it starts a run at another, the
    figures, and Pause, Sound, Sectors, New game, How to play and Settings,
    all but Pause and New game in the overflow menu on a compact screen.
    Where it has room, the figures are the wave, the score, the ships as
    their pilots, the one at the controls first, and the chain's multiplier
    while it counts; else the score and the ships alone, the ships as a
    number beside the pilot at the controls, as a score runs to six figures.
    Pause and Sound keep the focus on the board when pressed with a mouse or
    a finger. It hands the board back the focus as Resume goes on, and asks
    the app for the sectors, How to play and the settings.
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
    dashing, pausing, the controls by mouse, touch and keyboard, and every
    kind of rock and pickup from the catalogs, a stray and the comet, each
    with its name, its sentence and, once the scene has drawn, its picture,
    which the app hands it from the board.
  - `settings/` — the settings drawer (the speed, when the deck shows, which
    side holds its stick, whether the ship fires by itself, haptics, the
    sound and the palette) and `SettingsService`, which keeps what the player
    chose, the speed of the last run started among it. Where `DEBUG_MENU`
    says so, in a development build (`DEV_BUILD`, from
    `import.meta.env.DEV`, as a game's own dev server runs it) and in a
    production one whose address has `?debug`, the drawer also offers the
    debug menu: a slider for each number of the ship's flight, its gunnery
    and the rocks' speed (`TUNING_SLIDERS`), whether shots carry the ship's
    speed, Reset the numbers, and Copy the numbers, the lines of `tuning.ts`
    they would replace. `GameService.tune()` gives them to the field in play
    and every one after it, nothing keeps them, and a run flown on them
    keeps no records.
  - `pilot/` — `<app-pilot>`, a pilot drawn as the fuzzball it is, from
    `@fz/ui/fuzzball`, in its ink in the palette on the page (`pilotInk()`),
    and `<app-pilot-row>`, pilots in a row, which the bar, the Paused card
    and the result draw.
  - `stats/` — the records: `StatsService`, which holds and stores what
    `stats.ts` reads and moves on, and `ProgressService`, the sectors
    reached, at any speed, which a run may start at.
  - `styles/` — `global.scss`, loaded once from `src/main.ts`, and
    `_index.scss`, the toolkit the component stylesheets `@use`, which
    emits no CSS.

  A new feature gets a folder of its own, named for what it does, never for
  the kind of code in it.

- **`src/testing/`** — what the specs share, and what the scripts in
  `tools/` load through Vite: fields from pictures, the atlas in one
  palette, the autopilot, the scene run on a fake shell, the canvases a
  board makes, the palette's roles, the shell's small waves and the run the
  screenshots keep, as Tests below says. The app's tsconfig leaves it out.
- **`tools/`** — the scripts run from the workspace. `build-sounds.mjs`
  synthesizes the sounds; `report-waves.mjs` reports how the autopilot plays
  every wave; `check-layout.mjs` checks the build's layout in headless
  Chrome; `capture-screenshots.mjs` makes the screenshots the site shows.

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
  inside a margin of 12 CSS px on a compact screen and 24 on a roomy one; a
  room longer than 88 by 40 shows the page at the field's ends. The
  unit is whatever fraction of a device pixel that makes, and the field is
  centered on whole device pixels, so its frame is sharp. A wave's counts
  are written for a field of 40 by 40, and a larger one holds more by its
  area (`fillFor()`).
- **It takes a new shape only as a wave starts or while it is paused.** A
  wave waiting for its first move is laid out again on a new room at once, a
  paused one is stretched to it, and one in play keeps its field, fitted
  whole, until it pauses, which turning the screen does. A field stretched
  to a new shape keeps everything on it at the same share of the way across
  and down, and its ship untouchable for a second after.
- **The field wraps** (`torus.ts`): what leaves by one edge comes in by the
  other, and every distance is the shortest across the edges. A thing
  reaching past an edge is drawn on both sides of it, and at a corner four
  times (`copyShift()`, `Copies`). The strays and the comets cross rather
  than wrap, and a lost ship's pilot floats off, so each is drawn once, and
  the field's camera cuts it off at the edge.
- **The frame and the deck stand still.** Two cameras draw the scene: the
  field's, whose viewport is the field's rectangle, and the deck's, over the
  whole canvas, which draws the frame, 2 CSS px in the field's line
  (`FRAME_CSS_PX`), and the deck, so neither moves as the field kicks or
  shakes.
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
  the page, and ignores a key pressed with Ctrl, Alt or Meta. Keys go by
  `event.code`, so an AZERTY keyboard flies with Z, Q, S and D. The mouse
  aims the ship once it moves over the field, its main button fires and its
  second thrusts, so the board keeps the browser's menu shut.
- **The wave waits for the player.** A wave holds still, its ship waiting
  in its middle, until the player's first move; a ship lost is followed a
  second later by the next in line, waiting where it is safest, untouchable
  until it moves and for two seconds after. The wave pauses when the focus
  leaves the room, the page is hidden, the screen turns or a dialog opens,
  and goes on only when the player says; a run taken up after a reload
  starts paused. Nothing goes on until the field is drawn
  (`GameService.setDrawn()`, which the board calls from its canvas), since a
  wave nobody can see would be lost.
- **Its colors are the palette's and its own inks'.** `beltPalette()` takes
  the field, its line, the specks, the ship, the pickups, the shots, the
  flame and the comets from the page's roles, which `ThemeService` reads,
  and the rocks' and the pilots' inks from `inks.ts`, for light palettes and
  for dark; `src/view/contrast.spec.ts` holds them apart in every palette.
- **The placeholder, the ring and the cards work out the field in CSS,** as
  `fieldMetrics()` does, at the window's pixel ratio, from the room the
  board measures as it is first drawn; they take the scene's own rectangle
  once it has drawn (`data-field`), and the layout check holds the
  placeholder to it.
- **Motion follows the player's preference** (`GameViewportService`'s
  `allowsMotion`): without it every flourish but the points is left out,
  the points showing where they were scored without rising; the pickups'
  breath, a stray's bob, a warning's pulse, the flame's flicker and the
  pilots' blinks hold still; and the cards open without waiting.

## Styling

A component stylesheet that needs the toolkit opens with
`@use "../styles" as *;`, which brings in `@fz/style`'s mixins and
`@fz/game-ui`'s breakpoints, and nothing else; the app's own takes
`@fz/game-ui` alone, for the bar's size. The frontend's Angular and Sass
rules apply; on top of them:

- **No color is written in a stylesheet.** The field's, the rocks' and the
  pilots' are the palette's and the inks', which the scene draws, and which
  `<app-pilot>` takes as its `color` from `pilotInk()`; the placeholder
  draws with the palette's tokens.
- **The size comes from the stage,** a size container: the board fills it,
  and the component lays the field out in it as the scene does, the margin
  (`--margin`) and the frame (`--frame`) around it, clear of the deck. The
  board is a size container too, and its cards set smaller on a small
  board.

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
  among them, the score of the best run started there at each speed. Ids
  no sector has any more are dropped.
- `asteroid-breaker-progress`: the ids of the sectors reached, at any
  speed, which a run may start at, Endless's among them once a run has
  cleared the last written wave. Ids no sector has any more are dropped.
- `asteroid-breaker-game`: the run under way, by `SavedGameService`: its
  wave, by number and id, the wave it started at, its speed and seed, its
  points, its crew's colors and those at home, the strays brought home, for
  the result card, and whether it was flown on tuned numbers; and its
  field's size as laid out and as it is now, its rocks, whole or with a
  blast to go off, and the counts its draws, strays, comets and points run
  by. A wave not yet moved is kept as not yet begun, a wave just cleared as
  the next not yet begun, and a stray adrift, the comets, the pickups, the
  shots, the effects in play and the chain go. It is written as a wave
  starts, as its crew changes, as it pauses or goes on, and as the page is
  hidden or goes away, never at a step, forgotten once the run ends or
  another begins, and taken up paused at startup, fitted to the board's
  room as a pause is.

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
  above, and every wave begun, stray drifting in or brought home, ship
  gained or lost, pickup caught, pause, going on, wave cleared and end is
  announced.

## Development Commands

Run these from `frontend/games/asteroid-breaker/`, or as
`yarn workspace asteroid-breaker <script>` from `frontend/`. The root's
`yarn lint`, `yarn typecheck`, `yarn test` and `yarn build` run this
workspace's with the others'.

- **Run Development Server:** `yarn dev` (at `http://localhost:9005/`; the
  Solitaire Collection's uses 9000, Minesweeper's 9001, Sudoku's 9002,
  Snake's 9003 and Brick Breaker's 9004).
- **Production Build:** `yarn build`, into `dist/`; `yarn preview` serves it.
- **Run Unit Tests:** `yarn test` (the whole suite once, with coverage,
  failing below the floor `vitest.config.ts` sets for the rules and the
  view), `yarn test:watch`, or `yarn vitest run <path>` for one spec, which
  leaves the floor alone.
- **Linting:** `yarn lint` (ESLint with `@fz/dev`'s blocks and the fences
  between the layers, then stylelint with `@fz/style`'s preset).
- **Type Checking:** `yarn typecheck` (the app, the specs, the Vite
  config, and the scripts under `tools/` from their JSDoc).
- **Report the Waves:** `yarn report:waves` (runs `tools/report-waves.mjs`:
  the autopilot in `src/testing/autopilot.ts` plays every wave at every
  speed on the narrowest field, or the widest with `--field wide` on its
  side or `--field tall` upright, from the wave's number as the seed, as
  the autopilot's spec does, through `playWave()`. It prints the game time
  each took and the strays it brought home, flown with nothing able to
  take the ship, and the ships each cost as the spec plays it, and fails
  if any play didn't clear its wave in time (`-`). It is how the climb
  from wave to wave is tuned; `--seeds <n>` plays each wave from that many
  seeds of its own, since one seed's rocks and pickups can make a wave look
  far easier or harder than it is. `--endless` plays Endless's waves 31 to
  60 instead, each made from the seed it is played from, and fails only on
  a play that didn't clear its wave in time with nothing able to take the
  ship, as Endless is held to being fair, not to what it costs).
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
  which synthesizes the fourteen sounds, from a shot's tick to a wave's
  chime and the thrust's hum, with `@fz/dev/sounds` into
  `src/scene/sounds/sounds.wav` and their spritemap, `sounds.json`, the
  same bytes every run; their names and order are the view's `SOUNDS`,
  which the scene's spec holds them to).
- **Capture Screenshots:** `yarn capture:screenshots` (runs
  `tools/capture-screenshots.mjs` against the running dev server in headless
  Chrome, through `@fz/dev/chrome`: it reads the field's shape the board lays
  out at 1280 × 720, then a run kept by the rules on it (`keptRun()`, in
  `src/testing/kept_run.ts`), begun on wave 9, Crowd, at Normal and played by
  the autopilot until a second before its first stray, is taken up and gone on
  with, firing, until the stray drifts in, at 2× on Casino night, written to
  `public/docs/screenshots/asteroid-breaker/` as the site's `preview.webp`
  (2560 × 1440), which `index.html` names as the link preview, and
  `thumb.webp` (576 × 324, the field whole, with the bar above it, as the
  field is wider than a thumbnail) by `@fz/dev/screenshots`; `--url` names
  another server, such as `yarn preview`'s, and `--chrome <path>` or
  `CHROME_PATH` picks the browser).

## Tests

The repository's rules for specs apply. A spec sits beside the file it
tests, named after it, and runs in jsdom; `src/test-setup.ts` installs
`@fz/phaser/testing`'s headless Phaser first, so a scene's spec runs real
Phaser through `runScene()`, with a fake shell over a pictured field. This
workspace's `asteroid-breaker-testing` skill covers its setup, floors and
fixtures, the repository's `angular-testing` the patterns every Angular
workspace's specs share, and `phaser-core` the harness. What the specs
share is in `src/testing/`:

- `field_picture.ts` lays a field out from a picture of its rocks and its
  ship (`fieldFrom()`), each character a cell 4 units across (`CELL`), on a
  field of 72 by 40 unless it says another (`PICTURE_TORUS`), lays a rock, a
  pickup, a stray or a comet on it where a spec says (`placeRock()`,
  `placePickup()`, `placeStray()`, `placeComet()`), steps it and reads its
  events, so a spec of the field reads as the field it plays.
- `art_frames.ts` draws the atlas in one palette at one scale for the art's
  specs, and finds a frame by its name (`frameNamed()`).
- `autopilot.ts` plays a wave as a fair player would (`autoplay()`,
  `playWave()`), steering each frame by `pilot()`: it flees a rock or a
  comet whose course comes near the ship, dashing when one is about to meet
  it; else brings the stray adrift home or catches the pickup it has time
  for; else turns toward the rock it can hit soonest, leading it.
  `src/rules/autopilot.spec.ts` holds every wave, at every speed, on the
  narrowest field and the widest either way up (`NARROWEST`, `WIDEST`,
  `TALLEST`), to being cleared by it within four minutes of game time
  (`AUTOPILOT_LIMIT`), meeting a comet and a stray if it sends them, and
  Endless's waves 31 to 60 (`ENDLESS_PLAYED`) to being cleared so with
  nothing able to take the ship. `src/rules/spawn.spec.ts` holds every wave,
  in every formation, on those fields, at every speed and from twelve
  seeds, to being laid out fairly.
- `belt_board.ts` runs the scene for a spec (`startBoard()`) on a
  `FakeShell` that plays the shell's part, and reads what it draws
  (`shown()`, `imagesIn()`, `strokesOf()`); `canvases.ts` makes the canvas a
  board has in a window of a shape (`boardOf()`, `viewport()`), for the
  specs of the layout, the steering and the scene.
- `roles.ts` puts a palette's roles on the page (`paintRoles()`) for the
  specs that color the field, and `pilots.ts` reads the pilots an element
  draws (`pilotsIn()`).
- `play.ts` holds the small waves the shell's specs play, each set up to
  come to one thing soon (`SPEC_WAVES` and the others), handed to
  `GameService` through `GAME_WAVES` with a seed of its own through
  `GAME_RANDOM` (`provideSpecWaves()`), and plays them through `tick()`,
  steering the ship from the frame it reads (`shoot()`, `ram()`,
  `toPickup()`, `toStray()`, `playUntil()`, `loseShip()`, `endRun()`,
  `playToClear()`, `clearToNext()`).
- `kept_run.ts` keeps a run begun at a wave and played by the autopilot
  until its first stray is near (`keptRun()`), for the screenshots' script.

The board's spec runs on `provideFakePhaserCanvas()`, and then with the real
scene it loads.
