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
entry. Maria and Limited are entries of their own for exactly this reason —
nine and twelve columns are not Forty Thieves' ten — while still sharing
`FortyThievesGame`, its module and its board factory.

Same grid, different rules: default to a **variant option** on the existing
entry. Whitehead and Thumb and Pouch are options on Klondike, Alaska and Russian
Solitaire on Yukon, Josephine and Rank and File on Forty Thieves, Will o' the
Wisp on Spiderette — all traditional games with their own names, all options.

Baker's Game is the one that goes the other way: its own catalog entry on
FreeCell's grid, sharing `FreeCellGame` and `FREECELL_LAYOUT`, so that FreeCell's
entry can stay optionless. Follow the default unless you have that kind of
reason.

These are three independent decisions, and it is worth keeping them apart:

| Decision                                                | Driven by                                                                          |
| :------------------------------------------------------ | :--------------------------------------------------------------------------------- |
| Share the game **class**?                               | How much of the rules differ. Two lines → share it.                                |
| Share the **catalog entry** (i.e. be a variant option)? | Same grid → yes by default. Different grid → impossible.                           |
| Share the **board factory**?                            | Effectively always, when the class is shared: a board reads the grid off the game. |

### Adding a variant to an existing game

No new directory, no new board. Add a member to the game's variant union in
`<game>_rules.ts`, add its row to that file's variant table, and add a choice to
the `GameOptionSpec` in `src/ui/app/provider/game_catalog.ts`. Use the variant
enum members themselves as the option's `value`s — as `YUKON_VARIANT` and
`SPIDERETTE_VARIANT` do — so the choices offered and the games selected cannot
drift apart. Then document the new choice under `settingsAndVariants` in
`src/ui/app/provider/game_documentation_data.ts`.

---

## 2. `<game>_rules.ts` — roles and what each pile accepts

Two things: a `Role` const object naming the parts a pile can play, and a
function mapping a role to a `PlacementRule` (or `null` for a pile that is never
a destination — which is a different statement from "always refuses", and stops a
drag offering the stock as a target).

Compose the rule from the vocabulary in `src/engine/tableau/rules.ts` rather than
writing predicates by hand:

- **Combinators** — `all`, `any`, `byEmptiness(whenEmpty, whenOccupied)`,
  `cardIs(predicate)`, `hasRank`, `never`, `anyCard`, `singleCardOnly`,
  `maxStackSize(limit)`.
- **Adjacency** (what may sit directly on what) — `isOrderedPair`,
  `isSameSuitRun`, `isSameColorRun`, `isDifferentSuitRun`, `isAnySuitRun`.
- **Builds**, each derived from an adjacency via `buildsOn` —
  `descendingAlternatingColor`, `descendingSameSuit`, `descendingSameColor`,
  `descendingDifferentSuit`, `descendingAnySuit`, `ascendingSameSuit`.
- **Whole piles** — `suitFoundation` (Ace up by suit), `singleCardCell`.
- **Staging** — `cellStagingLimit(cellRole)` for the `free cells + 1` supermove
  limit shared by Eight Off, Seahaven and Kings-only Baker's Game.

A rule that needs to see the rest of the board gets `context.board`
(`BoardQuery`: `pile`, `pilesByRole`, `emptyCount`) — that is what FreeCell's
`supermoveLimit` counts empty cells and columns with.

**If the game has variants, put them in one table.** `freecell_rules.ts` and
`forty_thieves_rules.ts` pair each variant's build rule with its grab adjacency
in a single `Record`, deliberately: a run that can be lifted under one and not
landed under the other is a bug that only appears mid-drag, and the pairing is
what a reader has to be able to check at a glance.

---

## 3. `<game>_zones.ts` — the board as data

A `ZoneSpec` per pile (`src/engine/tableau/zone.ts`): its id, role, grid slot,
`layout`, `accept`, `grab`, `draggable`, `face`, and optionally `capacity`,
`backgroundKey`, `emptyIsActionable`. This replaces switching on a pile's role
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
(Klondike columns — deliberately lax), or `{ kind: "run", adjacent }` (FreeCell,
Spider). It must agree with the build rule from step 2.

