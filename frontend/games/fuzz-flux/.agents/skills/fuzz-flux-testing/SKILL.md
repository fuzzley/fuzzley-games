---
name: fuzz-flux-testing
description: How Fuzz Flux's specs run and are written, and what to do when one that holds the game to its design's sketch fails: its Vitest projects, boards drawn as pictures, the moves the sketch played, the golden games, the certificates, the floors, the feel and the timeline. Triggers on: frontend/games/fuzz-flux spec, golden game, certify:deals, report:levels, MOVE_FIXTURES, boardFrom, PORTED, FakeShell.
---

# Testing Fuzz Flux

How Fuzz Flux's specs run, the helpers they share, and what to do when one
that holds the game to its design's sketch fails. The patterns of every
Angular workspace's specs are the `angular-testing` skill's, the headless
Phaser harness is `phaser-core`'s, and the rules every spec follows are in
`.agents/AGENTS.md`, under "Writing Unit Tests". Paths are relative to
`frontend/games/fuzz-flux/`, where the commands run, but for the design's,
named in full under `docs/fuzz-flux/`, whose scripts run from anywhere.

## Commands and Coverage

`vitest.config.ts` sets a spec's project by its folder:

- **`pure`, in Node:** `src/rules/`, `src/view/`, `src/testing/` and
  `tools/`, but for `sim`'s folders.
- **`sim`, in Node, never with coverage:** the golden games and the random
  moves in `src/rules/golden/`, the certificates replayed in
  `src/rules/levels/every_level/`, the floors in
  `src/rules/levels/every_floor/`, and the benchmarks, in a `benchmarks/`
  folder of any layer, which print their times and hold none.
- **`dom`, in jsdom:** every other spec under `src/`, the scene's and the
  shell's.

Then:

- **Run one spec, or a folder's,** with
  `yarn vitest run --project <project> <path>`. `yarn test:coverage` runs
  `dom` and `pure` with coverage, then `sim` without.
- **A line only `sim` reaches counts as untested.** `vitest.config.ts`
  holds the rules and the view to their floor, the scene and the shell to
  theirs, and the helpers held as the rules are to the rules'.
- **A helper that the certificates or the floors are found with, or that a
  script loads, is held as the rules are.** It goes on `HELD_AS_RULES` in
  `eslint.config.js`, which holds it to the rules' fence and their exact
  arithmetic, so a line proven in Node clears its deal in every browser,
  and `vitest.config.ts` to the rules' floor from the same list.
- **A helper in `src/testing/` whose answer a spec trusts has a spec of its
  own beside it,** so one that answers wrongly can't let a spec pass that
  tests nothing. A change to one that has none yet adds its spec first.
- **The specs read the design's own files,** through
  `src/testing/design_files.ts`: the feel's words in `design.md`, the
  sketch's code and page, the sets' files, the sketch's certificates and
  results, and the sounds' measures. A number moved in the design and not
  the game, or in the game and not the design, fails.
- **Never edit a file a script writes:** the golden games,
  `src/rules/golden/<set>.json`, and `src/testing/golden_samples.ts`, which
  the sketch's `golden.mjs` writes; the certificates in
  `src/rules/levels/certificates/` (`yarn certify:deals`); and the sounds
  in `src/scene/sounds/` (`yarn build:sounds`). The sets' files in
  `src/rules/levels/` are copies of the design's, which
  `docs/fuzz-flux/levels/build.mjs` writes. Change what the script reads,
  and run it.

## Boards and Moves

- **Draw a board rather than play to it.** `boardFrom()` and `gameFrom()`
  (`src/testing/board_picture.ts`) lay one out from a picture, a row a
  string, in the levels' `LEGEND` (`src/rules/board/legend.ts`), with `f`
  for the frizzball, beside a picture of what each fuzzball wears and one of
  its dust; `pictureOf()` draws a board back for a spec to read.
  `GameOptions` sets the rest of the game, each option left out where its
  default will do.
