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

## B3.2's review

The reviewer found the traits as the plan has them, a missing rule a
compile error, and the fences holding. Its findings:

1. **The fuse burned a step long, and longer or shorter by the grid's
   order:** twelve steps of 8.33 ms left 3.6e-15 of 100 ms, and a blast lit
   during the bricks' pass was counted down in it if it lay later in the
   grid. Fixed: the field counts its steps (`Field.steps`), and every timer
   is the step its thing happens at: a blast's `goesOffAt`, a regrowth's
   `regrowsAt`, an effect's `endsAt`, a caught ball's `letGoAt` and the
   laser's `boltsReadyAt`, B3.3's countdowns included, so there is one way
   to time. A chain now goes off exactly a beat apart either way, and the
   specs check the beat to the step, both ways.
2. **A fuse lit as the level clears never burned.** Kept: once cleared,
   the field stands still, and what is left of a chain is no brick the
   level needs. A spec says so.
3. **A blast could clear a level that was `lost` or `serve`.** Kept: a
   chain lit before the last ball fell finishes, and clears the level if it
   breaks the last brick it needs. `FieldState`'s doc says so, and a spec
   plays it.
4. **A regrowing brick the level needed would clear it too soon,** as the
   count only falls. A catalog spec holds that no kind that regrows is
   needed, and the plan's growing brick raises the count for what it adds.
5. **`hitBrick()` broke a broken brick again.** Fixed: a broken brick takes
   no hit, so `hitAround()` no longer checks.
6. **Hits went on after the level cleared,** within a blast or a ball's
   contacts. Fixed: once cleared, a hit does nothing.
7. **A trait wasn't all in its rule:** the hidden brick's start was in
   `createBrick()`. Fixed: a `laid` rule sets a trait's state as the level
   lays the brick out, and the plan's list of what a new trait takes names
   `Brick` and `laid`.
8. **Gaps in the specs.** Fixed: a blast's hits neither climb the speed
   nor start a ball's bounces again, and the blast that clears a level is
   checked for its count and its events' order.
9. **`centerOf()` made a pair at each blast and regrowth.** Fixed:
   `columnMiddle()` and `rowMiddle()` in `grid.ts`, which the capsules'
   drop uses too.
10. **Small.** Fixed: `hitBrick()`'s doc says where its events are put;
    `canBreak()` is asked once; `isNeeded()` serves the field and the
    bricks; the hard trait's comment says who reads its `hits`.

Left as advised: `runRule<K>()`, `isCleared()`, `isBallIn()`'s closure,
the type-only import, and steel taking a blast's hit. For later: the plan's
saved game keeps the field's step count and every timer's step, a lit
fuse's among them.

## B3.4: scoring and the run

- **Built.** `src/rules/scoring.ts`: `multiplier()`, `scoreHit()` and
  `clearingPoints()`. `src/rules/run.ts`: `Run`, `RunStart`, `Outcome`,
  `createRun()`, `hasEnded()`, `startLevel()`, `pause()`, `resume()`,
  `tally()`, `gainLives()`, `loseLife()`, `clearLevel()` and `levelSeed()`.
  The tuning gains `STREAK` (from the fifth break double, the tenth triple,
  the twentieth four times), `CLEAR_POINTS` and `CLEAN_POINTS`. The field
  gains `score`, `streak` and `livesLost`: `hitBrick()` scores every hit,
  and a break lengthens the streak before it is scored; the paddle meeting
  a ball, and the last ball lost, start the streak again, and the last ball
  lost counts a life lost. Specs, 48 new.
- **Choices.**
  - The field keeps the level's score, and the run the points banked by
    the levels cleared, so the run's score is `banked` plus the level's as
    it stands (`tally()`), and a level left unfinished banks nothing.
  - A blast's hits lengthen the streak, as each is a brick broken.
  - Steel scores nothing, as its kind's points are 0, but still counts as
    a hit; a tough brick scores at each hit, a regrowing one each time it
    breaks.
  - The run doesn't count the capsules fallen, as the plan had it: the
    field's draws count from `levelSeed()`, the run's seed mixed with the
    level's number, so a level replays alike however the levels before it
    went. The plan says so.
  - Lives from points and from capsules both stop at six; a mark passed at
    six is spent, not saved.
  - `startLevel()` from `cleared` moves to the next level, so the shell
    shows the cleared level's tally until the player goes on.
- **Checks.** `yarn verify`: lint, typecheck, test (426), build; the rules at 100% of
  statements.
- **Review in.** B3.3's review came in during this step; its fixes follow
  in their own commit, before B4.

## B3.3's review

The reviewer ran the commit's specs and a stress run of 60 random levels
with every capsule. It found no free ball overlapping a brick, and
`needed` true to the bricks at every step. Its findings:

1. **A caught ball could sit past the paddle's end, and in a wall.** When
   the paddle shrank under it, the ball kept its offset, and carried to a
   wall it went past it. Launched from there, the sweep missed the wall
   and the ball left the field. Fixed: `followPaddle()` moves a resting
   ball in from an end the paddle shrank past and keeps it off the walls,
   so `meetPaddle()` no longer limits the offset itself. Specs: each limit,
   and a ball caught at the end, shrunk, carried to the wall and launched,
   which stays in the field.
2. **A blast ball struck again a brick its own reach had broken,** when it
   met two at once. B3.2's review had already stopped the second break, but
   the strike still climbed the speed and reached around again. Fixed:
   `turn()` strikes only a brick met that is still whole. Specs: the blast
   spec names the cells broken instead of counting `needed`, and a ball up
   the seam of two bricks climbs once.
3. **Every catch logged "paddle" four or five times.** A held ball still
   heads down onto the paddle, so each of the contacts left met it again.
   Fixed: `travel()` stops once the paddle holds the ball, and a ball the
   paddle lifts and catches waits as a held one does. Specs: the full list
   of events, for a landing, a launch and a paddle moved into a ball.
4. **Capsules fell after the last ball was lost,** from a chain still
   going off. Fixed: a capsule falls only while the level is in play,
   through `dropFrom()`. The plan says so. The capsules' specs now play a
   field with no ball (`playWithoutBall()` in `field_picture.ts`), since
   bricks broke there while the field waited to serve, which play never
   does. The spec of losing the last ball now drops its capsule before the
   ball goes, so it no longer passes with nothing falling.
5. **The gift trait leaked into `hitBrick()`, and a gift that cleared the
   level still let a capsule fall.** Fixed: `dropFrom()` decides a broken
   brick's capsule in one place, after the level's count, a gift's always
   and another needed brick's by chance. `gives`' rule is empty, with a
   comment, as `hard`'s is. Spec: a gift that clears the level drops
   nothing.
6. **`passes` was read as "breaks", and `size` nowhere.** Fixed: the
   catalog spec holds that a kind that passes has `damage: "breaks"` and
   that every kind is a normal ball's size. The plan's list for a ball kind
   says so, and its heavy-ball example names where the size would be read.
7. **A netted ball under the paddle jumps onto it.** Left: it may not show
   once drawn; Q3 looks at it.
8. **One scratch box for the paddle and a brick.** The drop no longer uses
   one since B3.2's review. Fixed anyway: it is `paddleArea`, the paddle's
   alone.
9. **Readability.** Fixed: `endEffects()` and `dropCapsules()` are apart;
   `splitBalls()` says why it marks the balls first; `ALL_SIDES` is
   `grid.ts`'s, built from `SIDE`; `findContacts()` picks what is solid
   once, and its `if` has braces; `Field.mode` is `PaddleMode`, from the
   capsule catalog; `fire()` is `fireBolts()`; the imports are in order;
   and the plan names `createEffects()` among what a new effect takes.
   Left: `hitAround()`'s doc, which reads true now that a broken brick
   takes no hit.
10. **Docs.** `AGENTS.md`'s timers line was fixed with B3.4. Fixed: the
    plan no longer says Net outlasts a level, as each level is a field of
    its own.
11. **Specs.** Fixed: the two specs that hid findings 2 and 3 (above), and
    `TO_PADDLE` and `TO_FLOOR`, worked out from the tuning as `TO_TOP` is.

Each new spec fails with its fix undone. A pointer's target is set as the
paddle is steered, at the width it has then, so a paddle shrinking stops
short of the wall until it is steered again; in play it is steered each
frame, so this is left as it is.

Left as advised: an effect's time counting from its catch's step, gifts
past the eight records, Multiball leaving a resting ball, a blast ball at
steel, the allocations at a catch, drop or lull, a bolt not moved up to the
brick it hits, braceless one-line loops, Catch holding a ball met at the
paddle's side, and `hardSolid`.

## B4.1: levels as data

- **Built.** `src/rules/legend.ts`: `BrickSpec`, `NO_BRICK`, the shared
  `LEGEND` and `brickOf()`. `src/rules/levels.ts`: `LevelData`,
  `BrickSpecData`, `LevelSetData`, `LevelEntry`, `LEVEL_SETS`, `LEVELS`
  and `parseLevel()`. `src/rules/levels/basics.json`: the first set,
  Basics, levels 1 to 10 as the plan's table has them (Stripes, Gifts,
  Pyramid as the plan draws it, Checker, Window, Arch, Diamond, Waves,
  Rocket with a picture's tints, Castle), its chance of a capsule 0.10 and
  its pace from 1.00 to 1.06. `level.ts` gains `TINTS`, the catalog
  `isBrickKindId()`, and `fieldFrom()` reads the shared legend rather than
  a copy of it. Specs, 70 new.
- **Choices.**
  - A level's ids are text in its file, so `LevelData` says `string` where
    the plan had the catalogs' ids, and `parseLevel()` checks them; a type
    that claimed more would be a cast over JSON.
  - A set's file holds its chance of a capsule, which each level may
    override; `parseLevel()` takes the level's entry (its number and set
    with its data), since its default pool and chance depend on them.
  - `parseLevel()` throws, naming the level and the problem: the levels
    are fixed data the spec parses, so a bad one fails the build's tests,
    not a player's game.
  - A tint grid may hold `.` for a brick, which then takes its row's
    stripe, so a picture needs tints only where it is one.
  - A legend's hits run from its kind's hits to its `mostHits`, so a tough
    brick takes 2 to 4, and steel none.
  - The reach check lives in the levels spec: a flood from the open field
    below the grid, through every cell but steel and the gap above the
    grid, must find every needed brick. A spec of its own shows it finds a
    brick shut in by steel.
  - The levels' hits run from 39 (Pyramid) to 183 (Castle). The autopilot,
    B4.2, times them, and `yarn report:levels` is where the ramp is tuned.
- **Checks.** lint, typecheck, test (510); the rules at 100% of
  statements, `levels.ts` at 100% of branches.
- **Review in.** B3.4's review came in during this step; its fixes follow
  in their own commit, before B4.2.

## B3.4's review

The reviewer reviewed B3.4 with the fixes of B2.4's and B3.2's reviews. It
found scoring as the plan has it, the timers exact, and the earlier fixes
covered by specs that fail when they are undone, but for those below. Its
findings:

1. **The run's moves acted on any run.** `loseLife()` on the last life and
   then `clearLevel()` revived a run with no lives, the order of the two
   decided the outcome, `tally()` after `clearLevel()` banked twice, and
   lives went on after the run was over. Fixed: `tally()`, `gainLives()`,
   `loseLife()` and `clearLevel()` act only while a level is under way, in
   play or paused, and return any other run as it is. So a run over stays
   over though a blast clears its level after the last life, and a level
   is banked once. `Run`'s doc and the plan say so. Specs: each move
   refuses each outcome, and a run over stays over through a clear.
2. **The right-angle spec didn't test its fix.** Its heading, -36.87°, met
   the two walls one after the other. Fixed: the exact heading, from
   `atan2`, and the spec expects one `wall` event. It now fails with one
   reflect about the summed normal.
3. **Gaps in the specs, each a mutation that passed.** Fixed: `tally()`'s
   spec arranges a score apart from the banked points; a mark passed at
   six checks the next mark; `clearLevel()`'s spec arranges a stale score;
   a ball lost while another plays on keeps the streak and costs no life;
   a blast that clears the level hits nothing more, and a second blast lit
   with it goes out. Each fails with its mutation.
4. **A gap just over a ball's width beside a wall** let a ball shuttle
   between the wall and the paddle's side, all but still. Fixed: the
   paddle's reach closes a gap under `CLOSED_GAP`, a ball's width and 0.1.
   A probe of the narrowest gap left open, 0.83, at four headings: the ball
   is out within 19 steps, a sixth of a second. The spec checks a gap of
   0.7 and one of 0.8.
5. **Scoring in the form the plan needs later.** Fixed: the field keeps
   what the streaks added apart (`streakPoints`), for the Cleared card.
   Left for B9, as the plan now says: the `broken` event will carry the
   streak, for the rising pitch.
6. **Design questions.** Fire cost points, as a 4-hit brick broken in one
   hit scored 50. Fixed: a hit scores each of the hits it takes, so a fire
   ball's scores them all. The clean bonus is for no life lost, as the code
   has it; the plan's wording now says so.
7. **Readability.** Fixed: the streak's rule is all in `scoring.ts`
   (`scoreBreak()` lengthens the streak and then scores, `endStreak()`
   starts it again); `Field.livesGained` and `livesLost` say they count up
   for the run to take what is new; `mirror()` reflects by each face's sign
   once.
8. **Doc nits.** Fixed: `FieldSetup.seed` is the level's; `Run`'s doc
   opens "Describes"; `Field.streak` names the lost ball; `Run.levels` is
   `lastLevel`. `hitBrick()`'s ragged wrap went with B3.3's review.
9. **Spec nits.** Fixed: `scoring.spec`'s hits go through `brickAt()`,
   which throws for no brick; `gainLives()`, `pause()` and `resume()` have
   one act a spec; `KEEPER` and `brickAt()` are `field_picture.ts`'s, for
   the three specs that used copies; `fieldFrom()` throws for more than 16
   rows. Left: the seam spec, which checks that two bricks met at once
   turn a ball once. Exposure is not what makes it pass: a face its
   neighbour hides can't be reached in this sweep, so exposing every side
   changes no turn. `exposureOf()` stays, as it spares the sweep the hidden
   faces.

Left as advised: the run a value and the field mutable, `levelSeed()`'s
mix, `multiplier()`'s scan, a mark spent at six, steel scoring 0, the
streak's breaks, `startLevel()` from `cleared`, and the earlier fixes'
shapes.

## B4.2: the autopilot and the levels' report

- **Built.**
  - `src/testing/autopilot.ts`: `autoplay()`, `AutopilotReport`,
    `AUTOPILOT_LIMIT` (eight minutes) and `ENDGAME` (three bricks).
  - `src/rules/autopilot.spec.ts`: the autopilot clears a level, stops at
    its limit on one it can't, and plays alike from a seed. Every level, at
    every speed, is cleared by it within eight minutes.
  - `tools/report-levels.mjs`, run by `yarn report:levels`: the rules and
    the autopilot loaded through Vite, as Sudoku's generator loads its
    rules, and a table of every level at every speed. The workspace gains
    `tsconfig.scripts.json`, and `yarn lint` and `yarn typecheck` take in
    `tools/`.
  - The catalog spec's second half: the levels use every brick kind and
    let every capsule fall, but those it names as still to come (steel,
    blast, ghost and regrow; Narrow, Fire, Fast and Blast). Each capsule
    that can fall first falls at the level its `from` names, counting a
    gift's draw and a pinned capsule.
- **Choices.**
  - The autopilot steers as a pointer does, so it moves as fast as a mouse
    and plays better than most players: it lost no life in any level. Its
    limit finds a level that loops or hides its last bricks, not one too
    hard for a person. The report's times show the ramp.
  - It aims half its landings at a brick the level still needs, chosen by
    the seed, and the rest at a seeded place on the paddle, so a last
    brick is chased as a player would chase it.
  - It goes for a good capsule only when it can catch it and still be back
    under the ball in time.
  - The spec and the report play from the level's number as the seed, so
    the report shows what the spec found.
  - The report adds the time spent once three or fewer needed bricks were
    left, the plan's "last brick" drag, for Q2 to read.
