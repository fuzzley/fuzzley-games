# Brick Breaker: the work log

Where the build of Brick Breaker stands, step by step, as
`docs/brick-breaker-execution-plan.md` runs it: what each step built, the
choices it made, its checks, its review and what became of each finding,
and the QA checkpoints. Newest last.

## 2026-10-29: the plan

- **Plan.** The user took all 21 of the design plan's recommendations and
  asked for a plan of execution, with a work log, regular commits, QA
  checkpoints, and an independent review after every commit whose findings
  are answered in a commit of their own. `docs/brick-breaker-execution-plan.md`
  holds it, with the design folded in as "Design reference";
  `docs/brick-breaker-plan.md` is deleted.
- **Choices.** B0's mock is no longer a gate: the look is shown to the user
  in screenshots at Q3 and Q4 instead, and its spike's questions are
  answered on the real code at Q2 and Q3. Part 2's branch is cut from Part
  1's tip rather than from `main` after a merge, so nothing waits on one.
  Nothing is pushed or merged into `main` without the user's go-ahead.
- **Branch.** `brick-breaker-lift`, cut from `main` at `c0220468`.
- **Numbers to compare against.** Snake's entry chunk is 77.7 kB gzipped,
  its scene 4.0 kB and its `phaser` chunk 351.7 kB (from the design plan).

## L1.1: the layout entry

- **Built.** `@fz/phaser/layout`: `fitCells()`, taking the cells across and
  down and the frame's width, with `Viewport` (moved from Snake), `CssRect` and `CellFit`,
  fully covered. The pure entries' ESLint fence takes `src/layout/`, and now
  lets the pure entries import each other (`layout` takes `Insets`). Snake's
  `boardMetrics()` is a call to it, and Snake's `BoardRect` is the library's
  `CssRect`.
- **Choice.** `board_metrics.spec.ts` changed only its import of `Viewport`,
  which now comes from the library; its cases are as they were, and pass.
- **Checks.** `@fz/phaser` and `snake`: lint, typecheck and test pass
  (Snake 395 tests). Docs: the library's `AGENTS.md`, Snake's layer table
  and the `phaser-core` skill name the entry.

## L2.1: the sound player

- **Built.** `@fz/phaser/sound`: `SpritePlayer<Name>`, taking the scene and
  a `SoundSprite` (key, spritemap, URL), with `loaded`, `follow()` and
  `play(name, config)`; the config is new, for Brick Breaker's rising
  streak (`detune`). The library's Phaser and framework fences take
  `src/sound/`. Snake's scene makes one, and its `sound_player.ts` is gone.
- **Choice.** The headless game has no audio, so `playAudioSprite()` can't be
  seen to play; the spec puts the sprite in `cache.audio` and watches the
  call with a spy, the one place it checks an interaction, as the
  repository's rules allow where state can't be inspected.
- **Checks.** `@fz/phaser` (238 tests) and `snake` (395): lint, typecheck,
  test. Docs: the library's `AGENTS.md`, Snake's and `phaser-core`.

## L2.2: the synthesizer

- **Built.** `@fz/dev/sounds`: `glide()`, `envelope()`, `thud()`, `note()`,
  `renderSoundSprite()` and `writeSoundSprite()`, moved out of Snake's
  `tools/build-sounds.mjs`, which now holds only its three recipes. Specced
  by rendering sprites and writing one into a temporary folder.
- **Proof.** `yarn build:sounds` writes the same bytes as before:
  `sounds.wav` `e3b108ff…bcf28` and `sounds.json` `f4676762…df90d` (SHA-256),
  unchanged in git.
- **Choice.** `renderSoundSprite()` is exported beside `writeSoundSprite()`,
  so the spec checks a sprite without touching the disk, and the writer
  returns what it wrote, for the script's line about it.
- **Checks.** `@fz/dev` (103 tests, coverage up to 89% of statements) and
  `snake`: lint and typecheck.

## L1.1's review

The reviewer compared `fitCells()` with the old `boardMetrics()` on 438,984
viewports and found them identical. Its findings, and what became of each:

1. **Snake's view fence blocked a list of `@fz/phaser` entries rather than
   allowing the pure ones,** so `@fz/phaser/sound` and `testing` slipped
   through. Fixed: the view blocks `@fz/phaser/*` but `color`, `insets` and
   `layout` (not the bare package, which git's ignore rules couldn't take
   back from), and the app's value-import fence names `@fz/phaser/scene` and
   `sound` too. Each was probed with a file of its own.
2. **The library's pure-entry fence let `../color/color` through.** Fixed:
   `../*/*` is refused after the entries are allowed.
3. **The plan said `layout` imports nothing.** Fixed in the plan.
4. **The plan didn't say when a review's fixes are committed.** Fixed: after
   the commit of the step in progress, before the next step's work.
5. **The plan's wall was three-sided in one place and all round in
   another.** Fixed: `fitCells()` leaves room for a frame all round, so the
   field stays centered, and the wall is drawn on three sides.
6. **"Keeps clear of the chrome" missed the frame and the right edge.**
   Fixed: it checks every edge of the frame against insets on all four sides.
7. **One test checked two frames.** Split.
8. **Doc comments.** Fixed: `CssRect` opens "Describes", the width and height
   are whole device pixels, and `fitCells()` says what a canvas too small for
   the field gets.
9. **No check that `across` and `down` are positive.** Left: every caller
   passes constants, and a check would be code no caller reaches.

Left as the reviewer advised: `BoardMetrics` as Snake's thin wrapper, the
name `Viewport`, and a shared `viewportOf()` for the scenes until B6 needs
one.
