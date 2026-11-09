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