- **The report** at this commit (time, the last three bricks' time, the
  paddle's hits and lives lost):

  ```text
                    relaxed                normal                 fast
   1 Stripes        2:48 0:08   63  0      2:20 0:09   69  0      1:47 0:08   58  0
   2 Gifts          1:13 0:04   62  0      1:01 0:02   59  0      0:46 0:02   58  0
   3 Pyramid        1:49 0:08   37  0      1:34 0:07   43  0      1:16 0:07   40  0
   4 Checker        3:31 0:10   86  0      2:51 0:11   85  0      2:01 0:03   71  0
   5 Window         1:53 0:03   85  0      1:19 0:02   71  0      1:00 0:02   50  0
   6 Arch           1:10 0:08   87  0      1:12 0:06   91  0      1:05 0:13   76  0
   7 Diamond        2:51 0:03   80  0      2:07 0:03   74  0      1:32 0:01   68  0
   8 Waves          1:24 0:03   77  0      0:59 0:01   65  0      0:51 0:03   80  0
   9 Rocket         4:50 0:30  101  0      3:53 0:35  108  0      3:20 0:28   90  0
  10 Castle         2:02 0:13   83  0      1:36 0:07   96  0      2:24 0:28  107  0
  ```

  The whole report runs in under three seconds. Q2 reads it.

- **Checks.** `yarn verify`: lint, typecheck, test (578), build; the rules
  at 100% of statements.

- **Review in.** B4.1's review came in during this step; its fixes follow
  in their own commit, before Q2.

## B4.1's review

The reviewer reviewed B4.1 with B3.3's review fixes. It found each of those
fixes held by a spec that fails without it, `playWithoutBall()` hiding
nothing, and `parseLevel()` laying levels out right. Its findings:

1. **A blast ball meeting two bricks at once hit by the grid's order.**
   B3.3's fix skipped a brick another's reach had broken, so `.....2o`
   left the tough brick with a hit while `.....o2` broke both, and a blast
   ball climbed less than a normal ball. Fixed: `turn()` strikes every
   brick met, then, if the balls' hits reach, hits around each; a strike
   breaks no other brick at once, so B3.3's double strike stays gone. The
   seam spec plays both orders, each breaking both bricks and climbing
   twice.
2. **A typo in a level's file went unread.** The compiler doesn't check a
   JSON value's keys against its type, so `"pase"` left the pace at 1.
   Fixed: `parseLevel()` throws for a key no level has, and for one no
   legend brick has, from records the compiler holds to `LevelData`'s and
   `BrickSpecData`'s keys. The plan says so.
3. **The reach check's specs missed two cases, and named steel.** Fixed:
   a brick reachable only through the gap above the grid, and one boxed in
   by steel with its corners open, which is shut in. The flood stops at any
   kind that never breaks. Left: the check is cautious about a needed brick
   boxed in by steel beside a blast brick, which a blast could reach; the
   levels of set 2 may need it to learn that.
4. **Checks with no spec.** Fixed: a legend's character longer than one,
   hits not whole or fewer than the kind's, a chance below none and a tint
   of 0 are named; sixteen rows, a pace of 0.8 or 1.4, and a chance of 0 or
   1 parse. Each fails with its check undone.
5. **A tint where there is no brick went unnoticed,** so tints shifted
   from their bricks passed. Fixed: `parseLevel()` names it.
6. **`dropCapsules()` meant the opposite of `dropFrom()`.** Fixed: it is
   `clearFalling()`, and `dropBolts()` is `clearBolts()`.
7. **The Basics ramp:** the pace levels off three times, and Castle, the
   set's test, stops at row 9 while Waves reaches 14. Q2 reads it with the
   autopilot's report. Left: a pace step under 0.01 can't be felt, so a
   level that holds the one before's is kept.
8. **Smaller.** Fixed: `hitBrick()`'s doc says the streak multiplies the
   score; two capsule specs are named for what they check; `fieldFrom()`'s
   doc points to `legend.ts`; `checkGrid()` takes `"bricks" | "tints"`.

Left as advised: the guard in `dropFrom()`, `hitBrick()`'s order,
`stepBalls()`, the wall clamp leaving the offset, Stripes' empty pool, and
the ids as text. For later: inserting a level shifts the default pools and
seeds of those after it, as both come from its number.

## Q2: the rules alone

Checked in a scratch spec, deleted after.

- **The autopilot over set 1, twenty seeds a level and speed:** all 600
  plays cleared within the limit, and none lost a life. Castle, the set's
  test, was heavy: 183 hits, a median of 206 s at Relaxed, one play of
  453 s against the limit of 480, and up to 85 s on its last three bricks.
  Its towers stood against the field's walls, with their tops and
  battlements reachable only through a hole in the wall, which made the
  last bricks a hunt. Arch's outer walls against the field's walls did the
  same, up to 68 s at Normal. No level looped.
- **Tuned**, on a harness that played candidate grids the same way:
  - Castle: a lane down each side, so the ball reaches the sky above the
    towers; the walls of three and four kept, with a gate; 159 hits, set
    three rows lower, now down to the twelfth row as a set's test should
    reach.
  - Arch: off the walls, with a lane down each side.
  - The other levels, whose worst plays ran from 2:26 to 4:37 and their
    endgames to 50 s, are left.
- **After:** all 600 plays cleared, the slowest at 277 s. Castle runs at a
  median of 119 s and at most 273 s at Relaxed, and 30 s at most on its
  last three bricks. The longest endgame in the set is Arch's 66 s, once in
  twenty at Relaxed, against a median of 6 s: the tail the last-brick glow
  (decision 15) is for. `yarn report:levels` now:

  ```text
                    relaxed                normal                 fast
   6 Arch           1:09 0:06   68  0      0:57 0:02   82  0      1:06 0:03   65  0
  10 Castle         1:23 0:10   74  0      1:30 0:12   77  0      1:21 0:06   91  0
  ```

  (the other eight as in B4.2's entry).

- **A hundred seeded runs of random steering:** the first thirty on set
  1's levels, the rest on random levels of every kind with every capsule at
  a chance of 0.3, steered by a seeded mix of pointer jumps, drags, held
  keys and chasing the lowest ball, launching, firing and serving at random.
  Over 2,089,317 steps, 626 capsules caught and 729 pairs of bolts fired,
  no free ball ever left the walls or sank into an unbroken brick (by more
  than 1e-4), no bolt was ever inside one, and the needed count always
  matched the bricks.
- **The physics' cost with eight balls,** in Node, on Castle's, Window's
  and Waves' first layouts at Fast: 12 µs a step, so 0.15 ms for a stalled
  frame's twelve steps.

## B5.1: the view's measures, frame, layers, timing, controls and steering

- **Built,** in `src/view/`, each with its spec:
  - `field_metrics.ts`: `fieldMetrics()` on `fitCells()`, 26 by 30 units
    with a 2 CSS px wall, and `toCanvasX()`, `toCanvasY()`, `toFieldX()`
    and `toFieldY()`.
  - `frame.ts`: `FieldView`, `EventsView` and `FieldFrame`, with `Steer`
    and the event types from the rules.
  - `layers.ts`: `LAYERS` and `depthOf()`.
  - `timing.ts`: the flourishes' times, the last bricks' glow, and
    `clearedDelayMs()` and `resultDelayMs()`.
  - `controls.ts`: `FieldCommand`, `HeldKey`, `FIELD_KEYS`,
    `commandOfKey()` and `heldKeyOf()`.
  - `steering.ts`: `Steering`, `PointerView`, `TouchSteering`, `TAP_MS`
    and `TAP_CSS_PX`.

  Specs, 64 new; the view at 100% of statements.

- **Choices.**
  - A place across and down converts by an axis each, so drawing a ball
    makes no pair.
  - `FieldView` lists what the scene reads, read only, and the rules'
    `Field` fits it as it is; `EventsView` is the log without `add()`.
  - The layers, back to front: the field, the bricks, the effects (shards
    and rings, behind what moves), the capsules, the bolts, the paddle, the
    balls, which nothing hides, and the tags.
  - `Steering` reads Phaser's pointer through `PointerView`, the fields it
    needs, so the scene passes the pointer as it is and the view never
    imports Phaser. It asks for a place only on a frame the pointer moved:
    the rules let held keys forget the pointer's place, and a mouse resting
    on the canvas would otherwise pull the paddle back as the keys let go.
  - A mouse's press launches at once; a finger's is a tap only if let go
    within 250 ms, having moved no more than 8 CSS px at any time, so a
    drag that comes back is no tap. One finger steers at a time.
  - The flourishes' times are first guesses, to be tuned at Q3: bricks drop
    in over 360 ms, 45 ms a row apart; shards fly 420 ms; a blast's ring
    300 ms; a shake 160 ms; a lost ball fades over 600 ms, which the result
    card waits for; the Cleared card waits 700 ms for the last shards.
- **Checks.** lint, typecheck, test (656), the rules and the view at 100% of
  statements.

## B5.2: the field's palette, the inks and the contrast spec

- **Built,** in `src/view/`:
  - `palette.ts`: `PaletteMode`, `PaletteRoles`, `BricksPalette` and
    `bricksPalette()`. A ball's color is by its kind and a capsule's by its
    tone, as records over the catalogs' ids, so a new kind without a color
    fails to compile. `CapsuleTone` is named in the capsules' catalog for
    it.
  - `inks.ts`: `LIGHT_INKS` and `DARK_INKS`, eight each: red, orange,
    amber, green, teal, blue, violet and pink, in the order rows take them.
  - `contrast.spec.ts`: every tint, steel, blast and gift brick, every ball
    kind, both capsule tones and the paddle at 3:1 or more against the
    field, in all four palettes (68 cases). Weakening steel or paling an
    ink fails it.
  - `palette.spec.ts` and `inks.spec.ts`.
- **Decided by the spec.**
  - **Steel is the text at 55%, not 35%.** At 35% it is 2.0–2.9:1 against
    the field. Pastel needs about 53%.
  - **Every ball gets the outline, as the Risks foresaw.** The light inks
    sit at a luminance of about 0.165, so the plain ball clears them all
    (3.03–3.41:1). But the fire ball's warning and the blast ball's danger
    are 3:1 or more from the field on the same side as the tints, so no
    ball color but the text could clear them.
    - So every ball is outlined in the field's color, the same for every
      kind so a kind still changes one mark, and the tints answer only to
      the field.
    - The dark inks are freed to be brighter (luminance about 0.26–0.30,
      4.4–5.3:1 against the field), which keeps amber from going brown.
  - The plan's view bullet, ball kinds, brick table and Risks now say so.
  - A pink replaced the slate I first tried, so no tint looks like steel.
    Some tints come near a kind's role color in one palette or another
    (the red ink and a blast brick, the green ink and Classic's gift). The
    kinds keep their patterns, the starburst and the capsule's outline, as
    the plan says, so color is never the only signal.
- **Checks.** lint, typecheck, test (732), the rules and the view at 100% of
  statements.

## B4.2's review (c8f6ba56, cc6c8463)

1. **The endgame wasn't bounded.** A lone brick behind a steel shelf with
   one gap passed the spec.
   - **Fixed:** every level's endgame is now held to a minute
     (`ENDGAME_LIMIT`).
   - Set 1's worst is now 25 s (Rocket at Relaxed).
2. **The run's moves still hung on their order,** which the field's
   counters can't tell the shell.
   - **Fixed:** `tally()`, `gainLives()`, `loseLife()` and `clearLevel()`
     are now one `catchUp(run, field)`.
     - It takes the points, the lives gained, the lives lost, then the
       clearing.
     - It keeps what it has taken of the level's counts (`levelGained`,
       `levelLost`, reset as a level starts), so calling it again takes
       nothing twice.
     - It takes the field as it is (`LevelProgress`, a `Pick` of `Field`),
       so a frame allocates nothing.
   - **Why that order:** on a field, a capsule can't be caught after the
     last ball is lost before the next serve, and nothing is lost after a
     clear.
   - **Specs:**
     - an "order" block: the last life lost, then a blast clearing;
     - a life kept through a clear;
     - a capsule's or the points' life before the last is lost;
     - a capsule's life spent at the cap before one is lost.
   - Mutating the order of lives, clearing or taking fails a spec. The
     redundant "run over" spec (point 9) went with the rewrite.
3. **The autopilot aimed through steel.**
   - **Fixed:** it aims at a needed brick only if a straight line from where
     the ball will land meets no other brick on the way (`inSight()`).
     - It checks once, as it picks the aim, so the spec stays at about
       4.5 s.
   - **Shelf probe** (`["", "", "o", "", "", "############."]` at Normal,
     seeds 1–20): 20:38 of game time in all, against 46:07 blind.
   - The reviewer's hidden-brick level (`["", "##", ".o", "##"]`) is luck
     either way: 1 of 10 seeds fails at Normal now, 3 blind. So the spec
     sums the shelf level's time instead (under 30 minutes).
4. **The autopilot's behaviour wasn't specced.**
   - **Fixed:**
     - `caught` joins the report, and `score`, which nothing read, left it.
     - **The aim:** a lone corner brick at Normal is hit within 8 bounces
       on seeds 1–20; it is 5 now.
     - **The chase:** over 20 plays of six gifts, more than half are
       caught. It is 86 of 120, and 33 without the chase.
     - **The endgame:** a level of three bricks is endgame from its start.
     - The determinism spec's level now has a pool, so the chase runs.
   - Reversing the aim, `<` for `<=`, no chase, and a blind aim each fail a
     spec.
   - **Left:** the wall fold in `landingX()` still fails no spec. It only
     sharpens the aim, and no outcome I probed moves without it.
5. **`canFall()` counted a pinned gift as drawing from the pool.**
   - **Fixed:** only an unpinned gift draws.
   - `KINDS_TO_COME` and `CAPSULES_TO_COME` are now typed by the catalogs'
     ids.
6. **The report and the spec played alike only by convention.**
   - **Fixed:** both play through the autopilot's `playLevel(entry, speed)`.
   - The script loads `STEP_S` from the tuning, rather than keeping its own 120.
   - The columns are "time last bounces lost", each right-aligned under its
     heading, and an uncleared play shows a dash.
   - The widths are declared at the top.
7. **`tsconfig.json` didn't reference `tsconfig.scripts.json`.** Fixed.
8. **Copies and names.**
   - `ENDGAME` is now `GLOW_BRICKS`, from the tuning.
   - `ballSpeedOf(field)` is exported from `field.ts`, and `stepBalls()`
     uses it.
   - `timeToLand()` is renamed `distanceToLand()`.
   - The 0.5 is named `AIM_AT_BRICK`.
9. **The smaller points.**
   - `hitBrick()`'s doc is reflowed, and `CLOSED_GAP`'s comment is
     rewritten: a ball in a gap barely wider than itself shuttles between
     the wall and the paddle, creeping down.
   - **Left:** `Math.max(0, …)` in `hitBrick()` guards a kind with more
     damage than a brick's hits, which the catalog's numbers allow.
   - **Left:** `fieldFrom()`'s row check, as the fixtures carry no specs.
10. **Run time:** the autopilot spec is about 4.5 s; at 30 levels, split it
    by set or take the Risks' turns.

- **Checks.** lint, typecheck, test, the report (above).

## B5.1's review (a29543fe, 6c1ce745, 4d058dc7)

1. **A paddle held at a wall left a gap as it narrowed.** A pointer resting
   past the wall sends no place after B5.1, so the target stayed clamped to
   the old width: a 1-unit gap once Wide ended.
   - **Fixed in the rules,** for every input: as `movePaddle()` changes the
     width, a paddle, or a target, against a wall stays against it
     (`keptAtWall()`). That covers a paddle the keys left there too.
   - **Specced:** a pointer past the wall at width 6, narrowed to 4, rests
     at 24; and a key-pushed paddle narrowed to 2.6. Each fails without its
     half of the fix.
2. **`FIELD_KEYS` couldn't be handed to Phaser's capture,** and held Enter,
   whose capture would block the cards' buttons.
   - **Fixed:** it is gone, as nothing but its spec used it.
   - The plan now says the scene captures, in Phaser's names, only the keys
     that would scroll the page (the arrows and Space), as Snake's does.
3. **Steering's spec had gaps.** Added:
   - a second finger after a lifted drag;
   - a tap after a drag;
   - `letGo()` with the mouse, in follow mode, with either key held, and
     with a finger pressed;
   - a finger let go past 8 px.
   - Each of the reviewer's eight mutations now fails a spec.
4. **Any mouse button launched, and a cancelled touch was a tap.**
   - **Fixed:** `PointerView` gains `button` and `wasCanceled`. Only the
     main button launches, and a touch the browser cancels is no tap.
5. **No spec told the two-pass strike from the old loop.** Fixed: the seam
   spec expects the ball's `bounces` to be 0.
6. **Castle doesn't reach lowest in set 1** (row 12; Waves 14, Rocket 13).
   - **Left as it is.** The plan's "reach lower" is the set's trend, not a
     rule level by level. Castle tests the set by its hits (the most, 159),
     its walls and its gate, and Q2 shortened it for time. Lengthening its
     legs would undo that.
7. **Space and Next level disagreed.** Fixed: `FieldCommand`'s doc and the
   plan's controls bullet say `launch` on a cleared level goes on to the
   next, for the shell to honour in B7.
8. **Docs.**
   - The layers put the balls last, so nothing hides them, the tags before
     them.
   - The shards' and rings' layer is `bursts`, as the rules' effects are
     what the tags show.
   - `CLEARED_MS`'s doc says it is the card's wait.
   - `fieldFrom()`'s doc is reflowed.
9. **Style.**
   - `frame.spec.ts` now checks the types it is about (`expectTypeOf`).
   - Steering takes its metrics as a parameter property.
   - **Left:** `FieldView` as its own interface rather than a `Pick`. Its
     nested types are read-only, so a write to the paddle or a brick fails
     to compile, which a `Pick` of `Field` would allow.

- **Found while fixing:** `GLOW_BRICKS` and `GLOW_AFTER_MS` were in both
  `tuning.ts` and `timing.ts`. They are now only in `timing.ts`, since only
  the view draws the glow, and the autopilot takes `GLOW_BRICKS` from it.
- **Checks.** lint, typecheck, test (738), the rules and the view at 100%
  of statements.

## B5.2's review (7f5077b1)

1. **Capsules cross bricks too.**
   - A capsule falls straight through the bricks below, drawn over them, at
     1.02:1 (accent on the green ink in Classic) to 1.17:1.
   - **Fixed:** every capsule is outlined as a ball is. The spec, the
     plan's capsule bullet, the art bullet and the Risks say so.
2. **The outline was only a comment.**
   - **Fixed:** `BricksPalette.outline`, the panel.
   - The spec holds each ball and capsule against it, and it against every
     tint, the untinted bricks and the paddle. An outline in the text color
     fails 47 cases.
   - The plan's B5.3 step and art bullet now set its width at 1 CSS px or
     more.
3. **Docs.**
   - AGENTS.md lists what the spec holds exactly, and no longer speaks of
     an outline to come.
   - The Risks say the plain ball clears the tints in the light palettes
     only, which let the dark inks be brighter.
   - The B5.2 step says "outline".
   - The spec's comment gives the real reason a ball can't clear the tints:
     the tints and warning and danger sit on the same side of the field,
     so a color 3:1 from both would need 9:1 from the field, which only
     the text reaches.
   - Steel at Pastel needs 51.5%, not about 53%.
4. **Kinds with no color yet** (a tough brick's deeper tint, a plain brick's
   edge, a ghost's outline, the net, the bolt, the tags).
   - **Planned:** the plan's B5.3 step now says every color the art derives
     joins the contrast spec, since that is where they are made.
5. **The wall at 1.47–1.83:1.** Exempted in the spec's comment and the
   plan, as Snake's is: it frames the field, and the field's edge is where
   the bricks and paddle stop anyway.
6. **Nits.**
   - `field`'s doc names the panel role, not `--fz-field`.
   - The untinted bricks are grouped as `bricks: { steel, blast, gift }`,
     typed by `UntintedKind`, a slice of the catalog's ids.
   - The spec walks the palette's records, so a new tone or kind is
     checked.
   - The docs link `WALL_WASH` and `STEEL_WASH`.
   - `inks.ts`'s comment is reworded.
   - `frontend/AGENTS.md` says a canvas game keeps its own colors in its
     view's TypeScript.
   - The spec numbers tints from 1, as levels do.

- **Checks.** lint, typecheck, test (806), the rules and the view at 100%
  of statements.

## B5.3: the art and the effects

- **Built,** in `src/view/`:
  - `art.ts`:
    - `DrawCommand`, a frame's shapes in device pixels: a rectangle, a
      rounded one, a circle, a ring, a line and a polygon. The scene will
      play them into a `Graphics`.
    - `ArtFrame`, with `ends` for the paddle's nine-slice.
    - `BRICK_ART`, `BALL_ART`, `CAPSULE_ART` (by tone) and `SYMBOLS`, each
      `satisfies` a record over the catalog's ids, so a kind without its
      art fails to compile.
    - `atlasFrames(palette, scale)`, with `brickFrame()`, `ballFrame()`,
      `capsuleFrame()`, `tagFrame()` and `FRAMES`.
    - The atlas holds 99 brick frames (72 of them tough), 3 balls, 11
      capsules, 11 tags, the paddle, a cannon, the rim, the bolt, a white
      shard for the scene to tint, an ember and a blast's ring.
  - `effects.ts`: each event's sound and flourishes (`effectsOf()`), a hit
    on steel ringing, and `flourishesOf()`, which plays none without
    motion.
  - The palette gains `mark` (the panel, which every brick and capsule
    keeps 3:1 from) and `toughTints` (each tint a quarter of the way to
    the text). The contrast spec holds the tough tints like the others, and
    the marks against every brick, capsule and the paddle.
  - Specs: every frame within its size, in whole pixels, named once, at
    four scales from a unit of 10 at a ratio of 1 to 54 at 3. Also:
    - every brick kind in every state a level can lay has its frame;
    - a ghost shows as a plain brick once hit;
    - a tough brick has a pip for each hit left and a crack for each taken;
    - balls and capsules are outlined a line's width wide;
    - the tones' shapes and colors;
    - every event's effects, with and without motion.
- **Choices.**
  - **Marks:** every mark on a brick (pips, cracks, rivets, the starburst,
    the gift's capsule, the sprout) and every symbol in a capsule is in the
    field's color. Every body is held 3:1 from it, so the patterns that
    tell kinds apart, which color must never do alone, are held too.
  - **The plain brick is plain:** its tint and no mark. The plan's lighter
    top edge would be shading that tells nothing, in a derived color the
    spec would have to exempt. The brick table says so.
  - **Tough bricks:** "deeper" mixes toward the text, which moves away
    from the field in both modes, so contrast only grows. In the dark
    palettes they read as a lighter tint.
  - **Lines** are a CSS pixel wide or more (`lineWidth()`, which grows to
    6% of a unit on large fields).
  - **The ball's outline** lies inside its radius, so the ball drawn is
    the one that bounces.
  - **Frame names** are made once in tables, so the scene finds a frame
    without making a string. A brick no level can lay throws rather than
    showing nothing.
  - **Steel** is told by a brick whose `whole` is 0, as `Brick` documents.
  - I rendered every frame to SVG in all four palettes, at a unit of 24
    (ratio 2) and of 12 (ratio 1), and looked. The capsules' symbols were
    small, so they take 85% of the capsule's inner height.
- **Checks.** `yarn verify` (lint, typecheck, every workspace's tests,
  Brick Breaker's 1,050, and the build); the rules and the view at 100%
  of statements.

## B6.1: the scene, the atlas and the first painters

- **Built,** in `src/scene/`:
  - `bricks_scene.ts`: `BricksScene` and `makeBricksScene()`, on
    `BricksSceneOptions`. These are `tick(deltaMs, steer)`, `frame`,
    `palette`, `motion`, `touch`, `onLayout` and `command`; `sound` and
    `onPictures` come with B6.2.
    - Each frame it measures if the canvas moved, hands over the time and
      the steering, re-bakes on a new palette or unit, starts a new field
      (a new level), and has the painters draw.
    - Keys go through `Steering` (held pushes) or `commandOfKey()`; the
      pointer through `Steering` (a mouse press or a tap launches).
    - It lets go of every key and finger as the window blurs, the page
      hides, or the focus leaves the board.
  - `atlas.ts`: `bakeBricksAtlas()`, which plays the view's commands into
    a `Graphics` through `bakeAtlas()`.
  - `field_painter.ts`: the field, the wall on three sides, and the net in
    the good capsules' accent. It redraws only when the layout, the
    palette or the net changes.
  - `brick_painter.ts`: 208 images made once. Each cell's frame changes
    only when its brick's does; bricks drop in row by row, 45 ms apart, as
    a level starts, or show at once without motion.
  - `paddle_painter.ts`: a 3-slice `NineSlice` whose ends come from the
    paddle frame's `ends`, drawn between its last place and its next, with
    the cannons (laser) and the rim (catch).
  - `ball_painter.ts`: eight images, each live ball drawn between its last
    place and its next in the balls' kind's frame.
  - The view gains `between(last, next, alpha)` in `frame.ts`.
  - `bricks_scene.spec.ts`: 38 specs on `runScene()` with a fake shell
    over a pictured field: the frames and the layout, the atlas (every
    frame, baked again at a new unit), the field and its palette and net,
    the bricks (frames, a hit, a break, the drop-in with and without
    motion, a new level), the paddle (place, interpolation, modes, ends),
    the balls, the keys and the pointer.
- **Found on the way.** Phaser's keyboard plugin runs on every key event
  (`MANAGER_PROCESS`) over the frame's whole queue, which is cleared only
  at the frame's end. Its duplicate check compares only with the event
  before, so the third key of a frame hands the first over again.
  - Four keys in one frame gave nine commands in the spec, and the same
    can happen in a browser.
  - The scene keeps the events it took in a `WeakSet` and takes each
    once.
  - Snake's scene has the same exposure: a frame with three key events
    could replay a turn. That is a fix for `@fz/phaser` (a helper both
    scenes use) and is left for the user to decide, outside this plan.
- **Checks.** lint, typecheck, test (1,091); the rules and the view at 100%
  of statements.

## B6.2: the capsules, bolts, tags and effects, the events and the pictures

- **Built,** in `src/scene/`:
  - `capsule_painter.ts` and `bolt_painter.ts`: an image for each record
    the field keeps (eight of each), each drawn between its last place and
    its next; a bolt hangs from its tip.
  - `tag_painter.ts`: a tag for each kind of effect, made once, shown in a
    row under the paddle while its capsule is in play, in its capsule's
    frame; and one `Graphics`, cleared and drawn each frame, with a ring
    around each tag in the wall's wash, and an arc in the capsule's tone
    for the time left.
  - `effects_painter.ts`: a broken brick's shards from one particle
    emitter, tinted in the brick's color; eight blast rings; a fading ball
    for each of the eight balls; and the camera's shake. Rings and fades
    run on the scene's clock rather than tweens, so playing one makes
    nothing.
  - `glow_painter.ts`: three frames around the last bricks a level needs.
  - `BrickPainter` swells a brick that holds a hit (`pop`) and grows a
    regrown one back (`grow`), also on the scene's clock. `BallPainter`
    leaves a fire ball's embers from a second emitter.
  - `bricks_scene.ts`:
    - It plays the field's events once each, from the last serial it
      played, through one arrow made once. A new field starts from serial
      0, and stops everything the last set off: shards, embers, rings,
      fades, the shake, and any brick mid-move.
    - It plays the flourishes `effectsOf()` and `flourishesOf()` give,
      none without motion; the glow holds still without it.
    - After each bake it hands How to play its pictures (`onPictures`),
      each `textures.getBase64()` of a frame `PICTURE_FRAMES` names.
      `sound` comes with B9, which plays it.
- **The view:**
  - `flourish.ts`: each flourish's curve (`popScale`, `growScale`,
    `ringScale`, `fadeAlpha`, `shareDone`), and `glowAlpha()`.
  - `tags.ts`: `timeLeft()`, `firstTagX()` and the row's measures. The
    row's middle sits halfway from the net to the field's foot, so the
    rings cross neither. A spec holds that.
  - `art.ts` adds `brickColor()` (each kind's `colorOf`), the glow's frame
    (four bars a line past the cell), `PICTURE_FRAMES` (a tough brick with
    a hit taken, a ghost still hidden) and `mapPictures()`.
  - `palette.ts` adds `glow`, the text, which the contrast spec holds
    against the field.
  - The rules export `EFFECT_KINDS`, the tags' order.
- **Choices.**
  - **The glow is built here.** Decision 15's glow is in no step, and this
    one holds the effects. It shows once three or fewer needed bricks are
    left and none has broken for 15 s, measured in the field's steps from
    the last `broken` event, or from the field's start. It pulses from full
    to 35% over 1.2 s, and holds still without motion.
  - **The fake canvas pictures itself.** `@fz/phaser/testing`'s headless
    canvas now has a `toDataURL()` that names the canvas's size. jsdom
    has none: it printed "Not implemented" on every bake and returned
    nothing. A spec can now tell the pictures of frames apart. It is
    specced in `headless.spec.ts` and noted in `lib/phaser/AGENTS.md`.
  - **No closures made each frame.** B6.1's review found closures made
    each frame, so the new painters loop over their images by index; a
    `for…of` over a list, which B2 settled on, stays. B6.1's own painters
    are fixed in its review's commit.
- **Checks.**
  - Mutation runs on the scene spec: 25 mutations. 23 are killed once
    specs were added for the glow's timing, a new level's reset and the
    glow's needed bricks.
  - Of the other two, clearing a finished move survives because a
    finished move's scale is 1 anyway. The other, `grow()` setting the
    scale at once, was redundant, since the move scales it that frame, so
    it was removed.
  - The look of the shards, rings, tags and glow is checked in a browser
    at Q3, once the board shows the scene.
  - `yarn verify`: lint, typecheck, test (Brick Breaker's 1,159, the
    scene's 63), build. The rules and the view are at 100% of statements.
    `timeLeft()`'s guard for an effect without a time was unreachable on
    its own line, so it was folded into the guard before it.

## B5.3's review (fc9a04aa, 6ddedb75, 8c83df33, 6a363973)

The review came back with eleven findings. Each is answered here, and the
fixes are in one commit.

1. **Without motion, the fire ball told apart by color alone.** Fixed. It
   carries a four-point spark in the marks' color, always, with the embers
   on top where motion is welcome. The contrast spec now holds the marks
   against every ball, and a spec holds each ball kind's mark (the normal
   ball has none).
2. **Lines drawn as separate segments, their joins chipped.** Fixed. A
   `polyline` command takes the place of `line`, and the scene plays it with
   `strokePoints()`, one path, so its corners join. The cracks, the
   sprout's stem and the Slow, Catch and Fast symbols use it, and a spec
   holds a symbol's lines to one path.
3. **The rim, stretched, fading at its ends.** Agreed. B6.1's review found
   it too, so it is fixed with the paddle in that review's commit.
4. **NineSlice draws nothing on the Canvas renderer.** Agreed. The paddle
   is rebuilt without a nine-slice in B6.1's review commit, so it draws on
   either renderer.
5. **Tough frame names that no frame draws.** Fixed.
   - The frames come from one list of the ways a tough brick can stand
     (`TOUGH_LOOKS`), kept in a map under a number for each, so `nameAt()`
     throws for any other, such as a broken tough brick.
   - The index arithmetic in `frames()` is gone.
   - The spec throws for four looks no level lays, so the work log's claim
     now holds.
6. **A widening paddle pinning a resting pointer's place to the wall.**
   Fixed.
   - A pointer's place is now kept unclamped.
   - `Paddle.dragging` marks a finger's target, which a drag stops at a wall
     and which is kept against a wall it reached. Only that target goes
     through `keptAtWall()`.
   - Specs cover the reviewer's probe (a pointer at 2.5 through Wide), the
     left wall, and a drag at a wall. The probe's spec fails on the old
     code.
7. **Gaps in `art.spec.ts`.** Fixed, with specs for:
   - the mark on each brick kind that has one;
   - the fire and blast balls' marks;
   - every capsule symbol in the marks' color;
   - the gift's cut-out in its body's color.

   Nine mutations against the art are killed, the reviewer's three among
   them.

8. **Docs that don't match.** Fixed.
   - The plan's view section now says `atlasFrames(palette, scale)`.
   - Its Accessibility section says what the contrast spec holds: the
     outline against every tint, not the ball.
   - The B5.3 step says the net is drawn in the good capsules' color, which
     the spec holds already.
9. **`inSight()` following the ball's middle alone.**
   - **The edges.** Tried, with rays along the ball's edges too. The seeded
     plays diverge, and the report got worse where it matters: Rocket on
     Relaxed took 5:42 instead of 2:47, its last bricks 0:48 of the one
     minute instead of 0:25, and no level gained much. So the middle ray
     stays, and its doc says it is a guess at what a player sees, which
     leaves aside the ball's radius and how steep a ball the paddle can
     send.
   - **`GLOW_BRICKS` from the view.** Kept. The autopilot is test code in
     `src/testing/`, not the rules, and its endgame is by definition the
     glow's threshold.
   - **The report's lost column.** Noted. It reports lives so a level that
     costs some would show; none does yet.
10. **Style.**
    - `BRICK_ART`, `BALL_ART`, `CAPSULE_ART` and `SYMBOLS` are `as const
satisfies`, so they are readonly.
    - `effectsOf()` reads `!canBreak(brick)`.
    - `DrawCapsule` takes a `CapsuleShape`.
    - A symbol's lines are a line's width at least: `DrawSymbol` takes the
      width. A spec holds every line of every frame to a CSS pixel at all
      four scales, and it fails on the old `stroke()`.
    - `Box` is now `Area`, exported because the art's modules share it.
    - `ArtScale` and `BrickLook` open with a verb.
    - `art.ts` is split:
      - `shapes.ts`: the commands, `ArtFrame`, the helpers and
        `lineWidth()`;
      - `brick_art.ts`: `BRICK_ART`, `brickFrame()` and `brickColor()`;
      - `symbols.ts`: `SYMBOLS`, shorter with `share()` and `dot()`;
      - `art.ts`: the rest.
    - Its spec is split the same way, sharing `src/testing/art_frames.ts`.
11. **`catchUp()` banking a stale field twice.** Left for B7.1, where the
    game service holds the run and the field together and replaces both in
    one move. A spec there will hold that a field from before a level
    started is never caught up.
    - Answered in B7.1: `GameService` lays out the next level's field in
      the same call that starts the level, and a spec holds that a frame
      after going on to the next level leaves the score where the clearing
      left it.

## B6.1's review (f0f5e025)

The review ran 24 mutations, and 21 survived the scene spec. Each of its
ten findings is answered here, and the fixes are in one commit.

1. **The re-bake path had no spec.** Fixed. A spec resizes the canvas and
   holds every image in the scene, hidden ones too, to its frame's new
   width and origin, and the paddle's body to its new height. It fails with
   any painter's `refresh()` removed, eight mutations in all.
   - It found that `BrickPainter.refresh()` skipped hidden images. They
     took their frame again as they were shown, so nothing drew wrong, but
     every painter now refreshes every image alike.
   - The palette's re-bake is held by the pictures handed over again and
     by the paddle painted anew.
2. **Closures made every frame.** Fixed. `BrickPainter.show()` and
   `BallPainter.draw()` loop by index, and the paddle has no loop with a
   closure left.
3. **The spec of ignored keys passing without testing them.** Fixed.
   - `runScene()`'s `key()` takes modifiers and a repeat (`KeyModifiers`,
     specced in `@fz/phaser`). Each key gets a stamp of its own, so Phaser
     no longer drops a raw event as a duplicate.
   - The spec is one case per key: a held key's repeat, Ctrl, Alt and Meta
     shortcuts, and a key the game doesn't use. Each of the three modifier
     checks fails a case when removed.
4. **Input code without specs.** Fixed, with specs for:
   - the keyup sequence the reviewer probed (left down, left up, left down
     and Q in one frame);
   - the page hiding;
   - focus moving to a button over the field, which keeps the push;
   - the "follow" setting;
   - the pointer read through the metrics laid out on the frame it moved
     in.

   Releasing the game's events when the scene ends was specced in B6.2.
   Every one of these fails without the code it covers.

5. **A ball's interpolation spec that couldn't fail on a swap.** Fixed. It
   uses alpha 0.25, with the last place and the next different both ways.
6. **The paddle's extras unplaced.** Fixed. Specs hold the cannons over
   its ends above its top, the rim a line below its top along its body,
   the body's top on the paddle's line, and its edges at its width.
7. **The rim fading at its ends.** Fixed with the paddle, which B5.3's
   review also found draws nothing on Canvas as a `NineSlice`.
   - The paddle is two images of its round end (the `paddle` frame, now a
     disc as tall as it) and a `Rectangle` a pixel wide between their
     middles, scaled across.
   - The rim is another rectangle, a line below its top. Both draw crisp at
     any width on either renderer, take their colors from the palette as
     the atlas is baked, and make nothing as the paddle changes width.
   - The `rim` frame and `ArtFrame.ends` are gone, along with the scene's
     `paddleEnds()`.
   - The plan's design reference, its Phaser table and Q3 now say the same.
8. **208 tweens a level.** Fixed. The drop-in is one tween over the bricks
   shown, its delay read from each one's row. A spec holds a lower row
   still falling after the top row has landed.
9. **Docs.** Fixed. B6.1's entry now says 38 specs, and `AGENTS.md`'s
   Layers paragraph says what exists, wrapped.
10. **Nits.**
    - `measure()` keeps its optional chain, which the lint asks for
      (`prefer-optional-chain`) over `!last || …`.
    - A new unit and a new palette in one frame bake once, which a spec
      holds.
    - `bakeBricksAtlas()` returns nothing, since nothing reads its frames
      any more.
    - The board's element is `board` in `letGoWhenAway()`.
    - The spec removes the element it appends.
    - `paddleEnds()` is gone with the nine-slice.

The 24 mutations run again on the new code (each refresh, the palette's
re-bake, the steering's metrics, the touch setting, the keyup dedupe, the
hidden page, focus within the board, each modifier, the drop's stagger,
both interpolations, the cannons, the rim, the body's top and the rim's
color) all fail a spec.

## B6.2's review (49e62230)

The review ran 16 mutations and its own probe specs. Each of its six
findings is answered here, and the fixes are in one commit.

1. **The shards never moved.** Fixed.
   - `updateConfig()` merges with `MergeRight`, which keeps only the keys
     the first config has. The emitter's config had no `speed` and no
     `gravityY`, so `layout()` set neither.
   - The config now holds both, at nothing, with a comment saying why.
   - Specs hold the shards thrown from the brick's middle, then apart and
     falling faster and faster. Each fails with either key, or the
     `layout()` call, removed.
2. **The last ball lost faded as a normal ball.** Fixed.
   - The rules end every effect in the same step the last ball is lost, so
     the field's kind is already normal when the scene plays the event.
   - `BallPainter.drawnKind` keeps the kind the balls were last drawn in,
     and the fade takes it, since events play before the frame is drawn.
   - A spec catches a fire capsule, steps the field through the floor with
     the rules, and holds the fade to the fire ball's frame. The fade's own
     spec now draws its kind first, as a game does.
3. **The specs missed much of what the painters do.** Fixed, with specs
   for:
   - the shake stopped by a new level;
   - the shards' speed and fall and where they start;
   - the ring's place, spreading and fading;
   - the fade's alpha halfway;
   - the glow's height;
   - the tags following the paddle between its places;
   - a tag's ring emptying with its time.

   The re-bake of the new painters came with B6.1's review's spec. All 13
   mutations of these fixes, the reviewer's among them, now fail a spec.

4. **Embers once per drawn frame.** Fixed.
   - Each ball keeps where it last left an ember, and leaves one for each
     ember's width it has gone since, along the way.
   - So the trail is the same at 60 Hz and 120 Hz, and a fire ball standing
     still, held or not stepped, leaves none.
   - A ball that jumps farther than three units in a frame (served, or
     moved) starts its trail afresh rather than drawing one across the
     field.
   - Specs: ten embers over 2.1 units at 16 ms a frame and at 8 ms a frame,
     and none under a ball standing still.
   - The plan said the emitter would follow the ball. A trail by distance
     reads the same at any refresh rate, which following doesn't.
5. **Doc nits.** Fixed. B6.2's note on loops now says what holds: no
   closures each frame, while a `for…of` over a list stays, as B2
   settled. The contrast spec's comment is reflowed.
6. **For Q5's trace.** Noted, to measure there rather than guess:
   - Phaser's `ParticleEmitter.preUpdate` makes a few arrays a frame for
     each emitter, even with nothing alive. Two emitters could be
     `setActive(false)` while empty if the trace shows it.
   - `bake()` encodes 21 pictures on every re-bake, a resize drag's
     included; they could be taken only when How to play opens.

## B7.1: the game service and what the announcer says

- **Built:**
  - `src/rules/describe.ts`: the words for each turning point the plan
    names. `describeFewLeft(before, after)` says the bricks left only on
    the frame a level comes down to five or fewer, and not on one that
    clears it, so the rule sits with its words and is specced in Node.
  - `src/app/play/game.service.ts`, `GameService`:
    - The run is a signal. The field is held outside one, with a clock and
      one frame record, which `frame()` hands the scene.
    - `tick()` steers the field, steps it as often as the frame's time
      holds a step, and serves the next ball once a lost one has had its
      beat. It then hears the field's new events, takes what the field
      came to into the run, and says it all at the frame's end.
    - With no level in play, `tick()` opens the cleared card or the
      result card once its wait has run.
    - `command()`, `launch()`, `pause()`, `resume()`, `toggle()`, `go()`,
      `nextLevel()`, `newGame()`, `startAt()`, `changeSpeed()`,
      `tryAgain()`, `setDrawn()` and `closeResult()`.
    - The shell's signals: `serving`, `multiplier`, `clearedOpen`,
      `resultOpen`, `resultClosed`, `runs` and `drawn`.
  - `src/rules/run.ts`: `catchUp()` returns the run as it is while its
    field has nothing new. The run's signal is set only on a frame that
    changed it, rather than 60 times a second with an equal value.
  - `src/view/timing.ts`: `SERVE_MS`, the second the paddle stands empty
    after the last ball is lost, with motion or without.
- **Choices.**
  - **The level is said as it starts.** That is the first launch of a run,
    or going on to the next level. A new run says nothing until then: the
    announcer is cleared, as Snake's is, and the board's name (B7.2) says
    which level it is.
  - **One frame, one announcement.** What a frame brings is gathered and
    said together: a capsule caught, the bricks left, a life gained or
    lost, a clearing or the end. A frame that loses the last life says the
    end, not "Ball lost. 0 lives left.".
  - **An extra life is said once.** It is said as the run takes the life,
    with the lives there are. Its capsule's "caught" event is not said by
    name as well.
  - **`nextLevel()` waits for the cleared card,** as a launch and Enter do,
    so the button, the keys and a tap all agree.
  - **`GAME_LEVELS`, beside `GAME_RANDOM`.** The game's levels are set
    for play and take minutes to clear. The spec hands in its own small
    levels and a seed of its own, and plays them through `tick()`,
    steering from the frame it reads. Each level is set up to come to one
    thing soon:
    - a row of blast bricks that one hit clears;
    - a steel wall that loses every ball;
    - five bricks the blasts can't reach;
    - rows of gifts, each letting one capsule fall.
  - **Settings, stats and progress wait for B10.** A run starts at Normal
    and at level 1 until the settings and the level choice exist, and
    `describeEnd()` is handed no new best until the stats keep one.
- **Checks.**
  - Mutation runs on the service and `describe.ts`: 35 mutants. 34 are
    killed, once specs were added for the frame's event log after a new
    run, the glide after a new run, and the bricks left on a frame that
    clears the level (now in `describe.ts`).
  - The survivor is resetting `heard` on a new field. It is equivalent:
    `heard` is set to the log's latest at the end of every frame, and no
    event in a new field's first frame is said. It stays, so the reset
    reads whole.
  - `yarn verify`: lint, typecheck, test (Brick Breaker's 1,287, the
    service's 63), build. The rules and the view stay at 100% of
    statements. The service misses only its two tokens' factories, which
    the spec replaces.

## B7.2: the board, its cards and the room

- **Built:**
  - `src/app/board/`, `BoardComponent`:
    - `<fz-phaser-canvas>` with the scene, loaded with `import()`, handed
      plain functions over `GameService`, the palette from
      `ThemeService`'s roles and the palette's mode, the player's motion,
      and how a finger steers (dragging, until the settings exist).
    - The empty field drawn in CSS until the scene draws: the panel, the
      wall on three sides and the paddle in the middle, at the unit
      `fieldMetrics()` works out, from the rules' measures.
    - The focus ring around the field where the scene laid it out, and the
      pointer hidden while a ball is in play.
    - The cards:
      - Ready, whenever a ball waits on the paddle: the level, and how to
        launch ("Tap to launch." on a touch screen).
      - Paused, with Resume.
      - Cleared, once its wait has run: the bricks', the streaks' and the
        bonus's points, the score, and Next level.
      - Ended, once an ended run's result is put away, with New game.
      - Still loading, and couldn't be drawn, as Snake's.
    - It is an application named for its level ("Brick Breaker, level 3:
      Pyramid"), described by its keys, and Phaser's keyboard target. It
      keeps the scene's pictures for How to play (`pictures`).
  - `app.component`: the board in the room (`[fzPlayRoom]`), which pauses
    the level in play when the player looks away; the announcer and the
    confirm dialog. The board takes the focus as each run begins and as
    the last dialog closes, as Snake's does.
  - `GameService.tally`, from the rules' new `tallyOf()`: how a cleared
    level's points add up, for its card.
  - `src/testing/play.ts`: the small levels and the steering that B7.1's
    spec kept to itself, shared now with the board's and the app's specs.
- **Choices.**
  - **The Ready card shows whenever a ball waits on the paddle,** not only
    before a run's first serve: after a lost ball and on a new level too.
    It sits halfway between the foot of the bricks' rows and the paddle,
    so it covers neither, and lets clicks and taps through to the canvas.
  - **Until B8 brings the bar,** the game's name is a heading only a
    screen reader sees. **Until B8.2 brings the result card,** an ended
    run leaves the board without a card, as the plan orders the steps.
- **Found in a browser.** The scene never drew on the dev server. Its
  first bake comes in `create()`, before the canvas is laid out, at a unit
  of a few device pixels. There the art's insets gave some shapes a
  negative size, and the canvas threw at a negative radius. The headless
  specs never saw it, since `runScene()`'s canvas has its size from the
  start.
  - `shapes.ts`'s helpers now take no size below nothing, and a rounded
    rectangle's radius no more than half its side.
  - A spec draws the atlas at every unit from 1 to 16 device pixels, at
    five pixel ratios, and finds no negative size.
- **Checks.**
  - The board's spec runs on `provideFakePhaserCanvas()` for the cards,
    and with the real scene it loads for the layout, Space and a level
    played to its end in the scene's time.
  - On the dev server: the field, the bricks, the paddle and the card
    draw, a click launches, and the console is clean.
  - `yarn verify`: lint, typecheck, test (Brick Breaker's 1,326), build.
    The rules and the view stay at 100% of statements.
  - Q3 waits for B7.1's review, whose fixes change how the service plays.

## B7.1's review (b5a7c578, with 92ceb61c, 40d7b26e and 1e8c0e32)

The review came back with eight findings. B7.2 was committed first, since
it touched the same service, and the fixes are in one commit on top of
it.

1. **Resets and a mid-loss pause no spec held.** Fixed, with five specs,
   each mutation-checked:
   - Try again from an open result card puts it away.
   - A new run started during the cleared card's wait, then paused, opens
     no card.
   - A paused level holds the lost ball's beat, and the next ball is
     served once the beat has run, paused or not.
   - The paddle stands empty for a beat after every lost ball, not only
     the first.
   - A new run's beat starts afresh.
2. **What `takeIn()` said came from the net change in lives.** Fixed.
   `describe.ts`'s new `describeLives(before, after)` works it out from
   the balls lost (`levelLost`) and the lives the frame gained, by points
   or a capsule. It is specced in Node:
   - A life gained and a ball lost in one frame are both said, in the
     order the run takes them.
   - An extra life caught with six lives held is said by its name.
   - `describeLost()` and `describeExtraLife()` fold into it.
3. **`wait()` took a paused level for an ended run.** Fixed. `tick()` now
   switches on the outcome: it plays a level ready or in play, opens the
   cleared card or the result card after its wait (`openAfter()`), and
   does nothing for a paused level.
   - `showField()`'s reset of `sinceDone` stays, so each guard holds
     without the other: either mutant alone survives, as equivalent.
4. **A long frame that lost the last life served a ball onto the ended
   run.** Fixed. The next ball is served after the run has taken the
   frame, and only while it is still playing. A spec plays the last ball
   out in frames of a second.
5. **`begin()` replaced the run before building its field.** Fixed: the
   field is laid out first, in `begin()` and in `nextLevel()`. A spec
   asks for a level the game hasn't, and finds the run as it was.
6. **Readability.** Fixed:
   - The rules' `launch` is imported as `launchBalls`, so the method no
     longer reads as calling itself.
   - `sinceLost` is a number, reset only as a field is laid out and as a
     ball is served.
   - `mayStartAnother()`'s doc opens with "Returns whether".
   - The multiplier's spec asserts 2, rather than working it out with
     `multiplier()`.
   - The specs that start a run from a key wait for every promise
     (`flush()`), not one tick.
   - `playUntil()` takes a frame's length too, and counts its limit in
     frames.
7. **AGENTS.md.** Fixed:
   - The `timing.ts` entry names the serve's beat.
   - The `EventLog` entry says the scene plays it and the shell hears it.
   - `describe.ts`'s entry names `describeLives()`.
   - The garbled sentence about `BallPainter` is rewritten.
   - Every line is 80 columns or less, but the stack's links.
8. **A ball's place could start its trail from where the last ball there
   went.** Fixed. Each ember place marks itself fresh while its ball is
   out of play, and a fresh one starts its trail where the ball first
   shows. A spec loses a fire ball and throws another a unit away, which
   leaves no ember.

- **Checks.** `yarn verify`: lint, typecheck, test (Brick Breaker's 1,339),
  build.

## Q3: the first playable build

Played on the dev server in the DevTools MCP's Chrome, at 1280 × 800 and
as a phone (390 × 844 at 3×, touch), in the dark palette the browser
picked and in Classic felt. The steering was driven from the page: real
mouse, key and touch events sent to the canvas and the board, so each went
through Phaser's input and the scene's `Steering`.

- **Mouse.**
  - The paddle goes exactly where the pointer is, at 6, 20 and 13 units.
  - A click on the field launches.
  - An in-page autopilot that followed the ball with the mouse cleared
    level 1 in about 3½ minutes and lost one life. The announcer said
    "Ball lost. 2 lives left.", "5 bricks left." and "Level 1 cleared!
    Score 5050."
  - The Cleared card added it up: bricks 3900, streaks 150, bonus 1000.
- **Keys.**
  - Space launches, and Enter goes on to the next level, which is
    announced.
  - ← held for 0.3 s moves the paddle 8 units, and D moves it back.
  - Escape pauses and shows the Paused card; P goes on.
  - The question before a new run takes the focus, pausing the level as
    the focus leaves the room. Tab and Enter answer it, and the focus
    comes back to the board.
- **Touch.**
  - The Ready card says "Tap to launch.", and a tap launches.
  - A finger dragged 6 units moves the paddle 6 units.
  - Synthetic touches need `pageX` and `pageY`, which Phaser reads.
- **Speeds.** A served ball's speed at each: Relaxed 12.7, Normal 15.9 and
  Fast 19.0 units a second, against bases of 13, 16 and 19.
- **At the top speed** (Fast's 29 units a second):
  - A ball sent straight at a seam between two bricks breaks one and comes
    straight back.
  - One landing on the paddle's end leaves at 57° from upright.
- **The paddle,** at 4 units and widened to 6: its round ends and its body
  join with no seam, sharp at 1×.
- **A lost ball** leaves the paddle empty for 986 ms before the next is
  served. The pointer shows while a ball waits on the paddle and hides
  while one is in play.
- **The console** stayed clean through every load, once B7.2 had fixed the
  first bake's negative sizes.
- **For the user's eye.** Screenshots sent, with these questions:
  - **The gift bricks wear the accent,** which sits close to one row's
    tint in each palette: the gold row in the dark palette, the green
    row in Classic felt. Only the capsule mark tells them apart there.
  - **A ball in flight as the level clears stays frozen** in mid-air under
    the Cleared card. It could fade, as a lost ball does.
  - **On an upright phone,** the field (26 by 30 units) fills the width
    and about 40% of the height. The bar (B8) will take some of the rest.
- **Not checked here.**
  - The feel itself, which wants a person playing; `tuning.ts` is left as
    it is.
  - Reduced motion in the browser, which the specs hold.

## B8.1: the bar

- **Built:**
  - `@fz/ui`'s `bricks` icon, a wall of bricks for the score, with its
    case in the icon spec's sweep over `ICON_NAMES`.
  - `@fz/game-ui`'s `GameViewportService.fitsActionLabels`, whether the
    window is as wide as the `desktop` breakpoint, from which the bar's
    actions keep their labels, with its two specs.
  - `src/app/bar/`, `BarComponent`, on `@fz/game-ui`'s game bar, as
    Snake's:
    - The link home, the page's `<h1>` (seen on a roomy screen, heard on a
      compact one), and the speed's badge, `<fz-bar-choice>`, which asks
      before it throws a run away for a run at another speed.
    - The figures, a `<dl>` that isn't a live region, since the announcer
      says each turning point. From the width the actions keep their
      labels at: the level, the score, the lives as hearts and the
      streak's multiplier ("×2") while it counts, in the accent. Below it:
      the score and the lives alone, each an icon beside its value, the
      lives as a number, one over the other across the bar or in a card
      each down a rail. The lives are said in words for a screen reader.
    - Pause, dimmed rather than disabled while there's no level in play,
      which keeps the focus on the board through a press and hands it
      back as Resume goes on; Levels; New game; How to play; Settings. On
      a compact screen Levels, How to play and Settings move into the
      overflow menu, led by the link home on the narrowest.
  - `app.component` puts the bar beside the board, with the stage inset
    by the bar's height on the side it stands, as Snake's. The hidden
    `<h1>` went; the bar holds it.
- **Choices.**
  - **Sound and Best wait for their steps.** The plan lists both in the
    bar, but Sound has nothing to switch until B9, and Best nothing to
    show until B10's stats. They come with those steps.
  - **Levels, How to play and Settings are outputs nothing answers yet.**
    B8.2 binds them to its dialogs in `app.component`.
  - **Below the desktop width, the score and the lives alone.** Measured
    in the browser: at 375 × 553, the narrowest shape the layout check
    holds a game to, three figures side by side overflowed even at a score
    of 0, and a four-digit score overflowed two. Extra lives come every
    40,000 points, so a score runs to six figures and a run to six lives.
    The two now sit one over the other in one card (86 px for 999999 and
    six lives). From 720 px, the narrowest roomy bar, to 1199 px, the
    labeled cards, six hearts and a streak left no room for the name,
    which the bar gives way first ("Bri…" at 768 with a score of 0, and
    nothing at all with six lives); the same two figures leave it whole.
    The level is on the Ready card and in the board's name, and a streak's
    points show in the Cleared card's sum. That needed a signal for the
    `desktop` width, so the template decides it and a spec can hold it,
    as `isCompact` decides the rest; Minesweeper drops its difficulty at
    the same width with CSS.
- **Browser check** on the dev server, with the run's figures set from the
  page (a score of 0 and of 999,999, three and six lives, a ×4 streak):
  - 1280 × 800 and 1200 × 800: every figure, the name whole.
  - 1199 × 800 and 720 × 900: the score over the lives, the name whole.
  - 375 × 812 and 375 × 553: the score over the lives; every figure fits
    its box, and the page doesn't scroll.
  - 667 × 375 and 568 × 320, the rail: a card each, the last control
    inside the window.
- **Specs.** `bar.component.spec.ts`: the heading; the speed shown,
  changed, named in the question, and kept when the player backs out;
  the level, score and lives; a life lost; no streak, then "×2" while one
  counts; Pause pausing, Resume going on and handing the focus back,
  dimmed with nothing in play and doing nothing there, and keeping the
  focus through a press; New game; asking for the levels, How to play and
  the settings. On an upright phone, a phone on its side and a tablet:
  the score and the lives alone, and no streak while one counts. On a
  compact screen: the speed, Pause and New game kept in the bar, the menu's
  items, and asking for each from it. Setting `fitsEveryFigure` to ignore
  the width fails the tablet's two.
- **Checks.** `yarn verify`: lint, typecheck, test (Brick Breaker's 1,369),
  build.

## B7.2's review (fd37e168, with 578f4386)

The reviewer ran two findings against the real scene in a scratch copy
before reporting. Every finding was taken.

1. **Space on a card's button left the focus on nothing.** Phaser hears
   the keys on the board, so Space on a focused Resume or Next level
   bubbled up to it. The scene went on, or to the next level, and Phaser's
   capture kept the button from clicking, so nothing handed the board back
   the focus as the card went. **Fixed:** the cards' buttons keep their keys
   (`keepKey()` stops a keydown at the button), so the button takes Space
   or Enter and hands the board the focus. Two specs press Space on Resume
   and on Next level with the real scene and find the board focused.
   Without the fix, both fail. **Snake's Resume has the same problem**,
   which goes on the list for the user.
2. **Only the Ready card fit between the bricks and the paddle.** The
   Cleared card (about 243 px) and the Paused card (about 157 px) were
   moved down with it, and covered the paddle on a phone or left the field
   on its side. **Fixed:** only the Ready card is moved down. The others,
   shown while nothing moves, sit in the middle, and `CARD_DROP`'s doc says
   so. The smaller cards now start below a board 360 px tall rather than
   320, and the Ready card stays between the bricks and the paddle there
   too. Measured in the browser, with each card shown from the page:
   - 390 × 844: Ready 447–546 between the bricks' foot (433) and the paddle
     (561). Paused and Cleared on the field, above the paddle.
   - 667 × 375: Ready 227–326 between 222 and 331. Cleared 66–309.
   - 568 × 320: at first the Ready card overlapped both by a few pixels and
     the Cleared card reached the paddle. With the smaller cards, Ready is
     195–272 between 189 and 279, and Cleared 60–260.
   - 375 × 553: Ready 298–397 between 286 and 409. Cleared 125–368.
3. **The tally spec read its expected values from the code under test.**
   **Fixed:** it reads each line as its term and points and pins them:
   Bricks 1300, Streaks 1300, Bonus 1500 and Score 4100. Swapping the labels
   fails it, since the terms' order changes. On the Blasts level the two
   sums happen to be equal, so swapping the sums themselves can't be caught
   there, and no level in the spec set that clears tells them apart.
   `tallyOf()`'s own spec holds the sums.
4. **Nothing checked the palette's mode, and it could run a moment ahead
   of the colors.** **Fixed:**
   - `@fz/ui`'s `ThemeService` gains `mode`, light or dark, which follows
     the palette as it is applied to the page, as `role()` does, rather
     than `current`, which changes a moment before. Three specs cover it,
     the last one that the mode waits for the palette to be applied.
   - The board's colors moved into `src/app/board/field_palette.ts`
     (`fieldPalette(theme)`), which reads the roles and the mode at the
     same moment. Its spec holds a light palette to the light tints, a
     dark one to the dark tints, and a palette chosen later to its own.
     Making it always light fails the spec.
   - The `fuzzley-ui` skill and `@fz/ui`'s AGENTS.md name `mode`.
5. **The keys' description left out what Space, ↑ and W do besides
   launch, and its last sentence wasn't true yet.** **Fixed:** it says they
   also go on and go to the next level, and that once an ended run's result
   is put away, Space, Enter or P starts another. That is what
   `GameService` does, and B8.2's result card is what puts it away. Since
   B8.1, the bar's New game starts another run at any time, so an ended run
   is no longer a dead end.
6. **The tally outlived its run.** **Fixed:** `begin()` clears it, with a
   spec, so it is null again until a level of the new run is cleared.
7. **Spec readability.** **Fixed:**
   - `endedBoard()` loses `FIRST_LIVES` balls.
   - `advanceWhilePlaying()` steps by `FRAME_MS` up to a named
     `LEVEL_LIMIT_MS`, and the other scene frames use `FRAME_MS` too.
   - The app spec's "goes to the board as a new run begins" uses
     `toHaveFocus()`.
8. **`focus()` said "once it has drawn".** **Fixed:** it says "after
   Angular's next render".

- **Mutants.** Each of these failed the specs: dropping `keepKey()`'s
  `stopPropagation()`, swapping the tally's labels, always-light in
  `fieldPalette()`, and dropping the tally's reset.
- **Checks.** `yarn verify`: lint, typecheck, test (Brick Breaker's 1,375),
  build.

## B8.2: the dialogs

- **Built:**
  - `src/app/levels/`: the Levels dialog. Each set is a section named by
    its heading, and its levels are buttons in a grid, each named by its
    number and name ("3 Pyramid"), with the run's own `aria-current`.
    Choosing one starts a run there through `GameService.startAt()`,
    asking first if a run is under way. The dialog closes once a run has
    started, and stays open if the player backs out.
  - `src/app/result/`: the card over an ended run, an alert dialog opened
    once the last ball has faded.
    - It shows "Game over" or "Every level cleared!", where and at what
      speed ("Out of lives on level 5, at Normal speed"), the score, the
      level reached and the levels cleared.
    - Its first button, focused as it opens, says "Try again from level n"
      after a loss and "New game" after a win.
    - Choose a level puts the card away and asks the app for the levels.
      Close leaves the board to look at.
    - The rules gain `levelsCleared(run)`.
  - `src/app/help/`: How to play.
    - The aim, then scoring and pausing. The scoring sentences are written
      from `tuning.ts`'s numbers, so they can't drift from the game: the
      streak in the bar's "×2" notation, the clearing bonus, and the lives.
    - The controls in a table: mouse, touch and keyboard.
    - The bricks, capsules and balls, each a section named by its heading,
      with every entry's name and sentence from the catalogs and its
      picture from the board once the scene has drawn.
  - `src/app/settings/`: the settings drawer, as Snake's, with the speed,
    how a finger steers (Drag, or Follow the finger) and the palette.
    `SettingsService` keeps how a finger steers under
    `brick-breaker-settings`, version 1, dropping anything else. The board
    hands the scene the setting in place of its `"drag"` constant.
  - `app.component` lays out the four dialogs, binds the bar's Levels, How
    to play and Settings, and counts each dialog as covering the board, so
    the board takes the focus back as the last one closes.
- **Choices.** Each part waits for the step that brings what it needs:
  - **Every level is open until B10.** Progress (`brick-breaker-progress`)
    and records come in B10.1, and with them the Levels dialog's locks,
    ticks and bests and the result card's best and "New best!".
  - **`SettingsService` came early, with how a finger steers only.** The
    setting needs a home now that the settings drawer offers it. The plan
    puts the service in B10.1, so B9 adds the sound to it and B10 the
    speed, which a run carries until then.
  - **The result card's first button depends on the outcome.** Trying
    again from the last level after a win would replay it alone, so a won
    run offers a new game from where it started.
- **Found while building.**
  - The dev server stopped while `settings.component.ts` existed without
    its template. It was restarted once both were written.
  - A template drops the space between two elements, so the level buttons
    were first named "1Blasts". `&ngsp;` keeps it.
- **Browser check** on the dev server:
  - How to play showed all 21 pictures (7 bricks, 11 capsules and 3 balls)
    beside their names, and the scoring read as written.
  - The settings drawer marked Normal and Drag as chosen.
  - The Levels dialog marked level 1. Choosing Pyramid started a run at
    level 3, closed the dialog and gave the board the focus.
  - With the run ended on level 5 from the page, the result card read
    "Out of lives on level 5, at Normal speed": score 12340, level 5,
    cleared 2. The focus was on "Try again from level 5".
  - Choose a level put the card away and opened Levels. Closing that left
    the Ended card on the board and the focus on the board.
  - At 375 × 553, the Levels, How to play and the settings each fit the
    window, with nothing scrolling sideways. The console stayed clean.
- **Specs.**
  - `levelsCleared()`: four cases.
  - `SettingsService`: five.
  - The settings drawer: nine, including starting no run at the speed in
    use and the finger setting.
  - How to play: ten, including the scoring sentences, each catalog's
    count, and a picture beside its name.
  - The result card: eight, covering lost and won, the figures, each
    button, and Choose a level.
  - The Levels dialog: six, including backing out of the question.
  - The board: a finger follows where the settings say. It fails against a
    board that hands the scene `"drag"`.
  - The app: each dialog opened from the bar, Levels from the result card,
    the focus back after the settings close, and the level paused as a
    dialog opens.
- **Checks.** `yarn verify`: lint, typecheck, test (Brick Breaker's 1,424),
  build. The first run failed only at Prettier on the settings template,
  which was formatted.

## B8.1's review (adb6aebb, with 16336def)

The reviewer proved findings 1 and 2 by running code: a scratch copy, a
jsdom probe, and a page in Chrome. Every finding was taken. B8.2 was built
before these fixes, and they came after its commit.

1. **Space on a card's button still did nothing in a real browser.**
   `keepKey()` stopped only the keydown. The keyup still reached Phaser,
   which cancels a captured key's keyup, and a browser clicks a button at
   Space's keyup. B7.2's specs couldn't see it, because user-event sends no
   key code and Phaser's capture reads one. **Fixed:**
   - The three card buttons keep their keyup too, and a comment says why.
   - The two specs now send Space with its key code, down and up. They hold
     that neither is cancelled and that the scene hears nothing. Removing
     either binding fails both.
   - In the browser pane, a real Space on the focused Resume went on with
     the level and handed the board the focus.
   - The scene's guard for Enter on a button over the field went, with its
     spec. No key from a card's button reaches the scene now, so the guard
     couldn't fire.
   - The board's keys description says a card's button takes Space and
     Enter itself.
2. **The "no streak" spec couldn't fail.** A `term` takes no name from its
   content. **Fixed:** it checks the terms shown, as the narrower bars'
   spec does.
3. **Leftovers from Snake's bar.** **Fixed:** the unused `compact` host
   class and the `lives` class went.
4. **The lives as shown were never checked.** **Fixed:**
   - A roomy bar draws a heart for each life. That spec finds them as
     icons, since they are hidden from a screen reader.
   - On each narrower bar, the number shows 2 after a life is lost.
   - At 340 × 700, the link home leads the menu.
5. **The app's wiring of the bar was untested.** **Fixed:**
   - The level pauses as the focus leaves the board for the bar.
   - The bar's Resume, pressed from the keyboard, hands the board the
     focus. The first version passed without the wiring, since the board
     kept the focus. It now starts from the bar's button, and fails
     without `(handBack)`.
6. **The bar's class comment opened with three sentences.** **Fixed:** one
   sentence, then the details, with "the lives to six".
7. **`fitsActionLabels`'s comment gave one game's reason.** **Fixed:** it
   says only what it measures.
8. **`ThemeService.mode`'s comment read two ways.** **Fixed:** it changes
   with `role()`'s colors, a moment after `current`.
9. **The light-mode spec started light.** **Fixed:** it starts on Midnight
   blue.
10. **`fieldPalette`'s spec missed what it was for.** **Fixed:**
    - A spec holds the tints light after a dark palette is chosen but not
      yet on the page. Reading the mode from `current` would fail it.
    - The palette is taken off the page after each spec.
    - The roles are shared with the board's spec from
      `src/testing/roles.ts` (`ROLES`, `paintRoles()`).
11. **AGENTS.md's "It keeps the scene's pictures" read as `fieldPalette`.**
    **Fixed:** "The board keeps…", the paragraph rewrapped, and the keys
    sentence says down and up.
12. **The level and the streak were hidden two ways.** **Fixed:** `streak`
    depends on the multiplier alone, and the template hides both under
    `fitsEveryFigure()`.
13. **`tally`'s comment.** **Fixed:** null until a level of this run is
    cleared.

- **Mutants.** Each of these failed the specs: dropping the keyup or the
  keydown binding, a `(handBack)` that does nothing, and (from B8.2's
  log) a board that ignores the finger setting.
- **A slip, put right.** For the binding mutants I wrote the backup from
  Windows Python to `/tmp`, which is `C:\tmp` there and not Git Bash's
  `/tmp`. The restore found nothing, and the template was left with no
  bindings. It was put back by hand, its diff checked against the last
  commit, and the backup file removed. `C:\tmp` already existed, and was
  left as it was.
- **Checks.** `yarn verify`: lint, typecheck, test (Brick Breaker's 1,431),
  build. The first run had one failure, in Snake's result spec ("shows the
  score, the best and the snake's length" saw 2, 2 and 5 for 1, 1 and 4).
  That spec passed four times alone, as did Snake's whole suite, and the
  next full run was clean. It is flaky under load, and on the list for the
  user.

## B9: sound

- **Built:**
  - `tools/build-sounds.mjs` writes the ten sounds with `@fz/dev/sounds`
    into `src/scene/sounds/sounds.wav` and `sounds.json` (3.81 s, 121,964
    bytes). `yarn build:sounds` runs it, and two runs write the same bytes.
    - The sounds are a paddle's bop, a wall's tick, a brick's knock, a
      broken brick's blip, steel's clang, a blast's boom, a capsule's two
      rising notes, a bolt's zap, a lost ball's falling tone, and a level's
      four-note chime.
    - Their names and order are the view's `SOUNDS`, which the scene's
      spec holds the spritemap to.
  - `src/rules/events.ts`: a `FieldEvent` carries `streak`, which
    `hitBrick()` sets on a `broken` event, itself counted. The scene plays
    the events after the frame's steps, when the streak may have moved on
    or ended.
  - `src/view/effects.ts`:
    - `SOUNDS` and `SoundName`.
    - `detuneOf()`: a broken brick's blip rises 100 cents for each brick of
      the streak past the first, up to an octave.
    - `FrameSounds` gathers a frame's sounds and plays each once, at the
      highest pitch it was heard at.
  - `src/scene/bricks_scene.ts`: a `SpritePlayer` named `bricks-sounds`
    plays each event's sound. It follows the new `sound` option every
    frame, so the game is muted while the settings want no sound.
  - `SettingsService` keeps `sound`, on by default. A setting stored
    before it existed is read as on.
  - The bar's Sound button, pressed while sound is on, sits after Pause
    and keeps the focus on the board, as Pause does. On a compact screen
    it is the overflow's first item, "Turn sound off" or "Turn sound on".
  - The settings drawer's Sound checkbox, "Play sounds", copied from
    Snake's along with its styles.
  - The board hands the scene the setting.
- **Choices:**
  - **One of each sound a frame, at its highest pitch.** A blast or a fire
    ball can break a dozen bricks in a frame. Stacking a dozen blips makes
    the sound louder rather than richer, and the highest pitch is the
    streak as the frame left it.
  - **The chime for an extra life and a new best waits for B10.** Neither
    is a field event. A life gained from points is the run's, and a best is
    the records', which B10 brings. The scene will hear them then, through
    an option as it hears the setting.
  - **`SettingsService` gains the sound now**, and B10 adds the speed, as
    the B8.2 entry says.
  - **A capsule's Extra life plays the caught notes.** It is a capsule
    caught like any other, and the chime is kept for what the run does.
- **Specs:**
  - The rules: the streak a broken brick carries, itself counted (it reads
    the last event, so it fails if the streak is left at 0).
  - The view: `detuneOf()` at no streak, along one and at the top, and
    `FrameSounds` playing a sound once at its highest pitch, then
    forgetting it.
  - The scene:
    - the spritemap's sounds in `SOUNDS`' order;
    - a sound heard when wanted and the game muted when not;
    - the shards still flying before the sounds have loaded.
  - The settings: sound on by default, a stored sound kept, and settings
    stored before the sound existed read with it on.
  - The bar: Sound pressed while on, turning it off, keeping the focus,
    and the overflow's item on a compact screen.
  - The drawer: turning the sound off.
  - The board: muted when the settings say so. It fails against a board
    that always asks for sound.
- **Checks.** `yarn verify`: lint, typecheck, test (Brick Breaker's 1,451),
  build, clean on the first run.

## B8.2's review (aaa53ef1, with 8bed5b3d)

The reviewer checked out the two commits from `git archive` and ran a
mutant for each finding marked as tested. Every one of those mutants
passed the specs it should have failed.

1. **The result card's specs couldn't tell the level reached from the
   first.** Every lost run ended on its first level, and the won one
   started on the last. Five mutants passed: Try again always starting a
   new game, the label, the lost subtitle and the Level figure reading the
   first level, and the won subtitle reading the level reached. **Fixed:**
   - The rules gain `levelsOf()`, which numbers the levels of a list of
     sets; `LEVELS` uses it.
   - `testing/play.ts` gains `TWO_SETS`, two sets of a blasts level each
     (a run won in two levels), `clearToNext()`, and a levels argument to
     `provideSpecLevels()`.
   - The lost run clears level 1 and is lost on level 2: "Try again from
     level 2", "Out of lives on level 2", Score 4400, Level 2, Cleared 1.
   - The won run goes from level 1 to level 2: "From level 1 to the last",
     Level 2, Cleared 2, and New game starts at level 1.
   - Each of the five mutants fails now.
2. **"Leaves the board as a dialog opens, pausing the level" tested the
   bar.** The click moving the focus paused the level, not the dialog, and
   another spec covers that. **Fixed:** removed.
3. **Only the settings were proven to cover the board.** **Fixed:**
   - "Goes back to the board once … closes" runs over Levels, How to
     play and Settings.
   - A spec goes from the result card to Levels and closes it, and the
     board has the focus.
   - Dropping `levelsOpen()` or `helpOpen()` from `covered` fails each.
4. **One set of levels couldn't test grouping by set.** **Fixed:**
   - The dialog's spec lists `TWO_SETS` under "First" and "Second".
   - The full list of the spec levels is its own spec.
   - `sets` groups the levels once, in a `Map` by set id, whose local name
     no longer shadows the member.
   - Putting every level in one set fails.
5. **The marked level was the run's first.** **Fixed:** the run goes on to
   level 2, and "2 Wide" is current. A mark hard-coded to 3 fails.
6. **The Ended card's New game kept its keys unspecced.** **Fixed:** a
   third spec fires Space down and up on it. Both stay uncancelled, and no
   run starts, though Space on an ended run starts one when the board has
   it. Removing the two bindings fails it.
7. **Only a brick's picture was checked.** **Fixed:** a brick, a capsule
   and a ball, each by its catalog name. Capsules without their pictures
   fail.
8. **The controls left out Space for going on.** **Fixed:** "P; Esc
   pauses, and Enter or Space goes on". The touch steering cell says
   "Drag anywhere on the field, or, in the settings, have the paddle
   follow your finger".
9. **The catalog list was written out three times.** **Fixed:**
   - A `catalogs` view model lists each catalog's id, heading, heading id,
     introduction (the capsules' only) and entries.
   - One `@for` renders them.
   - The placeholder `<span class="picture">` is gone: the words take the
     second column with `grid-column: 2`, picture or not.
10. **Two `TOUCH_STEERINGS` of different types.** **Fixed:**
    - `view/steering.ts` exports `TOUCH_STEERINGS` and `isTouchSteering()`,
      as `speed.ts` has `SPEEDS` and `isSpeed()`, with specs.
    - The settings reader uses the guard, so its copy of Snake's `oneOf()`
      is gone, and nothing needs lifting into `@fz/core`.
    - The drawer's list is `TOUCH_CHOICES`.
11. **"Last, so it opens over…" was wrong.** `<fz-dialog>` opens with
    `showModal()`, so a dialog stacks over those opened before it,
    wherever it sits in the page. **Fixed** in Brick Breaker by removing
    the comment. Snake, Minesweeper and Sudoku carry the same comment, and
    are on the list for the user, outside this game's commits.
12. **Docs nits.** **Fixed:**
    - The subtitle's comment: "Where the run started or ended".
    - AGENTS.md's long lines are rewrapped, with `levelsOf()`, `TWO_SETS`,
      `clearToNext()` and the touch steering guard named.
    - The bar's dialog `it.each` has one column.
    - `ThemeService.mode`'s comment is two plain sentences.
13. **The settings drawer's styles are a fourth copy.** **Not done here.**
    A mixin in `@fz/game-ui` would change four games' drawers at once,
    which is a lift of its own. It is on the list for the user.

- **Browser check.** How to play lists 7 bricks, 11 capsules and 3 balls,
  each with its picture, under one template. The capsules' introduction
  shows, and the words sit in the second column. The console stayed clean.
- **Checks.** `yarn verify`: lint, typecheck, test (Brick Breaker's 1,464),
  build, clean on the first run.

## B10.1: the records, the progress and the speed kept

- **Built:**
  - The rules:
    - `progress.ts`: `isOpen()` (the first level, any level cleared, and
      the one after a level cleared, at any speed) and `clearedOf()`, which
      keeps the stored ids a level still has.
    - `gainedLifeByPoints()` in `run.ts`: whether a frame's points brought a
      life, as opposed to a capsule's.
    - `pointsOf()` in `scoring.ts`: a tally's lines added up.
  - `src/app/stats/`:
    - `StatsService` under `brick-breaker-stats`: each speed's runs, best
      score and furthest level, and each level's best points at each
      speed.
    - `ProgressService` under `brick-breaker-progress`: the ids of the
      levels cleared.
    - Both readers keep each part that makes sense and drop ids no level
      has.
  - `SettingsService` keeps the speed. The first run starts at it, and
    `changeSpeed()` keeps the new one.
  - `GameService`:
    - It counts a run at its first serve.
    - As a level clears, it keeps the level cleared and its points as its
      best at the speed. A won run's last level counts too.
    - As a run ends, it keeps the score and the level reached, and says
      "A new best!" when the score beats the best.
    - `best`, `newBest` and `chimes`: the count goes up for a life the
      points brought, and for a new best as its card opens.
  - `GAME_LEVELS` and `GAME_RANDOM` moved to `src/app/play/tokens.ts`. The
    records services need the levels and the game service needs the
    records, so keeping them in `game.service.ts` would make a cycle.
  - The scene takes `chimes()` and plays the level cleared's chime each
    time the count goes up. It notes the count as it is made, so a chime
    called for before it began is never played.
  - The Levels dialog:
    - A tick beside a cleared level's number.
    - Under its name, its best at the speed in play, "Cleared" when its
      best is at another speed, or "Locked".
    - A locked level is `aria-disabled` and drawn with a dashed outline,
      its words as legible as an open level's. Choosing it does nothing.
  - The result card shows the best at the run's speed among its figures,
    two by two, and "New best" with the trophy, as Snake's does.
- **Choices:**
  - **No best in the bar, against the plan.** With a six-figure score and
    best and six hearts, the game's name had no room left. At 1200 px it
    was 38 px short. At 1280 px, where the wordmark takes over, it was
    95 px short, and the name shrank to "B.". The best is on the result
    card and on each level in the Levels dialog. Showing it in the bar
    only above about 1400 px would need a breakpoint of the game's own.
  - **A level's best is its own points**, bricks, streaks and bonus, as
    its card added them up, not the run's score at the time.
  - **A cleared level stays open**, as well as the one after it, so a set
    reordered by a later version never locks a level the player cleared.
  - **A run counts from its first serve**, as Snake's counts from its
    first direction. Only a run's first level starts as "ready".
  - **The chime for a new best sounds as the card opens**, not as the run
    ends, where it would sound over the lost ball's falling tone. A
    capsule's Extra life keeps the caught notes, as B9 chose.
  - **The game service doesn't refuse a locked level.** Only the dialog
    offers levels to choose. Try again and New game start where the run
    reached or started, which is always open.
- **Specs:**
  - The rules: `isOpen()` (5), `clearedOf()` (5), `gainedLifeByPoints()`
    (4) and `pointsOf()` (1).
  - `StatsService` (11) and `ProgressService` (5), with stored data that
    half makes sense, and another version.
  - `SettingsService`: the speed, kept and read back.
  - `GameService`, "the records" (13):
    - the speed from the settings, and a new one kept;
    - a run counted once, at its first serve;
    - the next level opened and the level's best kept;
    - a new best kept and said, and none for a score of 0;
    - the best of the run's own speed;
    - the new best forgotten as the next run begins;
    - the chime as a new best's card opens;
    - the chime for a life by points, on a two-level game whose first
      level is six rows of blast bricks (about 28,000 points in one
      chain);
    - no chime for a capsule's life.
  - The scene: the chime played as the count goes up, none for a count
    from before it began, and a broken brick's sound at its streak's
    pitch. A spy on `SpritePlayer.prototype.play` records each sound as
    it is played, since the sprite can't load headless.
  - The Levels dialog: the locks, a locked level that can't be chosen, a
    best, and "Cleared" for a best at another speed.
  - The result card: the best among the figures, and "New best" or not.
- **Mutants.** Twelve, each run against its specs:
  - Eleven failed at once: a cleared level not kept open, no run counted,
    no level kept cleared, no level best kept, no speed kept, no chime for
    a points life, no chime for a new best, a new best never forgotten,
    the scene chiming for old calls, a locked level chosen, and a worse
    level score kept.
  - The twelfth, the best read from Normal whatever the speed, passed.
    The spec "gives the best of the run's own speed" now fails it.
- **Browser check** on the dev server:
  - The bar at 1200 and 1280 px, measured as above.
  - With two levels cleared, one with a best at another speed, the Levels
    dialog read "1 Stripes Best 5230", "2 Gifts Cleared" and "3 Pyramid",
    then "Locked" from 4 on. Each tick, outline and the run's own mark
    showed.
  - The result card with a new best: the trophy, "New best", and Score,
    Best, Level and Cleared two by two. At 375 × 553 nothing scrolls
    sideways and the first button is in view; the card scrolls within
    itself.
- **Checks.** `yarn verify`: lint, typecheck, test (Brick Breaker's 1,516),
  build, clean on the first run.

## B9's review (0f11461d, with 52abf4be)

The reviewer worked in a `git archive` copy and ran a mutant for each
test finding. Every one passed the specs.

1. **No spec showed a sound played, or its pitch.** The scene's specs
   checked only the mute. Three mutants passed: no sounds played, no
   event's sound heard, and every detune 0. **Fixed in B10.1's commit
   (9e960ade)**, which needed the same spy to spec the chime:
   - `SpritePlayer.prototype.play` records each sound and its detune as it
     plays.
   - "Play a broken brick's, risen along its streak" expects
     `[["broken", 400]]` at a streak of 5.
   - Each of the three mutants fails it now.
   - The B9 entry's "a sound heard when wanted" overstated the mute spec,
     which only a scene that always mutes would fail.
2. **The won card couldn't tell the run's first level from level 1.**
   52abf4be's won run started on level 1. A subtitle hard-coded to level
   1 passed the whole suite, and New game at level 1 passed the result
   spec. **Fixed:**
   - `TWO_SETS` is now Blasts and Again, then Last.
   - The won run starts on level 2 and wins on 3: "From level 2 to the
     last", Score 8200, Best 8200, Level 3, Cleared 2, and New game at 2.
   - Both mutants fail.
3. **"Allocates nothing" was no longer true.** Phaser makes a sound object
   for each sound played, and `FrameSounds` iterated a `Map`. **Fixed:**
   - `FrameSounds` holds each sound's rise in an array by its place in
     `SOUNDS`, walked by index. Hearing and playing make nothing, and the
     sounds play in the sprite's order (specced).
   - `update()`'s comment says Phaser makes a sound object for each sound.
   - The shared config's comment says why one serves: Phaser copies it as
     the sound starts.
4. **`lastEvent()` returned slot 0, which no event wrote, before the
   first.** **Fixed in the log:** `forEachSince()` starts at serial 1 at
   least, so no reader sees that slot, with a spec. `lastEvent()` keeps
   only the latest event, not an array.
5. **"Turn sound on" in the menu was unspecced.** **Fixed:** Snake's spec,
   ported. A menu that always offers "off" fails it.
6. **The drawer never showed a stored "off".** **Fixed:** two specs, the
   box unchecked where the settings keep the sound off, and a click turning
   it back on. A box always checked fails both.
7. **The ways a finger steers were written out three times.** **Fixed:**
   - `TOUCH_STEERINGS` is `as const`, and `TouchSteering` comes from it.
   - The drawer maps it over `TOUCH_INFO`, a `Record<TouchSteering, …>`,
     as it maps `SPEEDS` over `SPEED_INFO`.
   - A new way to steer fails to compile until the drawer describes it.
8. **The capsules' introduction was unspecced.** **Fixed:** a spec finds
   it in the Capsules section. `intro: null` fails it.
9. **Nits:**
   - **Fixed:**
     - The comments that opened with two sentences (`playSound`, `play`,
       `FieldEvent.streak`) open with one.
     - The bar's long comment line is wrapped.
     - The Sound button's icon is a `soundIcon` view model.
     - `isTouchSteering()` "Returns whether".
   - **Not done: merging the Sound and Levels blocks.** Tried, and the bar
     lost both buttons: `<fz-game-bar>` projects `[fzBarActions]`, and
     Angular projects a block into a named slot only while the block has
     one root element. A comment above them now says so.
   - **Not done: lifting `arpeggio()` into `@fz/dev/sounds`.** It repeats
     Snake's chime. The lift touches Snake's sounds, so it joins the
     drawer-styles lift on the list for the user.
   - **The B9 entry overclaimed.** The highest pitch is the streak as the
     frame left it only if no paddle bounce ended the streak within the
     frame. Playing at the highest is still the choice.

- **Checks.** `yarn verify`: lint, typecheck, test (Brick Breaker's 1,522),
  build, clean on the first run.

## B10.2: the saved game

- **Built:**
  - `src/rules/saved_game.ts`:
    - `saveGame()` keeps a run in play or paused with its level's bricks:
      each brick's hits, whether it is broken or shown, and the steps its
      blast and its regrowth are due at. With them go the field's step and
      draw counts, its streak points and how far the speed has climbed.
    - A run whose level was just cleared is kept as the next level, not
      yet begun. A run waiting for its first serve, or one that has ended,
      keeps nothing.
    - `restoreGame()` reads it back, paused, under a new id. It drops a
      level the game doesn't have under that number, a field whose bricks
      don't fit the level, and any number out of its range: lives, a
      score below the points banked, the next life's mark, a brick's hits,
      streak points beyond the level's.
    - `takeUpField()` lays what was kept over a new field of the level,
      and counts the bricks it still needs again.
  - `SavedGameService` under `brick-breaker-game`, as Snake's:
    - It writes as a level starts, as a ball is served, as the run pauses
      or goes on, and as the page goes away, never at a step.
    - It forgets a run that has ended.
    - `main.ts` starts it before the board first shows, and it takes up
      the run kept.
  - `GameService`:
    - `saved()` and `takeUp()`, which lays the bricks over the new field
      and says "Your last run is paused on level 1, Stripes, with a score
      of 50 and 2 lives. Press Enter to go on." (`describeTakenUp()`).
    - `launch()` sets `serving` at once, rather than at the next frame, so
      the serve is kept as it happens.
- **Choices:**
  - **A lit blast and a regrowth carry over.** The kept steps are against
    the field's own count, which is kept too, so a blast lit before the
    reload goes off, and a brick regrows, at the step it would have.
  - **The speed's climb and the draws carry over,** so a level taken up is
    as fast as it was, and its capsules fall as they would have.
  - **`loseBall()` in `testing/play.ts` waits only while the last ball lost
    is off the field.** It used to wait for `serving`, which, with a ball
    already in play, read true until the next frame. With `serving` now
    false at once, it waited out a whole loss first, and the bar's lives
    specs lost two balls.
- **Specs:**
  - The rules (27):
    - nothing kept for a run waiting, ended, or at a level the game
      doesn't have;
    - a run in play and its bricks kept;
    - a cleared run kept as the next level;
    - a round trip to a paused run with a new id, and one to a level not
      yet begun;
    - seventeen kinds of stored data left out;
    - the bricks, points and counts laid over a new field, and a level not
      yet begun left as laid.
  - `SavedGameService` (14): kept as the first ball is served, not at a
    step, at a pause, after a ball lost, as the page goes away, and as the
    next level after a clearing; nothing kept for an ended or waiting run;
    taken up paused with its bricks, announced, under an id of its own, the
    next run's id past it; and left out when it can't be trusted or is in
    another shape.
  - `GameService`: no longer serving once the ball is launched.
- **Mutants.** Fifteen, each run against its specs:
  - Thirteen failed at once.
  - Two passed. Dropping the check on the next life's mark passed because
    the spoiled value also fell below the first mark. Dropping the id
    counter's update passed because only the run after the taken-up one
    shows it.
  - A spec for each now fails them: the mark passed, the mark before the
    first, and the next run's id.
- **Browser check** in headless Chrome, as the app's pane was hidden and
  its frames stood still:
  - On level 1, a launch, five seconds of play and a pause kept score 50,
    2 lives and brick 100 broken.
  - After a reload: paused, score 50, 2 lives, brick 100 broken with its
    gap in the pink row, the ball on the paddle, 77 bricks needed, run id 2,
    and the announcement above.
  - Resume and a launch played on.
- **Checks.** `yarn verify`: lint, typecheck, test (Brick Breaker's 1,564),
  build. The first run failed the rules' coverage floor (100% of
  statements): three guards and the restore of a level not yet begun had
  no spec. Four specs cover them.

## B10.1's review (9e960ade, with d6ae2cc3)

The reviewer found no bug in what the game does. Eleven of their
seventeen mutants passed every spec, though, and the closed Levels dialog
did needless work.

1. **A won run's last level was never shown to be kept.** **Fixed:**
   "keeps a won run's last level cleared, with its best" (`last`,
   `{ normal: 4100 }`).
2. **Every record was specced only at Normal.** Three mutants passed: the
   Levels dialog, the level best and the run count, each read or kept at
   Normal. **Fixed:**
   - The game service keeps the records at Fast, from the settings: one
     run and `{ fast: 4100 }`.
   - The Levels dialog, after `changeSpeed("fast")`, shows the Fast best
     of two.
3. **The new-best chime's condition was unproven.** **Fixed:** a run lost
   with 0 points calls for no chime as its card opens.
4. **"A run counts from its first serve" was unproven.** **Fixed:** no
   run is counted before the first serve.
5. **"A level's best is its own points" was unproven.** **Fixed:** on
   `TWO_SETS`, clearing levels 1 and 2 keeps 4100 for Again, not the run's 8200.
6. **Every spec had the best equal to the score.** **Fixed:** the stats
   keep a best of 600 through a 500. The result card shows a best of 9000
   that a 4400 run fell short of, without "New best".
7. **The scene's "each time" spec could not catch a chime every frame.**
   **Fixed:** one call, two frames, another call: exactly two chimes.
8. **The closed Levels dialog rebuilt its grid at every point.**
   `<fz-dialog>` keeps its content live, and `sets` read the whole run for
   its speed. The reviewer counted 9 rebuilds over 8 score changes, and 1
   with the speed read on its own. **Fixed:** `GameService.speed`, a
   computed that changes only with a run. The Levels dialog, the settings
   drawer, the bar's badge and `best` read it.
9. **Stale or loose comments.** **Fixed:**
   - AGENTS.md describes `TWO_SETS` as two sets of two levels and then
     one.
   - The result card's class comment names the best and "New best".
   - `chimes` counts since the page loaded.
   - `takeIn()` "keeps the records".
   - `Settings.speed` is the last run's, at which a visit's first run is
     played.
   - The plan's bar no longer lists the best, and says where it shows.
10. **Names.** **Fixed:**
    - `ProgressService` imports the rule as `isLevelOpen`.
    - `StatsService.changeSpeed()` is `changeSpeedStats()`.
    - The scene plays `CHIME`, which `view/effects.ts` exports, with a
      line saying what shares it.
11. **`FrameSounds` dropped a detune of -1 or below.** **Fixed:** "unheard"
    is `Number.NEGATIVE_INFINITY`, with a spec that plays a sound lowered
    by 100 cents.
12. **The tick and the trophy were unspecced.** **Fixed:** each is
    checked by its icon, with a comment that the words beside it tell
    assistive technology the same.
13. **Two choices, challenged. Not changed:**
    - **A best on the Ready card.** The Ready card is about the serve, and
      shows at every ball. The best is a target for the end of a run, on
      the result card, and per level in the Levels dialog.
    - **The status in the tile's name, rather than a description.** The
      name is the tile's visible text, in order, which voice control
      matches from its start ("3 Steel"). A description would take two ids
      per tile and leave the name short of what the tile shows.
14. **A folder cycle through the tokens.** **Fixed:** they moved to
    `src/app/tokens.ts`, so `stats/` and `play/` no longer import each
    other's folder.

- **Also:** `describeTakenUp()`, from B10.2, gains a spec of its own.
- **Mutants.** The reviewer's eleven survivors, and the negative detune,
  were run again: each fails now.
- **Checks.** `yarn verify`: lint, typecheck, test (Brick Breaker's 1,575),
  build, clean on the first run.

## Q4: the whole shell

Checked on the dev server in the DevTools MCP's headless Chrome, at
1240 × 900, as a phone (390 × 844 at 3×, touch) and at 1440 × 900. The
storage started empty. Keys and clicks were real events; a level cleared,
the last life and the place of a lost ball were set from the page.

- **The tab order.** The board comes first, then the link home, the speed's
  badge, Pause, Sound, Levels, New game, How to play and Settings, then the
  board again.
- **The dialogs, by keyboard.** Enter opens Levels, How to play and the
  settings, and Escape closes each.
  - The focus lands on the close button, or on How to play's scrolling body.
  - The focus comes back to the board each time.
- **The dialogs, by mouse.** Each opens from the bar and closes from its
  close button, handing the board the focus.
  - A locked level's tile does nothing when clicked.
  - The question before New game, and before a speed from the badge's
    menu, takes the focus.
  - Cancel, or Escape, keeps the run, paused, and the board takes the focus.
- **The settings,** changed by mouse, and still the same after a reload:
  Fast, Follow the finger, no sound, and Soft pastel.
- **The records and the progress.** Level 1 was cleared at Fast with 50
  points and a ball lost.
  - The level's best is 1,050, and Stripes is in the levels cleared.
  - The run kept is level 2, not yet begun.
  - After a reload, the run is paused on level 2, Gifts, and the announcer
    says so. Levels shows level 1 with its tick and "Best 1050", level 2
    open and marked as the run's, and levels 3 to 10 locked.
- **The end of a run.** With one life left, the ball was lost on level 2.
  - The result card shows the trophy, "New best", Score 1050, Best 1050,
    Level 2 and Cleared 1, two by two.
  - The focus is on Try again from level 2.
  - Fast's record is one run, best 1,050 and furthest level 2.
  - The saved game is gone.
  - Escape puts the card away, leaving the Ended card, and Enter starts a
    new run on level 1.
- **A run in play kept.** One brick was broken, then the ball was lost.
  After a reload, the run is paused at 50 points and two lives, that brick
  broken, 77 still needed, and the ball waits on the paddle.
- **The bar.**
  - **On a phone,** the bar holds the link home, the badge, the score over
    the lives, Pause, New game and More actions. Nothing scrolls sideways.
  - More actions holds "Turn sound on", Levels, How to play and Settings.
    Turning the sound on from there stores it.
  - The Levels dialog fills the phone, two tiles across.
  - **At 1440,** the wordmark, the three figures and every action fit, with
    their labels.
- **The palettes.** Soft pastel (light) and Midnight blue (dark): screenshots
  of the field in play, the Levels dialog and the result card.
- **The console** stayed clean through four loads: no errors, no warnings.
- **Notes, nothing changed.**
  - A sound turned on from the overflow menu leaves the focus on More
    actions, as a menu does, rather than on the board, which Sound in the
    bar keeps.
  - Scores show without a thousands separator on the bar, the result card,
    the Levels tiles and in what the announcer says ("1050"), as Snake's do.
    How to play writes its numbers with one ("1,000 points"). This is a
    question for the user.

## B11.1: the Steel set

- **Built.** `src/rules/levels/steel.json`, levels 11 to 20, as the plan's
  table names them, at a pace from 1.06 to 1.12 and a capsule chance of
  0.12. `LEVEL_SETS` holds it after Basics.
  - Narrow first falls on Pillars, Fire on Shelf, Fast on Minefield and the
    Blast capsule on Hidden, as each one's `from` says.
  - The catalog spec's list of capsules still to come is gone, since every
    capsule now falls. Its list of brick kinds holds only the regrowing
    brick, which Tricks brings.
- **Tuning.** The report's single play of each level, from its number,
  swung from 0:29 to 5:17 on the same level, as the capsules a seed lets
  fall decide much of it. So `yarn report:levels --seeds <n>` now plays each
  level from n seeds of its own, and prints the middle time, the longest,
  the longest endgame and the most lives lost. `playLevel()` takes a seed
  for it, its number by default, with a spec.
- **What the tuning changed.**
  - **The bricks the autopilot left for last** sat where a ball seldom goes:
    - above the steel, reached only up a channel one cell wide;
    - in a vault's inner corners, beside its walls;
    - above the post between the Cage's doors.

    A probe printed the endgame's bricks for each seed, and each map was
    redrawn so nothing a level needs hides there:
    - Pillars has three pillars, with gaps above them, rather than four
      against the walls.
    - The Cage holds two blocks, each over its own door.
    - The Vault's treasure sits straight above its door, with its inner
      corners empty.

  - **Steel under the bricks traps the ball above it,** which clears a
    level fast. Shelf has tougher rows over a shelf with an empty row above
    it.
  - **The Vault was the easiest of the set at first,** with its gifts'
    capsules. As the set's test, it has heavier walls of bricks around it.
- **Where it ended,** the middle of 15 seeds at Relaxed, Normal and Fast:

  | #   | Level     | Relaxed | Normal | Fast |
  | --- | --------- | ------- | ------ | ---- |
  | 11  | Pillars   | 1:53    | 1:50   | 1:41 |
  | 12  | Shelf     | 2:06    | 1:40   | 1:21 |
  | 13  | Fuse      | 1:06    | 1:04   | 0:48 |
  | 14  | Minefield | 1:53    | 1:42   | 1:26 |
  | 15  | Hidden    | 2:00    | 1:53   | 1:57 |
  | 16  | Corridors | 1:54    | 1:27   | 1:27 |
  | 17  | Cage      | 1:39    | 1:50   | 1:38 |
  | 18  | Lanterns  | 2:30    | 2:31   | 2:15 |
  | 19  | Gears     | 1:52    | 1:26   | 1:19 |
  | 20  | Vault     | 3:23    | 3:11   | 2:17 |
  - The first set's middles run from 1:06 to 2:52, so the sets match in
    length while the pace rises.
  - The Vault, the set's test, is the longest.
  - Fuse keeps the plan's map, so it is the shortest: the fuse takes three
    rows at once.
  - The longest endgame of any seed is 1:28, on Shelf at Fast. The spec's
    own seeds all finish within a minute.
  - The autopilot lost no lives on any seed.

- **Checks.** Lint, typecheck and test in the workspace (Brick Breaker's
  1,641), and the references check. AGENTS.md names the set, the report's
  option and the catalog spec's shorter list.

## B10.2's review (cb7b4d43, with 089163a3)

The reviewer found no bug in what a normal run does. They proved five things
by running them:

- a ball lost before a reload isn't given back;
- a save at a level's first serve is taken up;
- a confirmed New game forgets the old run;
- a run taken up is counted once;
- a lit blast goes off after the take-up.

The specs were the weak spot: 20 of their 21 mutants passed the whole suite.

1. **Most of `takeUpField()` could be deleted unnoticed.** **Fixed:**
   - The rules spec's level now holds a hidden brick, hit, and another not
     hit, a regrowing brick, a blast brick and steel. Its played field has a
     lit fuse, a regrowth due, a streak, a climb, draws, and a life gained
     and one lost.
   - The take-up spec saves the field taken up and expects what the field
     played saves.
   - A second spec checks the points, the lives and the bricks still
     needed.
   - The service's spec loses a ball, reloads, goes on and keeps two lives.
     It also sets off a fuse lit before the reload.
2. **No spec took up a save made before anything scored.** **Fixed:** a
   service spec serves, reloads and expects the run paused.
3. **The take-up announcement was never spoken.** `takeUp()` runs from the
   app's initializer, before `<fz-announcer>` exists, so the region arrived
   with its words in it. Snake, Minesweeper and Sudoku take up their games
   the same way. **Fixed in `@fz/ui`:**
   - `AnnouncerComponent` starts empty when words were said before it was
     in the page.
   - It says them once it has been there `ARRIVAL_MS` (100 ms).
   - What is said later shows at once, as before.

   A spec renders it after the service spoke, and reads it empty, then
   speaking. The library's `AGENTS.md` says so.

4. **The reader took states no run comes to.** **Fixed.** `restoreGame()`
   now also drops:
   - a level with nothing it needs left;
   - a breakable brick broken with hits left, or whole without any;
   - steel kept broken;
   - a brick hidden whose kind doesn't hide, or hidden once hit;
   - a fuse on a brick that doesn't blast, or isn't broken;
   - a regrowth on a brick that doesn't regrow;
   - a level kept as not begun, with points or lives on it;
   - a next life off the ladder: `run.ts`'s new `nextLifeAfter()` works it
     out from the score;
   - a count too large to step by one (`Number.isSafeInteger`).

   The cells' kinds are still not stored. A level redrawn under the same id
   fails these checks wherever a cell's kind changed in a way its state
   shows, and the version would change before any such redraw.

5. **Nine guards were unproven.** **Fixed:** a spoiled case for each, every
   new guard's own, and a round trip at six lives.
6. **Two of the service's promises had no spec.** **Fixed:**
   - "forgets a run thrown away for a new one".
   - "doesn't write the run as it scores", played on the Few level until it
     scores.
7. **A reload rescues a ball already past the paddle. Not changed.**
   Decision 16 puts the ball back on the paddle, so a reload can rescue any
   ball heading for a miss, not only one already past. Guarding only the
   last 2.5 units would leave that open, and would end a run on a reload
   without its record. It is a question for the user.
8. **Readability.** **Fixed:**
   - The effect no longer tracks `level()`, which every level change
     already changes through `outcome` or `runs`.
   - `restoredField()` returns `{ field }`, or null when it can't be
     trusted.
   - `SavedGame.speed` is a `Speed`.
   - `neededLeft()`, in `bricks.ts`, counts the bricks still needed for
     `createField()` and the take-up alike.
   - The take-up loop walks the cells.
   - The scene's imports are in ASCII order again.
   - `EVENT_EFFECTS.cleared` plays `CHIME`, which is declared above it.
9. **Docs.** **Fixed:**
   - What It Keeps names the draws, the climb and the streak's points.
   - `AGENTS.md` says the run is forgotten once it ends or another begins.
   - The service's comment is down to when it writes.
10. **B10.1's `speed()` in the Levels dialog is unspecced.** `speed()` is
    worked out from the run, so it always equals `run().speed`. The change
    only spares the grid a rebuild at every point, which no public
    behaviour shows. It stays unspecced.
11. **A run waiting for its first serve isn't kept,** so a level chosen and
    not yet served is lost on a reload. That is intended: nothing was played,
    and the level is one click away in Levels.

- **Mutants.** The reviewer's twenty survivors were run again: each fails now.
  So do ten mutants of the new guards, including one that hides every
  hidden brick and one that keeps none shown.
- **Checks.** `yarn verify`: lint, typecheck, test (Brick Breaker's 1,673,
  `@fz/ui`'s 182, Snake's 395), build, clean on the first run.

## B11.2: the Tricks set

- **Built.** `src/rules/levels/tricks.json`, levels 21 to 30, as the plan's
  table names them, at a pace from 1.12 to 1.20 and a capsule chance of
  0.14. `LEVEL_SETS` holds it last.
  - The regrowing brick first comes in Garden, on the plan's map.
  - Finale is a trophy, with a grid of tints: an amber cup on a violet
    stand.
  - Every brick kind is now used, so the catalog spec's waiting list is
    gone.
- **What the tuning changed,** from a probe of the bricks each slow
  endgame was left with, as in B11.1:
  - **Spiral, drawn as a closed spiral,** was never cleared: the ball
    doesn't travel along a corridor two rows tall. It is now an outer arm
    with an inner hook. The centre is open from below, and no bricks sit
    in the corridor under the outer arm.
  - **Hedge maze** had two rows of hedges, which kept regrowing across the
    corridors. It has one row now, with a gap in each hedge.
  - **Keep** had its walls' corners in channels one cell wide, behind the
    gates. Its wall now spans the field, and the gates guard only the
    middle.
  - **Finale's stem** sat on the steel base, boxed in by regrowing bricks.
    The stem stands clear of the base, and the steel handles enclose
    nothing.
  - **Storm's steel** sits in its top row, where it hides nothing.
- **Where it ended,** the middle of 15 seeds, at Relaxed, Normal and Fast:

  | #   | Level          | Relaxed | Normal | Fast |
  | --- | -------------- | ------- | ------ | ---- |
  | 21  | Garden         | 1:17    | 1:35   | 1:19 |
  | 22  | Hedge maze     | 1:45    | 1:33   | 1:18 |
  | 23  | Low bridge     | 0:49    | 0:53   | 1:02 |
  | 24  | Hourglass      | 1:37    | 1:49   | 1:47 |
  | 25  | Chain reaction | 2:04    | 1:49   | 1:39 |
  | 26  | Fog            | 1:25    | 1:28   | 1:19 |
  | 27  | Spiral         | 1:00    | 0:53   | 0:51 |
  | 28  | Keep           | 2:44    | 2:52   | 2:06 |
  | 29  | Storm          | 1:04    | 1:03   | 0:57 |
  | 30  | Finale         | 2:49    | 2:51   | 2:11 |
  - Keep and Finale are the longest, and Finale has the set's highest pace.
  - Low bridge and Storm read short. Their bricks reach low, so they ask for
    quick reactions, which the autopilot, reacting at once, doesn't feel.
    Their blast bricks and capsules clear them fast.
  - The spec's own seeds all finish their endgames within a minute.
  - A few other seeds take a little longer, up to 1:08 on Finale at Fast.
  - The autopilot lost no lives.

- **Checks.** `yarn verify`: lint, typecheck, test (Brick Breaker's 1,734),
  build. AGENTS.md names the set and the catalog spec's full check.

## B11.1's review (e58b8c5b, with 702a6e44)

The reviewer found no bug in a real run. A probe kept, read back and took
up the field every 23 steps of autopilot play on every level: no state was
refused, and none came back changed.

1. **Three Steel levels ran past a minute's endgame on other seeds.** Shelf
   took 1:28, Corridors 1:15 and the Vault 1:03, over 20 seeds. **Fixed in
   the maps, and the report now shows it:**
   - **Shelf** keeps its columns at the walls empty.
   - **Corridors** has 2s at the corridors' tops, and corridors a row
     shallower.
   - **The Vault** has empty cells beside its shell's top.
   - **The Tricks levels** got the same treatment:
     - Hedge maze's corridor tops are plain bricks.
     - Hourglass's neck is one cell wide, so it shades less of the top
       half.
     - Spiral's centre has a plain top row.
     - Finale's rim and the cup's tip take three hits.
   - **The report:**
     - Both modes mark an endgame over the limit with `!`.
     - A single play of each level, the spec's own game, fails on one, as
       the spec does.
     - `--seeds` counts them but fails only on a level not cleared. Across
       many seeds a few plays are unlucky however a level is drawn.
   - **Over 20 seeds** (1,800 plays), 7 now run past a minute, the longest
     1:24 on Hourglass at Relaxed. None of them leaves the same bricks for
     last.
   - **The spec still plays one seed.** The suite already takes minutes,
     and the tail it would catch is luck, not a hidden brick.
2. **No spec kept a brick grown back or a blast gone off.** **Fixed:**
   - A spec takes each up.
   - A new spec plays a crowded level of every brick that changes in play,
     keeping it every 50 steps, reading it back and taking it up, and
     expects each to come back as it stood. Mutants dropping the taking up
     of `shown`, `regrowsAt` or the climb fail it.
3. **The announcer delayed any words present as a region arrived,** so a
   region arriving later, such as a dialog's under `@if`, would repeat old
   words. **Fixed in `@fz/ui`:**
   - `AnnouncerService` notes whether the words were said before any region
     was in the page (`early`).
   - `<fz-announcer>` waits only for those.
   - Once a region has said them, they are no longer early.
   - The service's spec and the component's cover each case, and four
     mutants fail.

   Whether 100 ms is enough for a screen reader during the page's load is
   unchecked: no screen reader runs here.

4. **The not-begun check was tested only as a whole.** **Fixed:** three
   cases from a run kept as cleared, adding only points, only a life gained,
   or only a life lost.
5. **The announcer spec held two cycles.** **Fixed:**
   - It is split.
   - Brick Breaker's app spec renders the app as `main.ts` starts it, over
     a stored run, and reads the take-up in `<fz-announcer>` after
     `ARRIVAL_MS`, which `@fz/ui/announcer` now exports.
6. **The plan's Pillars map was stale.** **Fixed:** it shows the three
   pillars with gaps above them.
7. **`restoredField()` returned a three-way result.** **Fixed:**
   `restoreGame()` checks a level kept as not begun itself, and
   `restoredField()` returns the field or null.
8. **`nextLifeAfter()` repeated the ladder.** **Fixed:** `withScore()` takes
   the next life from it, and gains a life for each mark passed.
9. **Spec readability.** **Fixed:** `base` for the state every expected
   brick builds on, and the counts taken apart from the bricks.
10. **The report's style.** **Fixed:**
    - `ONE_PLAY` is typed `Layout`.
    - `cellsOf` takes a `ReadonlyArray`.
    - Each speed's columns are `cells`.
    - The seeds' stride is `SEED_STRIDE`.
11. **The autopilot loses no lives,** so the report measures length, not
    difficulty. **Not changed:** a slower-reacting autopilot would show the
    ramp, which is a question for the user.

- **Checks.** `yarn verify`: lint, typecheck, test (Brick Breaker's 1,740,
  `@fz/ui`'s 189), build, clean on the first run.

## B12.1: the layout check

- **Built.** `tools/check-layout.mjs`, Snake's adapted to the field, and
  `check:layout` in `package.json`. The root's `yarn check:layout`, and so
  CI, now runs it.
  - It serves the build and opens it in headless Chrome, at
    `@fz/dev/layout`'s shapes and at 320 × 480, and turned from upright to
    its side and back, each at 2×.
  - **The library's own checks:** no error, no scrolling, and the bar's
    controls in the window.
  - **The canvas:** it reaches `data-state="ready"` and draws at its size
    times the pixel ratio.
  - **The field** (`data-field`): 26 units by 30 and inside the window,
    where the placeholder drew it, within a pixel, and inside the focus
    ring.
  - **The card** lies on the field.
- **Deviation.** The plan asked for a unit of 10 CSS px, or 8 at 320 × 480.
  On the small phone on its side (568 × 320), the field's 30 units of
  height leave 9.5 at most. So the floor is 8 wherever the window is under
  360 CSS px either way.
- **The placeholder's check is real.** In the browser, after the scene had
  drawn, the placeholder's field stayed laid out, only hidden, half a
  pixel from the scene's.
- **The scripts' type-check** takes the DOM's types, as Snake's does, for
  the inspection that runs in the page.
- **Checks.** `yarn check:layout` holds at every shape and turn. Lint,
  typecheck, the references and the constraints pass. Docs: Brick
  Breaker's `AGENTS.md` and the frontend's.

## Q5: the full pass

Checked in the DevTools MCP's Chrome. The build ran under `yarn preview`, in
a context of its own with empty storage. The dev server ran where a check
needed to reach into the page. Nothing was found to fix.

- **Every level of set 1, and 20 and 30, at every speed, by every input.**
  108 levels played on the dev server.
  - **Keys and mouse.** Three runs, one per speed, each through levels 1 to
    10 by Next level, then 20 and 30 begun from Levels. Keys and mouse took
    turns level by level, and swapped places on Normal.
  - **Touch.** The same three runs again, with the window a 412 × 915 phone
    with touch. Follow the finger was used on Relaxed and Drag on Normal and
    Fast.
  - **What each level checked.**
    - The ready card ("Tap to launch." on the phone).
    - The paddle steered left: by the arrow key held; by the mouse moved to
      a fifth of the field; and by the finger, to where it lifted when
      following, or as far as it moved when dragging, within 0.6 units.
    - The ball launched by Space, a click or a tap.
    - The level cleared, every needed brick broken through the rules' own
      `hitBrick()`.
    - The Cleared card, then Next level by Enter or by its button.
  - **How the input was given.** It was DOM events, which is all Phaser and
    the board read. A touch has to carry `pageX`, which Phaser reads and
    Chrome's `Touch` doesn't derive.
  - **The end of each run.** Level 30 ended it with "Every level cleared!"
    and the speed's new best.
  - **The best.** The runs given up at level 10 for a new game don't count
    toward it, as `recordEnd()` keeps only ended runs.
- **AZERTY.** A key goes by its place (`event.code`), as the plan decided.
  - AZERTY's Q (`KeyA`) moves the paddle left, D right, and Z (`KeyW`)
    launches.
  - The keys labelled A and W there do nothing.
  - **Note.** The help and the board's description name the keys by
    QWERTY's labels ("A or D", "W"), as Snake's name W, A, S and D. A
    question for the user, across the games.
- **Tabs switched mid-level.** A second DevTools tab doesn't hide the page,
  so `document.hidden` was set and `visibilitychange` sent, with a ball in
  flight.
  - The run paused at once.
  - Nothing stepped while hidden: the steps and the ball stood still.
  - Back, it waits on the Paused card with the board focused.
  - Enter goes on, and the announcer says "Going on."
- **The context lost and restored** (`WEBGL_lose_context`) mid-level.
  - No error, and the canvas stays ready.
  - `bakeAtlas()` draws the atlas again, and the field was drawn whole after.
- **The palettes** on the build, with every level opened through the stored
  progress.
  - Vault and Finale in Soft pastel, then Finale switched live to Casino
    night from the settings, the atlas baked again in it. All three were
    sent to the user.
  - **Note.** Casino night's accent is the trophy's amber, so Finale's two
    gift bricks nearly vanish into it but for their capsule marks. This is
    the gift-accent question from Q3.
- **The accessibility tree** on the build.
  - **The board** is an application named "Brick Breaker, level 1:
    Stripes", described by the keys, with its card's text inside.
  - **The bar** is a banner holding the heading, the speed's menu button,
    the three figures and named buttons, Pause disabled until the ball is
    launched and Sound pressed.
  - **The live region** is polite.
  - **Levels** is a modal dialog of three regions, Basics, Steel and
    Tricks, each with its heading and ten buttons named by number, name and
    state ("2 Gifts Locked").
  - **How to play** is a modal dialog: its input table has column and row
    headers, then the Bricks, Capsules and Balls regions with their
    headings.
  - **Note.** The set headings and the bar's labels come through upper
    case, as CSS sets them, as in the other games.
- **Lighthouse** on the build, desktop and mobile.
  - Accessibility 100, best practices 100.
  - SEO 92 and the agents' audit fail only on `/robots.txt` and `/llms.txt`,
    which the preview answers with the game's page. The site serves its own
    in production.
- **The performance trace.** On the dev server, slower than the build, at
  Chain reaction: eight balls in flight, the blast ball's chains and their
  shards, and three capsules falling.
  - **Unthrottled,** Phaser's whole frame, update and render, takes 0.3 ms
    at the median and 1.4 ms at worst.
  - **With the CPU throttled six times,** wall times measure where Chrome's
    throttler suspends the thread, not the work. The render, 0.2 ms
    unthrottled, read 21 ms.
  - **The trace's CPU time per frame** over the same seconds is 0.49 ms at
    the median, 3.05 ms at p95 and 5.77 ms at worst. Those frames each ran
    up to 12 steps to catch up.
  - **Against the plan's bar of 4 ms at ×6,** the median and p95 pass. The
    worst frames of a blast chain are over it, at about 8 ms by the
    unthrottled worst times six, but inside a 60 fps frame. Left as it is
    and noted for the user.
- **The bundle,** gzipped: the entry 95.1 kB, the scene 9.8 kB and the
  `phaser` chunk 353.9 kB. The entry imports no Phaser; it reaches the scene,
  and through it Phaser, only by `import()`.
- **The console** stayed clean on both pages through every check.

## B11.2's review (819b2427, with 71b26f09)

The reviewer played the Tricks levels from 40 seeds each, ran mutants
against the specs, and probed the announcer with a spec of its own.

1. **Hourglass hid its last bricks in the neck's shadow.** The one-cell
   steel neck shaded column 6 of the top half from below. Every endgame over
   30 s ended on those bricks, the worst taking 2:06. **Fixed in the map:**
   - Column 6 is empty in the four rows above the neck, from the row of 2s
     down. The top row of 3s still spans it.
   - Over 40 seeds, one play of 120 runs past a minute (1:23 at Relaxed).
   - **A probe of the bricks each long endgame left** (the autopilot noting
     them for a moment, then put back):
     - **Hourglass:** none under the top row in column 6 now. The 8
       endgames over 30 s mostly end on the middle of the top row of 3s, the
       last row the ball reaches.
     - **Hedge maze:** its 19 spread over all three corridors, beside their
       regrowing gates, which are the level's trick.
     - **Spiral:** the cluster the reviewer named. 6 of its 8 end on (3, 7),
       above the hook's steel bar, but only one play reached the limit, at
       exactly 1:00. **Left as it is, and worth watching.**
   - **The worklog was wrong** to say no long endgame left the same bricks
     for last: 20 seeds had caught only one of Hourglass's.
2. **The announcer decided whether to wait as a region was made.** Words
   said after that, but before it rendered, arrived with it unannounced, and
   stayed early for a later region to say. **Fixed in `@fz/ui`:**
   - `early` is a signal now, which the region reads as it renders.
   - Words said before its first render wait as early words do.
   - A spec renders a page whose region is made before something speaks,
     and expects it empty, then speaking after `ARRIVAL_MS`.
   - **No app took that path:** each says its early words from
     `provideAppInitializer`.
3. **Brick Breaker's app spec didn't check the wait it names.** **Fixed:** a
   spec expects the region empty as the app renders over a stored run.
   - Mutants of a region that never waits, and of nothing early, now fail
     it.
4. **The round trip played far less than it claimed.** In 2,000 steps it
   broke 2 needed bricks, and never lit a fuse, built a streak, made a draw
   or lost a ball. **Fixed:**
   - **The crowd** is in a set of its own whose bricks draw for capsules,
     over a row of blast bricks the ball sets off at once.
   - **The paddle** meets the ball off its middle, by a cycle of four, and
     from take 150 keeps away until a ball is lost.
   - **The takes** come every 7 steps, sharing no factor with a fuse's 12,
     300 of them.
   - **The spec expects every state** a take-up must keep to have been
     reached: a fuse lit, a ghost shown, a regrowing brick broken and grown
     back, a tough brick worn, streak points, draws and a ball lost.
   - Mutants dropping the taking up of `goesOffAt`, `streakPoints` or
     `draws`, or refusing a lit fuse, now fail this spec on its own.
5. **The round trip checked only the field.** It saved the original run
   again, and its run and field came from different speeds and seeds.
   **Fixed:**
   - It saves the run taken up again.
   - The field is made from the run's speed and `levelSeed()`, as the game
     makes it.
   - A mutant restoring one life now fails it.
   - Restoring no life gained survives. No life is gained in this play, so
     that mutant changes nothing here, and other specs cover gaining one.
6. **The docs were stale after the redraw.** **Fixed:**
   - **The plan's table** now has Hedge maze's corridors behind regrowing
     gates, and Finale "at the game's top pace" rather than "the hardest".
   - **Finale** is not the longest by the report: Keep is.
     - "The hardest" isn't something the report can measure, since the
       autopilot loses no lives.
     - Finale has the game's top pace, 1.2. Lengthening it again would bring
       back the slow endgame its 3-hit rim fixed.
     - A question for the user.
   - **The Vault**, in B11.1's review, also gained a row of 2s, and six 2s
     became 3s. That was 26 hits more than that entry said.
   - **Every level over 40 seeds** (3,600 plays, middle times):
     - All 3,600 plays cleared, and no life was lost.
     - 16 ran past a minute's endgame: Shelf, Corridors, Cage, the Vault
       (twice), Hedge maze (twice), Hourglass, Spiral and Storm. That is
       0.44%, as before.
     - The Vault's longest play is 7:26 at Relaxed, under the 8-minute limit.

   | #   | Level          | Relaxed | Normal | Fast |
   | --- | -------------- | ------- | ------ | ---- |
   | 20  | Vault          | 2:27    | 2:14   | 2:08 |
   | 21  | Garden         | 1:36    | 1:26   | 1:19 |
   | 22  | Hedge maze     | 1:31    | 1:18   | 1:06 |
   | 23  | Low bridge     | 0:49    | 0:53   | 1:02 |
   | 24  | Hourglass      | 1:41    | 1:34   | 1:06 |
   | 25  | Chain reaction | 2:19    | 2:02   | 1:38 |
   | 26  | Fog            | 1:30    | 1:22   | 1:21 |
   | 27  | Spiral         | 1:08    | 1:13   | 1:13 |
   | 28  | Keep           | 2:50    | 2:52   | 2:14 |
   | 29  | Storm          | 1:00    | 1:07   | 1:01 |
   | 30  | Finale         | 2:14    | 2:03   | 1:52 |

7. **The announcer's bookkeeping was public, and `early` a getter.**
   **Fixed in part:**
   - `early` is a readonly signal, as `message` is.
   - `notePlaced()` and `noteEarlyWordsSaid()` say that only
     `<fz-announcer>` calls them. They stay on the service that holds what
     they change (B12.1's review corrected the reason first given here).
8. **`@fz/ui`'s `AGENTS.md` said a later region "says" the last words.**
   **Fixed:** it holds them from the start, so it doesn't say them again.
   The two spec names match.
9. **A mutant keeping `early` once set survived.** **Fixed:** a spec counts
   words said after early ones, once a region is in the page, as not early.
10. **`withScore()` could take a life away** for a run whose next life lay
    past its score. **Fixed:** the marks passed are never fewer than none.
    A spec holds it, and fails without the floor.
11. **`ReadonlyArray<AutopilotReport>` in the report.** **Not changed:** the
    JSDoc type parser rejects `readonly AutopilotReport[]` as a function
    type's parameter (`jsdoc/valid-types`), as it did when it was written.
12. **The report's summary could run into the table.** **Fixed:** a blank
    line comes before the summary whenever there is one.
13. **A not-begun case mixed two stored runs.** **Fixed:** it takes the
    score from the cleared run it changes.

## B13.1: the screenshots

- **Built.** `tools/capture-screenshots.mjs`, Snake's adapted, as
  `yarn capture:screenshots`.
  - It writes `public/docs/screenshots/brick-breaker/preview.webp` (2560 × 1440) and `thumb.webp` (576 × 324, the field and a margin), through
    `writeSiteImages()`.
  - `index.html` names the preview as its link preview, with its type, size
    and alt text, as Snake's does.
- **The run shown is kept by the rules.** `keptRun()`, in
  `src/testing/kept_run.ts`, begins a run at a level and breaks or wears the
  bricks it names through `hitBrick()`, as a ball would, then keeps it with
  `saveGame()`.
  - The script loads it through Vite's `runnerImport()`, as the report loads
    the autopilot, and stores it with the saved game's version.
  - So the run is always one the game's reader takes up, however the rules
    change. Its spec takes one up, checks the bricks and the points, and
    expects it to throw for a level or a place with none.
- **The picture.** Rocket at Normal, on Classic felt, at 1280 × 720 and 2×.
  - It shows a bite out of the rocket's foot, three of its flames and a
    brick of each fin broken, and two fin bricks worn.
  - The score reads 950.
- **Deviation.** The plan asked for the run taken up paused, as Snake's is.
  The Paused card lies in the middle of the field, over the rocket's foot,
  where the broken bricks are.
  - So the script presses Resume once the run is taken up.
  - The ball then waits on the paddle under the card that says how to
    launch it, which lies low on the field, clear of the rocket, and names
    the level.
  - The script fails unless the run was taken up paused, at its score, and
    then went on.
- **Checks.**
  - Lint, typecheck (the script's in-page code included), formatting and
    the references pass.
  - Brick Breaker's suite passes with its floors (1,748).
  - The build carries both images under `docs/screenshots/brick-breaker/`.

## B13.2: the game's docs and skills

- **`AGENTS.md`** describes the game as it stands, as Snake's does.
  - It no longer says the game is being built.
  - The layers are a table of what each may import.
  - Layout ends with `src/testing/` and `tools/`.
  - **New sections.** "The Field" holds the principles: the scene follows
    the game, the board is an application, Phaser's input is the board's,
    the level waits for the player, the colors are the palette's and the
    inks', the placeholder works the field out in CSS, and motion follows
    the player's preference. "Styling" and "In This Repository" (the
    screenshots, the toolbar's color, accessibility) come after it.
  - Tests lists what `src/testing/` holds, `kept_run.ts` among it, and
    points at the skills.
  - That the site serves the game at `/play/brick-breaker/` waits for
    B14.1, which puts it in the site's catalog.
- **`README.md`** describes the game, its sets, kinds and capsules, and
  every script, as Snake's does. It says the game will be played at its
  address once the catalog holds it, which B14.1 makes so.
- **Two skills** in `.agents/skills/`, linked into `.claude/skills/` with
  `node .agents/link-claude-skills.mjs`:
  - **`brick-breaker-testing`:** the commands and the floor, the setup,
    fields drawn as pictures, the levels and the autopilot, the saved
    game's round trip and its states, the view's art and contrast, the
    scene's `FakeShell`, and the shell's small levels and helpers.
  - **`brick-breaker-content`:** what adding a level, a set, a capsule, a
    new kind of effect, a ball kind, a brick kind or a brick trait takes.
    It covers the files, the records the compiler holds complete, what the
    saved game must keep for a trait, and the checks.
    - It lists what the levels so far showed makes an endgame drag: bricks
      above steel, a one-cell channel at a wall, an enclosure's inner
      corners, a corridor two rows high between steel, and bricks shaded by
      a single steel cell.
    - It notes that the screenshots keep a run on Rocket by its bricks'
      places.
- **Checks.** Formatting and the references pass; every path and name the
  docs cite was read back from the code.

## B13.3: the lists that name the games

- **Named now:**
  - **`.agents/AGENTS.md`:** the stack, the layers of `AGENTS.md`, the
    workspaces' skills folders, and the apps' testing skills.
  - **`frontend/AGENTS.md`** and **`frontend/games/AGENTS.md`:** the games'
    folders. The ports were already there, 9004 Brick Breaker's and 9005 the
    next game's.
  - **`frontend/lib/dev/AGENTS.md`:** the dev servers' ports.
  - **`docs/operations.md`:** the games that began here.
  - **The root `README.md`:** the workspace's dev server.
  - **`phaser-core`:** the games built on `@fz/phaser`, their layers, how a
    game takes the scene's time, and its scene spec as a worked example.
  - **`fuzzley-ui`:** the apps that adopt the libraries, and the contrast
    specs.
  - **`web-game-accessibility`:** the `AGENTS.md` files, a board that moves
    by itself, and the choice of pace.
  - **`angular-testing`:** the workspaces and the apps' testing skills.
- **Left for B14.1,** which puts the game in the site's catalog. Each says
  what the site serves, which isn't so until then:
  - `.agents/AGENTS.md`'s list of the games at `/play/<slug>/`;
  - `docs/operations.md`'s "Games";
  - the root `README.md`'s games and their local addresses;
  - the game's own `README.md` and `AGENTS.md` line on where it is played.
- **Nothing else names the games:** the CI workflow, its scripts and the
  site's `AGENTS.md` list none.
- **Checks.** Formatting and the references pass.

## B14.1: the site

- **The site builds and lists it.**
  - `frontend/site/games.json` has the workspace.
  - The catalog has Brick Breaker in Arcade, after Snake: "Bounce the ball,
    break every brick, and keep it off the floor.", for one player, 10
    minutes, added 2026-10-30, played at `/play/brick-breaker/`.
  - Its thumbnail and preview are the build's own screenshots, by the slug.
  - The site's description names it.
- **The docs held back in B13.3** now say where it is played: the
  repository's `AGENTS.md`, `docs/operations.md`, the root `README.md`, and
  the game's `README.md` and `AGENTS.md`.
- **Checks.** `yarn verify` passes: every workspace's tests, 6,872 in the
  Solitaire Collection's and 1,748 in Brick Breaker's among them. The
  site's build copies the game, adds its analytics tags, and finds the
  catalog's name in its `game.json`. `yarn check:layout` holds for all
  three games that have one.

## B12.1's review (b2dff36a, with 525d05a5)

The reviewer ran the layout check with what it measured printed, mutants
against the announcer, the round trip and `catchUp()`, and the level report
over 40 seeds, which reproduced the table exactly.

1. **The region's `arrived` signal did nothing.** Its timer set it, then at
   once `noteEarlyWordsSaid()` made the words not early, for good, so
   `arrived` was never true while they were. **Fixed in `@fz/ui`:**
   - The region says nothing while the words are early, and its timer only
     notes them said.
   - Its docs, the service's and `@fz/ui`'s `AGENTS.md` say words said
     before any region has rendered wait, which covers words said after one
     was made but before it rendered.
2. **`withScore()` moved the next life's mark back** for a run whose next
   life lay past its score. A later mark then paid a life the run had
   already passed, with the chime. No stored run reaches it, as
   `restoreGame()` holds the mark to the score. **Fixed:** the mark is never
   moved back, so the marks passed are never fewer than none. The spec
   holds the mark as well as the lives.
3. **The layout check's floor was looser than it needs to be, and its
   comment wrong.** Only a short window brings the unit under 10: 320 × 480
   gives 11, and 568 × 320 gives 9.5. **Fixed:**
   - The floor is 9 in a window under 360 CSS px tall, and 10 elsewhere.
   - The comment gives 568 × 320's 9.5 as the case.
   - The game's `AGENTS.md` and the plan say so.
4. **Some of the inspection's checks passed when their element was
   missing.** **Fixed:**
   - A missing placeholder or card is a problem, as a missing ring was.
   - The selectors are scoped to the board, since `.card` also matched the
     dialogs' cards.
   - The placeholder is held to the field's height too.
   - The inspection's doc names everything it checks, and the header is
     rewrapped.
   - A probe with the selectors broken reported both elements missing at
     every shape.
5. **Three copies of the layout check's runner.** Sudoku's, Snake's and
   Brick Breaker's share their command line, usage and `main()`, and
   Snake's and Brick Breaker's their shapes too. **Not changed:** a runner
   in `@fz/dev/layout` that takes each game's `inspect()` would touch
   Sudoku and Snake. It is left as a follow-up, beside the settings
   drawer's and `arpeggio()`'s lifts.
6. **The round trip's helpers.** **Fixed:**
   - `FIELD_WIDTH` replaces the bare 26.
   - The paddle goes to the wall across the field from the ball. Its
     mirror, `26 - x`, met a ball near the middle.
   - `AIMS` and `PLAYED_STATES` are readonly.
   - The play still reaches every state. The reviewer's mutants give the
     same verdicts: the round trip kills all but dropping the score, the
     lives lost or the bricks needed, which `takeUpField()`'s own spec
     kills.
7. **The reason given for leaving the announcer's bookkeeping public was
   wrong.** `@fz/ui`'s `exports` map blocks deep imports, so a second
   injectable that `index.ts` doesn't export would be out of the apps'
   reach. **Not changed:** the two calls stay on the service whose state
   they change, documented as the region's alone. A class of their own
   would guard two calls at the cost of splitting one small service. The
   B11.2 review's entry now says so rather than give the wrong reason.
8. **The worklog said column 6 was empty above Hourglass's neck "from the
   top row down".** The top row of 3s spans it. **Fixed:** the entry says
   the four rows above the neck, from the row of 2s down.
9. **An app spec raced the region's 100 ms wait.** It passed only if
   `render()` finished first. **Fixed:** `renderTakingUp()` fakes
   `setTimeout` and `clearTimeout`, and the case after it moves them on by
   `ARRIVAL_MS` rather than waiting. A region that never waits, nothing
   early, and early words never said each fail the app spec.
10. **No spec took a region away before its wait was over.** **Fixed:** a
    spec takes one away, lets the moment pass, and expects the next region
    to start empty. Without `clearTimeout()` it fails.

- **Checks.** The announcer's 19 specs, the run's, the round trip's and the
  app's pass, and the layout check holds at every shape and turn.
