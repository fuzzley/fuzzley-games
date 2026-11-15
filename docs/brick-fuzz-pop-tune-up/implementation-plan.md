# Brick Fuzz Pop tune-up: the implementation plan

Written 2026-11-15, as a companion to [`plan.md`](plan.md). That file is the
design: the five changes, the measurements behind them and the six choices
the user settled. This file is how to build them side by side:

- the points the design leaves open, settled before code (§2);
- the contracts the packages share: types, names and events (§3);
- each package of work, with its files, its specs and when it is done (§4);
- how the packages run in parallel, each an agent in a worktree of its own,
  each commit reviewed before it is made (§5);
- the checks, budgets and risks that hold for the build (§6, §7);
- how it ends (§8), and what the build decided, once it has (§9).

Where this file and `plan.md`'s "Order of work" disagree, this file is the
newer: it splits the five changes into nine packages so that four can run
at once, where the design built them one after another.

Paths are relative to `frontend/games/brick-fuzz-pop/` unless they start
with `frontend/` or `docs/`.

---

## 1. Summary

- **Nine packages in four streams, and a finish.**
  - **R, the rules:** R1, air time and wool, with the certificates; R2,
    the drop in the flight.
  - **F, fast-forward:** F1, the switch.
  - **G, the gauge:** G1, its placement and frames; G2, the steering's
    touch, the painter and the notch's pitch.
  - **D, the drop in the view and the shell:** D1, the icon and the sound;
    D2, the playback taking a round flown again; D3, the records at the
    landing; D4, Drop in the shell and the bar.
  - **Z,** the integrator's finish: the screenshots, the read-through, the
    full checks, a look at every change in a browser.
- **The critical path is the drop:** R1, then R2, then D2, then D4, each on
  the file or the type the last one changed. Everything else runs beside it.
- **Three agents at most at once.** Another session is building the
  Asteroid Breaker uplift on this machine with up to five, so this build
  takes three slots, runs its specs on three workers, and shares that
  build's lock for the heaviest checks (§6).
- **The integrator** is the session that runs the build. It owns the
  branch `brick-fuzz-pop-tune-up`, in the worktree
  `.claude/worktrees/bfp`, lands each finished package on it by a rebase
  and a fast-forward, and starts the packages that waited on it.
- **Every commit is reviewed before it is made,** by the
  `commit-review-process` skill: a fresh agent reads the staged change with
  only the project's and the package's context, and the author answers
  every comment in the commit's body.

---

## 2. Settled before code

The design leaves these open, or says them in words that admit two builds.
None changes a choice the user settled. Each is the plan's call, so the
build goes on without waiting.

**S1. The idle limit is derived from boredom where a flight's rules are
made.** `tuning.ts` gains `IDLE_SHARE = 2`, how many times boredom a
fuzzball flies without taking a hit before it yawns whatever it touched.
`FlightRules` gains `mostIdle` beside `bored`, and `flightRulesOf()` sets
it to `rules.bored * IDLE_SHARE`. `RoundRules` stays `{ bored }`, so the
debug menu's one slider tunes both, `rulesOf()` and the shell's specs are
untouched, and only the slider's top moves, from 300 to 600. The
`FlightRules` the specs build by hand gain it
(`src/testing/random_flights.ts`, `src/testing/flights.ts`).

**S2. The idle limit is a yawn, not a cap.** `Flight.capped` counts what it
counts now, the fuzzballs `MOST_FLIGHT` brought home and those the still
turns did, and not those the idle limit brings home, so "the caps never
reached" over the ten thousand random rounds keeps its meaning.

**S3. A touch is a strike on a brick whose kind can break.** In
`strikeOnce()`, a strike that took a hit moves `idleFrom` and `hitFrom`; one
that took none moves `idleFrom` alone, unless the kind's `hits` is
`"never"` (steel and the bumper). A zap or a blast moves neither, as now.

**S4. The certificates are found twice, once a rule.** A commit keeps the
`sim` specs green, and they replay every certificate, so the air time's
commit carries its certificates and wool's carries them again. One
certification takes about half a minute; two smaller reviews are worth it.
`plan.md`'s "certified again, once" was about the cost, which is small.

**S5. Wool raises the strike's charge, and no new event says so.**
`Struck.charge` loses `readonly`, its doc saying a rule may raise it.
`RECHARGES_RULE` gains `struck`, setting it to `MOST_CHARGE` for a
fuzzball's strike only (`by === "fuzzball"`); a zap or a blast is left
alone. The strike's event carries the charge after the strike, as now, and
the `recharge` event stays at the break.

