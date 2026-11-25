---
name: rickashay-content
description: What adding or redrawing a level, adding a set of levels, or bringing in a kind of brick or a trait takes in Rickashay, with the files to write, the order they land in and the checks that hold each. Triggers on: frontend/games/rickashay level, level set, redraw a level, brick kind, brick trait, LEVEL_SETS, LEVEL_MARKS, LEGEND, KIND_IDS, TRAIT_RULES, HELP_KINDS, CARELESS_FLOORS, CHECK_DEPTHS.
---

# Adding to Rickashay

What each addition to the game takes. How the specs run, how the
certificates, the marks and the checks are found and held, and what to do
when one fails are the [`rickashay-testing`](../rickashay-testing/SKILL.md)
skill's. The design, with the kinds ("The bricks"), the rules a level keeps
and the table of the drafts, is `docs/rickashay/design.md`. Paths are
relative to `frontend/games/rickashay/`.

## A Level

Its block in its set's file in `src/rules/levels/`, with the four keys of
`LevelData` (`src/rules/levels/levels.ts`) and no other, which
`parseLevel()` refuses.

- **Its `id` is for good.** The records, the progress, the certificates and
  the marks are kept by it, so a level renamed keeps its id.
- **Its `bricks`** are a row of nine of the legend's characters for each of
  the wall's rows, from the top, `.` for none. `LEGEND`
  (`src/rules/levels/legend.ts`) says what each character stands for.
- **Nobody picks a tint.** `tintOf()`, beside the legend, gives each brick
  its own from where it stands, as its doc says.
- **Its `name` and `around`** are player text, which the Ready card and
  Levels show: the `player-text` skill has the shape of a level's name.

### The Rules a Level Keeps

`parseLevel()` refuses a picture that breaks `PICTURE_RULES`
(`src/rules/levels/level_rules.ts`), naming the level, and
`src/rules/levels/levels.spec.ts` holds every level to `levelProblem()` at
its number. Their docs, and `levelProblem()`'s, give each rule, and the
design's "The rules a level keeps" why. Two of the design's rules no
picture can hold: a set's last level mixing what it taught, and the
guarantee, which the certificates and the checks hold.

### Drawing a Level

A wall is drawn in `docs/rickashay/levels/build.mjs`'s `DRAFTS`: a `name`,
what it is `around`, its `courses`, each a few rows top first, and its
`order`, the courses by letter from the lowest up, a digit in it the rows
of air before the next course in place of one. Its `SETS` takes the drafts
nine at a time, in order, and the script makes each level's `id` from its
`name`. `node build.mjs`, beside it, writes every set's draft there. A
set's file in `src/rules/levels/` starts as its draft, byte for byte, and
from then on it is the levels' source: the game reads nothing under
`docs/`.

### Redrawing a Level

`yarn report:levels` names a level that falls short of a check on any
depth, and the check: no line, under its set's floor, over the blind
ceiling or under the least sweet spot. Redraw it in its set's file in
`src/rules/levels/`, never in its draft, which the game doesn't read:

- **Keep what the level is for:** its rows and the kind it brings in, in
  the course it opens on. Change as little as clears the check, a course at
  a time, and play the report again after each try
  (`yarn report:levels --set <set id>`).
- **Its row in `levels.spec.ts`' table of the drafts** gives way to a case
  of its own that holds it as redrawn, its rows, the bricks it needs and
  their hits.
- **Say in the change's body** what was redrawn, row by row, and what the
  report found before and after on the depth that failed.

### Then

1. `yarn vitest run --project pure src/rules/levels`, which parses it and
   holds it to the rules above and the table of the drafts.
2. `yarn certify:levels --set <set id>`, for its lines, pars, rally marks
   and rally lines.
3. `yarn vitest run --project sim src/rules/levels`, which replays them on
   every depth, holds the careless player to its set's floor and checks its
   set on its depth.
4. `yarn report:levels --set <set id>`, which exits with 0 once no level
   falls short.

**A level's number is its place across the sets.** A level put before
others moves their numbers, and with them the seeds of their floors' and
their checks' games, their rally marks, and the `firstLevel` the catalog
gives each kind they bring in. The screenshots' `RUN` and the layout
check's `LAYOUT_RUN` keep a run on a level by its number.

## A Set

- **Its file** in `src/rules/levels/`, an `id`, a `name` and its nine
  `levels`, imported in `src/rules/levels/levels.ts` and placed in
  `LEVEL_SETS`. `levels.spec.ts` lists the sets in order, numbers every
  level, and holds each to its row in the table of the drafts.
- **Its files from `yarn certify:levels --set <set id>`:** its marks,
  imported in `src/rules/levels/level_marks.ts` and placed in
  `LEVEL_MARKS` in the set's place; and its certificates and rally lines,
  in `CERTIFICATES` and `RALLY_LINES` (`src/testing/every_level.ts`). The
  debug menu finds the files on its own.
- **Its floor,** the times in 100 the careless player must clear each of
  its levels, in `CARELESS_FLOORS` (`src/testing/line_play.ts`), and **its
  check's depth** in `CHECK_DEPTHS` (`src/testing/every_level.ts`), where
  its levels come nearest a check as `yarn report:levels` plays them.
