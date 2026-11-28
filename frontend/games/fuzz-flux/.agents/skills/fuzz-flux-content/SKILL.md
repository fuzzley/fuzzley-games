---
name: fuzz-flux-content
description: What redrawing a level, adding a set of levels, or bringing in an element takes in Fuzz Flux: the design's drafts and sketch first, then the files each takes in the game, the order they land in and the checks that hold each. Triggers on: frontend/games/fuzz-flux level, level set, redraw a level, drafts.mjs, element, ELEMENT_IDS, ELEMENT_RULES, LEVEL_SETS, CERTIFICATES, LEGEND, STAND_INS.
---

# Adding to Fuzz Flux

What each addition to the game takes. How the specs run, and what to do
when the golden games, the certificates or the floors fail, are the
[`fuzz-flux-testing`](../fuzz-flux-testing/SKILL.md) skill's. The design is
`docs/fuzz-flux/design.md`: what each element does ("What else is on a
board"), the rules a level keeps ("The levels") and the appendix's tables of
the drafts. Paths are relative to `frontend/games/fuzz-flux/`, where the
game's commands run, but for the design's, under `docs/fuzz-flux/`, whose
scripts run from anywhere.

## Where the Levels Come From

The levels are the design's. Each is drawn, played and proven there, and the
game keeps a copy:

- **`docs/fuzz-flux/levels/drafts.mjs`** draws every level, its board a
  picture in the legend its doc gives, nine to a set in `SETS`.
- **`docs/fuzz-flux/sketch/report.mjs`** plays every draft with the
  sketch's players, against what its place in its set asks (`TARGETS`), and
  writes the moves, deals and stars it sets to `results.json`, the proof's
  line on each deal to `certificates.json`, and its table to
  `results-table.md`, all beside it.
- **`docs/fuzz-flux/levels/build.mjs`** writes each set's JSON beside the
  drafts, each draft with what the report set it.
- **The game's sets in `src/rules/levels/`** are those files, copied and
  formatted by Prettier. `src/rules/levels/levels.spec.ts` holds each to
  the design's, and every level to the rules a level keeps
  (`levelProblem()` and `arrivalProblem()`,
  `src/rules/levels/level_rules.ts`, whose docs give each rule).

Then:

- **A level's `id` is its number among the design's levels, for good.**
  The records and the saved games keep a level by it, and the drafts number
  the levels in order, so a level goes in after the last, never between
  two.
- **Its `name`, and its set's,** are player text, which the bar and Choose
  a level show: the `player-text` skill's catalogs give a level's name its
  shape. Its `idea` and its set's `about` are the design's, which no page
  shows.

## Redrawing a Level

A redraw keeps the sketch, the design and the game on one level. It
rewrites files every set shares, so it runs alone, beside no other change
to the levels.

1. **Redraw it in `drafts.mjs`,** never in its set's file in
   `src/rules/levels/`, which `levels.spec.ts` holds to the design's. Keep
   what it is for: its idea, what it brings in, and how its board opens.
   Change as little as passes the check.
2. **Try it** with `node docs/fuzz-flux/sketch/report.mjs <number>`, which
   plays that level alone and prints its row, writing nothing, after each
   change.
3. **Play all 36** with `node docs/fuzz-flux/sketch/report.mjs`, which
   writes its three files. It takes every core and waits in no queue, so
   run it while no check runs.
4. **Build the sets** with `node docs/fuzz-flux/levels/build.mjs`, then
   **write the golden games again** with
   `node docs/fuzz-flux/sketch/golden.mjs`, which plays the sets' JSON.
5. **Copy each set's JSON that `build.mjs` changed** over the game's,
   `src/rules/levels/<set>.json`, and format it
   (`node_modules/.bin/prettier --write games/fuzz-flux/src/rules/levels/<set>.json`,
   from `frontend/`). A redraw changes its own set's, and a change to the
   sketch's rules may change any.
6. **Certify each such set again,** `yarn certify:deals --set <set id>`,
   or every set with no `--set`, whose lines `every_level/sketch.spec.ts`
   holds to the sketch's `certificates.json`.
7. **Bring the design along:** the level's row in design.md's appendix, as
   `node docs/fuzz-flux/levels/table.mjs` prints it, and any figure of "The
   sketch" the report moved; the feel sketch, which plays every draft,
   bundled again with `node docs/fuzz-flux/sketch/feel/bundle.mjs`; and the
   set's picture of its levels as they open, with
   `node docs/fuzz-flux/mocks/make-mocks.mjs levels`.
8. **Check it** with the specs that read what it rewrote:
   `yarn vitest run --project pure src/rules/levels src/testing tools`,
   then `--project sim src/rules`, and `yarn report:levels --set <set id>`,
   which exits with 0 once each level's file keeps what its games set. The
   change's check, `yarn verify:changed`, runs them all again.

Say in the change's body why the level was redrawn, the check that failed or
the owner's word, what changed, row by row, and its row of the report before
and after.

A redraw reaches past the level's own files:

- **The scripts' runs:** `tools/check-layout.mjs` ends a level along its
  certificate, and another along a casual player's game, and
  `tools/capture-screenshots.mjs` holds a move of one along its
  certificate. Each names its level and deal, and its spec fails once
  their moves stop playing as it says. Choose the run again, and retake
  the screenshots.
- **The players' games on it:** a saved or reported game is its moves,
  replayed on the level as it now is, so one that no longer replays is
  dropped (`src/rules/run/saved_game.ts`).

## A Set

Its levels are drafted, played and proven as a redraw's are: nine in a set
of its own in `drafts.mjs`' `SETS`, and what each asks a row of the report's
`TARGETS`, the set's first level asking more than the last of the set
before by more than twice the floors' leeway. Then, in the game:

1. **Its file** in `src/rules/levels/`, and its name in `DESIGN_SETS`
   (`src/testing/design_files.ts`) and in the copies `levels.spec.ts` and
   `src/testing/playable_levels.ts` keep, which brings its golden games
   into their spec. Its asks go into `CLEARS_ASKED`
   (`src/testing/report_api.ts`), which its spec holds to the report's
   table.
2. **Its certificates.** `yarn certify:deals --set <set id>` certifies the
   levels of `LEVELS`, so it runs with the set in `LEVEL_SETS` for that run
   alone, and the commit takes only the certificates' file, with its name
   in `src/app/debug/certificate_line.spec.ts`.
3. **Its join,** a commit of its own: its file imported in
   `src/rules/levels/levels.ts` and placed last in `LEVEL_SETS`, which
   `levels.spec.ts` lists, numbering every level by its id, and its
   certificates imported in `src/testing/certificates.ts` and placed in
   `CERTIFICATES`, which `src/testing/certificates.spec.ts` holds to every
   level the game plays. The replays, the floors, the report and the layout
   check go through `LEVELS`, so they turn on with the join.

- **Its time:** each set adds to `sim`, which CI's test job runs within its
  time limit. Time the set's `sim` specs on one worker (`--maxWorkers 1`)
  and the report with it, and say both in the join's body.
- **The layout check's endings** are held by its spec to the levels of the
  widest and tallest board and of the most goals, with a turning wind among
  them, so a set that brings a larger board or more goals moves an ending.

## An Element

An element is the design's before it is the game's, since the rules are the
sketch's: at the owner's word, it is written into the sketch's rules
(`docs/fuzz-flux/sketch/engine.mjs`), the drafts' legend, the golden
games' words (the sketch's `golden_words.mjs` and `golden_digest.mjs`), what
the players make of it (its `bots.mjs`), the feel sketch
(`docs/fuzz-flux/sketch/feel/feel.mjs`), the sound script
(`docs/fuzz-flux/sound/sounds.mjs`, written out by `make-sounds.mjs` beside
it) and design.md, and its levels are drafted as a set's are. The game then
takes it in this order, each step a whole commit or two.

