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

### Step 6.3: the Solitaire Collection's clock on formatClock()

Built as planned on `sl-sol`, as `eaf86af5`. `GameMetricsService.timerText`
takes `@fz/game-ui/stopwatch`'s `formatClock()`, so the header and the
victory card show "0:05" for "00:05" and "1:01:15" for "61:15", as
Minesweeper and Sudoku do (decision 2); its own `formatElapsed()` went. The
metrics spec's eight expectations follow, with a new one past an hour, and
the header's and victory card's specs their zero. 6874 tests pass.

The review:

1. _The clock past an hour is two characters wider, which on a narrow
   upright phone may clip the moves figure:_ not taken here. It needs no
   code change; the orchestrator checks "1:01:15" with three-digit figures
   at 320 and 360 px upright and on the rail in Phase 6's browser pass,
   after 6.4 and 6.5 change the bar again, and records it as accepted or
   decides on it then.
2. _The committed screenshots still show "TIME 00:00":_ not taken here.
   The orchestrator recaptures them (`yarn capture:screenshots`, then
   `yarn build:thumbs`) at Phase 6's end, once 6.4 and 6.5 have changed the
   chrome too.
3. _"its `formatClock()`" reads as a method of the service:_ taken.
   `AGENTS.md` says "the same entry's `formatClock()`".

### Step F5: Brick Breaker's screenshots through a testing API

Built as planned on `sl-tools`. Brick Breaker's
`tools/capture-screenshots.mjs` loads one entry,
`src/testing/screenshot_api.ts`'s `SCREENSHOT_API`, typed by
`src/testing/script_api.ts`, in place of three modules cast by hand and a
copied `SAVED_GAME_VERSION`, which moves into the rules beside `SavedGame`,
as Asteroid Breaker's sits. The entry it stores is the same, byte for byte
(5550 characters, a score of 950). Brick Breaker's 1834 and 180 specs pass.

Where it went other than planned:

- `SAVED_GAME_KEY` stays a commented copy in the script, as in Asteroid
  Breaker, whose API hands over the version alone, though the plan's F5 row
  says both: the key is the shell's, which the script's entry, fenced as the
  rules are, can't import.
- The shell's `saved_game.service.ts` now imports the version from the
  rules, two lines beside `sl-shell`'s 4.7 in the same file.

The review:

1. _The script's new code had no spec:_ taken. It exports `RUN`,
   `loadScreenshotApi()` and `shownRun()` and captures only when run, and
   `tools/capture-screenshots.spec.ts`, in `pure`, holds the stored entry to
   the version the shell takes up, paused on level 9, and its score.
2. _`script_api.ts` spoke of every script, though the report keeps its own
   types:_ taken. Its header names the screenshots' script alone.
3. _`saved_game.ts`'s entry and the testing skill's triggers missed the new
   names:_ taken. `AGENTS.md` names `SAVED_GAME_VERSION` there, and the skill
   triggers on `SCREENSHOT_API`, `script_api` and `shownRun`.

### Step 2.1: `@fz/core/run`, the stages and keys every run shares

Built as planned on `sl-play`. A new `@fz/core/run` entry holds `RunStage`,
`RunCommand`, `RUN_KEYS`, `isUnderWay()` and `hasEnded()`, with a spec that
pins every key and every stage. `@fz/game-ui`'s `RunLifecycle` takes the two
types from core, through a new `@fz/core` dependency (one line of
`yarn.lock`), and its entry hands them on. Snake's `Outcome` is
`Exclude<RunStage, "cleared">`, Brick Breaker's is `RunStage` and Asteroid
Breaker's is `Exclude<RunStage, "won">`. The games' own `hasEnded()` goes,
and so do the breakers' private `isUnderWay()`, along with the four "under
way" and three "ended" copies. Snake's and Brick Breaker's key maps spread
`RUN_KEYS`. The games lose 77 lines net, 30 of them specs that core's spec
now covers. Tests pass: core 237, game-ui 259, Snake 421, Brick Breaker 1823
and 180, Asteroid Breaker 3625 and 1620.

Where it went other than planned:

- Asteroid Breaker's `FieldCommand` was exactly `RunCommand`, so it goes
  rather than stay as an alias. Its `commandOfKey()` reads `RUN_KEYS` as it
  is, with nothing to spread.
- The fuzzley-ui skill's library table leaves the `@fz/core` row as it was.
  Lengthening that row would re-align every line of the table, which
  `sl-shell` is likely to edit too. A new reach-for row covers the entry.

The review:

1. _`RUN_KEYS`'s doc opened with two sentences, the second untrue for
   Asteroid Breaker:_ taken. It is one sentence.
2. _Asteroid Breaker's AGENTS.md still said `controls.ts` holds the
   commands:_ taken. It now says the file holds the keys held to fly and
   reads the run's keys from `RUN_KEYS`. As suggested, the fuzzley-ui
   skill's triggers gain `RunStage` and `RUN_KEYS`. The `frontend/games/
