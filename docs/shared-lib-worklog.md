# Work log: what the games can still share

The log of `docs/shared-lib-plan.md` as it is built: what each step built,
where it went other than planned and why, what was measured, and each review
comment answered, taken or not. It is deleted once every step is built and
merged.

## How the work is running

- **The branch.** Every phase on `shared-lib`, cut from `main` at
  `72ecbcf4`, its first commit the plan and this log.
- **Side by side.** The steps run in five tracks, each in a git worktree of
  its own under `../fg-wt/`, on a branch cut from `shared-lib`, grouped so no
  two tracks edit the same files where it can be helped:
  - `sl-shell`: F4, F6, F7, 1.1, 1.2, 4.4, 4.6, 4.7, 4.9 and 4.10, the
    shells' scripts, services and head tags.
  - `sl-frame`: 4.1, 4.2 with 4.3, 4.8 and 4.5, the shells' frames,
    settings and How to play, in templates and Sass.
  - `sl-play`: 1.3, 1.5, 2.1 to 2.6 (F2 with 2.2), 3.1 to 3.3, the rules,
    views and scenes of the games drawn with Phaser, and `@fz/core` and
    `@fz/phaser` under them.
  - `sl-tools`: 1.4, 3.4, F5 and Phase 5, the lint presets, the specs'
    helpers and the scripts. 3.4 joins 1.4 here, since both change
    `phaserGameLayers()`'s file.
  - `sl-sol`: Phase 6. 6.4 waits for `sl-frame`'s `choice-list` and
    `segmented` mixins (4.2's step 1 and 4.5).
- **Each step** is built and staged in its worktree, reviewed there by a
  fresh agent as the `commit-review-process` skill says, its comments
  answered, and committed there, then picked onto `shared-lib`, where its
  log entry joins it. A track that needs another's work resets onto
  `shared-lib` once its own commits are all picked.
- **The order on the branch** is the order the steps finish in, not the
  plan's numbering, since the tracks touch different files. Each phase ends
  with `yarn verify`, `yarn check:layout` and the touched games played.

## The steps

### Step F7: Sudoku's list-in-words helper renamed `inWords`

Built as planned on `sl-shell`. Sudoku's private `listOf` in
`src/rules/describe.ts`, which writes "1, 3 and 8", is now `inWords`, so it
no longer shadows `@fz/core/json`'s `listOf`, which `saved_grid.ts` beside it
imports to read a stored list. That is the declaration and its five callers,
with the body and the words unchanged. Sudoku's 592 tests pass.

The review:

1. _No findings._ The reviewer checked that the rename is complete, that the
   words stay pinned by `describe.spec.ts`, and that no doc or skill named
   the old helper.

### Step 1.3: `RunStart extends RunNumber`

Built as planned on `sl-play`. Snake's, Brick Breaker's and Asteroid
Breaker's `RunStart` now extend `@fz/core/run_numbers`' `RunNumber`. The
`id` and `seed` fields they spelled out are gone, two lines a game. The
import is a type alone, so nothing stored, seeded or drawn changes.
`lib/core/AGENTS.md`'s `run_numbers` entry now says each game's `RunStart`
extends it. Lint and typecheck are clean in all three games. Their tests
pass: Snake 421, Brick Breaker 1829 and 180, Asteroid Breaker 3630 and 1620.

The review:

1. _No findings:_ the reviewer found the change type-only, within the rules'
   fence, and the docs true as they stand.

### Step F6: the inner `version: 1` dropped from Minesweeper's and Sudoku's saved games

Built as planned on `sl-shell`. Minesweeper's `saveField()` and Sudoku's
`saveGrid()` no longer write a `version` of their own, and `restoreField()`
and `restoreGrid()` no longer check one, since the saved game's
`writeVersioned()` already versions the whole entry. The readers pick out the
keys they name, so an entry an earlier build stored still reads, which a new
spec in each game holds. The rules' "another version" cases went with the
check. Minesweeper's 373 tests and Sudoku's 592 pass.

The review:

1. _A rollback past this commit loses the games in progress, so write that
   down:_ taken. A build from before this one refuses the field or grid this
   one writes, and its `SavedGameService` forgets the entry as it deals a
   fresh game, so moving `live` back past this commit loses every Minesweeper
   and Sudoku game in progress once, on its first load. The commit's body
   says so. The way around it the reviewer offered, which stops checking now
   and stops writing in a later release, was not taken: it isn't worth it
   for a game in progress.

### Step 1.4: one rules fence for the games without Phaser

Built as planned on `sl-tools`. `@fz/dev/eslint` exports `gameRules()`,
`RULES_FENCE` and `deterministic()` over `src/rules/**`, and Minesweeper's
and Sudoku's `eslint.config.js` each take it in place of 27 hand-written
lines. `phaserGameLayers()` takes the rules' blocks from it, so the two
can't drift. Neither game's rules break the stricter fence. Four specs of
`gameRules()` join `@fz/dev`'s 461 passing; Minesweeper's 373 and Sudoku's
592 pass.

Where it went other than planned:

- The rules' specs are now free of the import fence, as the Phaser games'
  are; the hand-written fence covered them too. They need it: they import
  the pictures under `testing/`, which the new fence refuses.
- `deterministic()`'s messages say "a game" for "a run" and "what the scene
  or the shell hands them", since a game without Phaser has no scene.
- `@fz/dev`'s `AGENTS.md` gave Minesweeper's fence as a workspace's own; it
  now gives the Solitaire Collection's tier fences.

The review:

1. _The game docs read as if the fence covered the rules' specs:_ taken.
   Minesweeper's, Sudoku's and `@fz/dev`'s `AGENTS.md` now put "but its (their)
   specs" on the whole fence.
2. _`games/AGENTS.md` picked `gameRules()` by a test the Phaser games pass
   too:_ taken. It now says "for one drawn without Phaser".

### Step 6.1: the canvas's own cards in the Solitaire Collection

Built as planned on `sl-sol`, as `0dd6975c`. F1 was confirmed by reading
the compiled cascade: `fz-phaser-canvas:not([data-state=loading]) >
[fzCanvasPlaceholder]` (0,2,1) sets `opacity: 0; visibility: hidden` on the
overlay, which the game's `.loading-overlay[_ngcontent]` (0,2,0) never sets
back, so the failed words were hidden from sight and from the accessibility
tree. `<fz-canvas-cards>` now sits beside the canvas in a
`board-card-layer()` inside the chrome's insets, a size container, stacked
by a new `--z-board-cards` above the scrim. `isSlow`,
`hasInitializationFailed` and their branches went; the spec finds the alert
and the status by role and holds the alert outside the placeholder. 6875
tests pass.

Where it went other than planned:

- The loading badge stands aside, hidden rather than removed so its status
  region stays, while the canvas shows a card and once the board isn't
  loading. The card and the badge are both centred on the board, so the
  card would otherwise sit on the badge. On an ordinary deal the empty badge
  now goes at once rather than fading with the scrim.

The review:

1. _The badge blinks back in as a slow board turns ready:_ taken. The
   badge is aside whenever the board isn't loading too, so `.hidden` holds
   while the overlay fades; two specs pin it, one after a slow load.
2. _The phaser-core skill's list of games leaves out the Solitaire
   Collection:_ taken. It says every game drawn with Phaser, the
   solitaire-phaser skill names the cards, and the canvas stylesheet's top
   comment counts the cards among what keeps inside the insets.

### Step F4: Brick Breaker's How to play pictures encoded only while it is open

Built on `sl-shell`. Brick Breaker's scene no longer encodes How to play's
pictures at each bake. It hands the shell what encodes them as it is first
called, keeping them until the next bake. The board's `pictures` is a
`computed()` over that, and the app's `helpPictures` asks for them only while
How to play is open, as Asteroid Breaker's scene, board and app do. New specs
in the scene's, the board's and the app's spec files hold this. Brick
Breaker's 1835 and 180 tests pass.

Where it went other than planned:

- The plan names only the app's binding. Asteroid Breaker's way depends on
  the scene encoding lazily, though: had the binding alone changed, the scene
  would still have encoded at every bake. So `src/scene/bricks_scene.ts`, its
  spec and `src/app/board/board.component.ts` changed too. Those files are in
  `sl-play`'s area (2.2, 3.2), though in different hunks.

The review:

1. _Both scenes now copy the lazy pictures, and the plan still lists them
   among the ways Asteroid Breaker's scene differs:_ taken. The plan's line
   under "A base scene class" no longer names lazy pictures. The copy meets
   the bar for a lift, so it is lifted into `@fz/phaser/scene` as step F4b.
2. _The spec docs say only the board's spec runs the real scene:_ taken.
   `AGENTS.md` and the `brick-breaker-testing` skill now say the app's spec
   runs it too, for How to play's pictures. Asteroid Breaker's skill has the
   same gap, which is left to that game's next change.

### Step 1.5: the Phaser boards' host options and focus ring's style

Built as planned on `sl-play`. `@fz/phaser/canvas` gains
`boardHostOptions(title, keyboardTarget)`, the host options Snake's, Brick
Breaker's and Asteroid Breaker's boards each declared, differing only in the
title. `@fz/phaser/layout` gains `cssRectStyle(rect)`, the inline style that
lays the focus ring where the scene drew the board, its margin cleared. Each
has a spec, and both files are fully covered. The three boards lose about 90
lines between them. `lib/phaser/AGENTS.md` and the `phaser-core` skill
describe both helpers. Tests pass: `@fz/phaser` 591, Snake 421, Brick
Breaker 1829 and 180, Asteroid Breaker 3630 and 1620.

Where it went other than planned:

- Asteroid Breaker takes `cssRectStyle()` too, for its placeholder field,
  its ring and its card. The plan named only Snake and Brick Breaker, whose
  copies matched. Asteroid Breaker's private `rectStyle()` set no margin,
  and clearing the margin changes nothing there, since none of the three
  sets one.
- The boards' `hostOptions` fields lose their doc comments. The helper's
  doc says what the options are, and Asteroid Breaker's AGENTS.md already
  says why its board keeps the browser's menu shut.

The review:

1. _A copy of the lifted helper left in Asteroid Breaker's board spec
   (`placedOver()`), its doc now wrong:_ taken. The spec builds its
   expected styles with `cssRectStyle()`, so it checks the cleared margin
   too.
2. _The keyboard-target spec would pass for any other empty `<div>`, since
   Vitest compares DOM nodes with `isEqualNode()`:_ taken. A
   `boardElement()` helper gives the element an id of its own.
3. _Wording: "shows it with" in `lib/phaser/AGENTS.md`, and "until then"
   in a spec's name:_ taken. They now read "shows its scene with" and
   "until the scene has drawn".

### Step 3.4: `ColorMode` for the views

Built as planned on `sl-tools`. `phaserGameLayers()` lets every view take
`@fz/style/themes` by type alone; a value import is refused with its own
message, and the rules stay off it even by type. Both breakers'
`view/colors/palette.ts` drop `PaletteMode` for its `ColorMode`, three lines
each. Four specs join `@fz/dev`'s, 465 passing; Brick Breaker's 1829 and 180
and Asteroid Breaker's 3630 and 1620 pass.

Where it went other than planned:

- The type allowance is the fence's own, for all three games, rather than a
  game's `viewAllows`, which would let the values in too; an erased type
  import ties the view to nothing at run time.

The review:

1. _A type import the themes pattern matches skips the whole view fence, and
   no spec pinned its width:_ taken. A spec holds the view off another entry
   and the package by type, and fails with the pattern widened to
   `@fz/style`; a comment on the pattern says why it names one entry.
2. _`viewAllows: ["@fz/style/themes"]` would be named and still refused:_
   taken. `phaserGameLayers()` throws for it, as it does for a path it can't
   let in, with a spec, and its doc and `@fz/dev`'s `AGENTS.md` say so.
3. _A line of `@fz/dev`'s `AGENTS.md` ran to 90 columns:_ taken. The
   paragraph is reflowed.

### Step 4.1: the games' page frame, written once in `@fz/game-ui`

Built as planned on `sl-frame`. `@fz/game-ui` gains three Sass entries:

- `@fz/game-ui/toolkit` (`src/_toolkit.scss`) forwards `@fz/style`'s
  mixins, the breakpoints' and the bar's. Each game's `styles/_index.scss`
  is now that one `@forward`, so the hand-kept `show` list is gone.
- `@fz/game-ui/global` (`src/global.scss`) loads `@fz/style`'s global
  stylesheet. It then puts the bar's size on `:root` in `fz.tokens`, and
  `overscroll-behavior: none` in `fz.base`. Each game's `global.scss` is
  that one `@use`.
- `game-frame` (in `src/_index.scss`) writes the fixed host, the compact
  bar's size and the stage, inset by the bar on the side `data-bar` names.
  Each app's stylesheet includes it and adds its own stage rules after it.

The five games lose 194 lines between them. `src/frame.spec.ts` compiles
the three through fixtures, as a game loads them. Tests pass: `@fz/game-ui`
265, Minesweeper 373, Sudoku 592, Snake 421, Brick Breaker 1829 and 180,
Asteroid Breaker 3630 and 1620.

To check the pages look the same, every stylesheet of the five games was
compiled before and after, and the five builds' bundles diffed:

- Snake, Brick Breaker and Asteroid Breaker compile to the same CSS. Their
  bundles differ only in chunk hashes.
- Minesweeper's and Sudoku's app rules come out as the frame's and then
  their own, with no property in both.
- The global's two rules move into layers. Nothing else declares those
  properties on `:root`.

Where it went other than planned:

- `game-frame` takes no `$stage`. All five games call it `.stage`, and the
  bar's mixins also name the classes they style.
- The frame makes the stage `container: stage / size`. All five games made
  it a size container. Minesweeper's was unnamed, and nothing in
  Minesweeper queries a container by name.
- The global's rules sit in `@fz/style`'s layers, unlike the games' copies,
  so a library's global rules lose to a game's own as `@fz/style`'s do.
- The toolkit hides the breakpoints' three variables, so a component's
  stylesheet gets their mixins alone.

The review:

1. _The global's spec dropped every top-level node that wasn't a layer, so
   an unlayered rule would pass:_ taken. The spec keeps every node, and
   checks that the layers written into are ones `@fz/style`'s order
   statement declares. Adding an unlayered `:root` rule now fails both
   tests.
2. _The games' copied comments said the global "keeps the page from
   scrolling", and "every game" leaves out the Solitaire Collection:_
   taken. Each game's `global.scss` and `_index.scss` comment is two lines
   naming the library entry. The library says "a game on @fz/game-ui".
3. _Docs out of step: "one folder per entry point" in `AGENTS.md`,
   `bar-size()`'s doc on who includes it, and a long line in the skill:_
   taken. All three now describe the code as it is.

### Step 6.2: the Solitaire Collection on @fz/core

Built as planned on `sl-sol`, as `bbb1dafa`. A spec first pins Montana's
gaps for a fixed deal, `[16, 26, 35, 43]`, green against the old
`seededRandom()`; Montana then draws them with `createRandom()`, which gives
the same numbers for every seed. `shuffle()` and `seedFrom()` stay. The
layout's and the game browser's clamps take `clamp()`, the felts `keysOf()`
and `isKeyOf()`, and the browser's plurals `count()`. `lib/core/AGENTS.md`
no longer says the Solitaire Collection keeps its own seeded random, and
its contract rule names Montana's gaps. 6873 tests pass: one pin added,
and `seededRandom()`'s three specs gone with it.

Where it went other than planned:

- `seeded_random.ts`, left holding `seedFrom()` alone, became
  `seed_from.ts`, and its spec with it.
- At the review's asking, the fences now hold what the docs claim:
  `engine/core` refuses every library, and the tableau runtime and the
  games refuse every one but `@fz/core`, as `RULES_FENCE` does for the
  games drawn in layers. No tier imported one it now refuses.

The review:

1. _`engine/core` "keeps free of every dependency", but no lint rule
   holds it:_ taken. `@fz/*` added to `engine/core`'s fence, and
   `@fz/*` but `@fz/core` to `engine/tableau`'s and the games', each
   checked with a throwaway import; the table and the note under it list
   them.
2. _The docs give the wrong reason `shuffle()` keeps its order:_ taken.
   The Solitaire `AGENTS.md`, `lib/core/AGENTS.md` and the doc comments of
   `shuffle()` and `seedFrom()` say Montana's kept gaps hang on them with
   `createRandom()`. "RNG" in the tier diagrams is now shuffling.
3. _The contract spec's private `shuffled()` shadows core's:_ taken. It
   calls the engine's `shuffle()`, the same loop, so it plays alike.
4. _`@fz/core/random` imported among the `@/` imports:_ taken. Packages
   come first in the three files.

### Step F4b: `picturesWhenAsked()` in `@fz/phaser/scene`, for both breakers

Built on `sl-shell`, a step F4's review raised. After F4, both breakers'
scenes held the same lines: a field for How to play's pictures, its reset at
each bake, and a method that encoded them as first asked. That copy met the
plan's bar. It appears in two games with the same meaning, the API is three
parameters with no flags, and each scene gets shorter. So `pictures.ts`, beside
`picturesOf()`, now holds `picturesWhenAsked(scene, key, frames)`. It returns
a function that encodes the pictures as it is first called and returns the
same pictures after. Each `bake()` ends with
`onPictures(picturesWhenAsked(this, ATLAS, PICTURE_FRAMES))`, and each scene
is about 13 lines shorter. Three new specs in `@fz/phaser` hold it, and its
587 tests pass, as do Brick Breaker's 1835 and 180 and Asteroid Breaker's 3630
and 1620.

Where it went other than planned:

- The plan didn't have this step; F4's review found the copy F4 had made.
  It stays in a file of its own, apart from what `sl-play` adds to
  `@fz/phaser/scene`, except for the entry's one export line.
- Each function now keeps its own pictures, where the scene used to. Only a
  stale function called after a newer bake could tell, and no caller does.

The review:

1. _`picturesOf()` should leave the entry, since only `picturesWhenAsked()`
   calls it:_ taken. The entry exports `Pictured` and `picturesWhenAsked()`
   alone, so a scene can't encode at every bake again. `picturesOf()` keeps
   its `export` in `pictures.ts`, so its spec still covers it, as `pack` and
   `pixelRatioFor` are kept. `lib/phaser/AGENTS.md` and the `phaser-core`
   skill describe `picturesWhenAsked()` alone.
2. _The docs misname what the scene hands over, and two lines ran past the
   wrap:_ taken. Both games' `AGENTS.md` now say the scene hands over what
   `picturesWhenAsked()` returns, and `lib/phaser/AGENTS.md` that it returns
   a function. Both paragraphs are rewrapped.