- **Hand the rules in by name.** Each rule is handed the elements' rules,
  and `play()` the wind's too: the game's own, `ELEMENT_RULES` and
  `WIND_RULE` (`src/rules/elements/element_rules.ts`), or, for a spec that
  keeps the elements out of what it tries, `NO_PART`, `HOLDS_ONLY` or
  `HOLDS_AND_GOALS` (`src/testing/partial_rules.ts`).
- **Mind the frame.** `play()` takes a move, and hands back its record, in
  the screen's frame; `legalMoves()`, the bunches and the blasts work in the
  board's own, which a turning wind turns. `onScreen()` and `fromScreen()`
  (`src/rules/board/orientation.ts`) take a square from one to the other.
  On a game whose frame is unturned the two agree, so a spec that mixes
  them passes until the wind turns.
- **The moves played by hand are the sketch's.** `MOVE_FIXTURES` and
  `ENCORE_FIXTURE` (`src/testing/move_fixtures.ts`), a move for each kind of
  event, and `SKETCH_MOVES` (`src/testing/sketch_moves.ts`), the
  storyboards' and the busiest, each hold a board and the record the
  sketch's `play()` or `encore()` makes of it, in the record's words.
  `src/rules/move/play.spec.ts` and `encore.spec.ts` beside it hold the
  rules to the first two, and the view and the scene are specced on them.
  A new one's record is the sketch's, read into the game's words as
  `docs/fuzz-flux/sketch/golden_words.mjs`' `recordOf()` reads one, never
  `play()`'s own, or its spec holds the rules to themselves.
- **Random play** is `randomGame()` (`src/testing/random_games.ts`);
  `src/rules/golden/whole_boards.spec.ts` holds every board it leaves
  whole, and `src/rules/move/settle_properties.spec.ts` settles random
  boards of every size the design allows.

## The Golden Games

`node docs/fuzz-flux/sketch/golden.mjs` plays every level of the design's
sets on each of its deals, along its certificate and in games of random
moves, and writes each game's moves and the sketch's digest of the game,
as dealt and after each move, to `src/rules/golden/<set>.json`.
`src/rules/golden/golden.spec.ts` deals each and replays it through
`play()` (`replayGolden()`, `src/testing/golden.ts`), over every level of
`PLAYABLE_LEVELS` (`src/testing/playable_levels.ts`), which keeps out a
level holding an element still on `STAND_INS`. No golden game plays the
encore, which `encore.spec.ts` holds.

- **The digest is written twice,** by `src/testing/golden.ts` from the
  game's `Game` and `MoveRecord`, and by the sketch's `golden_digest.mjs`
  from its play put into the same words, each with a frame mapping of its
  own, so it never leans on the code it checks.
  `src/testing/golden_samples.spec.ts` holds the two texts alike on the
  positions `golden.mjs` writes to `golden_samples.ts`, and
  `src/testing/golden.spec.ts` that a change to each of their fields shows
  in the text (`PLANTED`). A field added to the game or the record is
  written by both, with a change planted for it, or no golden game checks
  it.

## The Certificates

`yarn certify:deals [--set <id>]` finds the proof's line (`proofOf()`,
`src/testing/proof.ts`) on each deal of each level, dealt the level's own
moves, and writes each set's lines, in the screen's frame, to
`src/rules/levels/certificates/<set>.json`. It waits its turn in the queue
`yarn verify:changed` keeps.

- **Two specs replay them:** `every_level/certificates.spec.ts` holds each
  line to clearing its deal at its last move (`certificateProblem()`,
  `src/testing/certificates.ts`), and `every_level/sketch.spec.ts` holds
  it, turned to the board's frame, to the sketch's `certificates.json`,
  which its `report.mjs` writes. So a line the game finds is the sketch's
  too, and certifying again passes only where the sketch's report, run
  again, found the same.
- **Lines are read elsewhere:** the debug menu plays them, and
  `tools/check-layout.mjs` and `tools/capture-screenshots.mjs` keep a run
  along one, which their specs hold to its file.

## The Floors and the Report

