---
name: add-solitaire-game
description: Add a solitaire game or a rule variant to fSolitaire — deciding between a new catalog entry and a variant option, the files to write and register, the shared pieces to build a board out of instead of hand-rolling, and which layer new code is allowed to live in.
---

# Adding a solitaire game

A new game is seven small files under `src/games/<game>/` and three provider
edits. Almost none of it is new machinery: the board, the moves, undo, the win
check, the drag and the sprites already exist and are the same in every game.
What a game actually contributes is **what its piles are, what they accept, what
may be lifted off them, and how the cards start out**.

Work in this order. Each step compiles against the one before it.

---

## 1. Decide: a new entry, or an option on an existing game?

The one hard constraint: **a catalog entry carries exactly one `layout`**, so an
option cannot change the grid. A different board grid is therefore always a new
entry. Maria, Limited and Lucas are entries of their own for exactly this
reason — nine, twelve and thirteen columns are not Forty Thieves' ten — while
still sharing `FortyThievesGame`, its module and its gestures. Mrs. Mop shares
`SimpleSimonGame`, Blue Moon `MontanaGame`, Trefoil `LaBelleLucieGame`, All in
a Row `BlackHoleGame` and Fortress `CastleGame` the same way.

Same grid, different rules: default to a **variant option** on the existing
entry. Whitehead, Thumb and Pouch and Saratoga are options on Klondike, Alaska,
Russian Solitaire and Moosehide on Yukon, Josephine, Rank and File, Indian and
Number Ten on Forty Thieves, Will o' the Wisp on Spiderette, Red Moon on Blue
Moon, Putt Putt on Golf, Sir Tommy on Calculation, Belvedere on Bristol, The Fan
and Shamrocks on La Belle Lucie, Storehouse, Superior Canfield and Rainbow on
Canfield, and Streets and Alleys and Citadel on Beleaguered Castle — all
traditional games with their own names, all options.

Baker's Game and Challenge FreeCell are the ones that go the other way: each is
its own catalog entry on FreeCell's grid, sharing `FreeCellGame` and
`FREECELL_LAYOUT`, so that FreeCell's entry can stay optionless. Follow the
default unless you have that kind of reason.

These are three independent decisions, and it is worth keeping them apart:

| Decision                                                | Driven by                                                |
| :------------------------------------------------------ | :------------------------------------------------------- |
| Share the game **class**?                               | How much of the rules differ. Two lines → share it.      |
| Share the **catalog entry** (i.e. be a variant option)? | Same grid → yes by default. Different grid → impossible. |
| Share the **gestures**?                                 | Always, when the class is shared.                        |

### Adding a variant to an existing game

No new directory, no new board. Add a member to the game's variant union in
`<game>_rules.ts`, add its row to that file's variant table, and add a choice to
the option in `src/ui/app/provider/game_catalog.ts`. Each choice carries two
things: its `rule`, the variant member the game is handed, and its `value`, the
number the settings panel stores. Give a new choice the next unused `value` and
never renumber an old one, or a saved preference picks a different game. Build
the option with `gameOption<MyVariant>({ …, defaultRule })` — as `YUKON_VARIANT`
and `SPIDERETTE_VARIANT` do — so `optionRule` hands back the variant without a
cast and the default cannot name a choice that is not offered. Data written in
the game's own terms, such as a profile's `values`, converts through
`storedValue` or `storedValues` rather than spelling out a number. A variant
option has the id
`variant` and `control: "list"`, which offers one choice to a row, and every
choice carries a one-line `description` of what sets it apart; the catalog spec
fails a variant option without them. Then document the new choice under
`settingsAndVariants` in
`src/ui/app/provider/game_documentation_data.ts`.

If the variant is known by a name of its own, as Whitehead and Russian Solitaire
are, also add it to its game's `variants` in
`src/ui/app/provider/game_profile_data.ts`, so the game browser lists it as a
game. A choice that only makes the game easier or harder, as Spider's suit count
does, stays a rule: rate it with a `DifficultyByRule` instead.