**S6. A drop is the flight's second kind of stop.** `FlightStop` becomes a
union: the guide's `{ stop: "first-turn"; extra }` and a new
`FlightDrop`, `{ stop: "drop"; at }`, the moment every fuzzball in the air
comes home.

**S7. What happens at the drop's moment.** Every event at that moment or
before it is the whole flight's, event for event, a launch among them, and
the drops follow them. A launch after the moment never happens: its
fuzzball has no events and no waypoints, and `trackProblemsOf()` and
`positionAt()` are taught such a track. A fuzzball already dropping home,
bored, goes on dropping and doesn't drop again. A zap or a blast set off
by then lands as it would. A dropped fuzzball isn't counted in `capped`.

**S8. The `drop` event.** `{ at, kind: "drop", ball, x, y }`, as a yawn's.
The drops go after every other event of their moment, a section of their
own after the zaps' in `byMoment()`, by fuzzball, so the events the
playback may already have played at that moment keep their places in the
log (S10); `events.ts`'s doc of the order says so.

**S9. The rounds take a drop as their last argument.**
`playRound(start, shot, levelBoon, rules = RULES, drop?: FlightDrop)` and
`playRoundBy(start, shot, levelBoon, rules, drop?: FlightDrop)`, handing it
to `fly()`. The guide never drops. `PLAY_ROUND`'s type follows, so the
specs' stand-in (`src/testing/play.ts`) takes it too.

**S10. The playback takes the round flown again by two members.**
`RoundPlay.moment`, the flight's moment the playback has reached, and
`RoundPlay.dropTo(round)`, which takes a round flown again from the same
start, dropped at that moment or later, and plays on from where it is,
its place in the event log kept, as the events already played are the same
ones. It does nothing unless the playback is flying. `skip()` stays, for a
page hidden mid-flight.