- **Its specs:** `src/rules/levels/every_floor/<set id>_11.spec.ts`, `_13`
  and `_22`, each `holdEveryFloor(import.meta.filename)`, and
  `src/rules/levels/every_check/<set id>_<depth>.spec.ts`,
  `holdEveryCheck(import.meta.filename)`. `src/testing/every_level.spec.ts`
  fails while a set the game plays lacks its files, its floor, its depth or
  its specs, and `src/rules/levels/level_marks.spec.ts` while a level lacks
  its marks.
- **Its kinds,** if it brings any in, are cataloged before its levels,
  each with its `firstLevel` among them, and listed in How to play: a
  level may hold only kinds `HELP_KINDS` lists, as
  `src/app/help/kinds.spec.ts` holds.
- **Its time:** each set adds to `sim`, which CI's test job runs within
  its time limit, so time the set's `sim` specs on one worker
  (`--maxWorkers 1`), and `every_level/` with every set in, and say both
  in the change's body.

## A Kind of Brick

A kind is its data in a file of its own in `src/rules/catalog/kinds/`, its
place in `KIND_IDS` and `KINDS` (`src/rules/catalog/kinds.ts`), How to
play's order and the order the levels bring the kinds in, and its
characters in `LEGEND`. `KINDS`, its colors in
`src/view/colors/brick_colors.ts`, `BRICK_ART`
(`src/view/art/atlas_frames.ts`) and `HELP_KINDS` (`src/app/help/kinds.ts`)
are whole records, so the compiler asks for its line in each.
`src/rules/catalog/kinds.spec.ts` lists every kind's fields by hand.

It comes before the levels that bring it in, in a commit or two:

1. **The kind, its data, drawn and listed,** in one commit, as those
   records take all of it together, a trait new with it holding `{}` in
   `TRAIT_RULES`, as "A Trait" says:
   - **Its art:** a `KindArt` (`src/view/art/art.ts`) in its own file of
     `src/view/art/kinds/`, specced beside it, drawing the frames named
     for it in `FRAMES` and `FRAME_NAMES` (`src/view/art/frames.ts`), in
     the catalog's order in `BRICK_ART`. Its shards take its color, and a
     color the player must tell from what it lies on is a pair in
     `src/view/colors/contrast.spec.ts`.
   - **Its words:** its line in a file of its own in
     `src/app/help/kinds/`, in `HELP_KINDS`, which How to play, In this
     wall and the Ready card read. Its `about` is a catalog line, as the
     `player-text` skill says, and a number in it comes from the tuning.
2. **Its traits' rules,** where a trait it has has none yet, as "A Trait"
   says.

**A kind whose look a flight changes,** as a hatch's dots and a lock's
bolts do, gets a `<kind>_tint.ts` of its own beside
`src/view/art/hatch_tint.ts` and `src/view/art/lock_tint.ts`, outside its
art, and a case in `leftBy()` (`src/view/play/round_play.ts`) for the
event that changes it. Its picture shows the tint `tintOf()` gives it.

Some specs list every kind by hand, to edit with a new one:
`src/view/art/atlas_frames.spec.ts`' frames in order, the pictures
`src/app/app.component.spec.ts` hands How to play, and
`src/app/help/help.component.spec.ts` and `src/app/help/kinds.spec.ts`.
So do the docs that count the kinds, in `src/rules/catalog/kinds.ts` and
`src/rules/levels/legend.ts`.

## A Trait

- **A member of the `Trait` union** (`src/rules/catalog/kinds.ts`), and its
  rule, a `TraitRule` (`src/rules/flight/hooks.ts`), in a file of its own in
  `src/rules/bricks/traits/`, specced beside it with `src/testing/shots.ts`,
  in its place in `TRAIT_RULES` (`src/rules/bricks/trait_rules.ts`). The
  compiler asks for that place, which holds `{}` where a trait has no rule,
  and for its case in `shapeOf()`'s switch (`src/rules/flight/faces.ts`).
  `TraitRule`'s doc gives the moments a rule acts at and the `Hooks` it
  acts through.
- **A spec that wants a trait without its rule** hands `flyAt()`
  `traits: { ...TRAIT_RULES, <trait>: {} }`, or `playRound()` the same, as
  `src/rules/round/round.spec.ts` does.
- **A rule acts only on bricks of its kind,** so a wall without one flies
  as it did, and the sets whose walls hold none keep their certificates and
  marks.
- **What no hook does yet** is a new member of `Hooks`, which the flight in
  `src/rules/flight/flight.ts` makes at its moments.
- **A trait that acts between rounds** rather than in a flight does so in
  `WALL_RULES`' `betweenRounds` (`src/rules/bricks/wall_rules.ts`), which
  `@fz/brick-wall/rules/wall`'s `lowerWall()` is handed.
- **A new kind of event** it adds to `FlightEvent`
  (`src/rules/flight/events.ts`) takes its place among a moment's events
  as `fly()` makes them, in the order the doc of `Flight`'s `events`
  gives. The compiler and lint then ask for it in each switch and record
  over the events' kinds: what each event calls for
  (`src/view/effects/effects.ts`), the view's playback
  (`src/view/play/round_play.ts`), `src/rules/flight/cast.spec.ts`, and
  `src/testing/flight_fixtures.spec.ts`' fixture that shows it and its
  place in a moment. The fixtures' flier (`src/testing/flight_fixtures.ts`)
  writes it from a method of its own, by `CLOSING_ORDER` where it closes a
  moment. Then comes its drawing in the scene.
- **A trait that changes how a kind already in the levels plays** fails
  the replays of the sets that hold it, and is certified again as the
  `rickashay-testing` skill's "When a Replay or a Check Fails" says.