1. **Its place, as a stand-in.** Its id in `ELEMENT_IDS`
   (`src/rules/catalog/elements.ts`), where the levels bring it in; what it
   is on a board, a piece of `Piece` (`src/rules/catalog/pieces.ts`) or
   something a fuzzball wears, and its letter in `LEGEND`
   (`src/rules/board/legend.ts`); its goal in `GOAL_IDS`
   (`src/rules/catalog/goals.ts`) where it has one; and what its first
   level brings, a `NewThing` (`src/rules/levels/level.ts`), with what that
   puts on the board in `level_rules.ts`. Its id goes on `STAND_INS`, its
   rule `{}` in `ELEMENT_RULES` (`src/rules/elements/element_rules.ts`),
   which keeps its levels out of `PLAYABLE_LEVELS`, and so out of the
   golden games, and its entry out of How to play. The compiler asks for
   its place in each record over the elements, the goals and the new
   things, and lint for its case in each `switch`.
2. **Its art.** Its frames named in `FRAMES` and `FRAME_NAMES`
   (`src/view/art/frame_names.ts`), drawn in a file of its own in
   `src/view/art/elements/`, specced beside it, and listed by
   `atlasFrames()` (`src/view/art/frames.ts`), whose spec holds the atlas
   to its room. What it wears on a fuzzball, behind it or over it, is
   named by `behindFrameOf()` or `overFrameOf()`
   (`src/view/art/piece_frames.ts`). Its inks are in
   `src/view/colors/inks.ts`, or the board's palette
   (`src/view/colors/palette.ts`), each a pair in
   `src/view/colors/contrast.spec.ts` with what it lies on, and its picture
   for the bar and How to play is in `PICTURE_FRAMES`
   (`src/scene/pictures.ts`).
