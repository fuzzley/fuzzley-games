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

## L2.1's review

The reviewer found Snake's sounds unchanged (the key, the call, the JSON in
the scene's chunk) and the spy justified. Its findings:

1. **Snake's view fence let `@fz/phaser/sound` through.** Fixed in L1.1's
   review, which found the same.
2. **The docs named `@fz/dev/sounds` before it existed.** L2.2 made it, so
   the name holds now; nothing to change.
3. **`spritemap: object` took anything, and the names weren't tied to the
   sprite.** Fixed: `SoundSprite<Name>` takes `{ spritemap: Record<Name, …> }`,
   so the player's names are the JSON's keys, and a map missing its
   `spritemap` doesn't compile.
4. **A test claimed a failed load it never made** (under `noAudio`, Phaser
   queues nothing). Fixed: renamed "isn't loaded before the sprite is in the
   cache", the URL's claim and the frame gone, and each test makes its
   player in its own Act or Arrange.
5. **The load call was untested.** Fixed: a spy on `load.audioSprite` checks
   the key, the map passed as the map, and the URL.
6. **Two doc comments were wrong:** the sprite loads when the player is made,
   which must be in `create()`, and `scene.sound` is the game's, shared by
   every scene. Fixed in the class, the library's `AGENTS.md` and the skill.
7. **The library's ESLint comments and the canvas's fence didn't name
   `sound`.** Fixed.

Left as advised: the spy, the "leaves the mute alone" test, the load started
by the constructor, the commented cast, and `config` on `play()`.

## L2.2's review

The reviewer rendered Snake's recipes through the module and matched the
committed bytes, and checked the `glide` specs' arithmetic. Its findings:

1. **A sound with a `NaN` sample, or none above 0, was written as silence
   without a word.** Fixed: `render()` throws, naming the sound, with a spec
   for each.
2. **Two sounds of one name overwrote each other's entry, and no sounds wrote
   an empty WAV.** Fixed: both throw, with specs.
3. **`thud()` ignored its time and kept state,** so a sound rendered twice
   differed and the spec depended on its order. Fixed: it makes its samples
   in order as far as a time asks, keeps them, and reads them by time; a
   spec reads it out of order. Snake's sounds are still the same bytes.
4. **The brightness spec passed with a third harmonic too.** Fixed: read a
   twentieth of a cycle in, where the two differ, the cycles named.
5. **The `note()` spec couldn't tell its offset.** Fixed: a tone of `t` shows
   the note plays from its own start; split from "silent until it starts".
6. **The WAV header's data size was checked against itself.** Fixed: 3,200
   bytes for a tenth of a second.
7. **The rendering kept parts and an empty gap.** Fixed: one array of the
   whole length, each sound set into it.
8. **Two lines of docs unwrapped.** Fixed.

Left as advised: `Sound.sample`'s name, the WAV header's bare offsets, the
envelope's doc, the map's rounding to milliseconds, and the file's header
comment.

## L3.1: `bakeAtlas()`

- **Built.** `bakeAtlas(scene, key, frames)` in `@fz/phaser/scene`, on
  `bakeTexture()`: the frames packed in rows, in their order, about as wide
  as the atlas is tall, a 2-pixel gutter between, each drawn translated to
  its place in one `Graphics`, then added as a named frame. With
  `ATLAS_GUTTER` and `MAX_ATLAS_SIDE` (4096). Specced on `runBareScene()`.
- **Choices.**
  - A bake again moves each frame with `Frame.setSize()` rather than
    removing and adding it, so an image showing a frame keeps a live frame;
    frames a new bake leaves out are removed.
  - It throws for two frames of one name, or an atlas over 4096 a side, so a
    mistake shows the first time the scene draws.
  - Rows, not a smarter packing: the frames Brick Breaker bakes are a few
    sizes, and rows in their order keep a frame's place predictable.
- **Checks.** `@fz/phaser`: lint, typecheck, 249 tests. Docs: the library's
  `AGENTS.md`, `phaser-core` and `phaser-canvas-performance`.

## L4.1: the play room

- **Built.** `@fz/game-ui/play_room`: `PlayRoomDirective`, `[fzPlayRoom]`,
  with `away` emitting `"focus"`, `"hidden"` or `"turned"`, and Snake's press
  rule, moved as they were. Specced with a host component, Testing Library
  and `installFakeViewport()`: the focus leaving for the page and for
  another window and moving within, the page hidden and shown, the screen
  turned both ways and resized without turning, and a press on text, on a
  control, from outside the room and with another button.
