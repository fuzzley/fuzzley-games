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

## B3.1, brought forward: the catalogs

- **Order.** The field (B2.4) names its bricks by kind, so the catalogs come
  before it rather than after; B3's other steps keep their order.
- **Built.** `src/rules/catalog/bricks.ts`, `balls.ts` and `capsules.ts`:
  every brick kind, ball kind and capsule of "Design reference", written
  `as const satisfies`, with the trait and effect unions, the ids in How to
  play's order, `brickKind()`, `ballKind()` and `capsule()` (an entry as its
  shape), `hasTrait()` and `isCapsuleId()`. `src/rules/catalog.spec.ts`'s
  first half: each entry named and described in a sentence, names apart, a
  brick that never breaks needing nothing and scoring nothing, every
  capsule weighed above nothing, joining after level 1, listed in the order
  it joins.
- **Choices.**
  - A brick kind has `mostHits`, how many hits a level's legend may give it
    (4 for a tough brick), where the plan said only that a legend may set
    more.
  - The ghost brick's 2 hits are its whole, the first of which shows it.
  - The ids come from `Object.keys()` with a commented cast, the one place
    the catalogs widen a type.
- **Checks.** lint, typecheck, test (81).

## B2.1's review

The reviewer checked the numbers against the plan, simulated the clock for
an hour at six refresh rates and a million jittered frames (no drift
outside a step), and found no allocation. Its findings:

1. **Two homes for one number:** the blast's delay and the regrow's time
   were in `tuning.ts` and the catalog; the plan put Wide's and Narrow's
   widths in both too. Fixed: a number of one brick kind or one capsule is
   its catalog entry's, `tuning.ts` says so, the two constants are gone, and
   the plan's table says whose the widths are.
2. **The plan's `vector.ts` wasn't built.** Not needed: the sweep and the
   balls work on plain numbers in place. The plan no longer lists it.
3. **A `NaN` frame froze the clock for good.** Fixed: a frame of no time,
   less, or not a number adds none, with a spec for -100 and `NaN`.
4. **"Steepest" was the wrong word,** and the unit was missing. Fixed: "the
   most slanted … in degrees".
5. **Choices not logged:** the rules resize the paddle (`PADDLE_RESIZE_SPEED`)
   where the plan had the view tween it, so the paddle drawn is the one the
   ball meets; the plan now says so. The lost ball's beat is the shell's to
   time (the view's `timing.ts`, B5.1): the field waits in `lost` until it
   is served again.
6. **Mixed time units.** Fixed: every duration in `tuning.ts` is in
   milliseconds (`KEY_RAMP_MS`, `BOLT_GAP_MS`, `CATCH_HOLD_MS`), as the
   catalog's are, but the step's, which the physics takes in seconds.
7. **`advanceClock()`'s doc opened with two sentences.** Split.
8. **`NET_DEPTH` didn't say from where.** Fixed: below the paddle's top.
9. **Specs.** Fixed: a frame of exactly twelve steps and one of thirteen,
   the part of a step through `progressOf()`, named objects in the
   assertions, the paddle's two checks split, and `SPEED_INFO`'s case under
   its own `describe`.

Left as advised: `SPEED_INFO`'s missing doc, as Snake's, `isSpeed()`'s
`as Speed`, and the name `climbed`.

## B1.1's review, and L3.1's and L4.1's fixes

The reviewer found no bug in running code, and each earlier fix as the log
describes it. Its findings:

1. **The game's `AGENTS.md` described a field, a scene and specs that don't
   exist.** Fixed: it says the field is to be drawn with Phaser, that
   `eslint.config.js` fences four layers of which the rules and the shell
   exist, and that the test setup's headless Phaser is for the scene's specs
   to come.
2. **`stylelint.config.js` named Snake's workspace.** Fixed.
3. **`index.html` keeps a large-image card but has no `og:image`.** The
   preview comes with the screenshots: B13.1 now adds the tags.
4. **`bakeAtlas()`'s spec left its `translateCanvas` spy on the prototype.**
   Fixed: `vi.restoreAllMocks()` after each.
5. **Half the UV spec couldn't fail** (the ball's `u` was 0.3 before and
   after). Fixed: the re-bake makes the atlas 30 wide, and the spec checks
   every edge of the moved frame, `v` counted up from the bottom, as
   Phaser 4's `Frame.updateUVs()` counts it.