AGENTS.md` bullet broken early is re-wrapped.
3. _`bar_pause.component.ts` could take its `outcome` as a `RunStage`:_ not
   taken here. It changes `@fz/game-ui`'s bar API, which no step of the plan
   covers. It is left as a follow-up.

### Step 1.1: `GAME_RANDOM` into `@fz/game-ui/random`

Built as planned on `sl-shell`. The token is declared once, in a new entry,
`@fz/game-ui/random`: `Math.random` unless a spec provides a source of its
own. The five games' own declarations are gone: Snake's, Minesweeper's and
Sudoku's from their `GameService`, and Brick Breaker's and Asteroid Breaker's
from `src/app/tokens.ts`. The services and the specs' helpers import the
library's. Every game is 6 to 12 lines shorter, and every run and deal is
seeded as before. The tests pass: game-ui 260, Minesweeper 373, Sudoku 592,
Snake 421, Brick Breaker 1835 and 180, Asteroid Breaker 3630 and 1620. The
`fuzzley-ui` skill gains a row for the token.

The review:

1. _A package import followed a relative one in both breakers'
   `src/testing/play.ts`:_ taken. It now leads the relative imports, as in
   Snake's.
2. _Two edited paragraphs were left unwrapped:_ taken. Asteroid Breaker's
   `AGENTS.md` and the `snake-testing` skill are rewrapped at the width
   around them.

### Step 4.2a: the choice list as a mixin of its own in `@fz/style`

Built as planned on `sl-frame`. The `.choice-list` and `.choice` rules that
sat inside `settings-drawer` (`lib/style/src/toolkit/_dialogs.scss`) are now
the `choice-list` mixin: a `.choice-list` of `.choice` tiles, each its
`.name` over its `.desc`. `settings-drawer` includes it after
`setting-fields`. All 65 stylesheets of the games, the Solitaire Collection
and the site compile to byte-identical CSS. `toolkit.spec.ts` gains four
tests, and `@fz/style` passes 274. `lib/style/AGENTS.md` and the
`fuzzley-ui` skill name the mixin. The skill names it in the radio group's
row, since adding to the dialogs' row, the table's widest, would make
Prettier re-pad the whole table.

For 6.4 on `sl-sol`: taking `choice-list` in the Solitaire Collection's
option group means three renames beyond the plan's list:

- `.choice-row` becomes `.choice`;
- `.choice-name` becomes `.name`;
- `.choice-desc` becomes `.desc`.

These are in `option_group.component.html`. The query for `.choice-row` in
`test/ui/app/component/option_group/option_group.component.spec.ts` changes
with them. Solitaire's `.choice-row` lacks only `font: inherit`, which
`@fz/style`'s reset already gives a button.

The review:

1. _The skill named `.name` and `.desc` but not `.choice-list` and
   `.choice`, the classes the mixin matches:_ taken. The row now reads "a
   `.choice-list` of `.choice` tiles". It stays inside the column's width.
2. _6.4's list of renames in the plan leaves out the choice list's three:_
   taken here rather than in the plan, as noted above for `sl-sol`.

### Step 1.2: `recordOf()` in Snake's, Minesweeper's and Sudoku's stats

Built as planned on `sl-shell`. The three stats services no longer keep a
`statsBy()` that writes each speed, difficulty or level by hand. Each
`statsFrom()` is now one line, `recordOf()` over the game's own list of keys
(`SPEEDS`, `DIFFICULTY_IDS`, `LEVELS`), and Minesweeper's `EMPTY` goes with
it: 9 lines in, 40 out. What is stored and read is unchanged, and the keys
keep their order. The tests pass: Snake 421, Minesweeper 373, Sudoku 592.

Where it went other than planned:

- Each reader takes `saved?.[key]`, which `parseStats()` turns into none
  when nothing is stored. That drops the separate early return, which saves
  a few lines more than the plan counted and reads as plainly.

The review:

1. _No findings._

### Step 6.5: the header's actions on bar-actions

Built as planned on `sl-sol`, as `09c9fd22`. The header includes
`@fz/game-ui`'s `bar-actions` in place of its own tap target, turning gear
and round, label-hidden actions, and keeps its tighter `--fz-bar-gap` and
its round actions' 18px icons after it; the stylesheet is 19 lines
shorter. A build's compiled CSS, diffed against the one before the phase,
differs only by the mixin's `aria-disabled` rule, which no action here
has, the gear's class (`settings`, the mixin's), and the labels hidden as
`visually-hidden` rather than `display: none`, unseen and unheard alike
since each labelled action has an `aria-label`. 6874 tests pass.

The review:

1. _The comment says the round actions' icons shrink, but they grow:_
   taken. It says they grow to the 18px of the circle buttons beside them.
2. _The spec finds the gear by its styling class:_ taken. Both queries
   find it by its name, `button[aria-label='Game Settings']`.
3. _The solitaire-styles skill and AGENTS.md describe the toolkit as it
   was:_ taken. The skill forwards all three kinds, and AGENTS.md names
   `bar-actions` beside `@fz/style`'s toolkit.

### Step 2.2: `HeldKeys` in `@fz/core/keys`, the keys held to steer

Built as planned on `sl-play`. `@fz/core/keys` gains `HeldKeys`, made with
what each `event.code` steers and built on Asteroid Breaker's version. Two
keys held for one thing keep it held until both are let go, a key that
repeats holds nothing new, and `axis()` takes the way pressed last while
both ways are held. Reading it makes nothing, so the steering reads it every
frame. Both breakers' steering holds its keys with it: Brick Breaker's two
booleans and Asteroid Breaker's counts, code set and last turn all go. That
fixes F2: Brick Breaker's paddle now keeps going when ArrowLeft is let go
while KeyA is still held. Brick Breaker's scene no longer maps codes itself.
Asteroid Breaker steers exactly as before. Core keeps 100% coverage. Tests
pass: core 259, Brick Breaker 1831 and 180, Asteroid Breaker 3625 and 1620.

Where it went other than planned:

- `press()` returns whether it holds a key afresh. Asteroid Breaker needs
  that to take the heading back from the mouse only on a fresh turn press,
  and `isHeld()` can't tell it when another key for the turn is held.
- Brick Breaker's `Steering.press()` and `release()` take `event.code`.
  `press()` returns whether the key pushes the paddle, as Asteroid Breaker's
  says whether a key flies the ship.
- Two more changes in Brick Breaker come with F2's fix. A keyup of a code
  the steering never held (KeyA after Ctrl+A, say) no longer stops the
  paddle. A repeat no longer sets which way was pressed last; a browser
  repeats only the key pressed last, so play can't show that change.
- The fuzzley-ui skill's `@fz/core` row has no room left in its column. A
  sentence after the table names the run's stages and keys (2.1) and the
  held keys, so the table isn't re-padded.

The review:

1. _`frontend/games/AGENTS.md`'s list of core's helpers and the fuzzley-ui
   `@fz/core` row lacked the held keys, and the row lacked 2.1's run words:_
   taken. The list gains the same phrase as core's description. The row
   would need one column more, so the skill names both after the table, as
   the coordinator asked.
2. _No spec released an unheld key for a way still held:_ taken. Core's
   spec now releases KeyA, ArrowRight and KeyQ in turn while ArrowLeft is
   held, and expects the way to stay -1. Brick Breaker's gains "keep pushing
   at the release of a key not held".
3. _`heldSince()` named something other than what it returns:_ taken. It
   is `lastPressOf()`.
4. _The spec wrote `HeldKeys<Way>`, and the let-go spec pressed inside its
   assertions:_ taken. The spec builds it as a game does, with the type
   inferred, and "holds a key afresh after a let-go" is a case of its own.

### Step 6.6: Solitaire's dead and doubled motion CSS dropped

Built as planned on `sl-sol`, as `704e1925`. `_animations.scss` loses the
`pulse` keyframes, unused since the confirmation became `@fz/ui`'s confirm
dialog, which keeps its own `fz-pulse`, and the universal reduced-motion
rule, a copy of `@fz/style`'s in `@layer fz.base` that never decided a
value, since a layered important declaration beats an unlayered one. The
rule that stops the loading shimmers stays. The file is 24 lines shorter. A
build's global CSS, diffed against the one before the phase, lost only the
keyframes and the unlayered copy; the library's layered rule is still
there. 6874 tests pass.

The review:

1. _The kept rule's comment gives a flicker no player sees as its reason:_
   taken. Each shimmer's 0% frame looks as its placeholder does at rest, so
   the comment now says the placeholders stop outright so that none depends
   on that frame matching.
2. _The summary called `fz-pulse` `@fz/style`'s:_ taken. The commit message
   names `@fz/ui`'s confirm dialog, where it is declared.

### Step 5.1: the bar's menus driven in specs by `@fz/game-ui/testing`

Built as planned on `sl-tools`. `@fz/game-ui/testing` holds `barChoice()`,
`chooseInBar()` and `openBarMenu()` (`src/testing/bar_menus.ts`), and all
five games' bar specs drop their own badge finder, chooser and menu opener,
13 to 19 lines each. Five specs of the helpers join `@fz/game-ui`'s, 264
passing at its floor; every game's suite passes.

Where it went other than planned:

- The copies built a `RegExp` from an option's name; the helpers match the
  start of the name with a function, so nothing needs escaping.
- Snake's, Minesweeper's and Sudoku's finders required the badge's value
  ("Speed: Normal"); their specs now say so with `toHaveAccessibleName()`.
- The testing entry imports Testing Library, which `@fz/game-ui` declares
  optional peers, as `@fz/phaser` does Vitest.

The review:

1. _The helpers' specs would pass with an exact match, and pinned no
   failure:_ taken. Every option has a detail, the badge's name is checked
   whole, and each helper is held to throw for what the bar lacks; the spec
   fails with the match made exact.
2. _Snake read the menu again rather than taking `openBarMenu()`'s list:_
   taken.
3. _Three specs no longer checked the badge's accessible name:_ taken, with
   `toHaveAccessibleName()`.
4. _The angular-testing skill's list of helpers, and the fuzzley-ui skill's
   rows:_ taken. The first names them; in the second the choice's helpers
   sit in the choice's row and `openBarMenu()` in the bar's.
5. _Testing Library reached through hoisting alone:_ taken. Optional peers,
   with `AGENTS.md`'s Imports rule saying so.
6. _`findByRole()` waited for nothing:_ taken. `openBarMenu()` takes the
   menu with `getByRole()`, as `chooseInBar()` does; its items prove it
   opened.
7. _`chooseInBar()`'s doc:_ taken, with why the name is matched as a start.

### Step 4.2b: the settings' choice lists drawn by `<fz-choice-list>`

Built as planned on `sl-frame`. `@fz/ui/radio_group` gains
`<fz-choice-list [options] [value] labelledBy describedBy (choose)>` and
`ChoiceOption<Id>`. The component is a `[fzRadioGroup]` of tiles, styled by
`@fz/style`'s `choice-list` in its own stylesheet. Each tile is named by
all its words, and every press emits, the checked choice's too. All nine
lists use it: three in Snake, two each in Brick Breaker and Asteroid
Breaker, and one each in Sudoku and Minesweeper. Each game keeps its own
guard against the choice in use.

`BarChoiceOption` is now an alias of `ChoiceOption`, so one list feeds a
bar's badge and its drawer. The speeds of Snake, Brick Breaker and
Asteroid Breaker (`SPEED_CHOICES`), and Sudoku's levels (`LEVEL_CHOICES`),
moved out of the bars into each game's new `src/app/settings/choices.ts`.
In the bars, only the imports and the deleted constant change.

To check the pages look the same, all 84 stylesheets of the games, the
site and the libraries were compiled before and after, and the five games
built:

- Only the five settings stylesheets changed. Each lost exactly the
  `.drawer`-scoped copy of the rules the component now holds. No other
  drawer rule or unlayered rule styles those buttons, so the lower
  specificity changes nothing.
- The five builds' global CSS is byte-identical.
- The component's host is `display: block`, so the extra element adds no
  box.

Tests pass: `@fz/ui` 280, `@fz/style` 273, `@fz/game-ui` 265, Minesweeper
375, Sudoku 592, Snake 422, Brick Breaker 1829 and 180, Asteroid Breaker
3630 and 1620.

Where it went other than planned:

- `settings-drawer` no longer includes `choice-list`. 4.2a's review put
  that at 4.3, but this step is what leaves the drawer's copy styling
  nothing: with the markup inside the component, the drawer's rules can't
  reach it. Its spec test went with it.
- Minesweeper keeps two lists. Its bar says Custom's size, where the drawer
  says what Custom is. The drawer's `value` is Custom while Custom's field
  is open.
- A choice with no detail has no `.desc`. None of the nine lacks one.
- The shared lists sit in `settings/`, not in `rules/`. The rules' fence
  keeps a game's rules free of the libraries' types.

The review:

1. _Snake's and Minesweeper's guards against the choice in use had no
   spec:_ taken. Snake gains "starts no run at the speed in use".
   Minesweeper gains "neither asks nor deals at the difficulty in use" and
   "closes Custom's field for the difficulty in use, dealing nothing".
   With each guard deleted, its specs fail.
2. _The template compared `option.id === value()`, where templates only
   bind:_ taken. A `choices` computed marks the checked one, as
   `BarChoiceComponent.items` does.
3. _`lib/ui/AGENTS.md` read as if `<fz-choice-list>` were native radios,
   and the accessibility skill ran it into the list of keys:_ taken. The
   doc calls it "a `[fzRadioGroup]` of tiles", and the skill puts a
   semicolon before it.
4. _The arrow-key spec would pass without the arrows working:_ taken. It
   now checks that the focus moves too, and is named "moves focus with the
   arrows without choosing".
5. _The breakers kept a `ChoiceInfo { name; says }` only to rename a
   field:_ taken. Their records are typed as `ChoiceOption` without `id`,
   keyed by `detail`, and spread into the list.
6. _Edited prose left ragged:_ taken. The edited lines are rewrapped to 78
   columns, down to where the old breaks pick up again. Lines that were
   already long elsewhere in those files are left as they were.

### Step 2.3: `Turns<T>` into `@fz/core/turns`

Built as planned on `sl-play`. Asteroid Breaker's `Turns<T>` and its
`Playing` record move unchanged into `@fz/core/turns`. The module imports
nothing, git records the move as a rename, and core gains a spec at 100%
coverage. Asteroid Breaker's three painters change only their import.
Brick Breaker's rings and fades are rebuilt on it: each becomes a `Turns`
of `Burst` records over its image, made by one `burstOf()`. That replaces
six fields with two and takes the indices out of the draw loops. Images are
made and added to their layers in the same order and reused round-robin
from the first, as before. No seed, draw or saved game changes. The work
was rebased onto `shared-lib` before the review fixes. The one conflict, in
the fuzzley-ui skill's frontmatter, was resolved by keeping upstream's
description and adding the `Turns` trigger. Tests pass: core 264, Brick
Breaker 1842 and 180, Asteroid Breaker 3625 and 1620.

Where it went other than planned:

- The plan speaks of Asteroid Breaker's `Turns` "with a spec", but it had
  none. Core's spec is new.
- Brick Breaker's effects painter comes out the same length (157 lines).
  Its code is shorter, but `Burst` and `burstOf()` add doc comments. The
  gain is clarity: no hand-rolled round-robin, no `?.` and no `?? now`.
  Brick Breaker never reads a record's `x` and `y`.

The review:

1. _Brick Breaker's painter is barely shorter, and both records spell out
   fields nothing reads:_ taken. One `burstOf()` makes both kinds of record
   and hides the image, so the setup is back to six lines. Its doc comment
   says the field place is written but never read. This corrects the change
   rather than reshaping it: Brick Breaker still drops its two hand-rolled
   pools for the shared one.
2. _The spec helper took its type from `rings` but was given `fades` too,
   and two specs read the images another way:_ taken. `Burst` is exported,
   `imagesOf()` takes a `Turns<Burst>`, and both specs read
   `imagesOf(…)[0]`. As the review also noted, "plays each record in turn"
   was covered by the wrap spec, so it is dropped.
3. _The phaser-canvas-performance skill's pooling advice pointed only at
   `Group`:_ taken. It now says a flourish played a set number at a time
   takes `@fz/core/turns`'s `Turns`, as both breakers' painters do.

### Step 4.6: Sudoku takes `anyOpen()` and `refocusWhenUncovered()` (F3)

Built as planned on `sl-shell`. Sudoku's `AppComponent` no longer lists by
hand what stops the clock (settings, How to play and the question). It
covers the game whenever `@fz/ui/dialog`'s `DialogService.anyOpen()`, so the
hint's sheet now stops the clock too. Its own focus effect is replaced by
`@fz/game-ui/play_room`'s `refocusWhenUncovered(board, game.deals)`, as in
Snake and the breakers. The board takes the focus as the page loads, after
each deal and whenever the last dialog closes, so a cancelled question or
How to play now hands it the focus rather than the bar's button.
`ConfirmService` is no longer injected. Sudoku's tests pass, 595 of them.

Where it went other than planned: the review's first finding took the
change into the hint and the pad (see 1).

The review:

1. _The hint's own `handBack` now does what `refocusWhenUncovered()` does,
   and the two focus calls clash:_ taken. `HintComponent.handBack`, its emit
   and the `(handBack)` on `<app-hint>` are gone, and the pad's `handBack`
   doc speaks only of presses with a pointer. The hint's spec now checks that
   filling in from the sheet closes it. The app spec gains "gives the board
   the focus once the hint's sheet fills its hint in". After the sheet the
   square scrolls into view, as after any dialog, which the staged change
   already did since the library's call came last. The board's `focus()`
   doc still holds: the pad hands the focus back with `preventScroll`.
   I took this as a correction, not a reshape: the behaviour is as staged,
   and `app.component.html` is untouched.
2. _No spec pins `game.deals` as the runs:_ taken. "gives the board the
   focus after New game from the bar, with no game under way to ask about"
   deals with no dialog. With `signal(0)` as the runs, it fails and no other
   spec does.
3. _A second `ResizeObserver` stand-in, and the testing skill names only
   the first:_ taken. `FakeResizeObserver` moves to
   `src/testing/resize_observer.ts`. Both specs stub it, and the app spec's
   `renderCramped()` reports `(0, 100, 100)` after `renderPlayed()`. The
   clock spec waits on `findByRole("dialog")` with no title fallback. The
   `sudoku-testing` skill and the `src/testing/` bullet in `AGENTS.md` point
   there.

### Step 4.5: two small mixins, `bar-figures-paired` and `segmented`

Built as planned on `sl-frame`, but for where `segmented` is included.

- `bar-figures-paired` in `@fz/game-ui`'s `_bar.scss` sets two figures one
  over the other in a single card. Brick Breaker's and Asteroid Breaker's
  bars each replace 20 lines with
  `:host(.score-and-…:not(.rail)) { @include bar-figures-paired; }`.
  `bar.spec.ts` compiles it through `fixtures/bar_defaults.scss`.
- `segmented` in `@fz/style`'s `_dialogs.scss` styles a `.segmented` well
  of `.segment` radios, the checked one, by `aria-checked`, filled in the
  accent. Minesweeper's settings stylesheet includes it in place of its own
  29 lines. `toolkit.spec.ts` checks it.

To check the pages look the same, all 84 stylesheets were compiled on
`shared-lib` before and after:

- Minesweeper's settings compile to the same CSS.
- The two bars differ only by a blank line.
- Nothing else changed.

Minesweeper, Brick Breaker and Asteroid Breaker all build. Tests pass:
`@fz/style` 276, `@fz/game-ui` 274, Minesweeper 375, Brick Breaker 1842 and
180, Asteroid Breaker 3625 and 1620.

Where it went other than planned:

- `setting-fields` doesn't include `segmented`, as the plan (line 300)
  said it would. Only Minesweeper draws one today, so including it there
  put dead rules in every other drawer and in Asteroid Breaker's debug
  menu. Each stylesheet that draws one includes it, and the Solitaire
  Collection's option group will too.
- For 6.4 on `sl-sol`:
  - `.segmented-control` becomes `.segmented`;
  - `.segment-btn` becomes `.segment`;
  - `.active` goes, since `aria-checked` already says which segment is
    checked.
  - The mixin leaves out Solitaire's `padding: var(--fz-space-2) 0`. The
    tap target's `min-height` hides the vertical half. The browser's own
    sideways padding matters only if a label wraps.

The review:

1. _`segmented` belongs only where it is used, not in `setting-fields`:_
   taken. Minesweeper includes it at its stylesheet's top level, and
   compiles to exactly the CSS it had. The spec that held the inclusion
   now checks `setting-fields` leaves it out. `lib/style/AGENTS.md` lists
   it among the parts, and the skill no longer says `setting-fields` holds
   it.
2. _`_index.scss` lists the bar's mixins and missed the new one:_ taken.
3. _`bar-figures-paired` doesn't say to keep it off a rail, whose stacking
   doesn't take its card away:_ taken, in its doc and in
   `lib/game-ui/AGENTS.md`.

Before committing, the worktree moved onto `shared-lib`. The stash popped
with one conflict, in the skill's table: `shared-lib`'s new bar-choice row
was kept beside this step's figures row.

### Step 2.4: multiplier tiers in `@fz/core/math` and `@fz/core/format`

Built as planned on `sl-play`. `@fz/core/math` gains `MultiplierTier` and
`multiplierAt(count, tiers)`, the two breakers' old loop line for line.
`@fz/core/format` gains `tierWords(tiers, noun)`, their old reversed map
with the noun lifted out. `STREAK` and `CHAIN` stay in each game's tuning as
`as const satisfies readonly MultiplierTier[]`. Both How to play pages word
the ladder with `tierWords()`. The help specs pin the exact words, and every
score is unchanged. The work was rebased onto `shared-lib` before the review
fixes: no conflicts, and the lockfile was unchanged. Tests pass: core 275 at
100%, Brick Breaker 1842 and 180, Asteroid Breaker 3625 and 1620.

Where it went other than planned:

- Each game keeps its own `multiplier()`, as one line over
  `multiplierAt()`, so its callers (Brick Breaker's `scoreHit()` and
  service, Asteroid Breaker's `chainMultiplier()`) and its spec of its own
  table stay as they were.

The review:

1. _Neither breaker's AGENTS.md said that its multiplier and How to play's
   tier words now come from core:_ taken. Brick Breaker's scoring line names
   `multiplier()` as `multiplierAt()` over `tuning.ts`'s `STREAK`, and
   Asteroid Breaker's names `multiplierAt()` over `CHAIN`. Both `help/`
   lines say the ladder is worded by `tierWords()`.
2. _The core spec's case name read "scores a count of 5 2 times":_ taken.
   It reads "scores a count of 5, 2 times".

### Step 5.2: a bar's and a card's figures read by `@fz/ui/testing`

Built as planned on `sl-tools`. `@fz/ui/testing` holds `figure()`,
`figureValue()` and `figures()` (`src/testing/figures.ts`), and twelve
specs across the five games drop their own: seven of `figure()` and five of
`figures()` or `tallyLines()`, 106 lines fewer. Ten specs of the readers join
`@fz/ui`'s, 279 passing above its floor; every game's suite passes, the
Solitaire Collection's too.

Where it went other than planned:

- `figureValue()` is exported beside the plan's two, since both breakers'
  bars need the value's element.
- The element to look in is `container`, not `within`, which would shadow
  Testing Library's `within`.
- Text reads as Minesweeper's copy read it, each run of white space one
  space, which is Testing Library's own default; no expected string changed.
- Asteroid Breaker's `figureTerm()` and the breakers' `terms()` stay their
  own: the pilots sit in the `<dt>`, and `terms()` is one line.
- The testing entry imports `@testing-library/dom`, which `@fz/ui` declares
  an optional peer, as `@fz/game-ui` does.

The review:

1. _The breakers' result specs searched `figures()` for Best:_ taken. They
   read it with `figure("Best")`, which throws where Best is missing.
2. _The two readers disagreed about a value, and neither required a
   `<dd>`:_ taken. One `valueAfter()` requires the `<dd>` and throws one
   message for both; a spec holds each reader to throw for a `<dt>` another
   `<dt>` follows, and fails with the check taken out. `figure()` defaults
   its `container` as its siblings do.
3. _The Solitaire Collection loads the optional peer without listing it:_
   taken. It lists `@testing-library/dom`, and `@testing-library/user-event`
   too, whose types `@fz/game-ui/testing` takes, closing 5.1's gap as well;
   its lint, typecheck and 6,874 tests pass.
4. _`figureValue()`'s spec passed with the lookup broken:_ taken. It checks
   the value's text, and fails with the lookup made to take the first term.

### Step 4.9: the overflow menu's shared items in `@fz/game-ui/bar_overflow`

Built as planned on `sl-shell`, after rebasing onto `shared-lib`.
`withHomeLink(items, barHome)` leads the items with the link home only
where `barHome` is `none`, and gives them back as they are otherwise, so
the ternary is gone from all five bars. `HELP_MENU_ACTION` and
`SETTINGS_MENU_ACTION` word How to play and Settings once, as
`soundMenuAction()` words the Sound's. The menus show the same items, ids
and order at every size. The five bars' edits stay in their overflow items
and the import from `@fz/game-ui/bar_overflow`, and they merged cleanly
over `sl-frame`'s 4.2b. The tests pass: game-ui 275, Snake 423, Minesweeper
375, Sudoku 595, Brick Breaker 1842 and 180, Asteroid Breaker 3625 and 1620,
and Solitaire 6874.

Where it went other than planned:

- The Solitaire Collection's header calls `withHomeLink()` too, so it takes
  the new signature and `SETTINGS_MENU_ACTION`. It keeps its own How to
  Play, worded in title case under the id `rules`.
- The `fuzzley-ui` skill gains a row of its own for the overflow menu's
  items, since adding them to the bar's row would widen the table's column
  and re-pad every row.

The review:

1. _`@fz/game-ui`'s `test` fell below its coverage floor, since no spec
   loaded `menu_actions.ts`:_ taken. The finding held before the rebase: my
   run filtered the output for failed specs and missed the threshold error.
   On `shared-lib`, `src/testing/bar_menus.spec.ts` imports the entry, which
   happens to cover the file. Coverage should not rest on that, so
   `menu_actions.spec.ts` now checks each constant's id, label and icon. The
   floor stays; statements and lines are at 100%.
2. _A copy is left behind in Solitaire, and the docs say "every game":_
   taken. Solitaire's header takes `SETTINGS_MENU_ACTION`, with no change in
   behaviour, and keeps its own How to Play. `AGENTS.md` says the items are
   worded once for the games, and that the Solitaire Collection words its own
   How to Play. `menu_actions.ts`'s docs say the same. The package
   description and the skill now name "the overflow menu's shared items".
3. _The skill dropped the condition:_ taken. The bar's row keeps its
   wording from `shared-lib`, "led by `withHomeLink()` when the bar has no
   room for the link home". The new row says `withHomeLink(items, barHome)`
   leads with the link where the bar has no room for it (`barHome` is
   `none`).
4. _Snake's bar spec never checks the menu at `none`:_ taken. It gains
   "moves the link home into the menu where there is no room for it", as the
   other four bars' specs have. It fails when Snake passes `"icon"` in place
   of `barHome()`.

### Step 6.4: the Solitaire Collection's drawer and option group on the toolkit

Built as planned on `sl-sol`, as `2076360a`. The settings drawer is
`settings-drawer(320px)`, its footer and its phone padding nested inside
`.drawer`, where they outweigh the mixin's header and content rules. The
option group includes `setting-fields`, `segmented` and `choice-list`. The
classes are renamed as the plan and 4.2a's and 4.5's entries list, and
`.active` is gone, since `aria-checked` carries the state. How to play's
`&times;` is the close icon in a `close-button`. The stylesheets are 141
lines shorter. A build's global CSS is byte-identical to the one before the
step, and the four component stylesheets, diffed, differ only as below.
6874 tests pass.

Where it went other than planned:

- The option group draws its own list with the `choice-list` mixin rather
  than `<fz-choice-list>`, which names a choice by all its words; here each
  is named by its name alone and described by its line, as a spec pins.
- The drawer's header takes the 20px of padding above and below that the
  other five drawers have, rather than 24px. The phone's 16px still wins.
- `setting-fields` brings `.setting-check` rules that nothing here uses, in
  the drawer and the option group, as it documents for a component of its
  own.
- The segments lose `padding: var(--fz-space-2) 0`; the reset zeroes it, and
  the tap target's `min-height` hides it, since no label wraps.
- The game browser's close button moved onto `close-button` too, after the
  review, so the collection's three dialogs close alike.

Left for later: the debug panel's dev-only band bleeds by `--fz-space-6`
(`debug_panel.component.scss:9-17`), while the drawer's content is padded
`--fz-space-4` below `phone`, so the drawer scrolls 8px sideways there in a
dev build. It was so before this step.

The review:

1. _The game browser's close button was the only one in the six games not
   on `close-button`:_ taken. It is `.close` with `close-button`, its icon
   20px rather than 22px and its corners the small radius.

### Step 2.5+2.6: `CountsById` and `withHigherCount()`, and `EventLogView`

Built as planned on `sl-play`, with the two steps joined as one: in both,
the breakers stop re-spelling what core's `json` and `event_log` already
give.

- `@fz/core/json` names the type `countsByIdOf()` returns, `CountsById<K>`.
  It adds `withHigherCount()`, which raises an id's count under a key and
  returns the same record, not a copy, when the value doesn't beat it.
- Brick Breaker's `withLevelPoints()` and Asteroid Breaker's
  `withRunEnded()` take it, and `LevelBests` and `SectorBests` go. Every
  value stored is as it was.
- `@fz/core/event_log` adds `EventLogView<E>`, which replaces both games'
  `EventsView`. Both frames hold `EventLogView<FieldEvent>`.

The work was rebased onto `shared-lib` before the review fixes: no
conflicts, and `y install` was run for the lockfile. Tests pass: core 283 at
100%, Brick Breaker 1842 and 180, Asteroid Breaker 3625 and 1620.

Where it went other than planned:

- The two steps are one commit, as the coordinator allowed.
- `withHigherCount()` takes an id with no count as -Infinity where the games
  took -1. For counts, which are never negative, nothing changes.
- The games' frame specs now check the rules' log against
  `FieldFrame["events"]`, which checks the event type too.
- As the review offered, `FieldPlay` now asks a field's log only for an
  `EventLogView`, so core uses its own view type.

The review:

1. _Asteroid Breaker's `withRunEnded()` came out a line longer:_ taken. It
   destructures the run once, so the `withHigherCount()` call fits on one
   line and the body is 12 lines where it was 16.
2. _The breakers' AGENTS.md edits weren't rewrapped, and Asteroid
   Breaker's list read ambiguously:_ taken. The first "and" is gone, so
   `wrappedBetween()` no longer reads as another type. Each edited paragraph
   is rewrapped from the edit on, at the files' 78 columns. Brick Breaker's
   "and `FieldFrame`" stays, as it ends its list before a semicolon.

### Step 4.4: the Phaser boards' styles in `@fz/style`'s `_boards.scss`

Built as planned on `sl-shell`, after rebasing onto `shared-lib`.
`canvas-board-host` writes the nine declarations Snake's, Brick Breaker's
and Asteroid Breaker's board `:host` repeated: a size container that holds
and clips the board's parts, no outline, and nothing a finger steering on
it sets off. `board-focus-ring($offset)` writes the ring's four declarations
and the `:host(:focus-visible)` rule that shows it. `$offset` is the wall's
width in Snake and Brick Breaker and the frame's in Asteroid Breaker. Each
board is about 15 lines shorter. Compiled before and after, each board's
stylesheet gives every selector the same declarations. The tests pass:
`@fz/style` 281, Snake 423, Brick Breaker 1842 and 180, Asteroid Breaker
3625 and 1620.

Where it went other than planned:

- Asteroid Breaker's board stylesheet now loads the game's toolkit
  (`@use "../styles" as *;`), which it didn't need before.
- Sass writes a ring's own placement as a second `.ring` block after the
  mixin's nested rule, as `board-card` already does with Snake's `.card`.
  No property is set twice, so the outcome is the same.
- The `fuzzley-ui` skill gains a row of its own, so the table's columns
  keep their width.

The review:

1. _`board-focus-ring`'s doc has two sentences in its first paragraph and
   says the ring rings a mixin:_ taken. Why it belongs in the board's own
   stylesheet is now a paragraph of its own: "the one whose `:host` takes
   `canvas-board-host`".
2. _`outline:none` sits under the finger's test, and the ring's spec misses
   its rounding:_ taken. "leave a canvas board's focus for its ring to show"
   checks `outline:none`, and the ring's test checks `border-radius` too.
3. _A clause in `lib/style/AGENTS.md` attaches to the width:_ taken.
   "`board-focus-ring($offset)`, which also writes the
   `:host(:focus-visible)` rule that shows it" now comes first, then the
   element it goes on and `$offset`.

The review's optional note to name the two mixins in the `phaser-core`
skill, beside `boardHostOptions()`: not taken. `sl-play` is rewriting that
paragraph for `viewportOf()` and `canvasChanged()`, and the `fuzzley-ui`
skill already names both mixins.

### Step 5.3: `installFakeViewport()` taking itself off as the test finishes

Built as planned on `sl-tools`. `@fz/ui/testing`'s fake viewport registers
its own cleanup with `onTestFinished`, as `setPageVisibility()` does, and 24
spec files drop 31 restores written by hand: the plan's 28 in 21 files, and
the Solitaire Collection's three. Five specs of the cleanup join the fake's,
295 passing in `@fz/ui` above its floor; every game's suite passes.

The check asked for first: `onTestFinished` called from a `beforeEach` works
in Vitest 5.1.0. It runs after the test's `afterEach` hooks, for a failing
test too, the hook registered last first; from a `beforeAll` it throws, as
no test is running.

Where it went other than planned:

- `restore()` stays, for a spec that takes the fake off before the test
  ends, and acts only once.
- The cleanup now runs after a spec's `afterEach`, so `vi.restoreAllMocks()`
  runs first, and the fake put back the spy over the pixel ratio it had
  found: a probe leaked a ratio of 2 into the next test. The fake now puts
  back only a ratio it set and still holds.
- A viewport variable stays only where a test reads it, scoped to the
  describe that does; the touch screens' become one call.

The review:

1. _A fake installed in a `beforeAll` threw only after changing the
   window:_ taken. It registers its cleanup first, and a spec holds it to
   throw leaving no `matchMedia`; the spec fails with the old order.
2. _The Solitaire Collection's three restores belong here:_ taken. Its
   lint, typecheck and 6,874 tests pass.
3. _Some viewport variables were assigned but never read:_ taken, in
   Snake's app, the theme spec and both breakers' bars; Minesweeper's,
   Sudoku's and Snake's bars scope theirs to the describe that reads it
   too.
4. _Nits in `fake_viewport.ts`:_ taken. The comment on the window's own
   ratio sits by the descriptor it explains, `restore()`'s doc says it acts
   once, and the redundant `setRatio &&` is gone.

### Step 5.7: `checkPhaserLayout()` in `@fz/dev/layout`

Built as planned on `sl-sol`, as `9abd89cd`, taken over from `sl-tools`.
`checkPhaserLayout(devtools, check)` runs `checkLayout()` at every shape
and the smallest phone, then `checkTurns()` through every turn, all at
twice the pixels, and `PHASER_CHECKED_AT` names those shapes and turns for
the script's "holds" line. Snake's, Brick Breaker's and Asteroid Breaker's
`tools/check-layout.mjs` lose the same preamble and concatenation, each
about 20 lines shorter, and check and say exactly what they did; the names
match the old list character for character. Two specs pin the viewports, in
order, and the names the problems come back under. `@fz/dev` passes 466
tests; the three games lint and type-check, and each script loads and
prints its usage with `--help`. `yarn check:layout` for the three games
needs a run on the integration branch, as Chrome can't start here.

Where it went other than planned:

- `turnsAt()` is no longer exported, since nothing outside the module
  copies a turn now. `SMALLEST` and `shapesAt()` stay exported, for
  Asteroid Breaker's specs of its field and deck. `checkTurns()` and
  `TURNS` stay exported too, deliberately, beside `checkLayout()` and
  `SHAPES`, which they complete, though no script calls them directly now.

The review:

1. _`turnsAt()` stayed exported with no user, and `lib/dev/AGENTS.md` gave
   it one:_ taken. Its export and its spec are gone, the first new spec
   pinning both ends of every turn at 2×; AGENTS.md names `shapesAt()`
   alone, for Asteroid Breaker's specs, and says "as `checkLayout()` and
   `checkTurns()` do" for "as both do". Keeping `checkTurns()` and `TURNS`
   exported is the choice recorded above.
2. _The new lists were mutable arrays beside `readonly` ones:_ taken.
   `PHASER_SHAPES` and `PHASER_TURNS` are typed `readonly Shape[]` and
   `readonly Turn[]`.

### Step 4.7: `keepSaved()` in `@fz/ui/storage`, spiked in Snake

Built as planned on `sl-shell`, in Snake alone, after rebasing onto
`shared-lib`. `keepSaved({ key, version, save, restore, track })` restores
what was kept as it is called. Then it writes what `save()` returns, or
removes the entry where that is null, as what `track()` reads changes,
or without `track` as what `save()` reads does, and as the page is hidden
or goes away. Snake's service goes from 62 lines to 42: one call names its
save, its restore and the three signals a write follows (`outcome`, `score`
and `runs`). Its 13 specs pass unchanged; "doesn't write the run at every
step" fails if the library drops `untracked`. The entry keeps its key,
version and shape. The tests pass: `@fz/ui` 303, Snake 423.

The verdict, which the review shared: Snake's service reads better and
still says in one place what triggers a write, so the decision is to adopt
`keepSaved()` in the other four games (4.7b).

The review:

1. _The doc's summary names only `track`, and two `saved`s shadow each
   other:_ taken. The summary says a write follows what `save` reads
   without `track`, and the stored entry is now `kept`.
2. _No spec checks that it stops writing once its injector is destroyed:_
   taken. "stops writing once its injector is destroyed" keeps the game in
   an injector of its own, destroys it, and finds the first write still
   stored. It fails when the effect takes `manualCleanup`.
3. _`frontend/games/AGENTS.md` still sends a game under way to
   `LocalStorageService` and `keepOnLeave()`:_ taken in 4.7b, where it
   becomes every game's rule.
4. _A spec checks a call where state shows the same:_ taken. "takes up
   nothing where nothing of its version was kept" now checks the lives
   are still 3.

### Step 4.3: the settings drawer's frame drawn once, by `<fz-settings-drawer>`

Built as planned on `sl-frame`, as `02fc13a6`, but for where the frame's
styles live.

- `<fz-settings-drawer [open] (closed)>`, in `@fz/game-ui/settings_drawer`,
  draws the dialog named Settings, its `h2`, the "Close settings" button
  and the scrolling `.drawer-content`, and projects the settings. Like
  `<fz-dialog>`, it only asks to close. Its eight specs pin the name, the
  heading, the focus opening on the close button, the projected settings,
  and Escape, a click beside it and the button each asking to close.
- The five games' settings templates each lose the 18 lines of the frame.
  Minesweeper still closes through its own `close()`, which shuts its
  Custom field first.
- Each game's settings stylesheet includes `setting-fields` at its top
  level, since the drawer's rules can't reach what it projects. Brick
  Breaker's `.range` moves up a level, and Minesweeper's `segmented` sits
  beside `setting-fields`.

To check the pages look the same, every stylesheet was compiled on
`shared-lib` before and after:

- The frame compiles to the same seven rules.
- Each game's settings compile to the same rules, less the `.drawer `
  prefix. Every settings rule loses the same weight, so their order among
  themselves holds, and the global stylesheet is all in `fz.*` layers, so
  nothing outside competes.
- Minesweeper's `segmented` rules now come before `.custom`'s, which share
  no elements with them.
- Nothing else changed, the Solitaire Collection's drawer included.

The five games' builds carry the same rules. Tests pass: `@fz/style` 278,
`@fz/game-ui` 286, Minesweeper 375, Sudoku 595, Snake 423, Brick Breaker
1842 and 180, Asteroid Breaker 3625 and 1620.

Where it went other than planned:

- The frame's half of `settings-drawer` doesn't move into the component. It
  stays in `@fz/style` as `settings-drawer-frame($width)`, which the
  component includes. `settings-drawer` stays whole, the frame with
  `setting-fields`, since decision 3 had the Solitaire Collection's drawer
  take it (6.4), and that drawer can't be `<fz-settings-drawer>` as it
  stands: it is "Game options", 320px wide, with a footer.
- Stylelint wants no blank line between `@use` and the first `@include`, so
  each game's settings stylesheet opens with the two together.
- Minesweeper's and Sudoku's `AGENTS.md` said the Solitaire Collection's
  dialogs took only the headings and the choice tiles. That stopped being
  true with 6.4, so the sentence this step rewrote drops it.

The review:

1. _`lib/style/AGENTS.md` said a game includes `setting-fields` "under that
   drawer", which reads as nesting it in `.drawer`, the one place it can't
   work, and the rewrap left a ragged break:_ taken. It says "at its top
   level for the settings it projects into that drawer", and the sentence is
   worded to meet the paragraph's old line breaks, so the lines after it are
   untouched.
2. _Nothing checks where the focus goes as the drawer opens:_ taken. "takes
   the focus at its close button as it opens". The spec's setting is now a
   checkbox, which can take the focus, so the spec fails when the content
   comes before the header, as tried.
3. _The whole drawer's default width is compared with the frame's only at
   320px:_ taken. A second spec compares them with no width.

Before committing, the worktree moved onto `shared-lib` twice, since 6.4
was picked while the checks ran. The first pop conflicted in
`@fz/game-ui`'s `package.json` description and the skill, against 4.9's
words; both were resolved by taking `shared-lib`'s text and adding this
step's edits to it. The second popped clean.

### Step 3.1: `fitCells()`'s steps as `@fz/phaser/layout` helpers

Built as planned on `sl-play`. `@fz/phaser/layout` exports `PixelRect`,
`roomInside(viewport)`, `framePixels(frameCss, pixelRatio)` and
`cssRectOf(rect, pixelRatio)`. `fitCells()` is rebuilt on them, with the
same operations in the same order. Asteroid Breaker drops its copies:
`PixelRect`, `stageOf()`, `frameOf()`, the board's `inCss()` and the board
spec's `inCssAt()`. Its views import `PixelRect` from the library, and its
source is 53 lines shorter. Every board's numbers are unchanged at every
pixel ratio.

Before the review fixes, the work was rebased onto `shared-lib`, with no
conflicts and the same lockfile. Tests pass: phaser 603, Asteroid Breaker
3625 and 1620, and, since both use `fitCells()`, Brick Breaker 1842 and 180
and Snake 423.

Where it went other than planned: nowhere.

The review:

1. _The new specs pinned each rounding from one side only, so `Math.ceil`
   or `Math.floor` would pass:_ taken. The insets spec now has one inset
   that rounds down and one that rounds up, so ceil fails across, floor
   fails both ways, and rounding the sum fails down. The `framePixels()`
   table gains 2 CSS pixels at 1.25, which is 3, where floor gives 2.
2. _`@fz/phaser`'s AGENTS.md `src/layout/` entry no longer read as a list,
   and it and the phaser-core skill had lines past 80 columns:_ taken. The
   entry's list is back as it was. The three steps have a sentence of their
   own before "It imports nothing but `insets`". Both paragraphs are
   rewrapped from the edit on.
3. _`Viewport`'s doc still spoke of a field of cells, and `cssRectOf()`'s
   doc was one long line:_ taken. It reads "Describes a canvas a field is
   laid out on", and `cssRectOf()`'s doc is wrapped.

### Step 5.8: the screenshot defaults and `takenUpBoard()` in `@fz/dev/screenshots`

Built as planned on `sl-sol`, as `c14c4ae6`, taken over from `sl-tools`.
`SCREENSHOT_VIEWPORT` (1280 × 720 at 2×) replaces the viewport in all five
capture scripts, `thumbRegionAround()`'s default 24 px margin the margin in
four, and `siteImagesFolder(root, id)` the folder in five. In Snake and the
two breakers, `takenUpBoard(page, board, score)` replaces the settle,
describe and check sequence, and returns the board's region or the same
problem as before. The scripts are 38 lines shorter between them. `@fz/dev`
passes 475 tests, nine of them new. The six games lint and type-check, the
breakers' script specs pass, and each script loads with `--help`. Running
`yarn capture:screenshots` for the five games needs the integration branch.

Where it went other than planned:

- `takenUpBoard()` names the board in its problems, so "the field did not
  draw" stays the breakers' and "the board did not draw" Snake's. Each
  script's board gains a `name`, and the breakers' constant becomes `FIELD`.
- It takes the score as a plain string rather than the plan's `{ score }`,
  after review: the breakers pass `run.score` and Snake its eaten count.
- The Solitaire Collection's `build:thumbs` writes to `siteImagesFolder()`
  too. Its capture keeps its own 1440 × 810 page.
- `@fz/dev/screenshots` no longer re-exports `describePhaserPage`,
  `readRect`, `PHASER_CANVAS_SETTLED` or their types. No script uses them
  now, and `@fz/dev/board-page` still exports them for the specs.
- After review, `describePhaserPage()` always waits 800 ms, since
  `takenUpBoard()` was its only caller and passed no other wait.

The review:

1. _AGENTS.md and the constant's doc said every game captures at
   `SCREENSHOT_VIEWPORT`, though the Solitaire Collection doesn't:_ taken.
   AGENTS.md says "Each game but the Solitaire Collection" captures at it,
   that the Solitaire Collection shoots its rules page at 1440 × 810 and
   makes the images with `build:thumbs`, and that each writes them to
   `siteImagesFolder()`. The constant's doc says "a game's capture script"
   and names the exception.
2. _No spec checked the board's name in the problems:_ taken. The spec's
   board is now `pitch`, a name no game uses, and the two named rows expect
   "the pitch did not draw" and "the pitch is missing".
3. _The `SCREENSHOT_VIEWPORT` spec checked only its product, and `PAGE`
   copied the constant:_ taken. `PAGE` is gone and the region cases pass
   `SCREENSHOT_VIEWPORT`, so their exact regions pin 1280 × 720 at 2×. The
   product spec stays as the reason for the size.
4. _`@param run` described a string, but the parameter was `{ score }`:_
   taken the other way. The parameter is now `score: string` ("The run's
   score, as the game bar reads it"), which also drops Snake's wrapper.
5. _`describePhaserPage()`'s `waitMs` option had no caller left (optional):_
   taken. `PhaserPageWait` is gone and the wait is a literal 800 ms in the
   function, as the page runs it from its source alone. The spec for a
   given wait now pins the 800 ms: the page laid out at 799 ms is the one
   described. AGENTS.md's "800 ms unless given (`waitMs`)" now reads "once
   800 ms have passed".

### Step 4.8: How to play's card drawn once, by `<fz-help-dialog>`

Built as planned on `sl-frame`, as `ba0a9c54`, but `help-card` goes
rather than splitting.

- `<fz-help-dialog [open] (closed)>`, in `@fz/game-ui/help_dialog`, draws
  the dialog named How to play, its card, the "Close How to play" button in
  the corner and the `h2`, and projects what the game says. Like
  `<fz-dialog>`, it only asks to close. Its eight specs pin the name, the
  heading, the focus opening on the close button, the projected words, and
  Escape, a click beside it and the button each asking to close.
- The five games' How to play templates each lose the 11 lines of the
  frame. Every word of their help is the same; Prettier rewraps some
  paragraphs, which sit a level shallower.
- The card's rules are the component's own: `dialog-card(580px)`,
  `corner-close-button` and the heading's three declarations, exactly as
  `help-card` wrote them.
- Each game's How to play stylesheet includes `help-text` and the new
  `help-controls`, the table of the controls, the head of its columns and
  the keycaps, at its top level, since the card's rules can't reach what it
  projects.

To check the pages look the same, every stylesheet was compiled before and
after, and again after the move onto `shared-lib`:

- The card compiles to the same five rules.
- Each game's words and table compile to the same rules, in the same
  order, less the `.card ` prefix. They all lose the same weight, so their
  order among themselves holds, and the global stylesheets are all in
  `fz.*` layers, so nothing outside competes. Snake's `.keys` and Asteroid
  Breaker's `fz-help-catalog` properties are untouched.
- `.close` now comes before the words' rules, but it styles no element they
  do.

Tests pass: `@fz/style` 283, `@fz/game-ui` 294, Minesweeper 375, Sudoku
595, Snake 423, Brick Breaker 1842 and 180, Asteroid Breaker 3625 and 1620.
Lint, typecheck and root lint are clean, and the five games build, with the
same How to play rules in their bundles as before the move onto `shared-lib`.

Where it went other than planned:

- `help-card` doesn't split as `settings-drawer` did. Nothing else draws a
  whole How to play, so no whole mixin stays to share, and a frame mixin
  would have one caller. The component builds the card from
  `dialog-card(580px)` and `corner-close-button`, as the plan's "the
  frame's half moves into the component" says, and `@fz/style` keeps only
  the words' half, `help-text` and `help-controls`. `toolkit.spec.ts` drops
  `help-card`'s two checks and checks `help-controls`' table, column heads
  and keycaps.

The review:

1. _The skill's description said "its overflow and choice menus" twice, on
   a line this step rewrites:_ taken by the move onto `shared-lib`, whose
   description has it once. The pop kept that and added this step's words.
2. _"A game's stylesheet" is wider than safe, as `help-controls` writes bare
   `table`, `th`, `td` and `kbd` rules, which an app's own stylesheet would
   spread over the whole shell; the settings drawer's docs from 4.3 say the
   same:_ taken for both. `help-text`, `help-controls`, `setting-fields` and
   `settings-drawer-frame`, the two components' docs, both libraries'
   `AGENTS.md` and the skill's two rows now name the stylesheet of the
   game's How to play or settings component.

Before committing, the worktree moved onto `shared-lib`, with 4.3 picked as
`be150fbf`. The stash popped with one conflict, in the skill, where
`shared-lib` had resolved 4.3's by hand; this step's edits were made again
on `shared-lib`'s text, and the dialogs row kept its width so the table
isn't re-padded.

### Step 3.2: `viewportOf()` and `canvasChanged()` in `@fz/phaser/scene`

Built as planned on `sl-play`. `@fz/phaser/scene` exports
`viewportOf(scene, insets)`, the `Viewport` a scene lays itself out on, and
`canvasChanged(scene, last)`, which says whether the canvas has a new size
or pixel ratio since `last`, or `last` is `null`. Snake, Brick Breaker and
Asteroid Breaker build their viewports with the first and test with the
second before their own checks: the chrome, the finger room and the
field's height, the board and the torus. Each scene lays itself out again
in the same cases as before and builds the same viewport.

Before the review fixes, the work was rebased onto `shared-lib`, with no
conflicts and the same lockfile. Tests pass: phaser 611, Snake 423, Brick
Breaker 1842 and 180, Asteroid Breaker 3625 and 1620.

Where it went other than planned:

- The helpers live in a file of their own, `src/scene/viewport.ts`; the
  plan named no file.
- Snake keeps its null check, so its `viewport.insets` comparison needs no
  `?.`.

The review:

1. _The spec didn't pin that `viewportOf()` keeps the insets object it is
   given, which Snake's `moved()` compares by identity; a copy would lay
   Snake out every frame:_ taken. A case, "keeps the chrome it is given,
   not a copy", expects `toBe(CHROME)`, and the doc comment says the chrome
   is the object given, so a scene can tell by identity whether it is still
   the one over it. A copying mutant fails it.
2. _"Leaves the chrome over the canvas to the scene" couldn't fail:_ taken.
   It is dropped; the doc comment already says the chrome is the scene's to
   check.
3. _Every case ran on a hand-built scene cast `as unknown as Scene`:_
   taken. The size cases, never laid out and unchanged run on a real scene
   through `runBareScene()`, and the width and height rows resize it with
   `run.game.scale.resize()`. `sceneAt()` stays only for the pixel ratio,
   which the harness holds at 1. Mutants that skip the width or the height
   check each fail their row.