**Memoize the result.** Wrap in `memoizeZones` from
`src/engine/tableau/zone_builder.ts` (or export a module-level const when the
board takes no parameters, as Spiderette does). `TableGame.zoneFor` rebuilds its
id index whenever it is handed a different array and is asked once per card per
frame, so returning a fresh array per call rebuilds that index forever. The cache
is bounded by the number of variants, so it cannot go stale.

For a slot that is not a plain consecutive row — Montana's grid — `zoneRow`
accepts a function for `column`.

---

## 4. `<game>_deal.ts` — the opening position

A plain function taking the deck and the piles, draining the deck. Reuse first:

- `dealColumnsThenCells(deck, tableaus, cells, cardsPerColumn)` —
  `src/games/common/row_deal.ts`, the opening of every all-face-up cell game.
- `dealRowFromStock(stock, columns)` — same file, for a Spider-style stock that
  pushes a card onto every column and returns one transfer per card.

Set `card.faceUp` explicitly for every card you place. Dealing puts cards into
piles directly and so **bypasses the placement rules entirely** — a cell's
`capacity: 1` is declared on its zone and enforced on moves, but the deal has to
honour it itself.

---

## 5. `<game>_game.ts` — the class

Extend `DealtTableGame` (`src/engine/tableau/dealt_game.ts`). It already owns the
new-game and restart cycle, including keeping the dealt order aside so a restart
replays the same game.

```ts
super({
  zones: () => myGameZoneSpecs(variant),
  deck: new DeckSource(new CardRegistry(), cardIds, random, /* faceUp */ true),
  autoMoveRoles: [MyRole.FOUNDATION, MyRole.TABLEAU, MyRole.CELL],
  winsWhenAllCardsIn: MyRole.FOUNDATION,
});
```

Then grab your piles with `this.pilesOfRole(role)` / `this.requirePile(id)`.

Constructor shape, followed by every game: `(cardIds = ALL_PLAYING_CARD_IDS,
random = Math.random, variant?)`. Both defaults are there so a test can supply a
short deck and a fixed shuffle. A variant is a constructor parameter rather than
a field because the zones closure is built from it during `super`.

The only required override is `dealBoard(deck)`. Optionally:

- `applyMoveEffects(move)` — what a move does beyond relocating cards. Two shapes
  are already written in `src/games/common/move_effects.ts`: `flipOnlyEffects`
  (Yukon, Easthaven, Forty Thieves) and `runCollectingEffects` (Spider,
  Spiderette, Scorpion). Klondike scores its flip and so calls
  `flipExposedTopOfColumn` directly.
- A stock action. `drawToWaste(stock, waste, count)` and
  `recycleWasteToStock(waste, stock)` from `src/games/common/stock_pile.ts` move
  the cards and return transfers; the game records them, because whether a
  recycle costs points is the game's business, not the stock's.

**Everything you do not write:** the piles and where every card is, move
legality, `moveCardToPile` / `autoMoveCard`, undo and the move history, the win
check, hover, the double-press window, the stack in hand, sprite lifecycle.

Two things to get right when the game acts outside the normal move path:

1. **Fold consequences into the causing action.** A completed run collected after
   a move goes in that move's `followUpTransfers` / `flippedCardIds`, so one undo
   takes the whole thing back. Record a dealt row and the runs it completed with
   a single `recordTransfers` call.
2. **Check the win yourself for actions the move path never sees.** Spiderette's
   `dealRow` calls `checkWinCondition()` because dealing can finish the last run.

---

## 6. `<game>_layout.ts` — the grid

```ts
export const MY_GAME_LAYOUT = boardLayout({
  columns: TABLEAU_COUNT,
  rows: 2,
  zones: myGameZoneSpecs(),
  designHeightPx: 1120,
});
```