3. **Its rule,** an `ElementRule` (`src/rules/elements/element_rule.ts`),
   whose hooks' docs give the moments it acts at, in a file of its own in
   `src/rules/elements/`, specced beside it on boards drawn as pictures,
   set in `ELEMENT_RULES` as its id comes off `STAND_INS`. Its place in a
   wisp's order, `WISP_RANKS`, and what it is worth there are in
   `src/rules/tuning.ts`.
   - **A moment no hook covers** is a new hook of `ElementRule`, called
     where the move plays that moment, and a new kind of hit joins `Hit`
     (`src/rules/move/record.ts`), with its words in the golden digest,
     both `src/testing/golden.ts`' and the sketch's.
   - **The players** weigh it as `bots.mjs` does: the casual player's `LOOK`
     (`src/testing/casual.ts`) and the careful player's `worthOf()`
     (`src/rules/move/hint.ts`).
   - **Its words** are player text: each square's name and what its hits
     say (`describeSquare()` and `HITS_SAID`) and the line under the bar on
     the level that brings it in (`NEW_THING_LINES`), all in
     `src/rules/run/describe.ts`, and its How to play entry, a file of its
     own in `src/app/help/entries/`, placed in `HELP_THINGS`
     (`src/app/help/things.ts`).
   - **A move played by hand** that shows each of its hits joins
     `MOVE_FIXTURES`, its record the sketch's.
4. **Its feel,** each number the design or the sketch gives it, in
   `FeelTuning` (`src/view/timeline/feel.ts`), its table of `feel.spec.ts`
   and `SLIDER_NAMES`, as the `fuzz-flux-testing` skill's "The Feel and the
   Timeline" says.
5. **Its events,** a file of its own in `src/view/timeline/events/` that
   plays each of its hits as `src/view/timeline/hits.ts` hands them on, in
   full and with Less motion, its look at rest in
   `src/view/timeline/looks.ts`, and its sounds cued by name from `SOUNDS`
   (`src/view/effects/sounds.ts`). Each sound is a recipe in
   `tools/sounds/`, which `yarn build:sounds` makes and its spec holds to
   the design's `docs/fuzz-flux/sound/measures.md`.

Some specs list every element by hand, to edit with a new one:
`src/rules/catalog/elements.spec.ts`, `src/app/help/help.component.spec.ts`
and `src/testing/golden.spec.ts`' `PLANTED`.