**S11. When Drop does nothing, and when it works paused.** It does nothing
while no flight is in the air (the playback isn't flying), and while the
debug menu plays a certificate's line, as a line's later shots assume the
earlier ones flew whole. While the run is paused with a flight in the air,
it works, as Skip's press does today: the round is flown again at the
playback's moment, and its fuzzballs come down as the run goes on. So the
button is dimmed exactly when a press does nothing. A drop at a moment past
the flight's last event changes nothing.

**S12. The shell keeps what a drop flies again, and the saved game sees
it.** While a flight is in the air, `GameService` keeps the run as it stood
once the level started (`startLevel()`'s), the round's start, the shot, the
level's boon and the `RoundRules` it was released with, and drops them as
the round lands or a new run begins. `drop()` flies the round again with
them, the drop at `play.moment`, takes the new outcome into that run with
`takeRound()`, hands the round to `play.dropTo()`, and sets the state. A
drop changes neither the run's rounds nor its outcome, which are all
`SavedGameService`'s `track` reads now, so D4 has it read the next start
too (`nextStart()`), `KeptGame`'s doc saying so, and a spec holds that a
drop writes the saved game again.

**S13. The records are kept as the run lands.** `playFrame()`, where it
lands the run (`landRound()`), keeps what the landing brings: a level
cleared, the levels it opens, the run's end and its best, and sets
`newBest` then. A run's start is still counted at its first release.

**S14. A page hidden mid-flight lands the flight, paused or not.**
`[fzPlayRoom]`'s `away` hands its reason on (`AwayReason`). A tab switch
blurs the window first, so `"focus"` usually comes before `"hidden"` and
has paused the run already; `landRound()` lands only a run that plays. So
for `"hidden"`, with a flight in the air, the game lands it whole whatever
the run's outcome: the playback by `play.skip()` and a frame of no time,
the run by `afterLanding()` with its pause kept, and the records as S13
keeps them; then it pauses, if it hadn't. A player coming back finds what
that landing shows, paused where the run can be. For `"focus"` and
`"turned"` alone, the flight pauses in the air, as now. D3's specs hold
both orders: hidden alone, and focus then hidden.

**S15. Taking up a run on the record marks its levels before cleared.**
Every level from the run's `firstLevel` to the one before its `level` is
marked cleared in the progress (`recordCleared()`), which changes nothing
where they are already; a run the debug menu took off the record marks
none. The stats are untouched.

**S16. Drop is its own button.** `src/app/bar/skip.component.ts` moves to
`drop.component.ts`, `button[appDrop]`, named "Drop" by its tooltip, its
output `dropFlight`, dimmed while there is no flight as Skip is. X asks for
`"drop"`, which replaces `"skip"` in `FieldCommand`. `@fz/ui` gains the
`drop` icon in D1 and loses `skip` in D4, which only this game uses.

**S17. F is a command.** `FieldCommand` gains `"fast"`, which toggles the
setting; `HeldKey`, `HELD_KEYS`, `heldKeyOf()`, the steering's held keys
and `Steer.fast` go. The announcer says "Fast-forward on" or "Fast-forward
off" for the key alone, the button's `aria-pressed` saying it for a press.

**S18. The switch is a setting with no control in the drawer.**
`Settings.fastForward`, off by default and read as off where an older entry
lacks it, `SETTINGS_VERSION` staying 1. The bar's button is its control;
the drawer's line on the bar's flight buttons says that it stays on from
flight to flight.

**S19. The gauge's placement is a view's function.** `src/view/gauge/gauge.ts`:
`gaugeOf(touch, field, pixelRatio, into)` writes the plate's middle, its
turn and the five pips' places, in device pixels, into a record made once
(`GaugePlace`), from the touch, the field's frame and ceiling and the
pixel ratio. `GAUGE_REACH_CSS_PX = 74` and `GAUGE_PIP_CSS_PX = 13` are its
measures in CSS pixels; the turn is
`docs/brick-fuzz-pop-tune-up/mocks/make-mocks.mjs`'s `gaugeTurn()`:
none where every pip lies inside the field and under the ceiling with room
to spare, otherwise the least whole degree toward the field's middle that
fits.

**S20. The steering says where the aiming finger is.** `Steer` gains
`touch: boolean`, `touchX` and `touchY`, in the canvas's device pixels,
written in place each frame: true for a finger that points from its press,
or that pulls back once past its dead zone, until it lets go or the shot is
called off; false for a mouse, the keys and no press.

**S21. The gauge's frames.** `FRAMES.gaugePlate`, `FRAMES.gaugeOn` and
`FRAMES.gaugeOff`, baked in `flightFrames()` beside the meter's, sized by
`ArtScale.pixelRatio` from the CSS measures, the plate in the lintel's
color with a rim, the pips in the meter's `on` and `off`. Where a pip
falls under 3:1 against the plate in a palette, G1 adds or picks a role
that holds it, and says so.

**S22. The gauge paints in a layer of its own,** `gauge` in `LAYERS`
(`src/scene/layers.ts`), over the fuzzballs and under the rim, through
`GaugePainter` (`src/scene/painters/gauge_painter.ts`), from one plate and
five pips made once, setting nothing on a frame where the steer and the
charge are as they were. It shows only while the steer says a finger aims
and a fuzzball waits to be let fly, as the meter shows only under a waiting
fuzzball, and hides as the shot flies.

**S23. The notch's pitch.** `src/view/effects/effects.ts` gains
`notchDetuneOf(charge)`, 100 cents a notch over the first, so charge 1
plays as today and 5 four semitones up; `WallScene.hearNotch()` plays the
notch at it.

---

## 3. Contracts

What the packages share, so a package beside another builds to the same
names. A package that needs a name another hasn't landed yet waits for it
(§5.1) rather than inventing one.

### 3.1 Rules

| Name                                                 | Where                        | Who makes it |
| ---------------------------------------------------- | ---------------------------- | ------------ |
| `BORED = 180`, `IDLE_SHARE = 2`, `MOST_FLIGHT = 900` | `src/rules/tuning.ts`        | R1           |
| `FlightRules.mostIdle`, set by `flightRulesOf()`     | `flight.ts`, `round.ts`      | R1           |
| `Struck.charge`, writable                            | `src/rules/flight/hooks.ts`  | R1           |
| `FlightDrop`, `FlightStop` as a union                | `src/rules/flight/flight.ts` | R2           |
| `FlightEvent`'s `drop`                               | `src/rules/flight/events.ts` | R2           |
| `playRound(…, drop?)`, `playRoundBy(…, drop?)`       | `src/rules/round/round.ts`   | R2           |

### 3.2 View and scene

| Name                                                | Where                                          | Who makes it |
| --------------------------------------------------- | ---------------------------------------------- | ------------ |
| `"drop"` in `SOUNDS`                                | `src/view/effects/effects.ts`                  | D1           |
| The `drop` event's sound, its eyes and its playback | `effects.ts`, `wall_scene.ts`, `round_play.ts` | R2           |
| `RoundPlay.moment`, `RoundPlay.dropTo()`            | `src/view/round_play.ts`                       | D2           |
| `"fast"` and `"drop"` in `FieldCommand`             | `src/view/steering/controls.ts`                | F1, D4       |
| `Steer.touch`, `touchX`, `touchY`; no `Steer.fast`  | `src/view/steering/steering.ts`                | G2, F1       |
| `gaugeOf()`, `GaugePlace`, the gauge's measures     | `src/view/gauge/gauge.ts`                      | G1           |
| `FRAMES.gaugePlate`, `gaugeOn`, `gaugeOff`          | `src/view/art/frames.ts`                       | G1           |
| `notchDetuneOf()`                                   | `src/view/effects/effects.ts`                  | G2           |
| `gauge` in `LAYERS`, `GaugePainter`                 | `src/scene/`                                   | G2           |

### 3.3 Shell and libraries

| Name                                                         | Where                                  | Who makes it |
| ------------------------------------------------------------ | -------------------------------------- | ------------ |
| `Settings.fastForward`                                       | `src/app/settings/settings.service.ts` | F1           |
| `GameService.fast` from the setting; `fastForward()` toggles | `src/app/play/game.service.ts`         | F1           |
| Records kept in `playFrame()`; the away reason handed on     | `game.service.ts`, `app.component`     | D3           |
| `GameService.drop()`, in `skip()`'s place for the bar        | `game.service.ts`                      | D4           |
| The saved game's `track` reading the next start too          | `src/app/play/saved_game.service.ts`   | D4           |
| `button[appDrop]`, `dropFlight`                              | `src/app/bar/drop.component.ts`        | D4           |
| The `drop` icon; `skip` gone                                 | `frontend/lib/ui/src/icon/`            | D1, D4       |

---

## 4. Work packages

Each package is one fresh agent's run, in a worktree of its own (§5.4). It
ends with its commits made, each reviewed, its checks passing, and its
report to the integrator. Each changes the workspace's `AGENTS.md`, its
skills and `frontend/lib/ui/AGENTS.md` where they describe what it
changed, in the same commit, as `.agents/AGENTS.md` asks: "a skill
describes code that exists".

### R: the rules

**R1. Air time and wool, with the certificates.** `plan.md`'s §1 and §3.
Two commits, each whole and green:

1. _Air time._ `tuning.ts` (S1: `BORED`, its doc saying "without
   touching a brick that can break", `IDLE_SHARE`, `MOST_FLIGHT`);
   `flight.ts` (`Ball.hitFrom`, `plan()`'s three limits, `strikeOnce()` by
   S3, `comeHome()`'s cap by S2); `round.ts` (`flightRulesOf()`, S1);
   the `FlightRules` built by hand in `src/testing/random_flights.ts` and
   `src/testing/flights.ts`; `src/view/debug/debug_tuning.ts` (the
   slider's top); the docs of `shelled.ts` and `plated.ts`; How to play's
   sentence on boredom (`src/app/help/help.component.html`). The specs
   `plan.md` names: `flight.spec.ts` (bored's round; the cap, on a wall that
   keeps giving hits; the idle limit, a test of its own), `round.spec.ts`,
   `trait_rules.spec.ts`, `solver.spec.ts`, and the hand-made `bored` round
   in `src/testing/flight_fixtures.ts`, worked out again for 180. Then
   `yarn workspace brick-fuzz-pop certify:levels` and
   `yarn workspace brick-fuzz-pop report:levels` (every level over its
   floor), and `tools/capture-screenshots.mjs`'s `RUN` and its spec, the
   first two shots of level 18's new line on a field 11 deep, and its
   `AIMING`, the shot the picture aims, chosen again on the wall those two
   leave: up through a gap, its guide punching through a bomb, as now.
2. _Wool._ `hooks.ts` and `recharges.ts` (S5); wool's `about` in
   `src/rules/catalog/kinds/sparks.ts`; `recharges.spec.ts` and
   `flight.spec.ts`'s "charges a recharged fuzzball to the most" rewritten,
   and a plain fuzzball punching through wool a case of its own. Then the
   certificates, the report, `RUN` and `AIMING` again.

- **Owns:** `src/rules/` but `src/rules/run/`, `src/testing/flight_fixtures.ts`,
  `src/testing/random_flights.ts`, `src/testing/flights.ts`,
  `src/testing/solver.spec.ts`, `src/view/debug/`, the certificates and
  `par.json`, `tools/capture-screenshots.mjs` and its spec.
- **Done when** the game's lint, typecheck and every project's specs pass,
  `sim` among them, the report marks no level under its floor, and the
  report's figures and par's sum are in the commit's body beside
  `plan.md`'s (`docs/brick-fuzz-pop-tune-up/sim/results/par.md`: 4,239 to
  about 4,123).
- If the air time alone puts a floor under the careless player, R1 folds
  wool into the first commit and says so.

**R2. The drop in the flight (after R1 and D1).** `plan.md`'s §5, "The
rules fly the round again":

- `flight.ts`: S6 and S7, the drop one more limit on `home` in `plan()`,
  each launch after it called off, a `drop` event (S8) where `comeHome()`
  yawns, through a shared helper rather than a copy.
- `events.ts`: the `drop` event and the order's doc.
- `round.ts`: S9.
- The `drop` event wherever a switch over `FlightEvent` needs a case:
  its sound, `"drop"`, in `effects.ts`; where its fuzzball looks, as a
  yawn's, in `wall_scene.ts`; beside `yawn` in `RoundPlay`'s `takeIn()`
  (`src/view/round_play.ts`), whose switch lint holds to every kind; and
  `orderProblemsOf()` and `trackProblemsOf()` in
  `src/testing/flight_fixtures.ts`.
- The property spec, over `src/testing/random_flights.ts`'s seeded flights:
  a flight dropped at a moment drawn in it is the whole flight up to that
  moment, every fuzzball in the air comes home then and none leaves after,
  and `orderProblemsOf()` and `trackProblemsOf()` stay empty; and a spec of
  `playRound()` dropped, the wall it leaves holding every brick the whole
  round would have broken after the moment.
- **Owns:** `src/rules/flight/`, `src/rules/round/`,
  and, after R1, `src/testing/random_flights.ts`; adds to `effects.ts`,
  `wall_scene.ts` and `round_play.ts`.
- **Done when** the checks pass and the benchmarks in
  `src/rules/flight/benchmarks/` hold `fly()`'s median where it was, as a
  flight with no drop takes no new branch per step.

### F: fast-forward

**F1. The switch.** `plan.md`'s §4:

- `settings.service.ts`: S18; `game.service.ts`: `fast` from the setting,
  `fastForward()` toggling it, the `"fast"` command (S17) with its words,
  `fastAsked`, `fastHeld` and their resets gone;
  `fast_forward.component.ts`: no `flying` input, never dimmed; the bar
  and `app.component.html` bound to match.
- `controls.ts` and `steering.ts`: S17. Every `Steer` built whole loses
  `fast`: `UNSTEERED` in `wall_scene.ts`, `STILL` in `src/testing/play.ts`,
  and the scene's and the steering's specs.
- Words: How to play's row for Fast-forward (a press, not a hold) and its
  "No hurry" paragraph, the drawer's line (S18), and the board's
  description of its keys (`board.component.html`).
- **Owns:** `src/app/settings/`, `src/app/bar/fast_forward.component.*`,
  `src/view/steering/controls.ts`; adds to `steering.ts`,
  `game.service.ts`, `wall_scene.ts`, `src/testing/play.ts`, the bar,
  `app.component.html`, How to play and the board.
- **Done when** the checks pass, and the game, served and looked at in a
  headless Chrome at 390 × 844 and 1280 × 720, shows Fast-forward live
  while aiming, pressed once pressed, still pressed on the next flight and
  after a reload.

### G: the gauge

**G1. The placement and the frames.** `plan.md`'s §2:

- `src/view/gauge/gauge.ts` and its spec: S19, in Node, a touch in the
  middle, by each side wall, under the ceiling and in a corner, at pixel
  ratios 1, 2 and 3, every pip inside the field and the turn the least
  that fits.
- `frames.ts` and `src/scene/field_art.ts`: S21, with the art's specs
  finding the three frames in the atlas at every scale, and
  `src/view/colors/contrast.spec.ts` holding the pips to the plate in the
  four palettes.
- **Owns:** `src/view/gauge/`, `src/view/art/frames.ts`,
  `src/scene/field_art.ts`, `src/view/colors/`.
- **Done when** the checks pass, the atlas holds inside its budget at 128
  device pixels a unit, and nothing yet draws the gauge.

**G2. The touch, the painter and the pitch (after F1 and G1).**

- `steering.ts`: S20, specs for a pointed press, a pull back before and
  past its dead zone, a call-off, a mouse and the keys; every `Steer` built
  whole gains the touch: `UNSTEERED` in `wall_scene.ts`, `STILL` in
  `src/testing/play.ts`.
- `src/scene/layers.ts`, `gauge_painter.ts` and `wall_scene.ts`: S22, the
  scene writing the gauge's place from the steer and the field into the
  paint context; the scene's spec showing it for a finger and hiding it
  for a mouse, at a charge and at none.
- `effects.ts` and `wall_scene.ts`: S23, with `notchDetuneOf()`'s spec.
- How to play's sentence under Charge: on a touch screen the charge shows
  over the finger too.
- **Owns:** `src/scene/painters/gauge_painter.ts`, `src/scene/layers.ts`;
  adds to `steering.ts`, `wall_scene.ts`, `effects.ts`,
  `src/testing/play.ts` and How to play.
- **Done when** the checks pass, and a headless Chrome emulating a phone,
  a finger pressed and held at the middle, by a side and under the
  ceiling, shows the gauge where
  `docs/brick-fuzz-pop-tune-up/mocks/charge-2-gauge.png` and
  `charge-4-gauge-ceiling.png` beside it draw it, lit as the meter is.

### D: the drop in the view and the shell

**D1. The icon and the sound.**

- `frontend/lib/ui/src/icon/`: the `drop` icon (`plan.md`'s Assets), in
  `ICON_NAMES`, in `FILLED`, a case in the template and in the spec's
  list of the filled ones, beside `skip`, which stays until D4; the line
  in `frontend/lib/ui/AGENTS.md`.
- `tools/build-sounds.mjs`: a `drop` recipe, a short falling tone, then
  `yarn workspace brick-fuzz-pop build:sounds`; `"drop"` in `SOUNDS` after
  `"yawn"`;
  `tools/sound-lab.ts`'s line for it and a scene of a drop, sixteen
  fuzzballs brought down at once playing one sound.
- **Owns:** `frontend/lib/ui/src/icon/`, `tools/build-sounds.mjs`,
  `src/scene/sounds/`, `tools/sound-lab.ts`; adds `SOUNDS`' entry.
- **Done when** the game's and `@fz/ui`'s checks pass, the root's
  `yarn typecheck` too, and the sound, played in Node from the sprite's
  bytes or heard in the lab, is a fall and not a yawn.

**D2. The playback takes a round flown again (after R2).**

- `src/view/round_play.ts`: S10, the flight and the wall indexed again for
  the new round, the points scored so far kept, the wall it settles the
  new round's.
- Specs over real flights: a round dropped at a moment the playback has
  reached plays on with the same events logged before it, its fuzzballs'
  drops and landings after, and settles the dropped round's wall; a drop
  past the flight's end changes nothing; `skip()` still lands a flight
  whole.
- **Owns:** `src/view/round_play.ts` and its spec.
- **Done when** the checks pass, the view's coverage at its floor.

**D3. The records at the landing (after F1).** `plan.md`'s "Records move to
the landing":

- `game.service.ts`: S13 and S14; `app.component`: the away reason handed
  on; `saved_game.service.ts` or `takeUp()`: S15; `src/rules/run/run.ts`:
  `afterLanding()`'s doc.
- Specs: a level cleared is on the record once its flight lands, not as it
  is released; a run's end and best likewise; a run's start at its first
  release; a page hidden mid-flight lands the flight, keeps its records and
  pauses, both hidden alone and after focus left first; focus leaving
  alone pauses the flight in the air; a run taken up marks its levels
  before as cleared, one off the record none.
- The testing skill's word on records at a release; What It Keeps in
  `AGENTS.md`; How to play's "No hurry", where it says the game pauses
  itself as you switch away.
- **Owns:** `src/rules/run/`, `src/app/app.component.*`; adds to
  `game.service.ts` and, where S15 goes there, `saved_game.service.ts`.
- **Done when** the checks pass, the shell's coverage at its floor.

**D4. Drop in the shell and the bar (after D2 and D3).** `plan.md`'s "The
shell takes the round again":

- `game.service.ts`: S11 and S12, `drop()` and the `"drop"` command;
  `saved_game.service.ts`'s `track` (S12); `src/testing/play.ts`'s
  stand-in taking a drop.
- `src/app/bar/`: S16, the bar and `app.component.html` bound to it;
  `controls.ts`: X.
- `frontend/lib/ui/src/icon/`: `skip` gone, and its line.
- Words: How to play's row and "No hurry", the drawer's line, the board's
  keys.
- Specs: a drop flies the round again from the same start, shot and rules,
  takes its outcome into the run as it stood before the release, plays on,
  and writes the saved game again; a drop that turns a cleared level into
  one still on keeps no clear; a drop while paused comes down as the run
  goes on; Drop does nothing while aiming or playing a certificate; the
  button, dimmed exactly then, and X.
- **Owns:** `src/app/bar/`, `src/app/play/saved_game.service.*`,
  `src/testing/play.ts`; adds to `game.service.ts`, `controls.ts`,
  `app.component.html`, How to play, the drawer and the board.
- **Done when** the checks pass, the shell's coverage at its floor, and a
  headless Chrome shows Drop dimmed while aiming, a dropped flight coming
  down where it was, and the next shot waiting where the player's
  fuzzball landed.

### Z: the finish (the integrator)

- **Z1.** `yarn workspace brick-fuzz-pop capture:screenshots --url
http://localhost:9614/` on the tip, against the dev server served there,
  the new picture looked at before it is kept; `AGENTS.md`,
  both skills and `frontend/lib/ui/AGENTS.md` read through against the
  code, and what else `plan.md`'s "What else to update" lists;
  `yarn verify:full` and `yarn check:layout`; a pass in a headless Chrome
  over each change at a phone's shape and a desktop's, in a dark and a
  light palette.
- **Z2.** §9, "As built", written here.

---

## 5. Running it in parallel

### 5.1 The dependencies

```text
R1 ──┬─ R2 ── D2 ──┐
D1 ──┘             ├─ D4 ── Z
F1 ──┬─ D3 ────────┘
     └─ G2 ────────────────── Z
G1 ──┘
```

R2 waits on D1 only for the `"drop"` sound; D3 waits on F1 because both
rewrite `release()` and How to play's "No hurry"; G2 waits on F1 because
both rewrite `Steer`.

### 5.2 Slots, and the order packages take them

At most three packages run at once. When one finishes, the integrator lands
it (§5.5) and starts the next ready package by this order: the critical
path first (R1, R2, D2, D4), then what another waits on (F1, D1, G1, D3),
then the rest.

| Starts first | Then, as slots free and their waits end |
| ------------ | --------------------------------------- |
| R1, F1, D1   | G1, R2, D3, G2, D2, D4                  |

A stream's next package is a fresh agent, so none carries one package's
context into the next; it reads the commits the last one made instead,
whose bodies say what each review found and how it was answered.

### 5.3 Who owns what

A package changes the files it owns freely (§4's "Owns"). Where it must
touch another's, it only adds: a case, a field, a member, a paragraph or a
sentence of its own, renaming, moving and restyling nothing there. The
files several packages add to are `game.service.ts`, `wall_scene.ts`,
`effects.ts`, `steering.ts`, `controls.ts`, `round_play.ts`,
`src/testing/play.ts`, `help.component.html`, `AGENTS.md`, the testing
skill, and the scene's and the game service's specs. The integrator settles what collides as it rebases, sending
anything beyond a list or a paragraph back to a fresh agent.

### 5.4 How an agent works

Each package's agent is a fresh `general-purpose` agent, run in the
background, briefed with this file, `plan.md`, its package, its worktree
and the files it owns. It:

1. works in its worktree, `.claude/worktrees/bfp-<package>` on the branch
   `bfp/<package>`, which the integrator cuts from the integration tip and
   installs (`yarn install --immutable`) before it starts;
2. reads the `AGENTS.md` files and skills of what it touches
   (`brick-fuzz-pop-testing`, `brick-fuzz-pop-content`, `phaser-core`,
   `fuzzley-ui`, `angular-testing`, `web-game-accessibility`), and
   `plan.md`'s sections for its package;
3. builds in small commits, each whole: its code, its specs and its docs;
4. checks each commit (§6), then has it reviewed by the
   `commit-review-process` skill (`.agents/skills/commit-review-process/SKILL.md`):
   it stages the change and launches a fresh `general-purpose` reviewer
   with that skill's brief, which reads the staged diff with only the
   project's and the package's context; it answers every comment, fixing
   it or saying why not, in the commit's body, and commits in the
   repository's form (`feat(brick-fuzz-pop): …`, a lower-case sentence, no
   attribution lines);
5. reports to the integrator what it made, commit by commit, what it
   checked and how long that took, what the reviews found and how each was
   answered, the choices it made where this file was silent, and what it
   left.

An agent that can't launch a reviewer stops with its change staged and
says so, and the integrator runs the review. An agent that finds a point
this file leaves open takes the choice §2's spirit gives and says so in the
commit's body and its report.

The main checkout and the Asteroid Breaker build's worktrees belong to
other work, so an agent works only in its own worktree. It never pushes,
never touches `main` or another branch, and never uses `git stash`, whose
stack every worktree shares. Never edit a worktree while its checks run.

A package that serves the game does so from its worktree on a port of its
own, `yarn workspace brick-fuzz-pop dev --port <port> --strictPort`: F1
9611, G2 9612, D4 9613 and Z 9614, and looks at it through
`frontend/lib/dev/src/chrome.ts`'s headless Chrome from a script in the
scratchpad, as `docs/brick-fuzz-pop-tune-up/mocks/capture.mjs` does, never
the chrome-devtools MCP another session may be driving. It stops its server
and its Chrome when it is done.

### 5.5 How the work comes together

The integrator owns `brick-fuzz-pop-tune-up`, and no package commits to it.
When a package reports done, the integrator:

1. rebases its branch onto the integration tip, in its worktree
   (`git -C .claude/worktrees/bfp-<package> rebase brick-fuzz-pop-tune-up`);
2. settles what collides; where it settled anything, has a fresh reviewer
   read that delta alone (`git range-diff <old-base>..<old-tip>
<new-base>..<new-tip>`), as a rebase stopped on a conflict makes a new
   change no one has reviewed;
3. runs the checks on the rebased branch (§6), after its last edit;
4. fast-forwards the integration branch to it, in its own worktree
   (`git merge --ff-only bfp/<package>`), and removes the package's
   worktree and branch;
5. starts the packages that waited on it, from the new tip.

At each third package landed, and before Z, the integrator runs
`yarn verify:changed` on the tip; where `origin/main` has moved, it rebases
the integration branch onto it then, between packages where it can, and
moves a package still at work onto the new tip with
`git rebase --onto <new tip> <old tip>` once its agent is done, as a plain
rebase would replay the integration branch's own commits. History stays
linear, as the repository's is: no merge commits, no squashes.

---

## 6. Checks and budgets

**Each commit's checks,** from `frontend/` in the package's worktree,
before its review, as the `commit-review-process` skill asks, in this
order and after the last edit:

- the game's `lint`, `typecheck` and `test --maxWorkers=3` (`yarn workspace
brick-fuzz-pop <script>`), the tests every project, `sim` among them;
- the root's `yarn lint`, under the lock the Asteroid Breaker build holds
  for its own (`flock /tmp/abu-root-checks.lock yarn lint`), so the two
  builds' heaviest checks never run together;
- where a commit changes `@fz/ui` (D1, D4), its `lint`, `typecheck` and
  `test`, and the root's `yarn typecheck`, which compiles every app's
  templates against the icons' names, under the same lock;
- at a package's last commit that touches the rules, the view, the scene
  or the shell, `yarn workspace brick-fuzz-pop test:coverage --maxWorkers=3`,
  held to the floors.

To format, never `yarn prettier`, which rewrites the whole repository, but
`node_modules/.bin/prettier --write <paths>` from `frontend/` over the
files changed (the paths relative to it, or `../docs/…`).

**Timings at the start** (`7fbd968a`, warm, in a fresh worktree, with the
Asteroid Breaker build's agents at work beside it): the game's lint 25 s,
its typecheck 7 s, its tests 40 s on four workers (6,489 specs in 147
files), of which `sim`, alone, 17 s (555 specs in 29 files).

**Budgets:**

- **The `sim` specs** take no more than half as long again (25 s alone):
  the air time flies longer, and the certificates replay it. Past that, R1
  says why.
- **A flight with no drop** costs what it did: `fly()`'s median in the
  benchmark within a tenth of the start's, read on a quiet machine.
- **The atlas** stays inside its budget with three frames more.
- **The coverage floors** hold as `vitest.config.ts` sets them.

---

## 7. Risks to the build, and what answers them

| Risk                                                                       | What answers it                                                                                                                   |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| A level finds no line under the new rules                                  | `plan.md`'s certification found one for every level at the first search; if one fails, R1 stops and says which, before any redraw |
| The air time alone puts a set's floor under the careless player            | R1 folds wool into its first commit (§4)                                                                                          |
| The Asteroid Breaker build and this one starve each other                  | Three slots here, three workers each, the root's checks under one lock across both builds                                         |
| Two packages edit one shared file                                          | §5.3's ownership, small additions in their own places, the integrator's rebase and a review of what it settled                    |
| A drop's flight differs before its moment from the flight released         | R2's property spec over the seeded random flights, event for event                                                                |
| The records and the saved game disagree after a hidden page                | S14, and D3's specs of a page hidden mid-flight                                                                                   |
| `main` moves under the branch                                              | The integrator rebases onto `origin/main` as §5.5 says, and again before any merge                                                |
| What only a hand can judge: the gauge's reach, a drop's feel, the patience | Left for the user, as `plan.md` says, with the build on the branch to play                                                        |

---

## 8. Finishing

The user asked for the build, committed as it goes; not for a merge. So the
build ends on `brick-fuzz-pop-tune-up`, every commit reviewed, `yarn
verify:full` and `yarn check:layout` passing on its tip, and §9 written.
Merging into `main` waits for the user to ask, and then follows the
`merge-to-main` skill: `origin/main` taken in, the checks again, a
fast-forward push, and this folder moved to
`docs/archive/brick-fuzz-pop-tune-up/` once the change is live, as the
game's other plans were.

---

## 9. As built

Written by the integrator at the end of the build.