---

## 2. `<game>_rules.ts` — roles and what each pile accepts

Two things: a `Role` const object naming the parts a pile can play, and the
`PlacementRule` each destination pile plays by, as named constants or functions
of the variant (`KLONDIKE_FOUNDATION_RULE`, `klondikeTableauRule(variant)`).
The zones in step 3 name them directly. A pile that is never a destination
gets `accept: null` there, which is a different statement from "always
refuses", and stops a drag offering the stock as a target. Do not write a
function mapping a role back to its rule: the zone already knows which rule it
wants.

Compose the rule from the vocabulary in `src/engine/tableau/rules.ts` rather than
writing predicates by hand:

- **Combinators** — `all`, `any`, `byEmptiness(whenEmpty, whenOccupied)`,
  `cardIs(predicate)`, `hasRank`, `never`, `anyCard`, `singleCardOnly`,
  `maxStackSize(limit)`.
- **Adjacency** (what may sit directly on what) — `isOrderedPair`,
  `isSameSuitRun`, `isSameColorRun`, `isDifferentSuitRun`, `isAnySuitRun`,
  the wrapping forms where an Ace takes a King (`isOrderedPairWrapping`,
  `isSameSuitRunWrapping`, `isAnySuitRunWrapping`), and `isAdjacentRank(wraps)`
  for the Golf family's one rank up or down.
- **Builds**, each derived from an adjacency via `buildsOn` —
  `descendingAlternatingColor`, `descendingSameSuit`, `descendingSameColor`,
  `descendingDifferentSuit`, `descendingAnySuit`, their `…Wrapping` forms,
  `ascendingSameSuit`, `ascendingSameSuitWrapping` and `ascendingAnySuit`.
- **Whole piles** — `suitFoundation` (Ace up by suit), `singleCardCell`, and
  `baseRankFoundation(role)` for foundations that start on a rank the deal
  chooses, read off the board with `baseRankOf` (Canfield, Penguin).
- **Staging** — `cellStagingLimit(cellRole)` for the `free cells + 1` supermove
  limit shared by Eight Off, Seahaven and Kings-only Baker's Game.

A rule that needs to see the rest of the board gets `context.board`
(`BoardQuery`: `pile`, `pilesByRole`, `emptyCount`) — that is what FreeCell's
`supermoveLimit` counts empty cells and columns with.

**Derive a column's build and lift from one adjacency.** When the runs a
player may lift are the runs they may build, use `runColumn({ adjacent,
whenEmpty, maxStack })` from `src/engine/tableau/zone.ts`, which returns the
`accept` and `grab` together, and spread it into `columnRow` (Eight Off,
Seahaven, Easthaven, Penguin, Canfield, FreeCell). A run that can be lifted
under one rule and not landed under the other is a bug that only appears
mid-drag. Spider, Spiderette and Simple Simon build on any suit but lift only
same-suit runs, deliberately, so they name the two apart.

**If the game has variants, put them in one table.** `freecell_rules.ts` keeps
each variant's `runColumn` options in a single `Record`, and
`forty_thieves_rules.ts` and `klondike_rules.ts` pair each build rule with its
grab rule there, so a reader can check them at a glance.

---

## 3. `<game>_zones.ts` — the board as data

A `ZoneSpec` per pile (`src/engine/tableau/zone.ts`): how it plays, its
`ZoneRules` (id, role, `accept`, `grab`, `draggable`, optionally `capacity`),
and how it looks, its `ZoneLook` (`src/engine/tableau/view/zone_look.ts`: grid
slot, `layout`, `face`, optionally `backgroundKey`, `emptyIsActionable`). This replaces switching on a pile's role
anywhere else.