`boardLayout` (`src/games/common/board_layout.ts`) reads the slots off the zones,
so a pile cannot be declared in one place and positioned in another. The only
judgement is `designHeightPx`: the grid's own height is not enough, because a
column fans well below its row. Klondike authors 950, FreeCell 1120 for columns
that can reach thirteen cards at 45px apart.

---

## 7. `<game>_gestures.ts` — only if a press means something

A game with no stock does not need this file at all: pass
`stocklessGestures(game)` from `src/games/common/table_gestures.ts`, as FreeCell
does.

Otherwise call `tableGestures(game, options)` with:

- `onCardPress` — `drawOnStockTop(role, draw)` for a stock whose top card draws
  (Klondike, Forty Thieves), or `dealOnStockPress(role, deal)` for one that deals
  a row wherever it is pressed (Spider, Scorpion, Easthaven).
- `onPilePress` — a press on an _empty_ slot: Klondike's recycle, Montana's
  redeal. Pair it with `emptyIsActionable` on the zone, which is what gives the
  slot a pointer cursor.
- `autoMoveFrom` — which roles answer a double press. Omit it entirely for a
  stockless game: everything on the board is in play.

---

## 8. `<game>_board.ts` — the scene

Nearly boilerplate, and intentionally so:

```ts
export function makeMyGameBoardScene(
  game: MyGame,
  presentation: TablePresentation,
  onReady?: () => void,
): BoardScene {
  return makeTableBoardScene({
    game,
    layout: MY_GAME_LAYOUT,
    handleIntent: myGameGestures(game),
    presentation,
    onReady,
  });
}
```

`makeTableBoardScene` (`src/games/common/board_scene_factory.ts`) measures the
grid, builds each frame's view state, resolves drops and follows resets. There is
no scene-bridge tier below this: `PhaserHost`
(`src/engine/render/phaser/phaser_host.ts`) mounts whatever board factory it is
handed, so the shell never imports a game in order to host one.

---

## 9. Register it — three provider edits

1. **`src/ui/app/provider/game_catalog.ts`** — declare the entry (`id`, `name`,
   two-character `marker`, `options`, `layout`, `create`) with `satisfies
CatalogEntry<MyGame>`, not an explicit annotation: the `satisfies` is what
   preserves the literal id and concrete game type that the board registry is
   checked against. Add it to `CATALOG_ENTRIES`. `create` must call
   `game.startNewGame()` before returning `{ game }`.
2. **`src/ui/app/provider/board_catalog.ts`** — map the id to the factory in
   `BOARD_FACTORIES`. The mapped type means a missing or mismatched board is a
   compile error, not a runtime throw.
3. **`src/ui/app/provider/game_documentation_data.ts`** — add the rules page.
   `CompleteGameDocumentation` is `Record<GameId, …>`, so shipping a game with no
   page is also a compile error. Capture its hero screenshot to
   `public/docs/screenshots/<id>/overview.png`.

**Routes and the game rail need no edit** — both are derived from the catalog.

---

## 10. Test it

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

- **Zones not memoized** — a per-frame index rebuild. See step 3.
- **Grab and build rules disagreeing** — a run liftable but not landable, which
  only shows up mid-drag. Pair them in one table.
- **A supermove limit the board cannot honour** — an empty _destination_ column
  does not count towards its own staging capacity (it is where the run is going),
  and under Kings-only empty columns the `× 2 ^ (empty columns)` term disappears
  entirely, because a moving same-suit run's only King is its bottom card.
- **Dealing past a capacity** — deals bypass placement rules.
- **A consequence recorded as its own action** — undo then takes it back in two
  presses instead of one.
- **A transfer recorded in the wrong order** — a transfer records where cards
  came _from_, so `drawToWaste` reverses the drawn cards before recording; that
  is what lets undo re-append them and get the original pile back.
- **`designHeightPx` left at the grid height** — long columns fall off the board.