- **`every_floor/casual.spec.ts`** holds the casual player
  (`src/testing/casual.ts`) to each level's ask, within the design's 4
  points, on the level's own deals, in the games `yarn report:levels`
  plays on each: 16 a deal, their dice seeded as the sketch's report seeds
  them. It holds each set's first level to ask more of the casual player
  than the last of the set before, too.
- **The asks, moves, deals and stars are the sketch's report's.**
  `CLEARS_ASKED` (`src/testing/report_api.ts`) is held to its table,
  `docs/fuzz-flux/sketch/results-table.md`, and each level's moves, deals
  and stars to its `results.json`, by `src/testing/report_api.spec.ts`.
- **The players are the sketch's `bots.mjs`, ported:** the casual player,
  the careful one (`playCarefully()`, `src/testing/careful.ts`, on
  `carefulMove()` in `src/rules/move/hint.ts`) and the proof. Each adds its
  decimal terms in the sketch's order, which breaks their ties as the
  sketch breaks them, and `report_api.spec.ts` holds a game of each, and a
  proof's line, to the sketch's report's.
- **`yarn report:levels [--set <id>]`** plays every level as the sketch's
  report does, on 40 deals each, prints its table with a column for the
  wind's turns, and a line for each level whose file keeps other moves,
  stars or deals than its games set, exiting with 1 then. It takes every
  core, so it waits its turn in the queue `yarn verify:changed` keeps; all
  36 levels take about 40 seconds.

## When One Fails

Each of these replays the sketch's own play. Finding the fault:

1. **A golden game** says which set, game, level, deal and move, the two
   digests side by side, and the game's written out. Print the sketch's
   with the command it gives (`golden.mjs --print <set>:<game>`), and read
   the two side by side to the first line that differs: what it names, a
   hit, a fall or a piece, is the rule at fault. Give that rule's spec a
   case on a board drawn small that fails as the golden game did, then fix
   the rule.
2. **A move played by hand** that `play.spec.ts` no longer plays as the
   sketch did is the same fault, found on a smaller board.
3. **A certificate.** The golden games play every certificate's line, so
   with them passing a replay fails only where the certificates' file or
   the level's moved, which `every_level/sketch.spec.ts` and
   `src/rules/levels/levels.spec.ts` name: put back what moved it.
4. **A floor.** Play the level's failing games beside the sketch's, its
   `casualMove()` (`bots.mjs`) and `play()`, to the first move that
   differs: whichever differs there, the casual player, its dice
   (`seededDice()`, `src/testing/dice.ts`) or a rule, is at fault, and its
   spec gains the case.
5. **Where the sketch is shown at fault,** or the owner changes a rule,
   change the sketch (`docs/fuzz-flux/sketch/engine.mjs`, or `bots.mjs` for
   a player) beside the port. Then run `golden.mjs`, the sketch's
   `report.mjs` (all 36, which takes every core and joins no queue, so run
   it alone) and, for a change to the rules, `feel/bundle.mjs`, whose page
   plays by them. Read the diffs, and name in the commit's body the fault,
   the sketch's lines it changed and the golden games that moved. A report
   whose moves, deals or stars move has moved the levels: carry it through
   as a redraw is, as the `fuzz-flux-content` skill's "Redrawing a Level"
   says.

A change to how a move plays reaches past the specs: a saved game and a
reported game are their moves, replayed (`src/rules/run/saved_game.ts`),
so one the change no longer replays is dropped.

## The Feel and the Timeline

- **Every number of the feel is held to the words that set it.**
  `src/view/timeline/feel.spec.ts` lists each number of `FeelTuning`
  (`src/view/timeline/feel.ts`) in the table of where it comes from:
  `WRITTEN`, the design's words; `SKETCHED`, the sound gaps the sketch's
  cues give; `PORTED`, a line of the sketch's `feel/feel.mjs`, its number
  marked `«so»`, found there once; `STYLED`, the style of its page,
  `docs/fuzz-flux/mocks/feel.html`; and `SCORED`, the sound script's
  chord. A new number joins its table, so one with words in neither the
  design nor its sketch has no place, and takes a name in `SLIDER_NAMES`
  (`src/view/debug/slider_names.ts`) for the debug menu's slider.