Build the rows from `src/games/common/zone_presets.ts` — `foundationRow`,
`cellRow`, `columnRow`, `stockZone`, `wasteZone` — which already carry the
placeholder artwork, the stacking, the face rule and the sane grab defaults.
Ids come from `src/games/common/pile_ids.ts` (`foundationPileId`,
`tableauPileId`, `cellPileId`, `STOCK_PILE_ID`, `WASTE_PILE_ID`) so the model and
the render layout cannot name the same pile differently. Pile arrangements come
from `src/games/common/pile_layouts.ts` — `STACKED_PILE_LAYOUT`,
`BURIED_COLUMN_LAYOUT` (any card dealt face down), `OPEN_COLUMN_LAYOUT` (all face
up), `wasteFanLayout(drawCount)`.

`GrabRule` is the interesting choice: `"none"`, `"top-only"`, `"any-face-up"`
(Klondike columns — deliberately lax), `{ kind: "run", adjacent }` (FreeCell,
Spider), or `{ kind: "uncovered", coveredBy }` for a card free only once the
piles lying over it are empty (Pyramid, TriPeaks; `isUncovered` in
`src/engine/tableau/zone.ts` asks the same of an accept rule). It must agree
with the build rule from step 2.

**Write it as a plain function of the choices that shape the board**, such as
the variant or the draw count. The game hands the result to `super` once and
`TableGame` indexes it there, so a game's zones are fixed for its life: changing
a rule deals a new game rather than reshaping this one.

For a slot that is not a plain consecutive row — Montana's grid — `zoneRow`
accepts a function for `column`. Slots may be fractional: Flower Garden's
bouquet overlaps at fractional columns, Pyramid's rows sit half a row apart and
Grandfather's Clock lays its foundations on a circle. Piles are drawn in
declaration order, so declare the ones that should lie on top last; the loading
skeleton places fractional slots too.

---

## 4. `<game>_deal.ts` — the opening position