6. **`pack()`'s doc opened with two sentences, and "not whole pixels" read
   wrong for 0.** Fixed: split, and "not whole pixels above 0".
7. **`global.scss` spoke of Snake's board and stage.** Fixed.
8. **The plan's B1.1 named a `public/` that isn't needed** (`@fz/style`'s
   plugin writes the icons). The plan no longer names it.
9. **Nits.** Fixed: two long lines wrapped, the `toString` test's name (the
   member is inherited), and `renderSoundSprite()` pairs each name with its
   samples, so no fallback is needed; Snake's sounds are still the same
   bytes. `frontend/games/AGENTS.md` gives 9004 to Brick Breaker, so the
   next game takes 9005.

Left as advised: the other lists of games until B13.3, the description's
"Thirty levels" until B14, `THEME_COLOR_ROLE`, the unused `@use`, the
router devDependency, and the fences and floors.

## B2.2's review

The reviewer found the exposure rule right for a swept ball (a hidden
corner's arc lies inside a neighbor's pushed-out box, so nothing catches at
a seam, and it holds while a ball is narrower than a brick is tall). Its
findings:

1. **Only one diagonal was ever solid in a spec, and no bottom face or right
   wall was hidden.** Fixed: each diagonal hides only its corner, a brick
   below hides the bottom, and a brick in column 12 meets the right wall.
2. **The plan's "cells a moving box crosses" wasn't built.** The field finds
   them from `columnAt()` and `rowAt()` of its move's box; the plan says so.
3. **`Solid` didn't say how rows outside the grid count.** Fixed: they are
   open, and a field checks `inGrid()` before it looks in its bricks, where
   column -1 would be the last of the row above.
4. **Three docs opened with two sentences,** and `brickBox()`'s spoke of a
   brick that moves. Fixed.
5. **The point-to-cell test packed three checks and no edges.** Fixed: one
   case each, a point on a seam and one left of the wall among them.

The log's reason for `SIDE` was wrong: the style guide forbids `const enum`,
not `enum`. `SIDE` is an object because its specs read its names with
`Object.entries()`, which an enum's reverse mappings would muddle.

## B2.3's review

The reviewer checked every formula and the spec's numbers by hand, found no
way for a fast ball to tunnel, then ran the spec against six changed
copies of the sweep, all of which passed. Its findings:

1. **The spec left the boundaries untested:** a face's ends, a contact at
   exactly the move's end, the center on the line, a tangent, a still ball;
   and "slides along" passed for the wrong reason. Fixed: a case for each,
   and the slide starts over the face.
2. **The plan's B2.3 promised what the field does** (gathering a moment's
   contacts, the paddle). Fixed: the plan says the sweep meets boxes and the
   field gathers.
3. **Ten positional numbers let a bad face through** (a normal of 0, a
   diagonal one, `from` past `to`). Fixed: `sweepFace(move, box, side)` and
   `sweepCorner(move, box, corner)` take a `Move` and a `Box` the field keeps
   and a `SIDE` bit, so a face can only be one of a box's four; still
   nothing allocated. Walls and the paddle are boxes too.
4. **The docs didn't explain `line`, and put the span on the wrong axis.**
   Gone with the new shape; `MISSED`'s doc reads as a constant's.
5. **"Or turn twice off one" wasn't the sweep's to promise:** a face's end
   and its corner report the same moment. Dropped; the field merges them.
6. **`gap < -r` hid "the center is behind the line".** Fixed: the distance in
   front is tested first, then the radius taken off.