- **An event's spec plays its parts on a wave of a move played by hand:**
  `firstWaveOf()` (`src/testing/played_parts.ts`) plays the fixture's first
  wave, the event's function writes its parts, `timelineOfParts()` makes
  the timeline a board plays of them, and `sampleAt()`
  (`src/view/timeline/sample.ts`) reads it at a moment, or `pieceAt()` and
  `spriteAt()` one piece or loose sprite of it, which read one gone too,
  as `sampleAt()` samples none. A moment it plays at is written from the
  feel's numbers (`FEEL.cageBitMs`), so the spec holds once they are
  retuned.
- **A whole move** is `timelineOf()` (`src/view/timeline/build.ts`) of a
  fixture's record from `moveStartOf()` (`src/testing/shown_board.ts`),
  in a `PlaySettings` of a speed and a motion. Less motion is a version of
  each event, which it plays by its wave's `motion` (`WavePlay`,
  `src/view/timeline/wave_play.ts`) as the timeline is built, never in the
  scene, so an event's spec plays it once more with `motion: "less"`.
- **The design's measures and the pools:**
  `src/view/timeline/measures.spec.ts` holds the storyboards' clips, at 30
  frames a second, to `SKETCH_MOVES`' timelines, and
  `src/view/timeline/limits.spec.ts` holds `POOLS` to the most of each
  effect the busiest moves show at once (`mostAtOnce()`,
  `src/testing/at_once.ts`).
- **The art's specs** draw in `ART_PALETTE` at `ART_SCALE`, or at the
  smallest square, `SMALLEST_SCALE` (`src/testing/art_frames.ts`), and hold
  shapes apart by what they cover (`coverageOf()` and `shareApart()`,
  `src/testing/coverage.ts`). A color the player must tell from what it
  lies on is a pair in `src/view/colors/contrast.spec.ts`.

## The Scene and the Shell

- **The scene's specs run it headless for a fake shell:**
  `src/testing/scene_shell.ts`' `FakeShell` hands the scene a play and
  keeps what the scene tells it, `startBoard()` runs it, and `playTo()`
  draws frames into a play. A play is `playOf()` a move played by hand,
  `stillPlayOf()` a board at rest, or `drawnPlay()` of the parts a spec
  draws. The input's specs press on `src/testing/input_board.ts`' small
  board.
- **The shell's specs play the small levels:** `SMALL_LEVELS`,
  `GAPPED_LEVELS` and `SEEDED_LEVELS` (`src/testing/small_levels.ts`),
  handed `GAME_LEVELS`, on a board whose first move is known whatever the
  deal (`BLUE_LINE`, `REFUSED`). `BoardFrames`
  (`src/testing/board_frames.ts`) plays the scene's part, its frames, taps
  and keys, with nothing drawn, and `PICTURES` (`src/testing/pictures.ts`)
  stands in for the pictures the scene bakes.

## The Scripts

- **A script loads the game's code only through an entry in
  `src/testing/`,** through Vite: `certify_api.ts`, `report_api.ts` and
  `screenshot_api.ts`, the last typed for the scripts by `script_api.ts`.
  Each is held as the rules are, and the script's spec holds the entry to
  what the script reads of it.
- **The layout check and the screenshots take up a run the rules keep**
  (`keptRun()`, `src/testing/kept_run.ts`), stored as the game stores one
  by `tools/stored_run.mjs`. A line certified anew under one fails its
  spec until the run takes the new moves.

## The Mutation Pass

A change to the rules, the view or a helper held as the rules are ends with
a mutation pass, as the
[`brick-wall-testing`](../../../../../lib/brick-wall/.agents/skills/brick-wall-testing/SKILL.md)
skill's "The Mutation Pass" says: from `frontend/`,
`yarn mutants games/fuzz-flux <list>`, the list a file kept outside the
repository.
The golden games, the replays and the floors in `sim` say only that a game
moved, so a rules mutant only they kill still wants a spec in `pure` that
names what broke.