A plain function taking the `Deal` (`src/engine/tableau/deal.ts`) and the
piles. The deal hands out the shuffled deck, last card first, and places cards
through the tabletop: `dealTo(pile, faceUp)` deals the next card,
`dealEach(piles, faceUp)` one to each pile, `dealRest(pile, faceUp)` all
that is left, `pull(predicate)` and `pullFirst(predicate)` take out cards the
deal places before the rest (Aces that start on the foundations), and
`place(card, pile, faceUp)` puts a card you drew or pulled. `peek`,
`putBack`, `putUnder` and `drawAll` cover the odd deal (Penguin's beak,
FreeCell's buried Aces, Nestor's rank rule, La Belle Lucie's fans). Never call
a pile's `addCard`. Reuse first:

- `dealColumnsThenCells(deal, tableaus, cells, cardsPerColumn)` —
  `src/games/common/row_deal.ts`, the opening of every all-face-up cell game.
- `dealRowFromStock(tabletop, stock, columns)` — same file, for a Spider-style
  stock that
  pushes a card onto every column and returns one transfer per card.
- `dealRowCollectingRuns(tabletop, stock, dealTo, columns, foundations)` —
  same file, for
  a stock deal that can finish a run: it deals, sends every completed run to a
  foundation, and returns the transfers and flipped cards to commit together.
- `sinkKings(column)` — `src/games/common/sink_kings.ts`, for a game whose
  columns never take a King (Baker's Dozen, Bristol).

Say which side every card shows as you place it. Dealing puts cards into piles
directly and so **bypasses the placement rules entirely** — a cell's
`capacity: 1` is declared on its zone and enforced on moves, but the deal has to
honour it itself.

---

## 5. `<game>_game.ts` — the class

Extend `DealtTableGame` (`src/engine/tableau/dealt_game.ts`). It already owns the
new-game and restart cycle, including keeping the dealt order aside so a restart
replays the same game.

```ts
super({
  zones: myGameZoneSpecs(variant),
  deck: { cardIds, random, dealsFaceUp: true },
  autoMoveRoles: [MyRole.FOUNDATION, MyRole.TABLEAU, MyRole.CELL],
  winsWhenAllCardsIn: MyRole.FOUNDATION,
});
```

Then grab your piles with `this.pilesOfRole(role)` / `this.requirePile(id)`.
They come back as `ReadonlyCardPile`s (`src/engine/core/card/card_pile.ts`),
which is also how the game hands them to anyone else: a game changes a pile
only through `this.tabletop` or, while dealing, the `Deal`.

Constructor shape, followed by every game: one options object extending
`DeckOptions` (`src/games/common/deck_options.ts`), destructured with its
defaults — `constructor({ cardIds = ALL_PLAYING_CARD_IDS, random,
variant = DEFAULT_MY_VARIANT }: MyGameOptions = {})`. `cardIds` and `random` are
there so a test can supply a short deck and a fixed shuffle; `DealtTableGame`
builds the deck from them, shuffling with `Math.random` when `random` is left
out. A variant is an
option rather than a field set later because the zones are built from it during
`super`.

The only required override is `dealBoard(deal)`. Optionally:

- `applyMoveEffects(move)` — what a move does beyond relocating cards. Two shapes
  are already written in `src/games/common/move_effects.ts`: `flipOnlyEffects`
  (Yukon, Easthaven, Forty Thieves) and `runCollectingEffects` (Spider,
  Spiderette, Scorpion). The Klondike family scores its flip, so
  `KlondikeFamilyGame` (`src/games/klondike/klondike_family_game.ts`) calls
  `flipExposedTopOfColumn` directly. A game played with Klondike's stock and
  scoring extends that class and writes only `dealBoard`, as Double Klondike
  does. A pairing game (Nestor, Monte Carlo, Pyramid) takes `pairsWithTop`,
  `sameRank` or `totalsThirteen` and `discardPairEffects` from
  `src/games/common/pair_removal.ts`: the partner's pile takes the card, then
  the effect sends both to the discard. Such a pile must have no `capacity`,
  which is checked before the accept rule.
- A stock action. `drawToWaste(tabletop, stock, waste, count)` and
  `recycleWasteToStock(tabletop, waste, stock)` from
  `src/games/common/stock_pile.ts` move
  the cards and return transfers. The game commits them with
  `commitAction(kind, transfers, options)`, because whether a recycle costs
  points is the game's business, not the stock's.
  Name the action with `ActionKind` from `src/games/common/action_kinds.ts`.
  A game that limits an action, such as Klondike's recycles or Montana's
  redeals, reads `timesApplied(kind)` rather than keeping a count of its own:
  the count comes from the history, so undo, restart and restore keep it right
  with nothing to save or take back.
- `isWon()` — only for a game won by the order of its cards rather than by
  gathering them into one role. Montana overrides it and leaves
  `winsWhenAllCardsIn` unset.

**Every recorded change of pile goes through `this.tabletop`**
(`src/engine/tableau/tabletop.ts`). `relocate(cards, to, { faceUp })` moves
cards from the one pile holding them and returns the `CardTransfer` that undo
needs; `rearrange(layout)` lays out several piles at once, as a redeal does
(La Belle Lucie, Montana, Monte Carlo), and returns transfers that restore them
all. Never build a `CardTransfer` by hand or call a pile's `addCard` or
`removeCard` in an action: the transfer would be a second description of the
change, free to disagree with it. The shared helpers above take the tabletop
as their first argument for the same reason.

**Everything you do not write:** the piles and where every card is, move
legality, `moveCardToPile` / `autoMoveCard`, undo and the move history, the win
check, hover, the double-press window, the stack in hand, sprite lifecycle.

Two things to get right when the game acts outside the normal move path:

1. **Fold consequences into the causing action.** A completed run collected after
   a move goes in that move's `followUpTransfers` / `flippedCardIds`, so one undo
   takes the whole thing back. Commit a dealt row and the runs it completed with
   a single `commitAction` call, which `dealRowCollectingRuns` sets up.
2. **Commit through `commitAction`, and nothing else.** It records the action,
   which is what counts it as a move, makes it undoable, applies the
   `scoreDelta` you pass and checks for a win, as `moveCardToPile` does. A
   game never writes its metrics: `state` is read-only, the move count is the
   length of the history, and the score changes only by the deltas a game
   reports, from `applyMoveEffects` or `commitAction`. A game whose deal
   starts at a score other than zero overrides `initialScore()`, as Vegas
   Klondike does.

---

## 6. `<game>_layout.ts` — the grid

```ts
export const MY_GAME_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: myGameZoneSpecs(),
  designHeightPx: 1047,
});
```

`boardLayout` (`src/games/common/board_layout.ts`) reads the slots off the zones,
so a pile cannot be declared in one place and positioned in another. The only
judgement is `designHeightPx`: the grid's own height is not enough, because a
column fans well below its row. Klondike authors 877, FreeCell 1047 for columns
that can reach thirteen cards at 45px apart. It is the board's own height: the
shell's chrome lies over the canvas, and the board reads how far in it reaches
from each edge (`--board-inset-top`, `-right`, `-bottom`, `-left`) at run
time rather than reserving it.

The catalog entry carries this layout (step 8), and both the loading skeleton
and the board are drawn on it. Every rule option of one entry must therefore
deal onto the same grid, which `test/ui/app/provider/catalog.spec.ts` checks for
every game.

### Phone grids (optional)

Without phone grids a game lies on this one grid everywhere, compacted on a
phone. To lay it out for a phone, declare its board to `phoneLayouts`
(`src/games/common/phone_layouts.ts`) beside the grid, as Klondike and Spider
do in `src/games/klondike/klondike_layout.ts` and
`src/games/spider/spider_layout.ts`:

```ts
export const MY_GAME_PHONE_LAYOUTS = phoneLayouts({
  columns: pileIdsInRow(ZONES, 1),
  row: pilesInRow(ZONES, 0),
  rails: {
    left: FOUNDATIONS.map((pileId) => ({ pileId, overlapped: true })),
    right: [{ pileId: STOCK_PILE_ID }],
  },
  longestColumn: { faceDown: 6, faceUp: 12 },
});
```

- **columns** fan down and take the height; **row** is the other piles, read
  off the zones with `pilesInRow`, so a pile is still placed in one place.
- **rails** say which row piles stack down which edge of a sideways phone. Every
  row pile goes on exactly one rail. Mark foundations `overlapped`; give a
  pile that spreads down the rail `spreadsDown` and the `reach` its cards
  need.
- **longestColumn** is the column every grid keeps on screen with fans at
  their floor; the builder sets each grid's design height from it.
- **pileLayouts** (optional) changes how a pile arranges its cards on every
  phone grid, as Spider's stock shows one sliver per deal.

The builder gives three grids: upright with the row above the columns, upright
with the row mirrored along the bottom (the default), and sideways with the
rail piles at the edges. All three fit each column's fan to the room below it.
Name them as `phoneLayouts` on the catalog entry (step 8). The settings drawer
then offers the upright layout and the hand for the game, the board mirrors
it for a left hand (keeping the columns in order), and the catalog spec checks
every grid places every pile. Add a `<game>_layout.spec.ts` that the longest
column fits the room below it on a few phone sizes, as
`test/games/klondike/klondike_layout.spec.ts` does.

---

## 7. `<game>_gestures.ts` — only if a press means something

A game with no stock does not need this file at all: map it to
`stocklessGestures` from `src/engine/tableau/table_gestures.ts` in step 8, as
FreeCell does.

Otherwise call `tableGestures(game, options)` with:

- `onCardPress` — `drawOnStockTop(role, draw)` for a stock whose top card draws
  (Klondike, Forty Thieves), `dealOnStockPress(role, deal)` for one that deals
  a row wherever it is pressed (Spider, Scorpion, Easthaven), or
  `playOnPress(game, roles)` where a single press plays a card (Golf, Black
  Hole, TriPeaks) — with `autoMoveFrom: []`, so a double press plays nothing
  more.
- `onPilePress` — a press on an _empty_ slot: Klondike's recycle, Montana's
  redeal. Pair it with `emptyIsActionable` on the zone, which is what gives the
  slot a pointer cursor and a hover border.

  If the slot can run out of things to do, mark it in the game's constructor
  with `markPile(pile, marker)`, as `KlondikeFamilyGame` and `MontanaGame` do.
  The view asks the marker every frame for the artwork and whether the empty
  slot is pressable, so the slot drops its pointer and shows
  `CLOSED_STOCK_PLACEHOLDER` the moment a press would do nothing. Build the
  marker with `recycleMarker({ usable, remaining, allowed })` from
  `src/games/common/zone_presets.ts`, which also shows the recycles or redeals
  left as pips when they are counted. Pip artwork exists only for the counts
  in its `PIP_COUNTS`. Do not override `pileBackgroundKey` or
  `isEmptySlotActionable`.

- `autoMoveFrom` — which roles answer a double press. Omit it entirely for a
  stockless game: everything on the board is in play.

---

## 8. Register it — four provider edits

1. **`src/ui/app/provider/game_catalog.ts`** — declare the entry (`id`, `name`,
   `options`, `layout`, optional `phoneLayouts`, `create`) with `satisfies
CatalogEntry<MyGame>`, not an explicit annotation: the `satisfies` is what
   preserves the literal id and concrete game type that the board registry is
   checked against. Add it to `CATALOG_ENTRIES`. `create` returns
   `dealt(new MyGame({ … }))`, which deals the game before handing it over.
2. **`src/ui/app/provider/board_catalog.ts`** — map the id to its gestures in
   `GESTURES`. The mapped type means a missing or mismatched entry is a compile
   error, not a runtime throw. There is no per-game board file:
   `makeTableBoardScene` (`src/engine/board/table_board_scene.ts`) draws every
   game from its gestures and its entry's grids (`boardLayoutsOf`), and `PhaserHost`
   (`src/engine/render/phaser/phaser_host.ts`) swaps in whatever board it is
   handed, so the shell never imports a game in order to host one.
3. **`src/ui/app/provider/game_documentation_data.ts`** — add the rules page.
   `CompleteGameDocumentation` is `Record<GameId, …>`, so shipping a game with no
   page is also a compile error. Capture its hero screenshot, on the default
   green table, to `public/docs/screenshots/<id>/overview.png`, then run
   `yarn build:thumbs`: it crops the chrome away and writes the game browser's
   `thumb.webp` and `preview.webp` beside the screenshot, and a spec fails while
   either is missing.
4. **`src/ui/app/provider/game_profile_data.ts`** — add the profile the game
   browser lists it by: its family, tagline, difficulty, decks, whether every
   card is dealt in view, and any variants with names of their own.
   `CompleteGameProfiles` is keyed by `GameId` as well, and
   `test/ui/app/provider/game_profile.spec.ts` checks the deck count and
   visibility against a deal.

**Routes and the game browser need no other edit** — the routes are derived
from the catalog, and the browser lists a game from its entry and its profile.

---

## 9. Test it

`test/games/<game>/<game>_game.spec.ts` — the deal, each rule that is actually
this game's own, the win condition, and undo of anything that moves more than one
card at a time. Pass a fixed `random` and, where it sharpens the test, a short
`cardIds` deck; both constructor parameters exist for this. Assert board state
through the public API rather than counting calls. See the `vitest-testing`
skill; UI-side specs use `configureUiTestBed` from `test/support/ui`.

Then `yarn verify` (lint → tsc → build → test). `yarn lint` runs
`yarn skills:check` first, so a skill naming a path you have moved fails here
too.

---

## Where new code is allowed to live

Each tier may depend only on the tiers below it, enforced as build errors by
`@typescript-eslint/no-restricted-imports` in `eslint.config.cjs`.

```
       [ src/ui ]              Angular shell (header, navigation, controls)
           |
      [ src/games ]            Game rules & variants — one directory per game
           |
  +--------+--------+
  |                 |
  v                 v
[ engine/tableau ] [ engine/render/phaser ]   Solitaire runtime & Phaser adapter
  |                 |
  +--------+--------+
           |
           v
   [ engine/render ]           Layout math, view contracts, drag math (Phaser-free)
           |
           v
    [ engine/core ]            Cards, piles, decks, suits, ranks, RNG
```

| Tier                                  | May import                               | Must not import                                                                                         |
| :------------------------------------ | :--------------------------------------- | :------------------------------------------------------------------------------------------------------ |
| `src/engine/core`                     | Standard TS only                         | `@/engine/render/*`, `@/engine/tableau/*`, `@/games/*`, `@/ui/*`, `phaser`, `@angular/*`, `rxjs`        |
| `src/engine/render` _(excl. phaser/)_ | `engine/core`                            | `phaser`, `@/engine/render/phaser/*`, `@/engine/tableau/*`, `@/games/*`, `@/ui/*`, `@angular/*`, `rxjs` |
| `src/engine/render/phaser`            | Phaser 4, `engine/core`, `engine/render` | `@/engine/tableau/view/table_view_builder`, `@/games/*`, `@/ui/*`, `@angular/*`, `rxjs`                 |
| `src/engine/tableau`                  | `engine/core`, `engine/render`           | `phaser`, `@/engine/render/phaser/*`, `@/games/*`, `@/ui/*`, `@angular/*`, `rxjs`                       |
| `src/games/*`                         | `engine/*`                               | `@/ui/*`, `@angular/*`, `rxjs`                                                                          |

Reading it as a decision, when you are unsure where a new piece belongs:

- Does it name a **card, pile, rank, suit or shuffle** and nothing else? →
  `engine/core`.
- Is it **geometry** — where a card sits, what a drag is over? →
  `engine/render`. It may not name Phaser, which is what keeps the renderer a
  port rather than a habit, and keeps the math testable with no mocks.
- Does it **draw**? → `engine/render/phaser`.
- Does it work for **any solitaire** — moves, undo, zones, rule combinators? →
  `engine/tableau`. Every game inherits this tier, so a dependency added here is
  a dependency of all of them, and naming a particular game here defeats the
  point of it.
- Is it this **one game's** rules, deal, layout, gestures or board? →
  `src/games/<game>/`.
- Do **two or more games** need the same helper? → `src/games/common/`. Not
  before the second one needs it.
- A game publishes through the engine's own `EventEmitter`; the Angular shell
  adapts to reactive types at its own boundary. That is why `rxjs` is banned all
  the way down.

---

## Traps that have actually bitten

- **Grab and build rules disagreeing** — a run liftable but not landable, which
  only shows up mid-drag. Pair them in one table.
- **A supermove limit the board cannot honour** — an empty _destination_ column
  does not count towards its own staging capacity (it is where the run is going),
  and under Kings-only empty columns the `× 2 ^ (empty columns)` term disappears
  entirely, because a moving same-suit run's only King is its bottom card.
- **Dealing past a capacity** — deals bypass placement rules.
- **A consequence recorded as its own action** — undo then takes it back in two
  presses instead of one.
- **A transfer written by hand** — undo re-appends a transfer's cards in the
  order they sat in the pile they came from, which is easy to get backwards
  when cards land turned over, as a draw's do. `tabletop.relocate` records
  that order itself, whatever order the cards land in; use it.
- **`designHeightPx` left at the grid height** — long columns fall off the board.