7. **A tangent counted as a corner hit, where sliding along a face didn't.**
   Fixed: a ball that would only graze a corner misses it.

Left as advised: the root's form, a center inside a brick touching at once,
the file's `//` comment, and the short names in the mathematics.

## B3.1's review

The reviewer checked every entry against the plan's tables and found no
bug. Its findings:

1. **The blast's delay and the regrow's time were in `tuning.ts` too.**
   Already fixed by B2.1's review: a number of one brick kind or capsule is
   its catalog entry's.
2. **The plan wasn't brought up to date.** Fixed: "Design reference" now has
   the gift brick with no capsule of its own, `passes` and `reaches` as
   booleans, the pace's `climb` and `fromBase`, and the split's `spreadDeg`.
   B3.1 says the catalogs are imported each by its file, so no `index.ts`,
   and the spec that Relaxed leaves out only the bad capsules moves to
   B3.3, with the pool it checks.
3. **The steel brick's words were wrong:** bolts stop at it, and a fire ball
   is turned. Fixed, in its sentence and the `hard` trait's doc.
4. **The hits test packed a conditional into one assertion,** and a hard
   brick that broke would have passed. Fixed: kinds that break take a hit
   at least, and a legend may give them their own hits; kinds that never
   break are not needed and take no hits from a legend; and a kind is hard
   exactly when it never breaks. A union for `hits` is left as it is: the
   level check reads `mostHits` of every kind, and 0 says a legend can't
   give one any.
5. **The sentences' numbers repeat the data.** Fixed with specs: each timed
   capsule names its seconds, the regrow brick its own, and the tough
   brick's hits, Extra life's six and Multiball's three are spelled from
   their numbers. The fractions ("half as wide again", "a quarter faster")
   are left to the eye.
6. **Names apart failed as "expected false".** Fixed: a case per catalog,
   expecting no name repeated.
7. **Every ball kind but the normal one has a capsule now,** by a spec.
8. **Docs.** Fixed: `CapsuleEffect`'s first paragraph is one sentence,
   `effect` has a doc, `mostHits` says what `hits` is without a legend,
   `EffectKind` sits beside its union with `TraitKind` beside the traits',
   and `hasTrait()` takes a `kind`.
9. **Two sentences misled.** Fixed: Catch says the ball waits 3 seconds at
   most, and Narrow shrinks the paddle to two thirds of its width.

Left as advised: the `Object.keys()` casts, `as const satisfies`, the
accessors, a ball capsule naming `"normal"`, `ms` beside `delayMs`, the
three `isCapsuleId()` cases, and a record keyed by id.

## B2.4: the field

