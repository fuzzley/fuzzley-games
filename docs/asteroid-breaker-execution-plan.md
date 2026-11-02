# Plan: building Asteroid Breaker, step by step

Answered 2026-10-31: the user took every recommendation of the design plan,
with changes of their own to decisions 3, 12, 23 and 25, and asked for this
plan of how it is built, as Brick Breaker was: a work log, regular commits,
QA checkpoints and an independent review of every change. The design plan
is folded in below ("Design reference"), and its file became this one. The
[mock page](https://claude.ai/artifact/WGnBUrcPphdq9U1RMEvViN), a private
artifact, draws the look, the layouts, the art, the rules' diagrams, the
cards and the pilots' colors, and has a sketch to fly; the sketch is
throwaway code written for the mock, not the game's.

Asteroid Breaker is the sixth game hosted on fuzzley.games, at
`/play/asteroid-breaker/`, in the Arcade category beside Snake and Brick
Breaker: a small ship, flown by the site's fuzzball, drifts in a field of
space that fills the screen and wraps at every edge, turning, thrusting and
firing, and breaks every rock in the wave into smaller and smaller pieces
before one of them finds it, bringing home the stray fuzzballs it meets;
thirty waves, then Endless. Its rules, physics included, are plain
TypeScript, its field is a Phaser scene, and its shell is Angular on the
shared libraries, laid out as Brick Breaker is. The work has two parts:

- **Part 1 lifts six pieces into the libraries:** four of Brick Breaker's
  (its fixed-step clock, its event log, its frame's sounds and its points
  grouped in thousands) and two new ones (a sound held while a key is, and
  a deck beside a board in the layout check). Brick Breaker adopts the four
  it gives, and nothing about it changes.
- **Part 2 builds the game,** from an empty workspace to a game linked from
  the catalog: its rules and physics first, tested in Node, then its view,
  its scene and its shell, five waves of it put in front of the user on real
  phones before the other twenty-five are built.

The game keeps the genre's conventions: inertia, a wrapping field, rocks
that split into smaller, faster pieces. What is its own: rock kinds as a
catalog (as Brick Breaker's bricks are), thirty designed waves in three
sectors and Endless after them, a comet and stray fuzzballs to bring home in
place of enemy ships, a dash in place of a random jump, a chain multiplier,
a round pod flown by the site's fuzzball, each pilot in a color of its own,
and flat art in the site's palettes.

## The user's answers

All 26 decisions, as answered; "Design reference" cites them by number, and
marks the user's own:

1. The name is Asteroid Breaker, at `/play/asteroid-breaker/`, workspace
   `games/asteroid-breaker`, port 9005, in Arcade.
2. The genre's flight, with inertia: the ship turns, thrusts along its
   heading, drifts and slows; a shot leaves with the ship's speed added.
3. The field fills the screen (the user's): all the room the bar and the
   deck leave, whatever its shape, wrapping at every edge. Its short side is
   40 units and its long side as long as the room, up to 88; a wave's rocks
   are written for 40 by 40 and grow in number with the field's area.
4. Touch: a deck beside the field, under it upright and on both sides of it
   on its side, never over it: a stick that appears where the left thumb
   lands, turning the ship toward where it points and thrusting past half
   way, and Fire and Dash for the right thumb; a setting swaps the hands.
5. The deck is drawn in the canvas, by the scene, and read by the view's
   `Steering`.
6. Fire is held: 7 shots a second, 6 in flight at most. "Fire by itself" is
   a setting, off by default.
7. The escape is a dash: 0.22 s along the heading, untouchable, recharged
   in 2.5 s.
8. Seven rock kinds, told apart by shape and marks as well as color; rocks
   pass over each other.
9. No enemy ships: a stray fuzzball to bring home and the comet give a wave
   its surprises.
10. Eight pickups, none bad: one of each group at a time, drawn in from 3
    units, 8 s to catch, one guaranteed after 25 s without any.
11. Effects end with their wave and with a lost ship.
12. Thirty waves in three sectors of ten, as data, each sector ending with a
    boulder, then Endless (the user's), made from the run's seed and harder
    each wave; a run starts at any sector reached, or at Endless once wave
    30 is cleared.
13. The game waits for the player: a wave's rocks hold still under the Ready
    card until the first move, and a new ship waits, untouchable, where it
    is safest.
14. Three ships, one more at 10,000 points and every 20,000 after, six at
    most.
15. Scoring by kind and size, smaller worth more; a chain of breaks each
    within 1.5 s of the last scores double from the fifth, triple from the
    tenth and four times from the twentieth; 500 for a cleared wave and 500
    more with no ship lost; 500 for a stray brought home.
16. Relaxed, Normal and Fast, in the bar's `<fz-bar-choice>`, with bests for
    each.
17. The field takes the palette's field, light space in a light palette and
    dark in a dark one; the rocks take the game's own inks, held to the
    contrast spec.
18. Flourishes only where motion is welcome.
19. Thirteen sounds and the thrust's hum, on by default, with the Sound
    button.
20. Haptics on a lost ship and a cleared wave, on phones that can, on by
    default.
21. A game taken up after a reload keeps its rocks, score, ships, pilots and
    wave, and comes back paused.
22. Part 1 lifts six pieces into the libraries, Brick Breaker adopting each
    unchanged, and merges first.
23. The feel is settled by the user on real phones at Q3, before the other
    twenty-five waves are built, with a debug menu in development builds
    holding every control the mock's sketch has (the user's).
24. No gamepad in this plan.
25. Fuzzley flavor, all five (the user's): the pilot in the window, pilots
    for ships in the bar, the bail-out, strays to bring home in place of the
    gold nugget, and a constellation in Endless; every pilot in a color of
    its own that stands out against the field and the bar in the palette the
    player chose.
26. A stray brought home joins the crew: it waits at home and flies the next
    ship the run gains; ships still come only as decision 14 says.

## How the work runs

This is the process every step follows, from the first commit to the last,
written here so it isn't forgotten halfway. It is Brick Breaker's, with its
reviews now made before each commit, as the `commit-review-process` skill
says.

### Where it is built

In the sibling worktree `C:\Users\fuzz3\Projects\personal\fuzzley-games-asteroid-breaker`,
where this plan was written, so the main checkout stays free for other
work. Before the first step: `yarn install` from its `frontend/`, and
`node .agents/link-claude-skills.mjs` from its root, so its skills load. Its
dev server is 9005's, and `yarn stop` there stops only its own. Once the
work is merged the worktree is removed, with the robocopy step the
`node_modules` in it needs on Windows.

### Branches

- **Part 1** is built on `asteroid-breaker-lift`, cut from this plan's
  branch, `asteroid-breaker-plan`, once that is rebased onto `main`, so the
  plan and its log go with the work.
- **Part 2** is built on `asteroid-breaker`, cut from the tip of
  `asteroid-breaker-lift` once Part 1 is done, so it starts on the lifted
  pieces without waiting for a merge.
- **Nothing is pushed, and nothing reaches `main`, without the user's
  go-ahead.** When it comes, `asteroid-breaker-lift` merges first, on its
  own, since it changes a live game, and `asteroid-breaker` after it
  (decision 22).

### A step is a commit

Each step under "Phases" ends in one commit, in the repository's form
(`feat(core): …`, `feat(asteroid-breaker): …`, `test(…)`, `docs: …`), once:

- the workspaces it touched pass their own `lint`, `typecheck` and `test`
  (`yarn workspace <name> <script>`), and `yarn prettier:check` passes;
- what it adds is covered by specs, at the workspace's floor;
- the docs it makes untrue are brought up to date in the same commit (an
  `AGENTS.md`, a skill, `docs/operations.md`);
- its review is answered (below);
- the work log has its entry.

The last step of each phase runs `yarn verify` too, which must be green
before the next phase starts.

### Every change is reviewed before it is committed

As the `commit-review-process` skill says: the step's change is staged,
then a fresh `general-purpose` agent, never a fork, reviews the staged diff
with only the project's and the phase's context, and reports without
changing anything. Its brief is the skill's, filled in with:

- **the project:** "Asteroid Breaker, a Phaser game for fuzzley.games; read
  `docs/asteroid-breaker-execution-plan.md`, step `<step>`, and the
  sections of its design reference the step names";
- **the phase and the change:** the step's own words below, and the files
  it touches;
- **the skills to read:** `phaser-core` and `phaser-canvas-performance` for
  the scene, `angular-testing` and `fuzzley-ui` for the shell,
  `web-game-accessibility` for the board and the dialogs, and
  `brick-breaker-testing` for Part 1's changes to Brick Breaker.

Every comment is answered, fixed or left with a reason, in the work log
under the step; the fixes go into the change, its checks run again, and then
it is committed. A fix that reshapes the change, rather than correcting it,
earns a second review before the commit.

### The work log

`docs/asteroid-breaker-worklog.md`, committed with the step it records.
Each step's entry gives the date, the commit, what was built, any choice
made that this plan didn't make (and why), what the checks reported, the
review's comments and what became of each, and numbers worth keeping:
bundle sizes, timings, the autopilot's report. QA checkpoints log what was
tried, on what, and what was found. A design change found on the way is made
in this plan too, so the plan stays true.

### QA checkpoints

Beyond the specs, thorough checks by hand and in a browser, each logged, at
six points. Screenshots go to the user as they are taken, from Q3 on, so
the look can be redirected early.

| Checkpoint | When                       | What                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1         | L5                         | Brick Breaker unchanged: `yarn verify`, its `check:layout`, its sounds the same bytes, `yarn report:levels` the same numbers, and a level played in its dev server by keys, mouse and touch                                                                                                                                                                                                                       |
| Q2         | after A6                   | The rules alone: the five waves over many seeds at every speed, on the narrowest and widest fields; a thousand seeded random flights checked for a ship, shot, rock, pickup or stray off the torus; the physics' cost at the widest field's cap (105 rocks, 42 shots, two comets) timed in Node                                                                                                                   |
| Q3         | after A9, the feel gate    | The five waves played by keys and mouse in windows from a small phone's to a 2560 × 1440 desktop's, and by the user on real phones, upright and on their side, Android's Chrome and, if one is to hand, an iPhone's Safari, from the dev server on the local network (`yarn dev --host`); the feel tuned through the debug menu and its numbers copied into `tuning.ts`. The build waits here for the user's word |
| Q4         | after A14                  | The whole shell: every dialog by keyboard and by mouse, the cards, the bar on a phone and a wide screen, the pilots' colors in every palette, sound and haptics, settings, records and progress across a reload, a saved game taken up, one in Endless among them, a light palette and a dark                                                                                                                     |
| Q5         | A15                        | The full pass A15 lists: every wave of the first sector and the last of each other, and Endless's first, by mouse, keys and touch; AZERTY; a lost context; the accessibility tree; Lighthouse; a performance trace at ×6 and at 120 Hz on the widest field; the bundle's sizes                                                                                                                                    |
| Q6         | A17, before asking to ship | The site's build and the Docker image: the game reached from the catalog, played at `/play/asteroid-breaker/` with the console open, no "Refused to load"                                                                                                                                                                                                                                                         |

A problem a checkpoint finds is fixed in a commit of its own, reviewed as
any other, before the next phase.

### What changed from the design plan's phases

- **Steps are commits,** each reviewed before it is made, where the design
  plan's phases were "a few commits".
- **Part 2 starts from the lift's branch,** not from `main` after a merge,
  so it doesn't wait for one.
- **The debug menu comes with the board (A9),** in a first settings drawer,
  since Q3 tunes the feel through it; the rest of the settings follow in
  A10.

## Phases

Sizes are rough: small is an hour or two, medium half a day, large a day or
more. Paths in Part 1 are under `frontend/lib/` or
`frontend/games/brick-breaker/`; in Part 2, under
`frontend/games/asteroid-breaker/` unless they say otherwise.

### Part 1: the lift (`asteroid-breaker-lift`)

#### L1: `@fz/core`'s four (medium)

- **L1.1** `@fz/core/clock`: `src/clock.ts` and its spec, from Brick
  Breaker's `src/rules/stepper.ts`. `createClock(stepMs, maxStepsPerFrame)`
  makes a `Clock` that keeps them, which `advanceClock()` and
  `progressOf()` read; `stepsIn(ms, stepMs)` takes the step's length
  itself, since the rules count their timers with no clock to hand. Brick
  Breaker's `stepper.ts` keeps `STEP_MS`, its own `stepsIn(ms)` and
  `createFieldClock()`, its clock of 1/120 s and 12; its stepper spec's
  cases move to the library's, and its other specs pass unchanged.
  `package.json`'s `exports` gains the entry. One commit.
- **L1.2** `@fz/core/event_log`: `EventLog<E>`, from Brick Breaker's
  `src/rules/events.ts`, taking its size and a function that makes a blank
  record; `next()` hands back the next record, numbered, to fill in place,
  and the readers read on from the last number they saw, as Brick Breaker's
  do. Brick Breaker's `events.ts` keeps `FieldEvent`, `FieldEventKind` and
  `EVENT_LOG_SIZE`, and its `FieldEventLog` is an `EventLog<FieldEvent>`
  whose `add()` fills `next()`'s record, so its callers are unchanged. One
  commit.
- **L1.3** `@fz/core/frame_sounds`: `FrameSounds<Name>`, from Brick
  Breaker's `src/view/effects.ts`, taking the sprite's names; each sound once
  a frame at most, at the highest it was heard. Brick Breaker passes its
  `SOUNDS`, in the view's `createFrameSounds()`, since the view holds the
  sprite's names and ties them to the gatherer once. One commit.
- **L1.4** `formatPoints()` moves into `@fz/core/format` beside `count()`,
  unchanged; Brick Breaker's `describe.ts`, every caller and its screenshot
  script import it from there. Each of the four is specced to 100%, as
  `@fz/core`'s floor asks. One commit.

#### L2: a sound held (small)

- **L2.1** `SpritePlayer.hold(name, held)` in `@fz/phaser/sound`: it loops
  a sound of the sprite while held is true, and stops it when it is let go,
  when `follow(false)` turns the sound off, or when the scene shuts down;
  a second `hold()` of the same sound while it plays changes nothing.
  Specced on `runBareScene()`, the sprite put in the audio cache, as
  `play()` is, since the headless game has no audio. Brick Breaker doesn't
  use it. One commit.

#### L3: a deck in the layout check (small)

- **L3.1** `@fz/dev/layout`'s `PhaserBoard` takes an optional `deck`
  (`PhaserDeck`): the attribute of the board's element that lists its
  zones, each its name and "x y width height" in CSS px on the canvas, as
  `data-field` gives the field, parted by commas; the zones it must show;
  and the least a zone may be across and down. A second inspection in the
  page, `inspectPhaserDeck()`, run once the board's says where the board
  lies, holds each zone named and shown once, on the canvas and in the window,
  clear of the board's field, of the other zones and of the bar's controls, and
  at least that size, and says which failed, by its name. Specced as the board's
  other checks are. Brick Breaker's check, which names no deck, is unchanged.
  One commit.

#### L4: docs (small)

- **L4.1** `@fz/core`'s, `@fz/phaser`'s and `@fz/dev`'s `AGENTS.md`,
  `frontend/games/AGENTS.md`, Brick Breaker's `AGENTS.md` and
  `brick-breaker-testing` skill, and the `phaser-core` and `fuzzley-ui`
  skills, each naming the lifted pieces where
  it named Brick Breaker's. `node .agents/check-skill-references.mjs`
  passes. One commit.

#### L5: proof (small)

- **L5.1** `yarn verify`, Brick Breaker's `check:layout`, then Q1. Fixes, if
  any, in commits of their own. Part 1 is done; `asteroid-breaker` is cut
  from its tip.

### Part 2: the game (`asteroid-breaker`)

#### A1: the workspace (small)

- **A1.1** `frontend/games/asteroid-breaker/`, from Brick Breaker's:
  `package.json` (`asteroid-breaker`, with `phaser`, `@fz/phaser`,
  `@fz/core` and the other libraries), `vite.config.ts`
  (`gameConfig({ port: 9005, name: "Asteroid Breaker" })`),
  `vitest.config.ts` with the floors on the rules and the view,
  `eslint.config.js` with `@fz/dev`'s blocks, `phaser()` for `src/scene/`
  and the four layers' fences ("Layers"), the tsconfig solution,
  `stylelint.config.js`, `src/test-setup.ts` with the headless Phaser,
  `index.html`, `src/main.ts` with a shell that shows only the game's name,
  `LICENSE`, `README.md`, `AGENTS.md` and `CLAUDE.md`. `yarn install`; the
  workspace's lint, typecheck, test and build pass. `games.json` doesn't
  list it yet. One commit.

#### A2: the torus and the flight (large)

- **A2.1** `src/rules/tuning.ts` and `speed.ts` (Relaxed, Normal and Fast,
  each a factor on the rocks' and comets' speed, Relaxed's comets half as
  many and its pickups a quarter more likely), with the clock from
  `@fz/core/clock` at 1/120 s and 12. Specced. One commit.
- **A2.2** `src/rules/torus.ts`: the field's size in units, the wrap, the
  shortest way from one place to another across it, the distance, and the
  copies an object near an edge needs drawn, one to four. Specced by cases,
  the corners and a field of 88 by 40 among them. One commit.
- **A2.3** `src/rules/ship.ts`: the flight from a frame's `Steer`, the turn
  by keys ramped in, the turn toward a heading eased, the thrust, the
  coasting's half-life, the top speed; the dash, its untouchable time and
  its recharge; and the guard. Specced by flights: a tap's few degrees, no
  overshoot toward a heading, turning round to stop, the top speed held,
  the dash's speed after. One commit.
- **A2.4** `src/rules/catalog/weapons.ts` (`WEAPONS`: the plain gun, and
  Spread, Rapid and Lance as data, which A4's pickups hand out) and
  `src/rules/shots.ts`: shots fired from the nose at the weapon's rate and
  count, their speed plus the ship's, wrapping and fading, swept as segments
  against circles across the wrap. Specced: no shot passes a small rock in a
  step at the fastest the ship and a shot go together, across an edge and
  at a corner. First, in a commit of its own, `keysOf()` moves from Brick
  Breaker into `@fz/core/records`, the weapons' catalog being the second to
  need it ("The lifted pieces"). Then one commit, `yarn verify` with it.

#### A3: rocks (large)

- **A3.1** `src/rules/catalog/rocks.ts` (`ROCK_KINDS`, `RockKind`,
  `RockTrait`), as "The catalogs" has them, `as const satisfies`, and the
  rocks' part of `src/rules/catalog.spec.ts`, beside A2.4's weapons': every
  entry named and described, hits and points for every size it comes in.
  One commit.
- **A3.2** `src/rules/rocks.ts`: `Rock`, laid in slots made once, as
  many as the cap, by `addRock()`; `hitRock()`, the split into pieces of
  the next size, each turned 25° to 50° off its travel by the run's seeded
  random and pushed along the shot's, as many as the free slots hold at
  the cap, one at least; `stepRocks()` and `setOffBlasts()`; and
  `TRAIT_RULES` for `blasts` (the reach, the 90 ms beat, the chain),
  `gives`, `drawn` (the lodestone's pull, never past its size's speed) and
  `rings` (iron's ring as a hit holds). It acts on `RockField`, what of the
  field the rocks need, which A3.3's `Field` extends, and begins
  `src/rules/events.ts` with the rocks' events and `src/rules/draws.ts`
  with the seeded draws. Specced trait by trait; `shots.spec.ts` takes a
  small rock's radius from here, which it writes out until then. One
  commit.
- **A3.3** `src/rules/field.ts`: `Field`, a wave in play, stepped in place
  from records made once: `createField()` from a `FieldSetup`,
  `steerField()` and `stepField()`, the ship, the shots and the rocks, hits
  (a Lance shot that breaks a rock flies on past its pieces, not into them,
  as a shot keeps each step it broke through a rock in and passes the rocks
  laid then), blasts, a lost ship and a cleared wave, and the events it logs
  through `@fz/core/event_log`: a pull fired and a dash started, which
  `stepShots()` and `flyShip()` now report, a ship lost and the wave
  cleared. With `src/testing/field_picture.ts` (`fieldFrom()`), a field
  laid out from a picture of its rocks and ship. Specced, the same seed and
  steering making the same field among it. One commit, `yarn verify` with
  it.

#### A4: pickups, strays, pilots, the comet and scoring (large)

- **A4.1** `src/rules/catalog/pickups.ts` (`PICKUPS`, the effect union);
  `src/rules/drops.ts`, the drop by chance, crystal and drought and the
  draw by weight from the wave's pool through `@fz/core/random`'s
  `drawAt()`, which `hitRock()` calls as a rock breaks, acting on
  `DropField`, what of the field a drop needs, which `RockField` extends;
  and `src/rules/pickups.ts`: the drift, the pull to the ship, the catch,
  the 8 s and the blink, and `EFFECT_RULES` for every effect (weapon,
  guard, pull, pace, nova, ship), one of each group at a time, each ending
  with its wave and a lost ship. The drop is a file of its own as the Nova
  hits rocks: `pickups.ts` imports `rocks.ts`, which can't import it back.
  The field breaks a rock that touches a shielded ship a size down, the
  ship untouchable 1 s after, and `events.ts` records an event by what it
  happened to: `add()` a place's, `addRock()` a rock's, `addPickup()` a
  pickup's. The catalog spec's checks of the pickups join it. Specced
  effect by effect. One commit.
- **A4.2** `src/rules/pilots.ts` and `hazards.ts`: the crew, those at home
  and `nextPilot()` (decisions 25 and 26); a stray's times (20 s into a
  wave, then 8 s after the last has gone), its crossing, its catch and the
  Magnet's pull on it, and the bail-out's event; the comet's warning, its
  crossing, its breaking rocks a size down for nothing, and its taking the
  ship. `src/rules/pilots.spec.ts` as "The checks that keep it whole" says.
  The crew is a value the field holds through a wave, from the run's as
  it starts, so the field gives every color, a stray's and a new pilot's
  alike, and the run takes the crew back as it catches up; the Extra ship
  joins it, six ships at most. A comet's blow smashes a rock: it breaks it
  as the Shield's does, but lets no pickup go, a crystal's or a drought's
  either. Specced. One commit.
- **A4.3** `src/rules/scoring.ts` and `run.ts`: points by kind and size,
  from the catalog's `rockPoints()`, scored as a rock breaks unless a comet
  smashes it, so the Shield's breaks score; the chain's multiplier, counted
  break by break, blasts among them, and its ending, by time or a lost
  ship; a stray's 500, times the chain; the wave's 500s; a `"scored"` event
  at each break and stray, its points and multiplier, for the "+40 ×2"; the
  ships points bring, each flown by the first stray at home, and a
  `"gained"` event with its pilot for each ship gained, by points or an
  Extra ship, for its chime and the announcer; nothing scored once the run
  is over, so its score doesn't hang on its frames; `tallyOf()`,
  how a cleared wave's points add up, for its card; and `Run`'s moves, as
  Brick Breaker's, with `catchUp()` taking what the field has come to since
  it last looked, the crew among it, and `waveStart()` handing each wave's
  field its seed, the crew, the points banked and the next ship's mark.
  The field gains the ships points bring, since the crew is the field's in
  a wave: before the ship meets the rocks, so a step's points can save the
  last ship, and again after the clear, for its points.
  Specced. One commit, `yarn verify` with it.

#### A5: waves and the field whole (medium)

- **A5.1** `src/rules/waves.ts` (`parseWave()`, `SECTORS`, `WAVES`),
  `src/rules/waves/inner-belt.json` with waves 1 to 5, and
  `src/rules/waves.spec.ts`, the checks that need a whole sector waiting for
  A13; the catalogs' guards of a file's names (`isRockKindId()`,
  `isRockSize()`, `isPickupId()`), and `ROCK_CAP` and `STRAYS_FROM` in
  `tuning.ts`. One commit.
- **A5.2** `src/rules/spawn.ts` (the four formations, the placement's
  fairness, the safest place for a new ship) and `fill.ts` (`fillFor()`, the
  cap, the pickups at once, the strays and the comets' times for a field's
  area, and `stretchField()`), with `src/rules/spawn.spec.ts` over many seeds
  on the narrowest and widest fields, every wave in every formation at
  every speed, and `fill.spec.ts`. One commit.
- **A5.3** The field whole: `fieldFor()`, a wave laid out from its `Wave`
  on a field of any shape at a speed, holding still for the first move
  (decision 13); the next ship a second after one is lost, waiting where it
  is safest, untouchable, and given what the player holds as it comes
  (`createShip()`'s `held`), as the wave's first is; `reshapeField()`, the
  stretch on a pause, with the 1 s guard after it through `guardShip()`,
  which counts it from the step that follows; and one name, `waveKind`, for
  the kind of rock a wave names, which its boulders break into. Specced.
  One commit, `yarn verify` with it.

#### A6: the autopilot (medium)

- **A6.1** `src/testing/autopilot.ts`, flying as a fair player would
  ("The checks that keep it whole"), `src/rules/autopilot.spec.ts` (the five
  waves at every speed, on the narrowest and widest fields, from fixed seeds,
  each cleared within four minutes of game time), and
  `tools/report-waves.mjs`, `yarn report:waves`, printing each wave's time,
  the ships it cost and the strays brought home, with `--seeds <n>` and
  `--field <narrow|wide|tall>`. One commit, `yarn verify` with it, then Q2.

#### A7: the view (large)

- **A7.1** `src/view/field_metrics.ts` (`deckLayout()`, `fieldRoom()`,
  `fieldShape()`, `fieldMetrics()`, `toCanvas()`, `toField()`), `frame.ts`, `layers.ts`, `timing.ts` and
  `controls.ts` (the keys by `event.code`). `fieldShape()` keeps the field
  it had while its room has no area, as a hidden page's is, and never asks
  `torusFor()` for one, which throws. Specced, the layout at every
  `@fz/dev/layout` shape: the field filling its room, its short side 40
  units, a unit of 6 CSS px or more, a deck of its least size. One commit.
- **A7.2** `src/view/stick.ts`, `deck.ts` and `steering.ts`: the stick's
  rings, its remapping, its following base and its one finger; Fire and
  Dash by which finger is where, within 12 px; the keys as a turn and a
  push, the mouse as a place to aim at (`Steer.aim`) once it moves, kept
  from its last move so a still pointer gives the same place, the stick as
  a heading, its rings with some give, so a thumb resting on one doesn't
  flicker a push or a heading on and off; the stick at rest and the buttons
  kept 16 px from the stage's sides, off the screen's edges; swapped
  hands and "Fire by itself". Specced by cases. One commit.
- **A7.3** `src/view/palette.ts`, `inks.ts` (the rocks' inks, seven for
  light palettes and seven for dark, and the pilots', eight for each, with
  `pilotInk()`) and `contrast.spec.ts`, holding every color "The checks
  that keep it whole" names in every palette. One commit.
- **A7.4** In two commits, so each review can hold its diff.
  - **A7.4.1** `src/view/art.ts`, `rock_art.ts`, `pilot_art.ts`,
    `ship_art.ts`, `symbols.ts` and `shapes.ts`: every frame of the atlas
    as plain commands, the pilot in each ink and its eyes from
    `@fz/style/fuzzball` among them, a stray's bubble and the
    constellation's places, and the deck's parts, white, apart; with
    `@fz/phaser/scene`'s `atlasSize()`, so a spec can hold the atlas to a
    size. Specced: every frame within its size, every kind in every state
    present, every mark on its rock's body, the frames fitting 2048 × 2048
    at the largest unit.
  - **A7.4.2** `effects.ts`, `flourish.ts` and `tags.ts`, with the tags'
    frames: what each event calls for, its sound and its flourishes.
    Specced: each event's effects with motion and without. `yarn verify`
    with it.

#### A8: the scene (large)

- **A8.1** `src/scene/belt_scene.ts`, `atlas.ts`, the two cameras, and the
  field, rock, ship and shot painters, an object across an edge drawn on
  both sides from pooled images; the steering written each frame, the atlas
  baked again on a new palette or unit. Specced on `runScene()` with a fake
  shell. One commit.
- **A8.2** The pickup, stray, hazard, effects, points, tag and deck
  painters; the particle emitters on the atlas; the events played once each,
  the rules logging on each what its flourishes need, the way the blow that
  broke a rock came, for the kick, and the slot of a rock that held a hit,
  for its flash;
  How to play's pictures from the atlas; nothing with motion off; no game
  object made after `create()`; nothing called after the scene ends.
  Specced. One commit, `yarn verify` with it.

#### A9: play and the board (large)

- **A9.1** `src/app/play/game.service.ts`, `src/view/wave_play.ts` and
  `src/rules/describe.ts`: the run in a signal and the wave in play outside
  one, `tick()`, steering, pausing, going on, starting waves and runs, the
  question before a run is thrown away, and what the announcer says.
  Specced. One commit.
- **A9.2** `src/app/board/` and `app.component` with the room
  (`[fzPlayRoom]`) and the focus: the scene loaded with `import()` behind a
  CSS drawing of the empty field and the deck's room; the Ready, Paused,
  Cleared and Ended cards, still loading and couldn't be drawn; the pointer
  hidden while a ship flies; haptics through `navigator.vibrate`. Specced
  with `provideFakePhaserCanvas()`, a wave played to its end through
  `tick()`. One commit.
- **A9.3** A first settings drawer holding the three settings the debug
  menu changes (fire by itself, which side holds the stick, when the deck
  shows) and, in a development build (`DEBUG_MENU`), the Debug section: the
  eight sliders and four switches "The debug menu" lists, acting on the
  field in play (`Field.debug`), Reset the numbers and Copy the numbers.
  Specced. One commit, `yarn verify` with it, then Q3, where the build
  waits until the user says the feel is right.

#### A10: the bar, the icon and the dialogs (medium)

- **A10.1** An `asteroid` icon in `@fz/ui` with its spec's case;
  `src/app/pilot/` (`<app-pilot>`, a fuzzball in a pilot's ink); and
  `src/app/bar/`: the link home, the name with the speed's badge, the wave,
  the score, the ships as their pilots, the chain while it counts, and
  Pause, Sound, Sectors, New game, How to play and Settings, the overflow
  on a compact screen. Specced. One commit.
- **A10.2** `src/app/sectors/`, `result/`, `help/` and the rest of
  `settings/`: the Sectors dialog, the result card with the fuzzballs
  brought home, How to play from the catalogs with the scene's pictures,
  and every setting. Specced. One commit, `yarn verify` with it.

#### A11: sound and haptics (small)

- **A11.1** `tools/build-sounds.mjs` with the thirteen sounds on
  `@fz/dev/sounds`, the sprite in `src/scene/sounds/`, a `SpritePlayer` in
  the scene playing each event's sound through the view's `FrameSounds`
  (`@fz/core/frame_sounds`), a
  break's rising with the chain, the thrust's hum through `hold()`, the
  Sound button and the haptics setting. Specced. One commit.

#### A12: storage (medium)

- **A12.1** `SettingsService`, `StatsService` and `src/rules/progress.ts`
  with its service, under `asteroid-breaker-settings`,
  `asteroid-breaker-stats` and `asteroid-breaker-progress`, each reader
  dropping what it can't trust. Specced with an in-memory store. One commit.
- **A12.2** `src/rules/saved_game.ts` and `SavedGameService` under
  `asteroid-breaker-game`, as "What it keeps" says, the crew and those at
  home among it: written as a wave starts, as a ship is lost or waits, on a
  pause and as the page goes away; taken up paused, stretched to the room it
  comes back to (decision 21). Specced, a round trip among it. One commit,
  `yarn verify` with it.

#### A13: the other twenty-five waves (large)

- **A13.1** Waves 6 to 10 in `inner-belt.json`, each played and tuned with
  `yarn report:waves` until the sector climbs evenly. One commit.
- **A13.2** `src/rules/waves/iron-reach.json`, waves 11 to 20, the same
  way. One commit.
- **A13.3** `src/rules/waves/storm.json`, waves 21 to 30, the same way; the
  catalog spec now sees every kind used and every pickup able to come from
  its `from`, and the waves spec holds every sector whole. One commit,
  `yarn verify` with it.

#### A14: Endless (medium)

- **A14.1** `src/rules/endless.ts` and `endless.spec.ts`, the constellation
  drawn in Endless's waves, and the autopilot's spec and report over
  Endless's 31 to 60. One commit.
- **A14.2** The Sectors dialog's fourth row, Storm cleared's card, and the
  records' "cleared all thirty". Specced. One commit, `yarn verify` with it,
  then Q4.

#### A15: the checks (medium)

- **A15.1** `tools/check-layout.mjs`, Brick Breaker's adapted, and
  `check:layout` in `package.json`: at `@fz/dev/layout`'s shapes and at
  320 × 480, and turned, each at 2×, no error and no scrolling; the canvas
  drawn at its size times the ratio; the field filling its room with a
  short side of 40 units and a unit of 6 CSS px or more, inside the
  window, where the placeholder drew it and inside the focus ring; and the
  deck's zones, through Part 1's `deck`, the stick's and the buttons',
  each shown, on the canvas and in the window, off the field, each other
  and the bar,
  with the deck set to show by the check's `before()`, since a headless
  Chrome is no touch screen. One commit.
- **A15.2** Q5: the full pass its row lists. Fixes, each a commit.

#### A16: screenshots and docs (medium)

- **A16.1** `tools/capture-screenshots.mjs` and the images: a run kept by
  the rules, begun on wave 9, Crowd, at Normal, a stray adrift, taken up
  paused, at 1280 × 720 and 2× in a dark palette, as the other arcade
  games' are, written by `writeSiteImages()`; `index.html`'s `og:image` tags
  pointing at the preview. One commit.
- **A16.2** The game's `AGENTS.md` and `README.md`, the
  `asteroid-breaker-testing` and `asteroid-breaker-content` skills in the
  workspace's `.agents/skills/`, linked with
  `node .agents/link-claude-skills.mjs`. One commit.
- **A16.3** The lists that name the games: `.agents/AGENTS.md`,
  `frontend/AGENTS.md`, `frontend/games/AGENTS.md` (9005 Asteroid Breaker's,
  the next game 9006), `frontend/lib/dev/AGENTS.md`, `docs/operations.md`,
  the root `README.md`, and the `phaser-core`, `fuzzley-ui`,
  `web-game-accessibility` and `angular-testing` skills. One commit.

#### A17: ship (small)

- **A17.1** `frontend/site/games.json` gets
  `"asteroid-breaker": { "workspace": "games/asteroid-breaker" }`; the
  catalog gets Asteroid Breaker in Arcade ("Fly, drift and blast every rock
  to rubble before one finds you.", `players: SOLO`, `minutes: 10`, `added`
  on the day, `play: { build: "asteroid-breaker" }`);
  `frontend/site/index.html`'s meta description names it. `yarn verify` and
  `yarn check:layout`. One commit.
- **A17.2** Q6, in the Docker image if Docker is running on this machine
  (it is off by default; if it stays off, the log says so and the image
  waits for CI). This plan and the work log move to `docs/archive/`, the
  log's lasting decisions folded into the plan. One commit.
- **A17.3** On the user's go-ahead: `asteroid-breaker-lift` merged into
  `main`, then `asteroid-breaker`, and pushed; the game played on
  fuzzley.games. Rollback: `git push --force origin <last good commit>:live`,
  then revert the merge on `main`.

## Design reference

### The game

#### The field and the ship

- **The field fills the room** the bar and the deck leave, inside a margin
  of 12 CSS px on a compact screen and 24 on a roomy one, with a frame of
  2 CSS px on every side, and wraps: whatever leaves by one edge comes in
  by the other, ship, shots, rocks and pickups alike. The comet and a stray
  alone cross once and leave. Everything the rules know is in units;
  the view turns them into device pixels.
- **Its short side is 40 units,** and its long side as many as the room
  holds at that unit, up to 88, where a room wider than 2.2 to 1 shows the
  page at its ends. So a unit is the short side over 40, a fraction of a
  pixel or not: the rocks turn and nothing needs a whole pixel's edge but the
  frame, which lies on whole device pixels.
- **Its rocks fill it.** A wave's counts are written for a field of 40 by
  40 (1,600 units²) and multiplied by the field's area over that, rounded
  to the nearest and never fewer than written: "3 large stone" is 5 on a
  desktop's 40 by 73. The cap on rocks, the pickups a field holds at once and
  the strays grow the same way; comets come more often by the square
  root of it, as they cross a longer field. The autopilot plays every wave
  on the narrowest field and the widest.
- **The field takes the room's shape as a wave starts, and while the game
  is paused.** A pause, which turning the phone sets off, stretches every
  place on the field to the new shape, adding and removing nothing, and
  the ship is untouchable for 1 s after it goes on. Between the two, a
  window resized in play keeps the field's shape, fitted whole into the room,
  until the next wave or pause.
- **The ship is a round pod,** 2.4 units long and 1.5 wide, its nose ahead,
  two fins at its tail and a round window, 0.4 units across its radius,
  where its pilot sits ("Pilots"); it is hit only within 0.7 units of its
  middle, less than it looks, so a graze is a miss.
- **It flies as the genre does.** Thrust pushes it along its heading; it
  keeps its speed and slows as it coasts, its speed halving every 1.5 s; it
  can't go faster than its top speed. Turning changes only where it points,
  so stopping means turning round and thrusting back.
- **It turns two ways.** By keys, at a fixed rate, ramped in over a few
  hundredths of a second so a tap turns a few degrees. By a stick or the
  mouse, toward where they point, at up to twice that, easing into the
  heading, so it can't overshoot and shudder.
- **Shots** leave the nose at their speed plus the ship's, up to its top
  speed, so a dash throws the ship but not its shots; they wrap, and fade
  after 0.8 s, so a shot crosses most of the field but can't circle it.
  Holding fire fires 7 a second, with at most 6 in flight.
- **The dash** throws the ship along its heading for 0.22 s, during which
  and for 0.1 s after nothing can hit it; then it keeps its old speed, plus
  a little along the heading, to its top speed. It recharges in 2.5 s,
  shown by a ring.
- **A lost ship** bursts, its pilot bailing out, ends the chain and every
  effect, and the next waits 1 s later where it is safest: the middle, if no rock is within 9
  units of it, else the best of a 5 × 5 grid of places, by the distance to
  the nearest rock a second ahead. It waits there, untouchable and blinking,
  while the rocks fly on, until the player moves, turns, fires or dashes,
  then stays untouchable 2 s more. With no ship left, the run is over.

#### The feel, in numbers

The numbers the game starts from, kept in `src/rules/tuning.ts` so one file
tunes the game, but those of one kind of rock or one pickup, which its
catalog entry holds. They are first guesses, to be settled by playing at Q3;
the mock's sketch has sliders for the ship's.

| What                  | Value                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The field             | 40 units on its short side, up to 88 on its long, wrapping at every edge; counts written for 40 × 40, times its area's share                                        |
| The step              | 1/120 s, 12 at most a frame                                                                                                                                         |
| The ship              | 2.4 units long, 1.5 wide, hit within 0.7 of its middle                                                                                                              |
| Thrust                | 24 units a second, each second, along the heading; top speed 15 units a second                                                                                      |
| Coasting              | the speed halves every 1.5 s                                                                                                                                        |
| Turning, by keys      | 300° a second, reached in 0.08 s                                                                                                                                    |
| Turning, to a heading | up to 600° a second, easing in over the last 12°                                                                                                                    |
| Shots                 | 32 units a second plus the ship's speed, up to its top speed; 0.8 s; one each 0.14 s held; 6 in flight; a radius of 0.18                                            |
| The dash              | 34 units a second for 0.22 s, untouchable 0.32 s, recharged in 2.5 s                                                                                                |
| Rocks' radius         | large 2.8 units, medium 1.6, small 0.9, the boulder 4.6; hit within 0.9 of it                                                                                       |
| Rocks' speed          | the boulder 1.5–2.5, large 2.5–4, medium 4–6, small 5.5–8.5 units a second, times the kind's, the wave's pace and the speed's                                       |
| Rocks on the field    | 48 for each 1,600 units² at most (105 on the widest); at the cap a rock splits into as many pieces as fit, one at least                                             |
| Rocks' turn           | 6° to 30° a second, either way; a piece turns 25° to 50° off its parent's travel, pushed 1.5 units a second along the hit                                           |
| A new ship            | 1 s after the last; untouchable while it waits and 2 s after                                                                                                        |
| Pickups               | drifting at 2 units a second for 8 s, blinking the last 2; drawn in from 3 units at 10 a second (14 with Magnet), caught at 2                                       |
| The Shield            | the rock that touches the ship breaks a size down, the ship untouchable 1 s after                                                                                   |
| Strays                | from wave 3, 20 s into a wave, the next 8 s after the last has gone; 3.2 units a second, turning 2° to 5° a second; a bubble of 1.15, brought home at 2; 500 points |
| The comet             | warned of 1.5 s ahead; 26 units a second times the field's pace; meets what is within 1 unit; comes in from and leaves past 3 units off the field                   |
| Coming in             | from 15% to 85% of the way along an edge, tilted toward its middle by up to 20° for a stray and 30° for a comet                                                     |
| The chain             | 1.5 s from one break to the next                                                                                                                                    |
| Ships                 | 3 to start, 6 at most; one more at 10,000 points and every 20,000 after                                                                                             |

What the shapes the layout check holds come to (the mock page works each
out with the same rules):

| Window                             | The field, in CSS px | In units  | A unit  | Rocks against 40 × 40 |
| ---------------------------------- | -------------------- | --------- | ------- | --------------------- |
| Roomy, 1280 × 800                  | 1232 × 679           | 72.6 × 40 | 17.0 px | × 1.8                 |
| Phone upright, 390 × 844           | 366 × 564            | 40 × 61.6 | 9.2 px  | × 1.5                 |
| Phone on its side, 844 × 390       | 496 × 366            | 54.2 × 40 | 9.2 px  | × 1.4                 |
| Small phone upright, 375 × 553     | 351 × 333            | 42.2 × 40 | 8.3 px  | × 1.1                 |
| Small phone on its side, 568 × 320 | 256 × 296            | 40 × 46.3 | 6.4 px  | × 1.2                 |

So the ship is 22 px long on a phone, 15 on the smallest on its side, and 41
on a desktop; the layout check's floor for a unit is 6 CSS px. A very large
window draws everything larger rather than more of it, since the short side
is always 40 units; the atlas is baked at no more than 32 device px a unit
and scaled past that, the most at which its frames fit 2048 × 2048 with
room to spare.

#### Rocks

- **A shot that breaks a rock splits it** into pieces of the next size,
  which leave from its place, each turned 25° to 50° off its travel, by the
  run's seeded random, and pushed a little along the shot's. The pieces are
  faster than their parent, as their size says. A small rock breaks into
  nothing.
- **A rock that takes several hits** shows each one (dents, then cracks)
  and flashes; the shot is spent.
- **Rocks pass over each other** rather than collide, so a player can read
  where each will go, and the field never clumps.
- **Rocks are placed fairly.** A wave's rocks start at least 12 units from
  the ship, measured across the wrap, each on a course that doesn't come
  within 5 units of it in its first 3 s, flown as play flies it, a
  lodestone's pull toward the waiting ship among it.
- **A wave lays its rocks out in one of four formations,** every rock of
  it: a scatter, each drawn anywhere far enough off, flying a drawn way; a
  ring round the ship, as far off as a large rock sits inside the short
  side, every rock flying along it one way; a wall across the short side,
  half the long side off, flying along the long side at one speed, the
  slowest drawn and no faster than keeps the rock in line with the ship
  clear of it, slower still for lodestones until they are fair; and a
  cluster about a middle half the long side off, flying one drawn way, or
  at right angles to the way to the ship if that way isn't fair. A rock
  whose course still isn't fair turns at right angles to the way from the
  ship, slowed until it is, as a course long enough to come round the wrap
  can still near the ship.

Seven kinds to start, each told apart by its shape and marks as well as its
color, since color is never the only signal:

| Kind      | Hits (L/M/S) | Splits into                              | Speed | Points (L/M/S) | From wave | What it does                                                                              | How it looks                                          |
| --------- | ------------ | ---------------------------------------- | ----- | -------------- | --------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Stone     | 1/1/1        | 2 of the next size                       | 1     | 10/20/40       | 1         | Breaks                                                                                    | Rounded, its ink, two or three craters                |
| Ice       | 1/1/1        | 3 of the next size                       | 1.25  | 15/30/50       | 4         | Shatters into more, faster pieces                                                         | Angular, pale, with facet lines                       |
| Crystal   | 1/1/–        | 2 stone of the next size                 | 1     | 20/40          | 2         | Always lets a pickup go                                                                   | A stone with a gem set in it                          |
| Iron      | 3/2/1        | 2 iron of the next size                  | 0.75  | 30/60/90       | 11        | Takes several hits at each size; a shot that doesn't break it rings off                   | Smooth, slate, four rivets, a dent for each hit taken |
| Volatile  | 1/1/–        | nothing                                  | 0.9   | 40/60          | 12        | Blasts: every rock within 6 units (4 for a medium) takes a hit, which can set off another | Round, a glowing core with three cracks               |
| Lodestone | 2/1/1        | 2 lodestones of the next size            | 1     | 25/50/80       | 21        | Drifts toward the ship, a little each second, never past its size's speed                 | Garnet, crossed by two bands                          |
| Boulder   | 6            | 3 large rocks of the kind its wave names | 1     | 200            | 10        | Ends each sector                                                                          | Twice a large rock, its ink deeper, five craters      |

A volatile rock's blast never hurts the ship. Blasts set each other off a
beat apart (90 ms), so a chain reads as a chain.

#### Strays and the comet

- **A stray fuzzball** comes from wave 3, as many times a wave as the wave
  says (once by default, more on a larger field), the first 20 s into it if
  the wave is still on and each after it 8 s after the last has gone, so one
  is adrift at a time: in its bubble it comes in at an edge, crosses the
  field once on a gentle curve at 3.2 units a second, slow enough to fly
  to, its eyes on the ship, and leaves. Shots pass through its bubble. The
  ship brings it home by touching it, its middle within 2 units of the
  stray's, guarded, dashing or not, for 500 points, times the chain, and
  the Magnet draws it in, the straight way, never across an edge. A wave
  never needs it, and one that leaves costs nothing. Each run counts its
  strays brought home, and the records count them all.
- **The comet** comes from wave 13, as often as its wave says: a chevron in
  the danger color pulses at the edge it will come in by for 1.5 s, then it
  crosses the field in a straight line at 26 units a second, times the
  field's pace as the rocks are, and leaves. It can't be broken, it breaks
  any rock it touches one size down, for no points and no pickup, a
  crystal's or a drought's either, and passes over the pieces, and it takes
  the ship unless the ship is dashing or shielded. A volatile rock it
  breaks still goes off, and what the blast breaks gives as any blast's
  does: the blast is the rock's. Relaxed sends half as many.
- **A stray and a comet come in away from an edge's corners,** heading
  across the field and tilted toward the edge's middle, so neither clips a
  corner and is gone at once.
- **A stray and a comet meet things only with their middle on the field,**
  since they don't wrap and what they meet is drawn across the wrap; both
  go as the wave is cleared.

#### Pilots

- **Every ship has a pilot,** the site's fuzzball, seen in its window, and
  every pilot has a color of its own, one of eight ("Look" says which).
- **A run starts with three,** in the first three colors. The bar shows a
  fuzzball for each ship the run has, the pilot flying first, then the
  others in the order they will fly.
- **A stray brought home joins the crew** (decision 26): it waits at home,
  in the order brought home, and flies the next ship the run gains, by
  points or the Extra ship pickup, which joins the end of the line in the
  bar in the stray's color. A ship gained with no one at home brings a new
  pilot.
- **A new pilot's color** is the next of the eight in turn, skipping any
  worn by a pilot in the crew, at home or adrift, so no two share one while
  eight are enough; with all eight worn, the next in turn. A stray takes its
  color as it comes in, and keeps it at home and at the controls.
- **A lost ship's pilot bails out** in a bubble of its color and floats off
  the field; the next in the bar takes the controls.
- **The rules know a pilot only as its color's number,** 0 to 7, as Brick
  Breaker's levels know a brick's tint, and the view gives the number its
  ink in the palette in play.

#### Pickups

A broken rock lets a pickup go by the sector's chance (0.04, 0.05, 0.06;
a quarter more at Relaxed), while fewer than two are on the field (more on
a larger one, as "The field and the ship" says); a crystal
always does, and so does the next large rock broken once 25 s of a wave have
gone by without one. Which pickup is drawn by weight from the wave's pool,
from the run's seed, the wave and its count of draws, so a wave played the
same way lets the same pickups go.

A pickup drifts at 2 units a second, wraps, lasts 8 s, blinking the last 2,
and is drawn in to the ship once within 3 units of it. The ship catches it
by touching it.

| Pickup     | Symbol                  | Group   | What it does                                                                             | Lasts                        | Weight | From wave |
| ---------- | ----------------------- | ------- | ---------------------------------------------------------------------------------------- | ---------------------------- | ------ | --------- |
| Spread     | three rays              | weapon  | Three shots at each pull, 12° apart, 18 in flight                                        | 12 s                         | 10     | 2         |
| Rapid      | two chevrons            | weapon  | A shot each 0.07 s, 12 in flight                                                         | 12 s                         | 9      | 2         |
| Shield     | a ring                  | guard   | The next rock or comet to touch the ship breaks a size down instead, and the shield goes | until used, or the wave ends | 7      | 2         |
| Extra ship | a pilot in its window   | at once | One more ship, up to six, flown by the first stray at home, if one waits                 | at once                      | 1      | 5         |
| Lance      | an arrow through a ring | weapon  | A shot passes through what it breaks, up to three rocks                                  | 10 s                         | 6      | 6         |
| Magnet     | a horseshoe             | pull    | Draws pickups and strays in from 14 units                                                | 15 s                         | 5      | 6         |
| Slow       | an hourglass            | pace    | Rocks and comets move at half their speed                                                | 8 s                          | 5      | 8         |
| Nova       | a starburst             | at once | A ring sweeps 12 units out from the ship; each rock it reaches takes a hit               | at once                      | 4      | 9         |

- **No pickup is bad,** so nothing has to be dodged that looks like a
  reward; a pickup is the accent, rounded, with its symbol, so it reads
  apart from every rock.
- **One of each group at a time.** Spread, Rapid and Lance are the weapon,
  and the latest caught replaces the one before; the same again starts its
  time over. The shots of the one before fly on, counted only toward its
  own most in flight, so they don't hold the new one back; it fires once
  the last pull's time is up, as the one before would have.
- **Every effect ends with its wave and when a ship is lost,** with the
  pickups on the field.
- **What is in effect shows on the field,** at its bottom left: a tag for
  each, its symbol over a ring that empties as its time runs out, as Brick
  Breaker's tags do.

#### Scoring

- **A rock scores by its kind and size** (the table above), times the
  chain's multiplier. The comet's breaks score nothing.
- **A chain scores more.** Each break within 1.5 s of the last counts on;
  from the fifth a break scores double, from the tenth triple, and from the
  twentieth four times. A pause of 1.5 s, or a lost ship, starts the count
  again. Blasts count. The bar shows the multiplier while it is above one,
  on a screen with room, and each break's points rise from it, "+40 ×2".
- **A stray brought home scores 500,** times the chain, and doesn't count
  on in it.
- **A cleared wave adds 500,** and 500 more if no ship was lost on it.
- **Points bring ships:** one at 10,000 and every 20,000 after, up to six,
  each flown by the first stray at home, if one waits.
- **A run's score** is everything from the wave it started on to its end:
  once the last ship is lost nothing scores, its shots and blasts still
  breaking rocks, nor a clearing they make. Bests are kept for each speed,
  for runs and for the furthest wave.

#### Waves

Thirty waves in three sectors of ten. Each sector brings a few new things,
each first alone, in a wave built around it, before it joins the others.
Within a sector the pace rises a little each wave, and the last wave has a
boulder, as the sector's test. A wave is cleared when every rock in it is
broken; the strays and the comets never count. The counts below are
for a field of 40 by 40; a larger field has more, by its area.

**Sector 1, Inner belt** (pace 1.00 to 1.08)

| #   | Name        | Rocks                                 | What it brings                              |
| --- | ----------- | ------------------------------------- | ------------------------------------------- |
| 1   | First light | 3 large stone                         | The flight and the split; no pickups        |
| 2   | Gem         | 3 large stone, 1 large crystal        | The first pickups: Spread, Rapid and Shield |
| 3   | Adrift      | 4 large stone                         | The first stray to bring home               |
| 4   | Thaw        | 2 large ice, 2 large stone            | Ice                                         |
| 5   | Hail        | 4 large ice                           | An extra ship can drop                      |
| 6   | Scatter     | 8 medium stone, 2 medium crystal      | Many small targets; Lance and Magnet        |
| 7   | Crossing    | 3 large stone, 2 large ice, in a wall | A wall that sweeps across                   |
| 8   | Frost       | 4 large ice, 1 large crystal          | Slow                                        |
| 9   | Crowd       | 6 large stone                         | Nova                                        |
| 10  | Boulder     | 1 boulder, 2 large stone              | The sector's test                           |

**Sector 2, Iron reach** (pace 1.08 to 1.16)

| #   | Name       | Rocks                                                 | What it brings        |
| --- | ---------- | ----------------------------------------------------- | --------------------- |
| 11  | Ore        | 2 large iron, 3 large stone                           | Iron                  |
| 12  | Powder     | 3 medium volatile in a cluster, 3 large stone         | Volatile rocks        |
| 13  | Streak     | 4 large stone; comets every 14–18 s                   | Comets                |
| 14  | Anvil      | 4 large iron, 1 large crystal                         | Iron, many hits       |
| 15  | Fuse       | a ring of 6 medium volatile, 2 large ice              | A ring that chains    |
| 16  | Shower     | 5 large ice; comets every 9–12 s                      | Comets through shards |
| 17  | Foundry    | 3 large iron, 3 medium volatile                       | Blasts to crack iron  |
| 18  | Rush       | 10 medium stone, ice and iron                         | Speed                 |
| 19  | Tinder     | 2 large volatile, 4 large stone; comets every 12–15 s | Everything so far     |
| 20  | Iron heart | 1 boulder of iron, 3 large iron                       | The sector's test     |

**Sector 3, Storm** (pace 1.16 to 1.25)

| #   | Name             | Rocks                                      | What it brings               |
| --- | ---------------- | ------------------------------------------ | ---------------------------- |
| 21  | Lodestar         | 3 large lodestone, 2 large stone           | Lodestones                   |
| 22  | Whiteout         | 6 large ice; comets every 10–13 s          | A crowd of shards            |
| 23  | Gauntlet         | 3 large iron, 3 large lodestone            | Tough rocks that come to you |
| 24  | Wildfire         | 4 large volatile, 3 large ice              | Chains through ice           |
| 25  | Swarm            | 16 small stone and ice                     | Fast and many                |
| 26  | Lost and found   | 5 large of four kinds; 3 strays            | Strays for the brave         |
| 27  | Pull             | 4 large lodestone; comets every 8–11 s     | Pulled into the comets' path |
| 28  | Bulwark          | 5 large iron, 2 large crystal              | Iron, with help              |
| 29  | Tempest          | 8 large of every kind; comets every 9–12 s | Everything                   |
| 30  | Eye of the storm | 2 boulders, 4 large of every kind; comets  | The finale, at the top pace  |

#### Endless

- **Clearing wave 30 opens Endless,** and the run goes on into it, wave 31,
  32 and on, until its ships run out. Wave 30's Cleared card says so
  ("Storm cleared. Endless begins."), with the trophy and the chime, and the
  run is marked as one that cleared all thirty.
- **Endless's waves are made, not written,** by `src/rules/endless.ts`, from
  the run's seed and the wave's number, so a run that reaches a wave with
  the same seed meets the same wave, and a saved game makes its wave again
  from the two. Each is a `Wave`, as a sector's waves are, so the field
  plays it with no rule of its own:
  - **its rocks:** a budget of 10 at wave 31, rising by 0.5 a wave to 24,
    spent on large rocks by their weight (stone and crystal 1, ice 1.2,
    volatile 1.5, as two medium, lodestone 1.6, iron 2), drawn from every
    kind, at most a third of the budget on iron, with one crystal in every
    wave, so pickups keep coming;
  - **a boulder wave every tenth wave** (40, 50 and on): a boulder for each
    ten waves past 30, three at most, and large rocks for the rest;
  - **its pace:** 1.25 at wave 31, rising 0.015 a wave to 1.6;
  - **its comets:** every 12–15 s at wave 31, closing to every 6–8 s by
    wave 60;
  - **its formation,** drawn from the four, and its strays: one a wave, two
    from wave 50.
- **A constellation lies among its stars,** the fuzzball's outline in
  fifteen of the field's specks and its eyes in two brighter ones, placed by
  the run's seed and the wave's number, faint, for a player who looks
  ("Fuzzley flavor"). It changes nothing.
- **The budget is for 40 by 40,** as every wave's counts are, and grows
  with the field.
- **Endless is a fourth row in the Sectors dialog,** open once a run has
  cleared wave 30, at any speed; a run started there begins at wave 31 with
  three ships.
- **An Endless wave is named by its number** ("Wave 37, Endless"), in the
  bar, the Ready card and the announcer.

#### Runs, sectors and records

- **A run** starts at the first wave of a sector the player has reached, or
  at Endless once it is open, with three ships and no score, and goes on
  through the waves in order, into Endless after wave 30, until its ships
  run out. No run is won: the result card says how far it came.
- **Sectors open as they are reached,** at any speed: the first is open from
  the start, and each after it once a run has reached its first wave. The
  Sectors dialog lists them, with their bests.
- **New game** starts a run where the last run started; the Sectors dialog
  starts one at any open sector. Both ask first when a run is under way.
- **Records,** for each speed: the runs played, the best run's score, the
  furthest wave reached, Endless's waves counting on from 30, whether a run
  has cleared all thirty, and the strays brought home, all told. A wider
  field holds more rocks, so a wave is
  worth more points on a desktop than on a phone; the bests are kept by
  speed alone, as the player has one screen at a time.

### Controls

| Action | Keys (by `event.code`)   | Mouse                             | Touch                           |
| ------ | ------------------------ | --------------------------------- | ------------------------------- |
| Turn   | ← → or A D               | the ship turns toward the pointer | the stick: where it points      |
| Thrust | ↑ or W                   | the right button, held            | the stick, pushed past half way |
| Fire   | Space, held              | the left button, held             | Fire, held                      |
| Dash   | Shift, ↓ or S            | —                                 | Dash                            |
| Pause  | P or Escape              | Pause in the bar                  | Pause in the bar                |
| Go on  | Enter, or any flight key | the card's button                 | the card's button, or the stick |

- **Keys go by place,** as Snake's and Brick Breaker's do, so an AZERTY
  keyboard flies with Z, Q and D.
- **The mouse takes over the heading only once it moves** over the field,
  and gives it back as soon as a turn key is pressed, as Brick Breaker's
  paddle goes back and forth between the keys and the pointer. The board
  keeps the right button's menu from opening.

#### The deck

The deck shows on a touch screen (`GameViewportService.isTouchScreen`), or
as the settings say (Auto, Always, Never). It is part of the canvas, off the
field:

- **Upright,** it lies under the field, between it and the bar: the stick's
  zone is its left half, and Fire and Dash sit in the right half, toward the
  bottom where thumbs rest. It takes a quarter of the stage's height, 136 to
  200 CSS px, and the field the rest.
- **On its side,** a deck lies on each side of the field: the stick's zone
  on the left, the buttons on the right, each a sixth of the stage's width,
  112 to 176 CSS px, inside the screen's safe areas, the stick at rest and
  the buttons kept 16 px from the stage's sides, so no thumb starts the
  browser's own swipe. The bar's rail stands beyond the right one, as on
  every game on its side.
- **Between the two,** on a stage near square, it lies whichever way
  leaves the field in play the larger unit, as `deckLayout()` works out,
  so a window resized in play doesn't turn it from a field it fits; the
  margin lies between the deck and the field.
- **"Stick on the right"** swaps the two halves or sides, for a left hand on
  the buttons.

The stick:

- **It appears where the thumb lands** anywhere in its zone, a base of
  48 CSS px radius and a knob of 20; at rest, a faint ring shows where it
  will sit, near the zone's lower corner.
- **Its rings say what it does.** Within 12% of its radius it does nothing,
  so a resting thumb doesn't steer. Past that it turns the ship toward where
  it points. Past half way it thrusts too, rising from nothing at the ring to
  full at the edge, remapped so it never jumps. The ring lights in the
  accent while it thrusts, and the edge at full push.
- **The knob stops at the edge, and the base follows** a thumb dragged past
  it, so the stick never runs out of reach.
- **One finger owns it** from press to lift, or until the browser cancels
  the touch, and another finger can't steal it; Fire and Dash take their
  own fingers.

Fire is 64 CSS px across and Dash 48, its recharge drawn as a ring around
it; each takes a press anywhere within 12 px of it. With "Fire by itself",
Fire is gone and Dash moves to its place.

### Look

The mock page draws all of this, in every palette.

- **The field is the palette's field** (`--fz-field`), framed in its line,
  with three dozen specks for each 1,600 units² of the field's muted text
  at a third of its strength, seeded for each run and still. In a light palette it reads as a
  star chart on paper, in a dark one as night.
- **The rocks are flat shapes in the game's own inks,** seven for light
  palettes and seven for dark, in `src/view/inks.ts`, outlined in the
  field's color so overlapping rocks read apart, each with its kind's marks.
  A rock's outline is a rounded, uneven polygon from a seed, nine to twelve
  points from 0.78 to 1 of its radius (ice's are sharp-cornered); six
  outlines for each kind and size, baked once, and each rock turns slowly.
- **The ship is the accent,** its window the field's color, with its pilot
  in it in the pilot's ink; its flame is the warning color, as long as the
  thrust is strong, flickering where motion is welcome. A guarded ship
  blinks within a faint ring.
- **Shots are the field's text color,** the clearest thing on the field, a
  short capsule along their travel.
- **A pickup is the accent,** a rounded hexagon with its symbol in the
  accent's text color, breathing gently, blinking its last 2 s.
- **The comet is the danger color,** a head with a short tapering tail; its
  warning a chevron of the same at the edge.
- **A stray** is its pilot's ink in a bubble: the field's text at a wash,
  with a white glint on its rim, so it reads apart from every rock.
- **The pilots take the game's own inks,** eight for light palettes and
  eight for dark, in `src/view/inks.ts`, as "Fuzzley flavor" lists them.
- **The deck** draws in the field's line and muted text, faint at rest: the
  stick's base and rings, the knob in the accent while held; Fire and Dash
  as rings with their symbols, filled in the accent while pressed.

### Flourishes

Only where motion is welcome (`GameViewportService.allowsMotion`); without
it, each thing simply goes, and points show where they were scored, without
rising.

| What           | Flourish                                                                                    |
| -------------- | ------------------------------------------------------------------------------------------- |
| A rock breaks  | 4 to 7 shards of its ink fly out and fade over 0.5 s; a puff of dust                        |
| A hit holds    | The rock flashes light for 60 ms, and a spark flies off                                     |
| A large break  | The field kicks 2 px away from the shot, settling in 0.1 s                                  |
| A blast        | A ring of the warning color sweeps out to its reach                                         |
| Points         | "+40 ×2" rises a unit and fades over 0.6 s                                                  |
| Thrust         | Exhaust specks from the tail, as many as the thrust is strong                               |
| A dash         | Three fading outlines of the ship along its path                                            |
| A lost ship    | A burst of shards and a ring; the field shakes 6 px, decaying in 0.3 s, after a 80 ms pause |
| A cleared wave | The last rock's shards linger, and the Cleared card waits 0.8 s                             |

### Sound

Synthesized with `@fz/dev/sounds`, into one sprite, as Brick Breaker's are:
a shot's soft tick; a large, medium and small break, from a low thump to a
crack, rising with the chain by up to a fifth (Brick Breaker's
`detuneOf()`); iron's ring; a blast; a pickup caught; the dash's whoosh; the
comet's warning, two soft notes; a lost ship's fall; a cleared wave's chime;
an extra ship's chime; a stray brought home's two rising notes. The thrust
hums low while it is held, through the
lifted `SpritePlayer.hold()`. Each sound plays once a frame at most, at the
highest it was heard, as `@fz/core/frame_sounds` has it.

### Cards and dialogs

- **Ready,** whenever a wave waits for its first move: "Wave 4: Thaw", and
  how to start, by keys ("Arrows or W A D to fly, Space to fire") or by
  touch ("Steer with the left pad, fire with the right").
- **Paused,** with the score, the fuzzballs waiting at home, each drawn in
  its color, and Resume.
- **Wave cleared,** with how its points added up (rocks, the chains'
  extra, the strays brought home, the wave's 500, the 500 for no ship
  lost) and "Move or fire for
  wave 5", which the stick, a flight key, Enter or the card's button does,
  so a thumb on the deck never has to reach the field.
- **Storm cleared,** wave 30's Cleared card: the trophy, "Storm cleared.
  Endless begins.", and the wave's tally, then "Move or fire for wave 31".
- **Ended,** the result card, once the last ship's burst has faded: the
  wave reached ("Lost on wave 37, Endless") and at what speed, the score and
  the best, "New best" and the trophy when it set one, the fuzzballs
  brought home ("3 fuzzballs brought home"), each drawn in its color, and
  "Cleared all thirty" for a run that did; Try again from the sector the
  run started at;
  Choose a sector; Close.
- **Sectors,** **How to play** (the aim, the controls by keys, mouse and
  touch, every rock and pickup from the catalogs, a stray and the comet,
  each with its picture, taken from the scene's atlas) and **Settings**
  (the speed, when the deck
  shows, which side holds the stick, fire by itself, haptics, sound and the
  palette).

### The debug menu

In a development build only (`DEBUG_MENU`, from `import.meta.env.DEV`, as
Brick Breaker's is), the settings drawer ends with a Debug section holding
every control the mock's sketch has, each acting on the ship in flight at
once:

| Control                      | Range               | Starts at (`tuning.ts`) |
| ---------------------------- | ------------------- | ----------------------- |
| Thrust                       | 8 to 60 u/s²        | 24                      |
| Top speed                    | 6 to 30 u/s         | 15                      |
| Coasting: speed halves every | 0.3 to 6 s          | 1.5                     |
| Turning by keys              | 120 to 600°/s       | 300                     |
| Turning toward a heading     | 180 to 1440°/s      | 600                     |
| Shot speed                   | 16 to 60 u/s        | 32                      |
| A shot every                 | 60 to 400 ms        | 140                     |
| Rocks' speed                 | ×0.5 to ×2          | ×1                      |
| Shots carry the ship's speed | on or off           | on                      |
| Fire by itself               | on or off           | the setting's           |
| Stick on the right           | on or off           | the setting's           |
| Deck                         | Auto, Always, Never | the setting's           |

- **The last three are the player's settings too,** and change them; the
  rest live only in the field in play (`Field.debug`), as Brick Breaker's
  `ballSpeedScale` does, and nothing keeps them.
- **A shot every** sets the gun's time, and every weapon's scales with it,
  so Rapid's stays half the gun's, as the catalog writes it.
- **Reset the numbers** puts the eight sliders back to `tuning.ts`'s;
  **Copy the numbers** puts them on the clipboard as the lines of
  `tuning.ts` they would replace, so a feel found by playing is pasted
  straight in.
- **The autopilot, the report and the specs play `tuning.ts`'s numbers
  only,** so a debug value never reaches a check.

### What it keeps

Each entry versioned (`LocalStorageService.writeVersioned()`), its reader
dropping what it can't trust:

- `asteroid-breaker-settings`: the speed, when the deck shows, which side
  holds the stick, fire by itself, haptics and sound.
- `asteroid-breaker-stats`: for each speed, the runs, the best score, the
  furthest wave, whether a run has cleared all thirty, and the strays
  brought home.
- `asteroid-breaker-progress`: the sectors reached, Endless among them.
- `asteroid-breaker-game`: the run under way (the wave, the score, the
  crew's colors, the pilot flying first, those at home, the last color
  given, the strays brought home, the next ship's mark, the speed, the
  seed) and its field: its size in units, each rock's kind, size, outline,
  place, speed, turn and hits left, the field's count of steps and draws,
  and the time the wave has run and the strays it has sent, for its strays
  and comets; a stray adrift goes, as the comets do. Written as a wave
  starts, as a ship is lost
  or waits, as the run pauses or goes on, and as the page goes away, never
  at a step. Taken up paused, it stretches to the room it comes back to, as
  a pause does.

The debug menu's numbers are not kept: a reload starts from `tuning.ts`.

### Accessibility

As the other games', by the `web-game-accessibility` skill: the board is an
application named for its wave ("Asteroid Breaker, wave 4: Thaw"),
described by its keys, the canvas in it hidden; the announcer says each
wave begun ("Wave 4, Thaw. 4 rocks."), a stray adrift ("A stray fuzzball
drifts in."), a stray brought home ("Brought home: 2 waiting."), a ship
gained and who flies it, a ship lost and how many are left, a pickup
caught, a wave cleared with the score, a pause, going on and the end. A
pilot's color is never said: it tells pilots apart, and nothing in play
depends on it. Every overlay is an `<fz-dialog>`. A real-time shooter can't be played
by a screen reader, but nothing in its shell is out of a keyboard's reach.

### Fuzzley flavor

The fuzzball is the site's mark, a pom-pom with two eyes, its shapes in
`@fz/style/fuzzball` (`FUZZBALL`). It belongs to the game five ways
(decision 25), all drawn on the mock page, as one story: the fuzzball flies
the ship, and brings its strays home.

1. **The pilot.** The pod's window, 0.4 units across its radius, is the
   field's color and shows its pilot inside, in the pilot's ink. The pilot
   stays upright while the pod turns round it, its eyes glancing toward the
   heading, and it blinks every few seconds where motion is welcome. On a
   phone the window is about 7 CSS px across, where the pilot is a dab of
   its color with two dark eyes; on a desktop, about 14, where its fur
   shows.
2. **Pilots for ships.** The bar draws each ship as its pilot, a small
   fuzzball in its ink, rather than a pod, the one flying first; the Extra
   ship pickup carries one in its symbol.
3. **The bail-out.** When a ship is lost, the pod bursts and its pilot pops
   out in a bubble, in its color, and floats off the field, blinking, over
   1.4 s, where motion is welcome; the next in the bar takes the controls.
   It softens the moment, which a casual game wants.
4. **Strays to bring home, in place of the gold nugget,** as "Strays and the
   comet" and "Pilots" say: each in a color of its own, flown to through
   the rocks, then waiting at home to fly the next ship the run gains. Wave
   26 is Lost and found, with three. It asks the player to fly somewhere,
   through the rocks, rather than shoot something, which the genre's glide
   rewards.
5. **A constellation in Endless.** Fifteen of the field's specks trace the
   fuzzball's outline and two brighter ones its eyes, faint, for a player
   who looks. It changes nothing.

Not taken: the ship as a fuzzball, since a round ship can't show where it
points, and fuzzy rocks, since the mark shouldn't be what the player
shoots.

#### The pilots' colors

Every pilot has a color of its own, so the crew in the bar, a stray adrift
and the pilot at the controls each read as one fuzzball, the same one from
the field to the bar. The colors are the game's own, in `src/view/inks.ts`,
eight for light palettes and eight for dark, as the rocks' are, taken in
this order:

| Color  | Light palettes | Dark palettes |
| ------ | -------------- | ------------- |
| Coral  | `#d33f37`      | `#ff7b70`     |
| Orange | `#c05a0c`      | `#ff9b45`     |
| Gold   | `#957000`      | `#f2cb45`     |
| Green  | `#2c8a3a`      | `#72d36a`     |
| Teal   | `#0f8378`      | `#3fd2c2`     |
| Blue   | `#2c72d6`      | `#72adff`     |
| Violet | `#8b55dc`      | `#b892ff`     |
| Pink   | `#c83a8e`      | `#ff7dc3`     |

- **Each stands out where it is drawn,** in the palette the player chose:
  3:1 or more, the bar for graphics, against the field, which is behind a
  stray's bubble and in the ship's window, and against the bar, where the
  crew waits. In a light palette the least is green's, 4.37 against the
  field and 3.92 against Soft pastel's bar; in a dark one, coral's, 5.93
  against the field and 6.93 against the bar. A light palette's inks are
  mid-tones, as a light field and the eyes' dark ink both need them to be:
  the eyes keep 3.79:1 or more against every ink, and 7.12 in a dark
  palette.
- **They stay apart from each other,** none nearer another than a ΔE of 27,
  so two pilots side by side in the bar never look alike.
- **Color is never the only signal,** as everywhere on the site: nothing in
  play depends on telling pilots apart, and a stray reads apart from a
  rock by its bubble, its fur and its eyes.
- **The contrast spec holds them,** in every palette: each ink against the
  field and the bar, and the eyes against each ink.

What it takes: the view's fence allows `@fz/style/fuzzball`, which is data;
`pilot_art.ts` draws the body and eyes as circles and ellipses and flattens the
fur's curves into short lines for Phaser's `Graphics`, a pilot's frame for
each of the eight inks, its eyes a frame of their own, moved within the
window. The bar, the Paused card and the result draw their fuzzballs from
the same shapes, as `<fz-wordmark>` does, in the inks the view's
`pilotInk()` gives them. A stray is in the catalogs, the waves and the
records where the nugget would have been (`strays`), among what the ship
catches rather than what its shots hit.

### Growing it

As Brick Breaker's, every rock kind, weapon and pickup is an entry in a
catalog and every wave an entry in a data file, and the compiler and the
specs between them refuse one with a part missing.

#### The catalogs

In `src/rules/catalog/`, each a readonly object written `as const
satisfies`, so its ids survive as a type:

```ts
/** The sizes a rock comes in, largest first; a rock breaks into pieces of the size after its own. */
export const ROCK_SIZES = ["boulder", "large", "medium", "small"] as const;

/** Gives a number for each size a kind of rock comes in, such as its hits. */
export type BySize = Readonly<Partial<Record<RockSize, number>>>;

/** Describes a kind of rock: its sizes, what breaking it takes and what it does. */
export interface RockKind {
  /** Names it in How to play, such as "Iron". */
  readonly name: string;
  /** Says what it does, in a sentence for How to play. */
  readonly about: string;
  /** The hits that break it at each size it comes in. */
  readonly hits: BySize;
  /** What it breaks into, by kind and count; null for one that breaks into nothing, as a small rock does. */
  readonly splits: {
    readonly into: "self" | "stone" | "wave";
    readonly count: number;
  } | null;
  /** Its speed against its size's. */
  readonly speed: number;
  /** What it scores at each size it comes in. */
  readonly points: BySize;
  /** What it does beyond breaking. */
  readonly traits: readonly RockTrait[];
}

/** Names something a rock does beyond breaking, with its settings. */
export type RockTrait =
  | {
      readonly kind: "blasts";
      readonly reach: BySize;
      readonly delayMs: number;
    }
  | { readonly kind: "gives" }
  | { readonly kind: "drawn"; readonly pull: number }
  | { readonly kind: "rings" };
```

The boulder is a size of its own, which only the boulder comes in, slow
enough as a size (1.5 to 2.5 units a second) that its kind's speed is 1. A
blast's reach is by size, as a volatile rock's is 6 units from a large one
and 4 from a medium.

- **`ROCK_KINDS`** (`catalog/rocks.ts`), with `TRAIT_RULES` in
  `src/rules/rocks.ts`, its type mapped from the union, so a trait without
  its rule fails to compile: `held`, `broken`, `step` and `goesOff`, as
  Brick Breaker's `TRAIT_RULES` are.
- **`WEAPONS`** (`catalog/weapons.ts`): the plain gun and each weapon a
  pickup gives, by `count`, `spreadDeg`, `everyMs`, `inFlight` and `breaks`,
  so a weapon is data, as Brick Breaker's ball kinds are.
- **`PICKUPS`** (`catalog/pickups.ts`): each its name, sentence, `weight`,
  the wave it is `from` and its `effect`, one of a union:
  `{ kind: "weapon", weapon, ms }`, `{ kind: "guard" }`,
  `{ kind: "pull", reach, ms }`, `{ kind: "pace", scale, ms }`,
  `{ kind: "nova", reach }`, `{ kind: "ship" }`; an effect's kind is its
  group. `EFFECT_RULES` says what each does as it starts and ends.
- **What each looks like is the view's,** in `src/view/art.ts` and
  `src/view/rock_art.ts`, keyed by the same ids and written `satisfies`, so a
  kind without its art fails to compile; How to play lists every entry with
  its picture.

#### Waves as data

A sector is one JSON file in `src/rules/waves/` (`inner-belt.json`,
`iron-reach.json`, `storm.json`), imported statically, its id, name,
chance of a pickup and waves; `SECTORS` in `src/rules/waves.ts` lists them,
and `WAVES` numbers every wave from 1. A wave is:

```ts
/** Describes a wave as its sector's file holds it. */
export interface WaveData {
  /** Names it for good. */
  readonly id: string;
  /** Names it to the player. */
  readonly name: string;
  /** Its rocks, by kind, size and count. */
  readonly rocks: readonly {
    readonly kind: string;
    readonly size: string;
    readonly count: number;
  }[];
  /** How its rocks are laid out, one of `FORMATIONS`; scattered by default. */
  readonly formation?: string;
  /** The rocks' speed against their own, 1 by default. */
  readonly pace?: number;
  /** The kind of rock it names, which its boulders break into; stone by default. */
  readonly waveKind?: string;
  /** The chance a broken rock lets a pickup go; else its sector's. */
  readonly drops?: number;
  /** The pickups that can come; else every one whose wave has come. */
  readonly pickups?: readonly string[];
  /** How many strays cross it; 1 from wave 3 by default. */
  readonly strays?: number;
  /** How often comets come: the seconds from one to the next, drawn from the least to the most. */
  readonly comets?: { readonly every: readonly number[] };
}
```

A file's formation is text and its range a list, as JSON's types are, so
`parseWave()` checks both.

`parseWave()` turns one into a `Wave`, or throws naming the wave and what
is wrong: an unknown key, kind, size, formation or pickup, a size a kind
doesn't come in, boulders breaking into a kind that doesn't come large, a
count that isn't whole, no rocks or more than a field of 40 by 40 holds, a
pace outside 0.8 to 1.4, a chance outside 0 to 1, and a range that isn't two
numbers, whose least isn't above 0, or that runs backward.

#### The checks that keep it whole

| Check              | Where                          | What it holds                                                                                                                                                                                                                   |
| ------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The compiler       | everywhere                     | Every trait and effect has its rule, and every rock, weapon and pickup its art                                                                                                                                                  |
| The catalog spec   | `src/rules/catalog.spec.ts`    | Every entry has a name and a sentence; every kind is used by a wave; every pickup can come in a wave from its `from`; weights positive                                                                                          |
| The waves spec     | `src/rules/waves.spec.ts`      | Every wave parses; ids and names unique; the pace never falls within a sector; each sector ends with a boulder                                                                                                                  |
| The placement spec | `src/rules/spawn.spec.ts`      | Over many seeds and on the narrowest and widest fields, every wave lays its rocks out fairly: 12 units off, no course within 5 units in 3 s                                                                                     |
| The autopilot spec | `src/rules/autopilot.spec.ts`  | Every wave, and Endless's 31 to 60, at every speed, on the narrowest and widest fields, from fixed seeds, is cleared within four minutes of game time                                                                           |
| The Endless spec   | `src/rules/endless.spec.ts`    | Every wave it makes from 31 to 200, over many seeds, parses as a written wave does, keeps to its budget and the cap, and is the same for the same seed                                                                          |
| The contrast spec  | `src/view/contrast.spec.ts`    | Every rock ink, the ship, shots, pickups and comet against the field in every palette; every pilot's ink against the field and the bar, and the eyes against each; the marks against their rocks; the outline against every ink |
| The pilots spec    | `src/rules/pilots.spec.ts`     | A new pilot's color is the next in turn not worn by the crew, at home or adrift, or with all eight worn the next in turn; a stray keeps its color at home and at the controls                                                   |
| The scene spec     | `src/scene/belt_scene.spec.ts` | Every kind in every state is drawn from a frame of the atlas, and an object across an edge is drawn on both sides                                                                                                               |

The autopilot flies as a fair player would: it turns toward the rock it can
hit soonest, leading it, fires when lined up, thrusts away from a rock or
comet whose course comes within 1.5 units of touching the ship in the next
second, dashes when one is about to hit, and catches the pickups and strays
it has time for. It runs in Node, without Phaser.
`yarn report:waves` runs it over every wave at every speed from many seeds,
invulnerable and not, and prints how long each took and the ships each
cost, which is how the climb from wave to wave is tuned and checked.

#### What adding each takes

- **A wave:** its block in a sector's file.
- **A rock kind with traits that exist:** its entry in `ROCK_KINDS`, its
  ink for light and dark palettes, its art and a wave that brings it in. A
  new trait: a member of `RockTrait` and its rule.
- **A weapon:** its entry in `WEAPONS`, its pickup in `PICKUPS` and its
  symbol.
- **A pickup with a new kind of effect:** a member of the effect union and
  its rule in `EFFECT_RULES`, which the compiler asks for.

An `asteroid-breaker-content` skill walks an agent through each, as
`brick-breaker-content` does.

### The lifted pieces

| Piece                       | From Brick Breaker                                                                     | To                      | What changes                                                                                                                                                                                                                                                                |
| --------------------------- | -------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A fixed-step clock          | `src/rules/stepper.ts`: `createClock()`, `advanceClock()`, `progressOf()`, `stepsIn()` | `@fz/core/clock`        | The step's length and the most steps a frame are its arguments; Brick Breaker passes 1/120 s and 12                                                                                                                                                                         |
| A ring of numbered events   | `src/rules/events.ts`: `EventLog`                                                      | `@fz/core/event_log`    | `EventLog<E>` takes its size and a blank record; `next()` hands back the next record, numbered, to fill in place, so nothing is made per step                                                                                                                               |
| A frame's sounds            | `src/view/effects.ts`: `FrameSounds`                                                   | `@fz/core/frame_sounds` | `FrameSounds<Name>` takes the sprite's names; Brick Breaker's `SOUNDS`                                                                                                                                                                                                      |
| Points grouped in thousands | `src/rules/describe.ts`: `formatPoints()`                                              | `@fz/core/format`       | Beside `count()`, unchanged                                                                                                                                                                                                                                                 |
| A record's keys, typed      | `src/rules/tables.ts`: `keysOf()`                                                      | `@fz/core/records`      | Unchanged, at A2.4, as the weapons' catalog needs it; `recordOf()` too, at A7.4.1, as the art needs it; `pick()`, only Brick Breaker's, stays                                                                                                                               |
| A sound held                | new                                                                                    | `@fz/phaser/sound`      | `SpritePlayer.hold(name, held)` loops a sound while held and stops it when let go, or when sound is turned off or the scene ends                                                                                                                                            |
| A deck beside a board       | new                                                                                    | `@fz/dev/layout`        | `PhaserBoard` takes an optional `deck`: the attribute that lists its zones by name, the zones it must show, and their least size; `inspectPhaserDeck()` holds each zone on the canvas and in the window, off the board, the other zones and the bar, and at least that size |

Each moves now because two games need it, as `@fz/core`'s rule asks; the
last two are new, and each lies where the next action game will look for
it. The stick itself stays in Asteroid Breaker until a second game wants
one. Brick Breaker adopts the five it gives, its sounds the same bytes, its
autopilot's report the same numbers.

### The build

#### Layers

As Brick Breaker's, four folders under `src/`, fenced by
`eslint.config.js`:

| Folder       | May import                                                                                                                 | May not import                                                      |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `src/rules/` | `@fz/core`                                                                                                                 | Phaser, Angular, RxJS, any other `@fz/*`, the view, scene and shell |
| `src/view/`  | the rules, `@fz/core`, `@fz/phaser/color`, `@fz/phaser/insets`, `@fz/phaser/layout`, `@fz/style/fuzzball`                  | Phaser, Angular, RxJS, the shell's libraries, the scene and shell   |
| `src/scene/` | Phaser, `@fz/phaser`'s entries but the canvas, the view and the rules                                                      | Angular, RxJS, the shell's libraries, the shell                     |
| `src/app/`   | Angular, every `@fz/*` library, the rules and the view; the scene and `@fz/phaser`'s host, scene helpers and sound by type | Phaser, and those by a value import                                 |

#### The rules

- `tuning.ts` the numbers; `speed.ts` the three speeds; the clock from
  `@fz/core/clock`, through `stepper.ts`, as in Brick Breaker.
- `torus.ts`: the field's size in units, the wrap, the shortest way from
  one place to another across it, the distance, and the copies an object
  near an edge needs drawn (one to four), which the view reads.
- `fill.ts`: a wave's counts for a field's area (`fillFor()`), the cap, the
  pickups at once, the strays and the comets' times, and the stretch a
  pause makes (`stretchField()`), so the autopilot plays them as a player
  meets them.
- `endless.ts`: Endless's waves, from the run's seed and the wave's number.
- `ship.ts`: the ship's flight from a frame's `Steer` (`turn` of −1 to 1, a
  stick's `heading` or the mouse's `aim` to turn toward; `thrust` 0 to 1;
  `fire`; `dash`), its guard, its dash and its recharge.
- `shots.ts`: shots fired by the weapon in hand (`WEAPONS`), moved, swept
  as segments against rocks' circles across the wrap, so none passes
  through a small rock in a step.
- `rocks.ts`: `Rock`, laid by `addRock()` in slots as many as the cap;
  `hitRock()`, which a shot, a blast, a comet, the Nova and the Shield
  call; the split, the cap, and `TRAIT_RULES`.
- `draws.ts`: the field's seeded draws (`nextDraw()`, `drawIn()`), as
  Brick Breaker's are.
- `events.ts`: `FieldEventLog`, what happened on the field, for the scene
  to play, through `@fz/core/event_log`.
- `drops.ts`: drops by chance, crystal and drought, by weight from the
  wave's pool through `@fz/core/random`'s `drawAt()`, which `hitRock()`
  calls as a rock breaks.
- `pickups.ts`: the drift, the pull to the ship, the catch, and
  `EFFECT_RULES`.
- `hazards.ts`: the strays' and the comets' times, warnings and
  crossings, a stray's catch and the Magnet's pull on it.
- `pilots.ts`: the crew, those at home, and the next pilot's color
  (`nextPilot()`), a pilot being its color's number, 0 to 7.
- `spawn.ts`: the wave's rocks laid out by its formation, fairly, and the
  safest place for a new ship.
- `field.ts`: `Field`, a wave in play, stepped in place from records made
  once, as Brick Breaker's is: `fieldFor()`, a wave's field laid out whole,
  `createField()`, `steerField()`, `stepField()`, `reshapeField()`, the
  stretch on a pause, and the events it logs (`@fz/core/event_log`).
- `scoring.ts`, `run.ts`, `describe.ts`, `progress.ts`, `stats.ts` and
  `saved_game.ts`, as Brick Breaker's are, for waves, sectors, ships and
  their pilots.

#### The physics

Every object is a circle on the torus. Each step, at 1/120 s: blasts due go
off, reaching the rocks laid before the step; the ship flies, then its
shots, a pull leaving from where its nose is now; every rock and pickup
moves and wraps; each shot is swept from its last place to its next against
every rock (the shortest way across the wrap), and the first it meets takes
the hit; the ship is tested against every rock, comet, pickup and stray. At
the widest field's cap, 105 rocks, with Spread's 18 shots and two comets,
that is about two thousand circle tests a step, and with every weapon's 42
at once, as weapons caught one after another can leave for a moment, about
four and a half thousand, which needs no spatial index; Q2 times the most in
Node, and a grid of cells joins only if it doesn't fit.

#### The view

- `field_metrics.ts`: where the deck and the field lie on the canvas and
  the field's size in units: `deckLayout()` takes the deck's share of the
  stage (a quarter of its height upright, 136 to 200 CSS px; a sixth of its
  width each side on its side, 112 to 176), `fieldRoom()` is the rest,
  `fieldShape()` shapes the field for it, its short side 40 units and its
  long side up to 88, and `fieldMetrics()` fits a field of a shape into it
  on whole device pixels, a unit being whatever fraction that makes; with
  `toCanvas()` and `toField()` between the two. The deck lies under the
  field or beside it, whichever leaves the field in play the larger unit,
  so a phone upright has it under and one on its side beside. `@fz/phaser/layout`'s
  `fitCells()` doesn't fit, as it makes each cell a whole number of device
  pixels, which would waste up to 88 of them on the long side; the game
  keeps its own, as no other game needs it yet.
- `steering.ts`: `Steering`, which turns held keys, the mouse and fingers
  into each frame's `Steer`: the keys as a turn and a push, the pointer as a
  place to aim at, kept from its last move, the stick (`stick.ts`, its
  rings, its remapping, its following base and its one finger) as a heading
  and a push, and the buttons (`deck.ts`) by which finger is where.
- `frame.ts`, `layers.ts`, `timing.ts`, `flourish.ts`, `effects.ts` (each
  event's sound and flourishes) and `tags.ts`, as Brick Breaker's are.
- `palette.ts` and `inks.ts`: the field's colors from the palette's roles,
  the rocks' inks, seven for light palettes and seven for dark, and the
  pilots', eight for each (`pilotInk()`), which the shell's bar and cards
  take too.
- `art.ts`, `rock_art.ts`, `pilot_art.ts`, `ship_art.ts`, `symbols.ts` and
  `shapes.ts`: every frame of the
  atlas as plain drawing commands in device pixels: the ship, its flame and
  ring, a pilot in each ink and its eyes, a stray's bubble, shots, each rock
  kind in each size, outline and state, each pickup and its symbol, the
  comet, its warning, the deck's parts, white, in their own small atlas,
  as they are sized in CSS pixels, and the flourishes' shards; the
  constellation's places; and How to play's pictures.
- `wave_play.ts`: `WavePlay`, the wave in play that `GameService` makes and
  drives, as Brick Breaker's `LevelPlay` is.

#### The scene

`BeltScene` is handed plain functions over the game, as `BricksScene` is:
each frame it hands the game the time and the steering, reads the frame and
has its painters draw, each in its layer: `FieldPainter` the specks, the
constellation in Endless and the frame, `RockPainter`, `PickupPainter`,
`StrayPainter` the strays adrift and the pilots bailing out,
`HazardPainter` the comets and their warnings, `ShotPainter`,
`ShipPainter` the ship and its pilot, `EffectsPainter` the
shards, rings, exhaust and shake, `PointsPainter` the rising points,
`TagPainter` the effects in play, and `DeckPainter` the stick and buttons.

- **Two cameras.** The field's camera has the field's rectangle as its
  viewport, so whatever lies past an edge is cut off there; the deck's
  camera, over the whole canvas, draws the field's frame and the deck and
  ignores the field's objects, so the frame stays still as the field
  shakes.
- **An object across an edge is drawn on both sides,** up to four times at
  a corner, from pooled images, as `torus.ts` says, so a rock slides out of
  one edge as it slides in at the other.
- **One atlas,** baked with `@fz/phaser/scene`'s `bakeAtlas()` again on a
  new palette or unit, so the field draws from one texture; its frames fit
  in 2048 × 2048 at the largest unit, at six outlines a kind and size,
  baked at 32 device px a unit at most. The deck's parts, sized in CSS
  pixels, are baked in a small atlas of their own on a new pixel ratio.
- **Flourishes from pools,** a particle emitter on the atlas for shards and
  exhaust, every image made as the scene is created; nothing is made per
  frame.
- **Four pointers:** the mouse, and the three fingers the steering
  follows (`MOST_FINGERS`), a thumb on the stick and two on the buttons, so
  one can hold Fire as another dashes; Phaser starts with one, and the
  scene adds the rest (`input.addPointer(MOST_FINGERS - 1)`).

#### The shell

Laid out as Brick Breaker's, one folder per feature: `play/`
(`GameService`, `SavedGameService`), `board/` (the canvas, the placeholder
drawn in CSS, the focus ring, the cards, the deck's room in CSS for the
placeholder, the pointer hidden while a ship flies, haptics through
`navigator.vibrate` where it exists), `bar/` (the speed's badge, the
figures: the wave, the score, the ships as their pilots, each in its ink,
and the chain while it counts; compact, the score and the ships alone),
`pilot/` (`<app-pilot>`, a fuzzball in a pilot's ink, which the bar, the
Paused card and the result share), `sectors/`, `result/`,
`help/`, `settings/`, `stats/` and `styles/`. The board is an application;
`[fzPlayRoom]` pauses the wave when the player looks away or the phone
turns, as it does for Brick Breaker.

#### Performance

Brick Breaker's bar holds: a frame's work under 4 ms at the median with the
CPU throttled six times, measured at the busiest moment (Tempest on the
widest field, at the cap of 105 rocks, Spread's 18 shots, a blast chain), on
a 2560 × 1440 window too, where the atlas is scaled up; nothing allocated
per step or frame
(`phaser-canvas-performance`); a check at 120 Hz this time, which Brick
Breaker never had. Phaser loads with `import()` after the page paints.

#### Testing

As Brick Breaker's: the rules and the view in Node, each spec beside its
file, a floor on both; fields from pictures in `src/testing/`
(`fieldFrom()`, a rock or ship placed and stepped); the stick and the deck's
layout by cases (every `@fz/dev/layout` shape gives a field filling its
room, a short side of 40 units, a unit of 6 CSS px or more and a deck of
its least size); the fill and the stretch by cases; the autopilot and the
placement over seeds and field shapes; Endless's waves over seeds; the
saved game's round trip; the contrast spec over every palette; the scene on
real Phaser through `runScene()`, the shell through
`provideFakePhaserCanvas()`; `yarn check:layout` at every shape and turned,
with the deck; `yarn capture:screenshots` for the site's images.

## Risks

- **Touch feel is the game, and only a person on a phone can judge it.**
  The earlier games never had a real-device pass; this one has its gate at
  Q3, before most of the content exists.
- **A small phone on its side is tight:** at 568 × 320 the field is 256 CSS
  px across between two decks of 112, a unit of 6.4. The layout check holds
  its unit to 6 CSS px; if it plays badly there, the decks shrink first.
- **A wider field is a longer wave.** At constant density a desktop's
  field holds 1.8 times a 40 by 40's rocks, the widest 2.2, so its waves take
  longer and score more, and bests made on a desktop beat a phone's. The
  autopilot's report shows the lengths on both; if a desktop's waves drag,
  the long side's cap comes down before the density does.
- **A very large window draws everything large,** a ship of 80 CSS px on a
  2560 × 1440 screen, since the short side is always 40 units. The atlas is
  scaled past 32 device px a unit, which softens edges a little; the
  screenshots at that size show whether it matters.
- **iPhone Safari's edge swipe** goes back a page and can't be fully
  stopped; the stick at rest and the buttons keep 16 px off the edges,
  and the decks inside the safe areas.
- **Thumbs near the bar.** Upright, the bar sits under the deck; a thumb
  that slides can press Pause. The deck keeps a gap above the bar, and the
  bar's buttons need a deliberate tap.
- **Many objects drawn up to four times** at the edges; the pools and the
  one atlas keep it to one texture, and the trace at Tempest proves it.
- **Light palettes:** space on white is unusual. The mock shows it; if the
  user prefers night everywhere, always dark space is one switch in
  `palette.ts`.
- **Shots added to the ship's speed** can feel odd to a newcomer flying
  backward. It is the genre's, and the sketch lets it be tried.

## Not in this plan

- A gamepad (decision 24), and full screen on phones that allow it.
- Enemy ships, a Custom speed, ships to choose between, co-op, online
  leaderboards, tilt.
- Moving the stick into a library, until a second game wants one.

## What other games teach

Read for the design plan, and what its decisions drew on: descriptions,
reviews and design write-ups of games in the genre, and guides to touch
controls. No other game's code was read.

- **The glide is the genre.** The original is described as "a rudimentary
  physics game": ship, rocks and shots all carry inertia, and a shot leaves
  with the ship's speed added to its own
  ([Game Developer](https://www.gamedeveloper.com/design/feature-game-design-essentials-20-atari-games-)).
  Players of clones say what they miss is the glide
  ([AtariAge](https://forums.atariage.com/topic/365993-the-case-of-the-assy-asteroids-clones/)).
  So the ship drifts, and shots add the ship's speed (decision 2).
- **Wrapping is the escape valve,** and smaller rocks are faster and worth
  more; the original capped the rocks on screen and split one into fewer
  pieces at the cap
  ([Wikipedia](<https://en.wikipedia.org/wiki/Asteroids_(video_game)>)).
  Kept, with our own numbers.
- **Lurking.** Players of the original hid near an edge and farmed the
  saucers for points until a patched ROM stopped it; its sequel's design
  aimed at the same strategy
  ([Wikipedia](<https://en.wikipedia.org/wiki/Asteroids_(video_game)>),
  [Asteroids Deluxe](https://en.wikipedia.org/wiki/Asteroids_Deluxe)). A
  game here has no endless source of points to farm: the strays come a set
  number of times a wave, and comets pay nothing.
- **Pickups that come to you, and come often enough.** Blasteroids' power
  crystals decay, so they must be caught quickly
  ([Blasteroids](https://en.wikipedia.org/wiki/Blasteroids)); reviewers of
  Asteroids: Recharged liked that pickups drift toward the ship, which spares
  unfair deaths, and disliked uneven drop rates
  ([Gamezebo](https://www.gamezebo.com/reviews/asteroids-recharged-switch-review-out-of-this-world/),
  [The Xbox Hub](https://www.thexboxhub.com/asteroids-recharged-review/)).
  So pickups last 8 s, are drawn in from close by, and a drought rule
  guarantees one (decision 10).
- **Rocks of different stuff.** Super Stardust HD's rocks are rock, gold and
  ice, each best broken by its own weapon
  ([Giant Bomb](https://www.giantbomb.com/wiki/Games/Super_Stardust_HD)),
  and Blasteroids has rocks that home on the ship after a hit, rocks that
  grow, and rocks that hold crystals. Asteroid Breaker's kinds are its own,
  but the idea, a kind told apart at a glance that asks for a different
  approach, is what its catalog is for (decision 8).
- **Shields and boosts over a random jump.** Asteroids Deluxe replaced the
  jump to a random spot with a draining shield; Super Stardust HD has a
  boost. A random jump is a gamble the player can't learn, so the escape
  here is a dash (decision 7).
- **On a phone, twin sticks are the common answer, and a finger over the
  ship is the common complaint.** Atari's own mobile game went twin-stick
  ([Gamezebo](https://www.gamezebo.com/upcoming/asteroids-gunner-preview/));
  players say a finger covering the ship is bad and that a virtual stick
  works for asteroid shooting
  ([TouchArcade](https://toucharcade.com/community/threads/preferred-control-method-for-shmup-bullethell-free-flight-games.125655/));
  a developer of a portrait asteroid game found four buttons needed two
  hands and thought holding to fire more accessible
  ([TouchArcade](https://toucharcade.com/community/threads/spacey-asteroid-beta-testers-needed.411941/)).
  So the controls sit off the field, in a deck, and fire is held
  (decisions 4 and 6).
- **How a virtual stick feels right:** it appears where the thumb lands, in
  a zone of its own; a dead zone of 10–15% of its radius, with the output
  remapped from the dead zone's edge so it doesn't jump; the knob clamped to
  the base; a highlight at full push, since a thumb feels no stop; and one
  finger tracked from press to release
  ([Abratabia](https://www.abratabia.com/game-controls/virtual-joystick.php)).
  All of it is in the deck (decision 4).
- **Feel comes from small, quick feedback:** a kick and a decaying shake, a
  brief pause on a big hit, debris that lingers, sound with every action
  ([Vlambeer's talk, as summarized](https://infovore.org/?p=5275)). So the
  flourishes (decision 18), all left out where the player asks for less
  motion.