- **Snake.** `app.component` loses its four handlers, `FOCUSABLE`, the
  `document` and the room's `viewChild`, and binds `(away)="pauseRun()"`.
  Its 395 specs pass unchanged, its pausing ones among them.
- **Checks.** `@fz/game-ui` (156 tests, 100% of statements) and `snake`:
  lint, typecheck, test. Docs: the library's `AGENTS.md`, Snake's, and the
  `fuzzley-ui` and `web-game-accessibility` skills.

## L3.1's review, and the earlier fixes'

The reviewer checked the earlier reviews' fixes against the log (the fences
probed, the layout spec's numbers, the sprite's names, the sounds' bytes)
and found them as described. Its findings:

1. **A re-bake left objects showing a frame half-updated.** An image draws
   the new size at once but keeps its old origin and bounds, a `NineSlice`
   keeps its old UVs, and an object on a dropped frame throws as it draws.
   Fixed in the docs rather than the code: `bakeAtlas()`'s doc, the
   library's `AGENTS.md` and `phaser-core` say a scene sets every object's
   frame again after a bake (`setTexture()` for a `NineSlice`), and a spec
   shows an image taking the new size and origin once it does. Brick
   Breaker's scene re-lays every painter after a bake, so it does.
2. **`name in spritemap` matched `toString`.** Fixed: the names are checked
   with a `Set` before anything renders, and a spec renders a sound named
   `toString`.
3. **"Silent until it starts" couldn't fail** (the envelope was already 0
   there). Fixed: a tone and shape of 1.
4. **Frame sizes and names weren't checked.** Fixed: a size not a whole
   number of pixels above 0, or the name `__BASE`, throws, with specs.
5. **No spec checked where a frame is drawn, or its UVs after a move.**
   Fixed: a spy on `translateCanvas` (a headless canvas keeps no pixels)
   checks each frame's corner, and a spec checks a moved frame's UVs.
6. **Small items.** Fixed: `Placed`'s doc, `pack()`'s doc names what it
   throws for, `ATLAS_GUTTER` and `MAX_ATLAS_SIDE` are no longer exported
   from the entry (nothing outside uses them), the long lines are wrapped,
   and "refusing none" reads "throwing for an empty list".

Left as advised: packing in rows, `vi.fn()` drawings, the explicit
`@fz/phaser/scene` in Snake's app fence, `thud()` keeping its samples, and
the uploads `bakeTexture()` already made.

## L5: docs and proof

- **L5.1 folded in.** Each lift's step brought its own docs up to date, so
  nothing was left for a step of its own: the libraries' `AGENTS.md`,
  Snake's, and the `phaser-core`, `phaser-canvas-performance`, `fuzzley-ui`
  and `web-game-accessibility` skills.
- **`yarn verify`** passed at `0af7a840`: every workspace's lint, typecheck
  and tests (Snake 395, `@fz/phaser` 249, `@fz/game-ui` 156, `@fz/dev` 109),
  and the build. Snake's entry chunk is 81.2 kB gzipped, its scene 3.8 kB
  and its `phaser` chunk 357.1 kB.

## L4.1's review

The reviewer found no bug, and Snake's behavior unchanged: on a turn, the
pause now runs after the focus effect rather than before, which is harmless,
since neither reads what the other writes. Its findings:

1. **The docs said "a press there", but the rule holds for a press anywhere
   on the page while the focus is in the room,** and the spec never pressed
   outside it. Fixed in the directive's doc, the library's `AGENTS.md` and
   `fuzzley-ui`; the spec presses text outside the room and inside it.
2. **The press specs checked `fireEvent`'s return, not the focus.** Fixed:
   they press with user-event, which skips moving the focus when the press
   is cancelled, and check where the focus is; moving within and out of the
   room uses `user.tab()`. Turning the rule off fails the two that keep it.
3. **The class doc's first paragraph was two sentences, and named Snake's
   score.** Fixed.
4. **Handlers were named for their events.** Fixed: `noticeFocusLeaving()`,
   `noticePageHidden()` and `keepFocus()`.
5. **The library says a component reads no viewport.** The directive does,
   on purpose; the library's `AGENTS.md` says so.

Left as advised: the `setTimeout` settle and the `FakeViewport | null`
copied from Snake's spec, `setVisibility()` copied (a helper in
`@fz/game-ui/testing` can come when Brick Breaker's shell needs it), and
`FOCUSABLE` as it was. The fix's commit (`21d65a12`) missed the skill's
line and this entry, which the next commit adds.

## Q1: Snake unchanged

At `ba7354fd`, on Windows, Chrome in the app's browser pane:

- **Suite.** `yarn verify` passed at `0af7a840`; since then Snake's 395 specs
  pass on each fix, and its `app.component.spec.ts` pausing cases among
  them.
- **Layout.** `yarn workspace snake check:layout` on a fresh build: the
  layout holds at every shape and turn, with and without the arrows.
- **Screenshots.** `yarn capture:screenshots` against the dev server wrote
  `preview.webp` and `thumb.webp` byte for byte as they are in the tree.
- **Sounds.** `yarn build:sounds` writes the same bytes (L2.2), and the dev
  server serves the sprite and its map (200s), with nothing in the console.
- **By hand.** A run started by key ("Started, at Normal speed."); the page
  hidden paused it; a direction went on ("Going on."); the focus moved to
  the bar paused it; after a reload it was taken up paused; at 390 × 844 a
  run going on paused when turned to 844 × 390. No console errors.

Part 1 is done. `brick-breaker` is cut from `brick-breaker-lift` here.

## B1.1: the workspace

- **Built.** `frontend/games/brick-breaker/`, from Snake's: `package.json`,
  `vite.config.ts` (`gameConfig()`, port 9004), `vitest.config.ts` (the
  rules and the view held to 100% of statements, functions and lines and
  95% of branches), `eslint.config.js` with Snake's four fences, the
  tsconfig solution, `stylelint.config.js`, `src/test-setup.ts` with the
  headless Phaser, `index.html`, `src/main.ts`, an `app.component` that
  shows the game's name, with its spec, the styles' `global.scss` and
  `_index.scss`, `LICENSE`, `README.md`, `AGENTS.md` and `CLAUDE.md`.
  `yarn install` adds it to the lockfile. A `brick-breaker-dev` preview is
  in the machine's `.claude/launch.json`.
- **Choices.** No `tools/` yet, so no scripts' ESLint block, no
  `tsconfig.scripts.json`, and none of Snake's `tools` scripts: each comes
  with its first script. `AGENTS.md` describes only what exists, and names
  the layers' folders once they do.
- **Checks.** lint, typecheck, test (1) and build: the entry chunk is
  34.9 kB gzipped with no Phaser yet. `yarn constraints` and the reference
  check pass. `games.json` doesn't list it.

## B2.1: tuning, speeds and the stepper

- **Built.** `src/rules/tuning.ts` (every number of "The feel, in numbers",
  and the sizes the physics needs: the capsule's, the bolt's, the net's
  depth), `speed.ts` (`SPEED_INFO`, `ballSpeed()`, `isSpeed()`) and
  `stepper.ts` (`Clock`, `advanceClock()`, `progressOf()`), each specced;
  `tuning.spec.ts` holds what tuning must not break, such as a row of
  bricks filling the field's width.
- **Choice.** The clock is a record changed in place and returns its step
  count, rather than Snake's new value each frame, so a frame allocates
  nothing (decision 3). A frame too long for twelve steps drops all that is
  left, the part of a step included.
- **Checks.** lint, typecheck, test: 26 tests, 100% of the rules.

## B2.2: the grid

- **Built.** `src/rules/grid.ts`: cells by index, column and row,
  `columnAt()` and `rowAt()` for a point, `brickBox()` and `exposureOf()`,
  specced on grids drawn as rows of `#`: a brick alone, two side by side,
  one under another, one against the wall, one touched across a corner.
- **Choices.**
  - `brickBox()` writes into a box it is given, and `exposureOf()` returns
    bits (`SIDE`), so the sweep allocates nothing per step.
  - `SIDE` is an object `as const`, not an enum: the style guide asks for
    no `const enum`, and plain bits read the same.
  - The walls beside the grid count as solid, so a brick against one has
    no face or corner there, and the space above the first row is open.
- **Checks.** lint, typecheck, test (41).

## B2.3: the sweep

- **Built.** `src/rules/sweep.ts`: `sweepSegment()`, when a moving circle
  first touches a face that runs along an axis, pushed out by its radius,
  and `sweepPoint()`, when it first comes within its radius of a point (a
  corner), each as a share of the move, or `MISSED`. Specced: a face met
  straight and at an angle, a move far longer than the gap, one too short,
  one leaving or sliding along it, one beside its ends, one already touching
  or a little through, one whose center is past it, a face that runs down,
  and a corner met, grazed, passed wide of, left, and already overlapped.
- **Choice.** Numbers in, a number out, no objects, so the field calls them
  for every face and corner near a ball with nothing allocated; the field
  gathers the contacts at the earliest moment.
- **Checks.** lint, typecheck, test (58).