- **Built.** `src/rules/field.ts`: `Field`, `createField()`,
  `steerField()`, `stepField()`, `launch()` and `serve()`, with a ball's
  travel: the earliest contact among the walls, the paddle and the exposed
  faces and corners of the bricks in the cells its move crosses, every
  contact of that moment gathered and turned once, up to four a step.
  `paddle.ts` (`Steer`, `Paddle`, steering and moving, the paddle's box),
  `balls.ts` (`Ball`, holding and serving, the paddle's angles, the mirror,
  a turn, settling), `events.ts` (`EventLog`) and `level.ts` (`Level`,
  `LevelBrick`). `src/testing/field_picture.ts`: `fieldFrom()`, with `o`,
  `#`, `+` and `2` to `4`, `throwBall()`, `stepTimes()`, `eventsOf()`,
  `headingOf()` and `ballOf()`. Specs for each, 84 new.
- **Choices.**
  - Steering is taken once a frame (`steerField()`) and the steps follow
    it (`stepField(field)`), rather than `stepField(field, steer)`: a
    finger's drag is a frame's distance, which twelve steps would apply
    twelve times.
  - Keys and a pointer: keys go first and let go of the pointer's place; a
    pointer that stops asking leaves the paddle heading where it last
    asked; a drag moves that place. The keys' ramp starts from nothing when
    the keys change, and letting go stops the paddle at once.
  - The paddle's ends and top corners send a ball off as its end would,
    60° outward and up, rather than by their normal; its underside meets
    nothing. The plan says so.
  - The climb counts hits on bricks that break; steel adds nothing, so a
    ball rattling among steel doesn't speed up. It resets when the last
    ball in play is lost, not each of several. The plan says so.
  - Bounces count at walls and bricks; meeting the paddle or breaking a
    needed brick resets them. The lull turns at the wall after twelve.
  - `Level` holds only what the field reads so far, its cells and pace; the
    capsules' and the levels' steps add theirs. `FieldEvent` has only the
    kinds the field writes so far.
  - `Field.solid` is the one closure a field makes, for `exposureOf()`. The
    sweep's move, box and contacts are module records reused every step,
    so a step allocates nothing; losing or serving a ball, which happens
    a few times a level, may.
- **QA.** A scratch spec (deleted) played random levels of 12 rows
  (plain, tough and steel bricks) with a paddle steered to the lowest
  falling ball, checking at every step that no ball is NaN, past a wall,
  inside a brick by more than 1e-6, of a length other than 1, or flatter
  than 20°. Two of eight levels never cleared: a ball glancing off a steel
  corner was turned flatter than 20°, and holding it to 20° with its sign
  sent it back into the corner, which it met again at once, every step.
  Fixed: `settleBall()` takes the normal and picks the up or down that
  leaves, and a lull's turn back into its wall is mirrored; a spec holds the
  corner case, which failed before the fix. After it, 16 levels cleared in
  4 to 8 minutes of game time with no fault, and 6 more, with a paddle
  aimed loosely enough to lose 39 balls, did too.
- **Checks.** `yarn verify` passes; the rules at 100% of statements, 98%
  of branches.

## B3.2: the bricks' traits

- **Built.** `src/rules/bricks.ts`: `Brick` (moved from `field.ts`, with
  `whole`, `shown`, `fuseMs` and `regrowMs`), `createBrick()`,
  `canBreak()`, `hitBrick()`, `stepBricks()` and `TRAIT_RULES`, typed
  `{ readonly [K in TraitKind]: TraitRule<TraitOf[K]> }`, with `hit`,
  `broken` and `step` rules:
  - `hard`: no rule of its own; never breaking is its kind's `hits`.
  - `blasts`: lights a fuse as it breaks, and a beat later (100 ms) hits
    the eight bricks around it once, each through `hitBrick()`, so a blast
    beside it goes off a beat after.
  - `hidden`: shows at its first hit, which also takes one of its two.
  - `regrows`: grows back whole 10 s after it breaks, once no ball is in its
    place.
  - `gives`: an empty entry until the capsules fall, in B3.3, which now
    lists the gift's capsule. The plan says so.

  The field steps the bricks after the paddle and before the balls. Two new
  events, `blast` and `regrown`. `fieldFrom()` reads the whole shared
  legend. Specs trait by trait, 17 new.

- **Choices.**
  - A rule is run through `runRule<K>()`, whose kind and trait share `K`, so
    the compiler matches each trait to its own rule without a cast.
  - Only a ball's hit climbs the speed and resets its bounces; a blast's
    hits don't.
  - A regrown brick takes the hits the level laid it with (`whole`).
  - `isCleared()` reads the field's state afresh in the loops, where the
    compiler took an earlier check to hold after a hit that may clear the
    level.
- **QA.** The scratch spec of B2.4 again (deleted), on 12 random levels
  with every kind: no fault in 107 blasts and 1,580 regrowths. One level
  kept two needed bricks for 15 minutes, its events at the usual rate,
  so no ball was wedged: they were shut in behind steel and regrowing
  bricks, which the levels spec's reach check and the autopilot (B4) are
  for.
- **Checks.** lint, typecheck, test (297), the rules at 100% of
  statements.

## B3.3: capsules and their effects

- **Built.** `src/rules/capsules.ts`: `Falling`, `InEffect`, `Effects`,
  `dropByChance()` (a needed brick that breaks, by the level's chance,
  while fewer than three fall), `dropGift()` (the gift brick's, past the
  cap: the capsule the level pins to it, or one drawn), the draw by weight
  of those the speed lets fall, `stepCapsules()`, `catchCapsule()`,
  `stepEffects()`, `endEffect()`, `endEffects()` and `EFFECT_RULES`, typed
  as `TRAIT_RULES` is. `src/rules/bolts.ts`: `Bolt`, `fire()`, `stepBolts()`,
  `dropBolts()`. `src/rules/draws.ts`: `nextDraw()`, moved from the field.
  `stepper.ts` gains `stepsIn()`.
- **The field.** It steps the paddle, the bricks, the capsules, the
  effects' time, the bolts, then the balls. It gains `climbRate`,
  `paceScale`, `ballKind`, `mode`, `net`, `livesGained`, `falling`,
  `effects`, `bolts`, `boltGapSteps` and `hardSolid`. The balls' kind and
  pace set their speed. A fire ball sweeps a brick that can break as a
  whole box it passes through, breaking it as it reaches it, and meets
  steel by `hardSolid`, where what can break counts as open. A blast
  ball's hit reaches the eight around. While the paddle catches, a ball
  that meets it rests where it landed, until `launch()` or 3 s. The net
  turns back a ball that crosses its line in a step. `Level` gains `drops`
  and `capsules`, `LevelBrick` and `Brick` a pinned `capsule`, and
  `FieldEvent` the capsule an event is about. `hitBrick()` takes the
  damage, and `hitAround()` serves the blast brick and the blast ball.
  `fieldFrom()` takes `drops`, `capsules` and `gift`. Specs effect by
  effect, 65 new.
- **Choices.**
  - Timers count whole steps, not milliseconds: twelve steps of 8.33 ms
    leave 3.6e-15 of 100 ms, a step late. Found by a spec of the bolts'
    gap; the bricks' fuse and regrowth, which have the same flaw, are
    B3.2's review's.
  - `EFFECT_RULES` has `start` and `end`, no `step`: no effect needs one.
    The plan says so.
  - An effect is kept in play only if it has an `end`; Multiball and Extra
    life are over as they start.
  - Losing the last ball also lets go of the falling capsules and the
    bolts. The plan says so.
  - Multiball splits the balls in flight, not one resting on the paddle.
  - The field counts the lives caught capsules bring (`livesGained`); the
    run adds them, up to six, in B3.4.
  - The ball kinds' `size` is read nowhere yet: every kind is 1, and the
    first of another size brings it. `speed` is read.
  - `bolts.ts` is a file of its own, beside `capsules.ts`.
  - The net was first written to turn back any ball below its line, which
    would have caught one already past it; a spec of an effect's end found
    it, and it turns back only a ball that crosses the line in a step.
- **QA.** The scratch spec again (deleted), on 10 random levels of every
  kind with every capsule able to fall at a chance of 0.3, the paddle
  firing whenever it can and letting caught balls go: every level cleared,
  with no fault. Every capsule was caught somewhere, up to eight balls at
  once, three balls netted, 304 pairs of bolts fired, and no bad capsule
  fell at Relaxed. A spec's 7 Extra lives in 220 draws looked low: 22,000
  draws fill 11 bins evenly, so the sample was small, and the spec draws
  1,100.
- **Checks.** lint, typecheck, test (362), the rules at 100% of
  statements, 97.8% of branches.
- **Reviews in.** B2.4's and B3.2's reviews came in during this step; their
  fixes follow in their own commits, before B3.4.

## B2.4's review

With B2.4 the reviewer took the five fix commits before it (B2.1's, B1.1's,
B2.2's, B2.3's and B3.1's reviews), which check out against this log but
for two points below. It played six steel-heavy levels at up to eight
times the pace without a ball passing through anything, and made eight
small changes to the field to see which the specs caught. Its findings:

1. **No spec showed a fast ball can't pass through a brick:** at the usual
   pace a step is shorter than the ball's radius. Fixed: a ball at 40 times
   the pace, a step of 5.3, still breaks the brick in its way.
2. **The determinism spec never drew a random number,** and nothing held
   the lull to its seed. Fixed: the spec's level drops capsules and shuts
   balls in with steel, draws as it plays, plays another way from another
   seed, and the lull turns the same from the same seed.
3. **A ball could freeze between the paddle's end and a wall** less than a
   ball apart, sent from one to the other at once, four events a step.
   Fixed: the box the balls meet the paddle by reaches the wall across such
   a gap (`paddleReach()`), with the reviewer's case as a spec.
4. **Two faces met at once at a right angle turned the ball about their
   diagonal,** not back the way it came. Fixed: each face met turns the
   ball along its own axis, and a corner's normal counts only when no face
   was met; a spec sends a ball into the top left corner at 0.6 by 0.8.
5. **A wrong side was a silent miss.** Fixed: `Face` and `Corner` are
   unions of `SIDE`'s bits, so `sweepFace()` and `sweepCorner()` take only
   their own; the specs of a corner given as a face are gone.
6. **A cleared field kept last step's places,** so it would be drawn
   shaking. Fixed: once cleared, what moves is held still where it is.
7. **Specs that couldn't fail.** Fixed: the paddle's underside (a ball
   rising from below passes through it), its lift (a ball whose middle
   has fallen below it is left), a lull's turn back into its wall
   (mirrored out, one wall event; it failed without the mirror), a seam
   (two steel bricks turn a ball once), and four contacts a step (a ball
   shut in steel at 40 times the pace turns four times and stays in).
   The gap of 3 and the lull's mirror each failed once undone.
8. **Catch's 3 s wait sat in `tuning.ts` against its own rule.** The rule
   was too broad: the bolts and the net keep theirs there too. It now
   reads: a number a catalog's entries differ by is the entry's, and one
   that sets how an effect works is the tuning's. Catch's sentence is held
   to `CATCH_HOLD_MS` by a spec.
9. **The catalog's duration specs matched within other numbers.** Fixed:
   a whole word (`\b12 seconds\b`), and the regrow check reads the
   catalog's own trait, with no fallback.
10. **The contact search talks through module records.** Left: they are
    the step's way of allocating nothing, as the plan asks, and each
    function's doc names the one it reads or writes. The bricks the last
    contact held stay referenced until the next, which costs nothing.
11. **The sides' geometry was written three times.** Fixed: `FACE_NORMAL`
    and `CORNER_AT` in `grid.ts`, beside `SIDE`, serve the sweep and the
    field.
12. **`fieldFrom()` drew a mistake as no brick.** Fixed: it throws for a
    character it doesn't know and a row past 13.
13. **Smaller.** Fixed: `remaining` for the distance left; `meet()` and
    `meetBox()` are `noteContact()` and `noteBox()`, beside `met`; the
    union is `Obstacle`; the ramp uses `STEP_MS`; `AGENTS.md` says a step
    makes only a draw's generator; `throwBall()`'s doc says it puts the
    field in play; the specs name cells with `cellIndex()`.
14. **Doc nits.** Fixed: "a field checks"; `sweepLine()`'s doc opens with
    one sentence; the long doc lines wrapped; the ragged wraps in two
    `AGENTS.md` files and `stylelint.config.js`.

Left as advised: `Field.solid` as a closure, the `|| 1` guard, the event
log's `if (event)`, a generator per draw, `for…of`, `expect.closeTo` in
the stepper's spec, the visitor of `forEachSince()`, a lull only at walls,
and keys over the pointer.
