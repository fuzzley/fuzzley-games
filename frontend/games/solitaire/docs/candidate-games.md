# Games we could add next

This file surveys solitaire games, and a few solitaire-adjacent ones, that the
engine could play without a major rework. For each one it gives the rules,
where they come from, whether it is a variant of a game already in the catalog,
and what code it would take. None of it is built yet.

The catalog today holds Klondike (with Whitehead and Thumb and Pouch), FreeCell,
Baker's Game, Eight Off, Seahaven Towers, Spider, Spiderette (with Will o' the
Wisp), Scorpion, Simple Simon, Yukon (with Alaska and Russian Solitaire),
Easthaven, Double Klondike, Forty Thieves (with Josephine and Rank and File),
Maria, Limited, Baker's Dozen and Montana.

## How to read this

Each game is one of three kinds, following the `add-solitaire-game` skill
(`.agents/skills/add-solitaire-game/SKILL.md`):

- **Variant option.** It has the same grid as an existing entry, so it becomes a
  choice in that entry's settings, as Whitehead is on Klondike. This is usually
  one row in a variant table.
- **New entry, shared class.** It has a different grid but the same rules
  machinery, as Maria and Limited share `FortyThievesGame`.
- **New game.** It gets its own directory under `src/games`.

Effort is a rough relative size:

- **S** is the skill's files and provider edits, with nothing new beyond the
  game's own rules, deal and zones.
- **M** is S plus one new mechanic, or one of the shared extensions below.
- **L** means changes in several tiers, or new UI.

Every new entry also carries fixed costs that this file does not repeat for
each game. It needs a rules page in `src/ui/app/provider/game_documentation_data.ts`
with a screenshot and a `yarn build:thumbs` run, a profile in
`src/ui/app/provider/game_profile_data.ts`, a gesture map in
`src/ui/app/provider/board_catalog.ts`, and a spec under `test/games/`. A
variant option needs its `settingsAndVariants` entry, plus a profile variant if
it has a name of its own.

## At a glance

| #   | Game                                                            | Relation to the catalog                                   | Effort | Extensions    |
| --- | --------------------------------------------------------------- | --------------------------------------------------------- | ------ | ------------- |
| 1   | Saratoga                                                        | Variant option on Klondike                                | S      | none          |
| 2   | Vegas scoring                                                   | Rule option on Klondike                                   | S–M    | E7            |
| 3   | Moosehide                                                       | Variant option on Yukon                                   | S      | none          |
| 4   | Wasp, Scorpion II                                               | Variant options on Scorpion                               | S      | none          |
| 5   | Challenge and Super Challenge FreeCell                          | New entry on FreeCell's grid and class                    | S      | none          |
| 6   | Indian, Number Ten                                              | Variant options on Forty Thieves                          | S      | none          |
| 7   | Lucas                                                           | New entry sharing `FortyThievesGame`                      | S      | none          |
| 8   | Mrs. Mop                                                        | New entry sharing Simple Simon's rules                    | S–M    | none          |
| 9   | Blue Moon, Red Moon, Addiction                                  | New entries sharing `MontanaGame`; Addiction is an option | M      | none          |
| 10  | Bisley                                                          | New game                                                  | S      | none          |
| 11  | Aces Up                                                         | New game                                                  | S      | none          |
| 12  | Golf (with Putt Putt)                                           | New game                                                  | S      | E1 for wrap   |
| 13  | Calculation (with Sir Tommy)                                    | New game                                                  | S      | none          |
| 14  | Flower Garden                                                   | New game                                                  | S      | E3            |
| 15  | Bristol (with Belvedere)                                        | New game                                                  | S      | none          |
| 16  | Nestor                                                          | New game                                                  | S      | P1            |
| 17  | Monte Carlo (with Thirteens)                                    | New game                                                  | M      | P1            |
| 18  | La Belle Lucie (with The Fan, Shamrocks, Trefoil)               | New game                                                  | M      | none          |
| 19  | Canfield (with Storehouse, Superior Canfield, Rainbow)          | New game                                                  | M      | E1, E2        |
| 20  | Penguin                                                         | New game                                                  | M      | E1, E2        |
| 21  | Black Hole, All in a Row                                        | New game; All in a Row is an entry sharing it             | S      | E1            |
| 22  | Grandfather's Clock                                             | New game                                                  | S–M    | E1, E3        |
| 23  | Pyramid                                                         | New game                                                  | M      | P1, E3, E4    |
| 24  | TriPeaks                                                        | New game                                                  | M      | E1, E3, E4    |
| 25  | Beleaguered Castle (with Streets and Alleys, Citadel, Fortress) | New game                                                  | M      | E5            |
| 26  | Poker Squares                                                   | New solitaire-adjacent game                               | M      | E6 (optional) |

Games that were considered and set aside are listed at the end, with the
reason for each.

---

## What the engine already covers

These are the parts of the engine that keep most of these games small:

- **A board is data.** Each pile is a `ZoneSpec` (`src/engine/tableau/zone.ts`)
  that gives its role, slot, layout, optional `capacity`, what it `accept`s,
  what may be grabbed from it, and which side its cards show. A rule gets
  `context.board`, so a pile can accept a card depending on any other pile,
  as Montana's cells read their left neighbour.
- **Per-zone rules.** Two piles with the same role can accept different
  cards. This is what lets Bisley's Ace and King foundations, Calculation's
  four interval foundations and Grandfather's Clock's twelve foundations all
  share one winning role.
- **Capacity is enforced on moves.** `hasRoomFor` already caps a pile at its
  `capacity`. Shamrocks' three-card fans and Calculation's thirteen-card
  foundations get their limits for free.
- **Consequences fold into the move.** `applyMoveEffects` can return
  `followUpTransfers` and `flippedCardIds`. `MoveHistory.takeBack` reverses
  transfers in reverse order, so a move whose consequences relocate other
  cards (a pair leaving for the discard, a reserve card filling a space) undoes
  in one press.
- **Custom actions.** `commitAction` together with `afterUndo`, `saveExtra` and
  `restoreExtra` is how Montana's redeal works. Any gather-and-redeal or
  consolidate step can copy it.
- **Win conditions.** `winsWhenAllCardsIn` covers games won by gathering cards.
  Overriding `isWon` covers games won some other way, such as clearing the
  tableau.
- **Decks.** A `DeckSpec` (`src/engine/core/card/deck.ts`) picks suits, ranks
  and copies, so stripped and multi-deck games need no core change.
  `DeckSource.find` fetches a particular card for a deal that places it
  first.
- **Presses.** `tableGestures` hands a game single presses, double presses and
  presses on empty slots. A game where a press plays a card, as in Golf or
  TriPeaks, calls `autoMoveCard` from `onCardPress`.
- **Off-grid slots on the canvas.** `SlotPlacement.column` and `.row` are plain
  numbers, and `computePileOrigins` multiplies them, so a slot at column 2.5 or
  row 0.5 is drawn where you would expect. Cards are drawn in zone declaration
  order, so a later zone draws over an earlier one. The loading skeleton does
  not handle this yet; see E3.

---

## Shared extensions these games need

They are numbered so that each game can point to the ones it uses. **E**
entries change shared code. **P** entries are patterns written once in
`src/games/common` and need no engine change.

### E1. Wrap-around ranks and up-or-down adjacency

`rankAbove` and `rankBelow` (`src/engine/core/card/playing_card.ts`) return
`undefined` past King and Ace, and every adjacency in
`src/engine/tableau/rules.ts` is one-directional. Several games need a King to
sit next to an Ace (Canfield, Penguin, Black Hole, TriPeaks, Grandfather's
Clock, Putt Putt), and the Golf family needs "one rank up or down".

- Add `rankAboveWrapping` and `rankBelowWrapping` to `engine/core`.
- Add adjacencies to `engine/tableau/rules.ts`: a wrapping form of
  `isSameSuitRun` and `isOrderedPair`, plus `isAdjacentRank(wrap)`. Add the
  builds derived from them with `buildsOn`, which keeps a run's grab rule and
  its build rule in step, as they are today.
- Add `ascendingSameSuitWrapping` for foundations that start mid-suit, and an
  `ascendingAnySuit` (Bristol, Sir Tommy).

**Size:** S. Pure functions, easy to test.

### E2. Foundations whose base rank is dealt

In Canfield and Penguin, the deal decides which rank starts every foundation.
Zones are fixed for a game's life, but the base rank changes with every deal.
So the rule must **read the base rank from the board**, not close over a value:
it should take the bottom card of whichever foundation is occupied. Reading it
from the board also survives `restore()` and restarts with no extra state. If
the game captured the rank in a field at deal time, it would also need a
`saveExtra`.

A small helper, `baseRankFoundation(role)`, would do this. It accepts the base
rank on an empty foundation, then builds up in suit with wrap (E1). The same
lookup gives Penguin's empty-column rule ("the rank below the beak").

**Size:** S.

### E3. Off-grid slots in the loading skeleton

The canvas draws fractional slots correctly. The loading skeleton in
`src/ui/app/component/game_canvas/game_canvas.component.html` places slots with
CSS `grid-column: slot.column + 1`, though, and a fractional value is invalid
there, so the slot falls back to auto-placement. The fix is to position
skeleton slots absolutely, as percentages of the grid. Pyramid and TriPeaks
(half-offset rows), Grandfather's Clock (a ring), Flower Garden (an
overlapping bouquet) and any tighter row pitch all need it.

**Size:** S, in `src/ui`. A spec that renders a fractional layout would keep
the fix from regressing.

### E4. Grab rules that depend on other piles

In Pyramid and TriPeaks, a card is free only when the cards overlapping it are
gone. `GrabRule` is a closed union, and `canGrab(grab, card, pile)` sees only
its own pile. Add a declarative kind:

```ts
| { readonly kind: "uncovered"; readonly coveredBy: readonly string[] }
```

It means the pile's top card may be taken only while every pile in `coveredBy`
is empty. Data is better here than an arbitrary predicate, because the same
list also serves the pair rule ("the target card must be uncovered") and
TriPeaks' flip-on-uncover. `canGrab` then needs the `BoardQuery`, which means
changes to `zone.ts`, to `TableGame.resolveMove` and the
`isCardInteractable…`/`isCardDraggable…` methods, and to `stackFromCard` in
`src/engine/tableau/view/grabbable_stack.ts` (which has the `TableView`, so the
view interface gains `board`).

A related refinement: `resolveDropTarget`
(`src/engine/render/layout/drop_geometry.ts`) picks the pile the dragged card
overlaps most, whether or not that pile would take it. On a pyramid, where
piles overlap by half a card, a drop meant for a free card can resolve to the
covered one beside it. `resolveDragTarget` in `table_view_builder.ts` could
prefer the piles that accept the stack before measuring overlap.

**Size:** S–M.

### E5. Horizontal fans that take drops along their length

The Beleaguered Castle family deals its rows sideways. `fan-right` exists, and
a large `maxVisible` fans a whole pile, but:

- `computeDropGeometries` sizes every drop area as one card wide, and grows
  only its height (`pileHeight`). A long horizontal row accepts drops only
  over its first card. It needs a `pileWidth` alongside `pileHeight` in
  `src/engine/render/layout/pile_layout.ts`.
- There is no `fan-left`, which the left wing of a castle traditionally uses,
  so that each row's free card faces outward. A first version can fan both
  wings to the right.
- A carried stack spaces itself only for `fan-down` sources (`dragContext` in
  `table_view_builder.ts`). That is harmless here, since these games move one
  card at a time.

**Size:** M. The work is in `engine/render` and stays Phaser-free.

### E6. A status readout for game-specific counters

`GameMetrics` holds only score, moves and undo depth. A count of two or three
can be drawn on the board instead, as Montana's redeal marker does with pips
(see [`montana-redeal-count.md`](montana-redeal-count.md)). These games add
counters that pips cannot carry: La Belle Lucie's redeals, Vegas' passes,
Golf's strokes, and Poker Squares' line scores. An optional `status` on `PlayableGame` (a short label and value,
evented like the metrics) would cover all of them, shown in
`header_bar.component.html` when present.

**Size:** S–M. None of these games needs it to be playable.

### E7. Scores below zero

Scores are clamped at zero in `TableGame.undo`
(`Math.max(0, this.state.score - last.scoreDelta)`), and twice more in
`KlondikeFamilyGame`. Vegas scoring starts at −52. Each `scoreDelta` already
records the change that was actually applied, so the clamp in `undo` can go.
The Klondike clamps would move into `ScoringPolicy`, so that each policy
decides whether it has a floor.

**Size:** S.

### P1. Pair removal

This pattern serves Pyramid, Nestor and Monte Carlo. The player drags card A
onto card B. B's pile accepts A only if the two make a pair (same rank, or a
sum of 13) and B is free. `applyMoveEffects` then returns a follow-up transfer
that takes both cards to the discard, so one undo puts both back. No engine
change is needed.

The trap: give the paired piles **no `capacity`**. `hasRoomFor` runs before the
accept rule, so a capacity-1 pile would refuse A before the pair rule is ever
asked. The accept rule and the deal keep these piles at one card instead.

It goes in `src/games/common` when its second user arrives, as the skill
says.

---

## Part A: variants of games already in the catalog

### 1. Saratoga

**Relation:** variant option on Klondike. **Effort:** S. **Extensions:** none.

**Rules.** This is Klondike in every respect except that all 28 tableau cards
are dealt face up. It uses the same seven columns (1 to 7 cards), the same
foundations built up in suit from Ace, and the same alternating-colour
building down. Only a King fills an empty column, and the stock is drawn one or
three at a time with unlimited passes. PySol describes it as "Klondike by
Threes, but all the cards in the tableau visible". (Thoughtful Solitaire goes
further and shows the stock's order too. That would need a face-up stock, and
is not proposed here.)

**References.**
[PySolFC: Saratoga](https://pysolfc.sourceforge.io/doc/rules/saratoga.html);
[Wikipedia: Klondike, variations](<https://en.wikipedia.org/wiki/Klondike_(solitaire)>).

**What it takes.**

- One row in `VARIANT_RULES` in `src/games/klondike/klondike_rules.ts`:
  King-only spaces, `descendingAlternatingColor`, `{ kind: "any-face-up" }`,
  and `dealsFaceUp: true`. The deal and the zone's face rule already read
  `dealsFaceUp`, which is how Whitehead deals face up.
- A choice in `KLONDIKE_VARIANT` (`game_catalog.ts`), a `settingsAndVariants`
  entry, and a named variant in the Klondike profile (difficulty: easy).

### 2. Vegas scoring

**Relation:** a rule option on Klondike. It is a way of scoring and limiting
passes, not a different game. **Effort:** S–M. **Extensions:** E7 (and E6 for a
pass counter).

**Rules.** Wikipedia describes the casino form: the cards are dealt one at a
time, there is a single pass through the stock, the player pays $50 to play,
and the house pays $5 for each card played to a foundation. Computer versions
popularised a start of −52 (a dollar a card), with one pass when drawing one
and three passes when drawing three. Play is otherwise Klondike.

**References.**
[Wikipedia: Klondike, "Las Vegas Solitaire"](<https://en.wikipedia.org/wiki/Klondike_(solitaire)>).

**What it takes.**

- E7, so the score can go negative.
- A Vegas `ScoringPolicy` (`src/games/klondike/scoring_policy.ts`). It starts at
  −52, gives +5 per card to a foundation and −5 per card taken back off one,
  with no flip bonus and no recycle penalty.
- A pass limit in `KlondikeFamilyGame.drawCardsFromStock`, which already counts
  `recycleCount`. Once the passes are spent, recycling stops working.
  `KlondikeFamilyGame.isSpentStock` would count the passes too, so the stock
  shows the closed outline and drops its pointer. An E6 readout would show the
  passes left.
- A "Scoring: Standard / Vegas" option on the Klondike entry.

### 3. Moosehide

**Relation:** variant option on Yukon. **Effort:** S. **Extensions:** none.

**Rules.** The deal is Yukon's: seven columns, the first holding one card and
the others 1 to 6 face-down cards under five face-up ones. Any face-up card may
be moved together with everything on top of it. Only a King, or a pile headed
by one, fills an empty column. Foundations build up in suit from Ace. The
difference is that columns **build down in any suit but the card's own**,
Thumb and Pouch's rule applied to Yukon.

**References.**
[PySolFC: Moosehide](https://pysolfc.sourceforge.io/doc/rules/moosehide.html).

**What it takes.**

- A `YukonVariant.MOOSEHIDE` with `descendingDifferentSuit` in
  `OCCUPIED_COLUMN_RULES` (`src/games/yukon/yukon_rules.ts`). Yukon grabs
  `any-face-up`, so there is no run adjacency to keep in step.
- A choice in `YUKON_VARIANT`, documentation, and a profile variant.

### 4. Wasp and Scorpion II

**Relation:** variant options on Scorpion. **Effort:** S. **Extensions:** none.

**Rules.** In Scorpion, 49 cards go into seven columns of seven. The first four
columns hide three cards each under four face-up cards, and three cards are
held back as a stock that later deals one card onto each of the first three
columns. Columns build down in suit, and any face-up card moves with
everything on it. Only Kings, or piles headed by one, fill empty columns.
Completed King-to-Ace runs go to the foundations.

- **Wasp:** the same, except that **any card or sequence** may fill an empty
  column.
- **Scorpion II:** only the **first three** columns hide three cards. The
  other four columns are dealt face up, which makes it easier than Scorpion.

**References.**
[Wikipedia: Scorpion](<https://en.wikipedia.org/wiki/Scorpion_(solitaire)>);
[PySolFC: Wasp](https://pysolfc.sourceforge.io/doc/rules/wasp.html);
[PySolFC: Scorpion II](https://pysolfc.sourceforge.io/doc/rules/scorpionii.html).

**What it takes.**

- Scorpion has no options today. Add a `ScorpionVariant` and a variant table
  in `scorpion_rules.ts` that pairs each variant's empty-column rule with its
  hidden-column count, and pass that count to `dealScorpionLayout`, which today
  reads the constant `HIDDEN_COLUMN_COUNT`.
- Build `scorpionZoneSpecs(variant)` from the table, give the catalog entry an
  option, and add documentation and profile variants.
- Three Blind Mice (ten columns of five) belongs to the same family but has a
  different grid, so it would be an entry of its own later.

### 5. Challenge FreeCell and Super Challenge FreeCell

**Relation:** a new catalog entry on FreeCell's grid and class, following the
Baker's Game precedent. **Effort:** S. **Extensions:** none.

**Rules.** This is FreeCell (four cells, four foundations, eight columns, build
down in alternating colours), except that the **four Aces and four Twos are
dealt to the bottom of the eight columns**, one in each, so they surface last.
Super Challenge FreeCell also lets **only Kings** fill an empty column.

**References.**
[PySolFC: Challenge FreeCell](https://pysolfc.sourceforge.io/doc/rules/challengefreecell.html);
[PySolFC: Super Challenge FreeCell](https://pysolfc.sourceforge.io/doc/rules/superchallengefreecell.html).

**What it takes.**

- FreeCell's entry is kept optionless on purpose, so this should be one
  "Challenge FreeCell" entry on `FREECELL_LAYOUT` with an "Empty Columns: Any
  Card / Kings Only" option, built exactly like `BAKERS_EMPTY_COLUMNS`.
- Two rows in `VARIANT_RULES` (`freecell_rules.ts`). Super Challenge pairs
  King-only spaces with `kingsOnlySupermoveLimit`. The reasoning in
  `cellStagingLimit` holds for alternating-colour runs as well: in any
  descending run only the bottom card can be a King, so an empty column cannot
  stage part of one.
- A deal flag in `freecell_deal.ts`: pull the eight Aces and Twos out of the
  shuffled deck and deal them first, one per column (which puts them at the
  bottom), then deal the remaining 44 cards round-robin as usual.

### 6. Indian and Number Ten

**Relation:** variant options on Forty Thieves. **Effort:** S.
**Extensions:** none.

**Rules.** Both use two decks, eight foundations built up in suit, and a stock
turned one card at a time with no redeal. Any card fills a space.

- **Indian:** ten columns of **three** cards, with the **bottom card face
  down**. Columns build down in **any suit but the card's own**, one card at a
  time.
- **Number Ten:** ten columns of four, the **bottom two face down**. Columns
  build down in **alternating colours**, and sequences move as a unit.

**References.**
[Wikipedia: Forty Thieves, variations](<https://en.wikipedia.org/wiki/Forty_Thieves_(solitaire)>);
[PySolFC: Indian](https://pysolfc.sourceforge.io/doc/rules/indian.html);
[PySolFC: Number Ten](https://pysolfc.sourceforge.io/doc/rules/numberten.html).

**What it takes.** `VARIANT_RULES` in `forty_thieves_rules.ts` already carries
exactly the fields these games change, `cardsPerColumn` and
`buriedPerColumn`, and `dealFortyThievesLayout` already honours them.

- Indian: `{ occupied: descendingDifferentSuit, grab: { kind: "top-only" }, buriedPerColumn: 1, tableauCount: 10, cardsPerColumn: 3 }`.
- Number Ten: `{ occupied: descendingAlternatingColor, grab: { kind: "run", adjacent: isOrderedPair }, buriedPerColumn: 2, tableauCount: 10, cardsPerColumn: 4 }`.
- Choices in `FORTY_THIEVES_VARIANT`, documentation, and profile variants.

### 7. Lucas

**Relation:** a new entry sharing `FortyThievesGame`, like Maria and Limited.
Its thirteen columns are a different grid. **Effort:** S. **Extensions:** none.

**Rules.** Two decks. The eight Aces start on the foundations. The rest is
dealt as thirteen columns of three, face up. Columns build down in suit, and
same-suit sequences may be moved. The stock is turned one card at a time, with
one pass. Wikipedia gives odds of about 1 in 3.

**References.**
[Wikipedia: Forty Thieves, variations](<https://en.wikipedia.org/wiki/Forty_Thieves_(solitaire)>);
[PySolFC: Lucas](https://pysolfc.sourceforge.io/doc/rules/lucas.html).

**What it takes.**

- A `LUCAS` variant row with `tableauCount: 13` and `cardsPerColumn: 3`,
  same-suit runs, and a new `acesStartOnFoundations` field. The deal moves the
  Aces first, leaving 96 cards: 39 for the columns and 57 for the stock.
- `LUCAS_LAYOUT` from `fortyThievesLayout`. `boardColumnCount` already widens
  the board to the tableau. Then the entry, the gestures
  (`fortyThievesGestures`), documentation and a profile.

### 8. Mrs. Mop

**Relation:** a new entry sharing Simple Simon's rules. It uses two decks and
thirteen columns. **Effort:** S–M. **Extensions:** none.

**Rules.** Two decks, all 104 cards dealt face up into **thirteen columns of
eight**. There is no stock. Cards build down regardless of suit, but only a
same-suit sequence moves as a unit. A complete King-to-Ace suit sequence is
discarded, and the game is won when all eight have been. PySol calls it "just
like Spider, but all the cards are dealt and face-up at the start", which also
gives Spider's any-card rule for spaces. Charles Jewell invented it.

**References.**
[Wikipedia: Mrs. Mop](https://en.wikipedia.org/wiki/Mrs._Mop);
[PySolFC: Mrs. Mop](https://pysolfc.sourceforge.io/doc/rules/mrsmop.html).

**What it takes.**

- Simple Simon already has these rules: `descendingAnySuit`, any card into a
  space, a same-suit run grab, and runs collected to foundations that are not
  drop targets. Its board is fixed by module constants (`TABLEAU_COUNT`,
  `FOUNDATION_COUNT`) and its staircase deal. Parametrise
  `simpleSimonZoneSpecs` and the game by deck, column count, foundation count
  and deal, then add `MRS_MOP_LAYOUT`: 13 wide, with a `designHeightPx` for
  columns that start eight deep and grow.
- `stocklessGestures`, documentation, and a profile in the Spider family.

### 9. Blue Moon, Red Moon and Addiction

**Relation:** Blue Moon and Red Moon are new entries sharing `MontanaGame`;
their 4 × 14 grid differs from Montana's 4 × 13. Addiction is a variant option
on Montana. **Effort:** M for the two Moons, S for Addiction.
**Extensions:** none.

**Rules.**

- **Blue Moon:** all 52 cards are dealt in four rows. The Aces are then moved
  to the left end of the rows, which makes a grid of 4 × 14 with gaps where
  the Aces were. A gap takes the card that is one rank higher, in the same
  suit, than its left neighbour. Nothing goes after a King. There are two
  redeals: the cards not yet in sequence are shuffled and dealt after each
  row's sequence, leaving one gap after each. The goal is every row in suit
  from Ace to King.
- **Red Moon:** like Blue Moon, but easier, because the opening deal puts the
  gaps next to the Aces.
- **Addiction:** Gaps (Montana) with three reshuffles instead of two.
  Wikipedia notes that other versions allow four, or unlimited.

**References.**
[Wikipedia: Gaps](https://en.wikipedia.org/wiki/Gaps);
[PySolFC: Blue Moon](https://pysolfc.sourceforge.io/doc/rules/bluemoon.html);
[PySolFC: Red Moon](https://pysolfc.sourceforge.io/doc/rules/redmoon.html).

**What it takes.**

- Addiction: `MAX_REDEALS` becomes a constructor option, plus a "Redeals: 2 /
  3" choice. The marker shows two pips, from `REDEAL_MARKER_PLACEHOLDERS`, so
  three redeals need a three-pip set of artwork.
- The Moons: generalise `src/games/montana` over the column count (14) and the
  deck (`MONTANA_DECK` without Aces versus the full deck). Column 0 holds the
  Aces for good: `accept: null` and `grab: { kind: "none" }`. `montanaCellRule`
  for column 1 already accepts a Two on an Ace, because
  `rankAbove(Rank.ACE)` is Two. `settledPrefixLength`, `isMontanaSolved`,
  `redealArrangement` and the deal all assume a row starts with a Two, and
  need the starting rank as a parameter. That shared change is most of the
  work, and Montana's specs guard it.

---

## Part B: new games that need no engine change

### 10. Bisley

**Relation:** new game. **Effort:** S. **Extensions:** none.

**Rules.** One deck. The four Aces are laid out first as foundations. The rest
is dealt into thirteen columns, face up: four columns of three under the Aces,
and nine columns of four to their right. Ace foundations build **up** in suit.
When a King becomes available it may start a second foundation for its suit,
which builds **down** in suit. The two foundations of a suit may meet anywhere.
Columns build **up or down in suit**, one card at a time, with only the top card
available. An empty column stays empty. The game is won when every card is on a
foundation. Wikipedia puts the odds at about 2 in 3. PySol's version deals
twelve columns of four instead; Wikipedia's thirteen columns are proposed here.

**References.**
[Wikipedia: Bisley](<https://en.wikipedia.org/wiki/Bisley_(card_game)>);
[PySolFC: Bisley](https://pysolfc.sourceforge.io/doc/rules/bisley.html).

**What it takes.**

- Roles `FOUNDATION` and `TABLEAU`. Give both kinds of foundation the
  `FOUNDATION` role, with different `accept` rules per zone, so
  `winsWhenAllCardsIn` still works:
  - Ace foundations use `suitFoundation`; the deal places the Aces.
  - King foundations each close over the suit of the Ace they belong to:
    `all(singleCardOnly, byEmptiness(cardIs(king of that suit), descendingSameSuit))`.
- Columns use `byEmptiness(never, any(ascendingSameSuit, descendingSameSuit))`,
  which is Baker's Dozen's "never refill" combined with Alaska's two-way build,
  grab top-only, and `OPEN_COLUMN_LAYOUT`.
- Grid: thirteen wide. Ace foundations at columns 0–3 and King foundations at
  columns 9–12 in row 0, and the thirteen columns in row 1. The 3-versus-4
  split lives in the deal.
- `stocklessGestures`. `autoMoveRoles: [FOUNDATION]`.

### 11. Aces Up

**Relation:** new game. **Effort:** S. **Extensions:** none.

**Rules.** Deal four cards face up in a row. Whenever two or more top cards
share a suit, discard the lower ones; Aces rank high, so an Ace can never be
discarded. An empty column may take the top card of any other column. When no
move is left, deal four more cards, one onto each column. The game is won when
only the four Aces remain (48 discarded). Wikipedia puts typical play at about
1 win in 35. A harder variant lets only Aces move into an empty column.

**References.**
[Wikipedia: Aces Up](https://en.wikipedia.org/wiki/Aces_Up);
[PySolFC: Aces Up](https://pysolfc.sourceforge.io/doc/rules/acesup.html).

**What it takes.**

- Zones: a stock, four columns (`OPEN_COLUMN_LAYOUT`, top-only,
  `byEmptiness(singleCardOnly, never)`), and a discard pile.
- The discard's rule is the whole game: a single card whose suit shows, as the
  top card of **another** column, with a higher rank, counting the Ace as 14.
  It reads the other columns through `context.board.pilesByRole`.
- The stock deals with `dealRowFromStock(stock, columns)` committed as one
  action, pressed through `dealOnStockPress`. A double press sends a card to
  the discard (`autoMoveRoles: [DISCARD]`).
- `isWon`: the stock is empty and only Aces remain in the columns. The harder
  variant is an option with an `aceOnly` empty-column rule.

### 12. Golf (with Putt Putt)

**Relation:** new game. It would start a Golf family alongside Black Hole, All
in a Row and TriPeaks. **Effort:** S. **Extensions:** none for Golf; E1 for
Putt Putt.

**Rules.** Deal seven columns of five cards, face up. One more card starts the
foundation, and the remaining sixteen form the stock. The top card of any
column may go onto the foundation if it is one rank higher or lower than the
foundation's top card, regardless of suit. **Nothing may be played on a King**,
and ranks do not wrap. When stuck, turn the stock one card at a time onto the
foundation. There is no redeal. The goal is to clear the tableau. Traditional
scoring is one point per card left in the tableau, or minus one per card left
in the stock if the tableau is cleared, over nine "holes". Variants: Queens may
be played on Kings; **Putt Putt** "turns the corner", so Ace and King are
adjacent.

**References.**
[Wikipedia: Golf](<https://en.wikipedia.org/wiki/Golf_(patience)>);
[PySolFC: Golf](https://pysolfc.sourceforge.io/doc/rules/golf.html).

**What it takes.**

- Zones: seven columns (`OPEN_COLUMN_LAYOUT`, top-only, `accept: null`, since
  nothing builds on the tableau), a stock, and a single foundation. The
  foundation accepts one card one rank either way from its top, never onto a
  King. Putt Putt's wrap comes from E1, or from a local helper until E1
  exists.
- The stock press is `drawToWaste(stock, foundation, 1)`: the foundation is
  also the waste.
- A **single press** plays a card, as in PySol: `onCardPress` calls
  `autoMoveCard`.
- `isWon` is true when the columns are empty. `winsWhenAllCardsIn` is left
  unset, because the stock may still hold cards.
- Golf scoring: lower is better, which the header's "Score" does not convey;
  E6 or a label change. Options: "Kings: blocked / Queens on Kings" and
  "Putt Putt".

### 13. Calculation (with Sir Tommy)

**Relation:** new game. Sir Tommy is a variant option on the same grid.
**Effort:** S. **Extensions:** none.

**Rules: Calculation (Broken Intervals).** One deck. An Ace, a Two, a Three and
a Four, of any suits, start four foundations. Each foundation builds regardless
of suit, by its own interval and wrapping past King, until it ends on a King:

| Foundation | Sequence                   |
| ---------- | -------------------------- |
| 1          | A 2 3 4 5 6 7 8 9 10 J Q K |
| 2          | 2 4 6 8 10 Q A 3 5 7 9 J K |
| 3          | 3 6 9 Q 2 5 8 J A 4 7 10 K |
| 4          | 4 8 Q 3 7 J 2 6 10 A 5 9 K |

Turn the stock up one card at a time. Each card must be played either to a
foundation or onto any of four waste piles. Only the top card of a waste pile
may move, and only to a foundation. There is one pass. The game is won when
every card is on a foundation.

**Rules: Sir Tommy (Old Patience).** The same table, but the foundations start
empty. Each is begun by an Ace as it turns up and built up to King regardless
of suit, with four waste piles. (Wikipedia's article currently says eight
waste piles, but it describes the variant Strategy as easier for having eight.
Wikibooks and most sources say four.)

**References.**
[Wikipedia: Calculation](<https://en.wikipedia.org/wiki/Calculation_(card_game)>);
[PySolFC: Calculation](https://pysolfc.sourceforge.io/doc/rules/calculation.html);
[Wikipedia: Sir Tommy](https://en.wikipedia.org/wiki/Sir_Tommy);
[Wikibooks: Sir Tommy](https://en.wikibooks.org/wiki/Solitaire_card_games/Sir_Tommy).

**What it takes.**

- A one-card **hand** pile holds the turned card (stacked, `capacity: 1`,
  `accept: null`, top-only, draggable). A stock press draws into it only while
  it is empty, which enforces "place it before turning the next".
- Waste piles accept any card, but only from the hand
  (`context.sourcePile.role === HAND`); they are top-only and use
  `OPEN_COLUMN_LAYOUT`.
- Each foundation's rule closes over its interval: the next card's value is
  `((top − 1 + step) mod 13) + 1`, with Ace as 1 and King as 13. A
  `capacity` of 13 ends each foundation at its King, which the formula alone
  would build straight past.
- The deal places the first Ace, Two, Three and Four it finds. Sir Tommy deals
  none, and its foundations use `byEmptiness(Ace, ascendingAnySuit)`.

### 14. Flower Garden

**Relation:** new game. **Effort:** S. **Extensions:** E3.

**Rules.** One deck. Thirty-six cards go into six **beds** of six, face up. The
other sixteen form the **bouquet**, and **every bouquet card is available**.
Foundations build up in suit from Ace. Beds build down regardless of suit, one
card at a time. An empty bed takes any card. The game is won when every card is
on a foundation. Wikipedia says skilled players win more than 20% of the time.
An easier version uses seven beds of five and a 17-card bouquet, which is a
different grid and so would be another entry.

**References.**
[Wikipedia: Flower Garden](<https://en.wikipedia.org/wiki/Flower_Garden_(solitaire)>);
[PySolFC: Flower Garden](https://pysolfc.sourceforge.io/doc/rules/flowergarden.html).

**What it takes.**

- The bouquet is the only unusual part. **Model it as sixteen single-card piles
  at fractional columns**, overlapping like a fanned hand: `accept: null`,
  top-only. The top-most sprite takes each press. This avoids a new grab kind.
  A real "take any card from the middle" grab would touch
  `TableGame.resolveMove` and `stackFromCard`, and also `CardTransfer`, because
  undo re-appends cards to the **top** of their old pile, which would scramble
  a pile that a card left from the middle. It needs E3 for the skeleton.
- Beds use `byEmptiness(anyCard, descendingAnySuit)`, top-only, and
  `OPEN_COLUMN_LAYOUT`. Foundations use `suitFoundation`.

### 15. Bristol (with Belvedere)

**Relation:** new game. Belvedere is a variant option. **Effort:** S.
**Extensions:** none.

**Rules.** One deck. Eight fans of three cards are dealt face up, with any King
moved to the bottom of its fan. Three more cards start three reserve piles.
The stock is dealt three at a time, one onto each reserve. Foundations: each Ace
starts one as it becomes available, built up **regardless of suit** to King.
Fans build down regardless of suit. Only the top cards of fans and reserves are
available, and they move one at a time. An empty fan is never refilled. There
is no redeal. **Belvedere:** the same, except that one Ace starts on a
foundation.

**References.**
[Wikipedia: Bristol](<https://en.wikipedia.org/wiki/Bristol_(solitaire)>);
[PySolFC: Bristol](https://pysolfc.sourceforge.io/doc/rules/bristol.html).

**What it takes.**

- `sinkKings` is private to `src/games/bakers_dozen/bakers_dozen_deal.ts`.
  Bristol is its second user, so it moves to `src/games/common`.
- Fans use `byEmptiness(never, descendingAnySuit)`, top-only, and short
  `OPEN_COLUMN_LAYOUT` fans. Reserves are stacked, top-only, `accept: null`.
  Foundations use `byEmptiness(Ace, ascendingAnySuit)` (E1 adds that build;
  until then it is a one-line local rule).
- Stock press: `dealRowFromStock(stock, reserves)` via `dealOnStockPress`.

### 16. Nestor

**Relation:** new game. **Effort:** S. **Extensions:** P1.

**Rules.** One deck. Eight columns of six cards are dealt face up, so that **no
column holds two cards of the same rank**: a card that would duplicate a rank
already in its column goes to the bottom of the deck, and the next card is
dealt instead. The four remaining cards form a reserve, all available. Remove
**pairs of the same rank** from among the column tops and the reserve. The game
is won when every card is discarded. Variants: Vertical (seven columns of six,
ten-card reserve) and Doublets (twelve columns of four, four-card reserve).

**References.**
[Wikipedia: Nestor](<https://en.wikipedia.org/wiki/Nestor_(solitaire)>);
[PySolFC: Nestor](https://pysolfc.sourceforge.io/doc/rules/nestor.html).

**What it takes.**

- P1 pair removal. The columns and four single-card reserve piles accept a
  card only when it makes a same-rank pair with their top card, and both cards
  go to the discard. `winsWhenAllCardsIn: DISCARD`.
- **Trap in the deal:** near the end, the cards left may all duplicate ranks
  already in the last column. The deal must give up on the rule rather than
  loop forever, and a fixed-`random` spec should pin that case.

### 17. Monte Carlo (with Monte Carlo Thirteens)

**Relation:** new game. Thirteens is a variant option. **Effort:** M.
**Extensions:** P1.

**Rules.** One deck. Deal 25 cards face up into a 5 × 5 grid. Remove pairs of
the **same rank** that are adjacent horizontally, vertically or diagonally.
Then **consolidate**: slide the remaining cards towards the top left, in reading
order, to close the gaps, and deal from the stock to fill the spaces at the
end. The game is won when every card is discarded, and lost when no pair can be
removed. **Monte Carlo Thirteens** removes pairs totalling 13, and Kings on their
own.

**References.**
[Wikipedia: Monte Carlo](<https://en.wikipedia.org/wiki/Monte_Carlo_(solitaire)>);
[PySolFC: Monte Carlo](https://pysolfc.sourceforge.io/doc/rules/montecarlo.html).

**What it takes.**

- Twenty-five cell piles, each with a rule that closes over its eight
  neighbours' pile ids, as Montana's cells close over their left neighbour.
  They have no `capacity` (P1).
- Consolidation is a press on the stock, committed as one action like
  Montana's redeal: one transfer per card that shifts, then the refill. Some
  rule sets allow it only after a pair has been removed since the last one;
  either way it is a `canConsolidate` getter.
- `winsWhenAllCardsIn: DISCARD`.

### 18. La Belle Lucie (with The Fan, Shamrocks and Trefoil)

**Relation:** new game, starting a Fan family. The Fan and Shamrocks are
variant options. Trefoil has a different number of fans, so it is an entry
sharing the class. **Effort:** M. **Extensions:** none.

**Rules.** One deck, dealt face up into **seventeen fans of three and one of a
single card**. Aces go to the foundations as they become available, which
build up in suit. Fans build **down in suit**, and only the top card of a fan
moves, one at a time. **An empty fan is never refilled.** When stuck, gather
the tableau, shuffle, and deal it again in threes; **two redeals** are allowed.
The game is won when every card is on a foundation. "Three Shuffles and a
Draw" adds one _merci_ after the last redeal: one buried card may be drawn out.

- **The Fan:** a King may fill an empty fan; there are no redeals.
- **Shamrocks:** fans build **up or down regardless of suit**, and **no fan may
  hold more than three cards**.
- **Trefoil:** the Aces start on the foundations, and the other 48 cards make
  sixteen fans of three.

**References.**
[Wikipedia: La Belle Lucie](https://en.wikipedia.org/wiki/La_Belle_Lucie);
[PySolFC: La Belle Lucie](https://pysolfc.sourceforge.io/doc/rules/labellelucie.html);
[PySolFC: Fan](https://pysolfc.sourceforge.io/doc/rules/fan.html);
[PySolFC: Shamrocks](https://pysolfc.sourceforge.io/doc/rules/shamrocks.html);
[PySolFC: Trefoil](https://pysolfc.sourceforge.io/doc/rules/trefoil.html).

**What it takes.**

- Fans use `byEmptiness(never, descendingSameSuit)` and top-only. Shamrocks
  swaps in `any(ascendingAnySuit, descendingAnySuit)`, or an any-suit
  adjacency from E1, with `capacity: 3`, which the engine already enforces.
- The redeal copies `MontanaGame.redeal`: gather the cards fan by fan, shuffle
  them with the game's `random`, deal them out in threes, and commit one
  `"redeal"` action. `afterUndo` hands the redeal back, and
  `saveExtra`/`restoreExtra` keep the count. A redeal marker zone with
  `emptyIsActionable` is the button, as in Montana.
- Layout: eighteen short vertical fans in a 6 × 3 block, with the foundations
  above. A fan of three reaches 403 design units, more than the 353-unit row
  pitch. Either space the rows at a fractional pitch (E3) or give these fans a
  tighter `faceUpGap`. Horizontal fans, as on a real table, would need E5 and
  are not required.
- The merci needs a buried card to move, which the engine cannot do (see
  Flower Garden). Leave it out of a first version.

---

## Part C: new games that need a small engine extension

### 19. Canfield (with Storehouse, Superior Canfield and Rainbow)

**Relation:** new game, starting a Canfield family. The three variants share
its grid and are options. **Effort:** M. **Extensions:** E1, E2.

**Rules.** One deck.

- **Deal:** thirteen cards to a **reserve**, face down with the top card face
  up. The next card goes face up to the first foundation, and its rank becomes
  the **base rank** for all four foundations. One card goes face up to each of
  four tableau columns. The rest is the stock.
- **Foundations:** build up in suit from the base rank, **turning the corner**
  from King to Ace.
- **Tableau:** builds down in alternating colours, also turning the corner (a
  King may go on an Ace). Whole or partial sequences may move.
- **Spaces:** the reserve's top card fills a space **at once**. Once the
  reserve is empty, a space may be filled from the waste.
- **Stock:** dealt three at a time onto the waste, with unlimited redeals.
- **Win:** all 52 cards on the foundations.

Variants on the same grid:

- **Storehouse:** the four Twos start the foundations, and the tableau builds
  down in suit. Wikipedia says the stock is used once; PySol deals single
  cards and allows two redeals.
- **Superior Canfield:** the reserve is dealt face up, and spaces are not
  filled automatically.
- **Rainbow:** the tableau builds down regardless of colour; the stock is
  dealt one card at a time with no redeal.

**References.**
[Wikipedia: Canfield](<https://en.wikipedia.org/wiki/Canfield_(solitaire)>);
[PySolFC: Canfield](https://pysolfc.sourceforge.io/doc/rules/canfield.html);
[Wikipedia: Storehouse](<https://en.wikipedia.org/wiki/Storehouse_(solitaire)>);
[PySolFC: Storehouse](https://pysolfc.sourceforge.io/doc/rules/storehouse.html);
[PySolFC: Superior Canfield](https://pysolfc.sourceforge.io/doc/rules/superiorcanfield.html).

**What it takes.**

- E1 for wrapping adjacency in the foundations, in the tableau build, and in
  the run grab, which stay paired as `buildsOn` arranges. E2 for the dealt base
  rank.
- Roles: stock, waste, reserve, foundation, tableau. The reserve is stacked,
  `face: "card"`, top-only, `accept: null`. Superior Canfield fans it down
  face up instead, on the same slot.
- The empty-column rule reads its source: a card from the reserve, or from the
  waste once the reserve is empty.
- **The automatic fill** goes in `applyMoveEffects`. When a move empties a
  column and the reserve is not empty, move the reserve's top card into it as a
  `followUpTransfers` entry and flip the new reserve top (`flipExposedTop`),
  so one undo takes all of it back.
- The stock uses `drawToWaste(…, 3)` and `recycleWasteToStock`. Extending
  `DealtTableGame` directly is simpler than bending `KlondikeFamilyGame`, which
  scores by Klondike's rules.
- Gestures as Klondike's: `drawOnStockTop`, and `onPilePress` to recycle.

### 20. Penguin

**Relation:** new game, in the FreeCell family. **Effort:** M.
**Extensions:** E1, E2.

**Rules.** One deck, dealt face up into seven columns of seven. The first card
dealt, at the top left, is the **beak**. The other three cards of the beak's
rank go straight to the foundations as they are dealt, and the next card takes
each one's place. Foundations build up in suit from the beak's rank, wrapping
from King to Ace, and each ends on the rank below the beak. Columns build
**down in suit, wrapping from Ace to King**. Same-suit sequences move as a unit
**however many cells are free**. An empty column takes only a card of the rank
below the beak, or a sequence headed by one. There are **seven cells** (the
"flipper"), each holding one card. The game is won when every card is on a
foundation. David Parlett invented it. Wikipedia reports that 99.94% of deals
can be won.

**References.**
[Wikipedia: Penguin](<https://en.wikipedia.org/wiki/Penguin_(solitaire)>);
[PySolFC: Penguin](https://pysolfc.sourceforge.io/doc/rules/penguin.html).

**What it takes.**

- E2: three foundations hold a beak-rank card from the deal onwards, so "the
  base rank is the bottom card of any occupied foundation" always has an
  answer. The empty-column rule uses the rank below it.
- E1: a wrapping same-suit adjacency for both the build and the `run` grab,
  with **no** `maxStackSize`.
- `cellRow({ count: 7 })`. The deal needs its own function because of the beak
  rule.
- Grid: an eleven-slot top row (seven cells and four foundations) over seven
  centred columns, as Double Klondike centres nine columns under eleven slots.
  `stocklessGestures`.

### 21. Black Hole and All in a Row

**Relation:** new game in the Golf family. All in a Row has a different grid,
so it is an entry sharing the class. **Effort:** S. **Extensions:** E1.

**Rules.**

- **Black Hole:** the Ace of Spades starts a single foundation, the Black Hole.
  The other 51 cards are dealt face up in **seventeen fans of three**. The top
  card of any fan may go into the hole if it is one rank above or below the
  hole's top card, regardless of suit, with **Ace and King adjacent**. Nothing
  builds on the fans, and there is no stock. The game is won when every card
  is in the hole. David Parlett invented it. Wikipedia reports that about 87%
  of deals can be won.
- **All in a Row:** thirteen columns of four, face up. The single foundation
  starts empty and takes any top card first, then builds up or down by rank,
  wrapping. Empty columns are not refilled.

**References.**
[Wikipedia: Black Hole](<https://en.wikipedia.org/wiki/Black_Hole_(solitaire)>);
[PySolFC: Black Hole](https://pysolfc.sourceforge.io/doc/rules/blackhole.html);
[PySolFC: All in a Row](https://pysolfc.sourceforge.io/doc/rules/allinarow.html).

**What it takes.**

- E1's `isAdjacentRank(wrap)`. The foundation uses
  `all(singleCardOnly, byEmptiness(never | anyCard, buildsOn(isAdjacentRank(true))))`.
  Black Hole's foundation is never empty, and All in a Row's starts empty.
- Tableau zones have `accept: null` and are top-only. A single press plays a
  card, as in Golf.
- The deal takes the Ace of Spades out first (`DeckSource.find`).
  `winsWhenAllCardsIn: FOUNDATION`.
- Layout: seventeen fans and the hole fill an 18-slot block, with the hole in
  the middle. The same row-pitch choice as La Belle Lucie applies.

### 22. Grandfather's Clock

**Relation:** new game. **Effort:** S–M. **Extensions:** E1, E3.

**Rules.** One deck. Twelve cards are laid in a **circle** as foundations. PySol
places the Two of Spades at five o'clock, then each position clockwise one
rank higher, in the suit order spades, hearts, clubs, diamonds, ending with the
King of Diamonds at four o'clock. Each foundation builds **up in suit, wrapping
from King to Ace**, until its top card matches its clock position (Jack is 11,
Queen is 12). The remaining forty cards go into **eight columns of five**, face
up. Columns build down regardless of suit, only the top card moves, and an
empty column takes any card. The game is won when every card is on a
foundation. (Some sources use a different suit order; the ranks and positions
agree.)

**References.**
[PySolFC: Grandfather's Clock](https://pysolfc.sourceforge.io/doc/rules/grandfathersclock.html).
Wikipedia has no article.

**What it takes.**

- The deal pulls the twelve named cards onto their foundations first. Each
  foundation then needs either three more cards (positions 5 to 12) or four
  more (positions 1 to 4). Give each foundation a `capacity` of 4 or 5 and the
  rule `ascendingSameSuitWrapping` (E1), and it closes itself once complete,
  with no per-zone target rank needed.
- The ring is twelve zones at fractional slots on a circle about five slots
  across (E3), above or beside the eight columns. This is the one board here
  that is not a grid of rows.
- Columns use `byEmptiness(anyCard, descendingAnySuit)` and top-only.

### 23. Pyramid

**Relation:** new game. **Effort:** M. **Extensions:** P1, E3, E4.

**Rules.** One deck. Twenty-eight cards form a **pyramid** of seven rows, each
row half-covering the one above, all face up. A card is available only when
**no card covers it**. Remove **pairs that total 13** (Jack 11, Queen 12, Ace 1).
A **King** totals 13 by itself and is removed alone. The rest is the stock.
Turn it one card at a time: the drawn card and the top of the waste are both
available to pair, with each other or with the pyramid. An unmatched draw goes
to the waste. There is one pass; "Par Pyramid" allows two redeals. Wikipedia's
win condition is every card removed. **Relaxed Pyramid** wins once the pyramid
alone is cleared. Further variants: Giza, Apophis (three waste piles) and Tut's
Tomb.

**References.**
[Wikipedia: Pyramid](<https://en.wikipedia.org/wiki/Pyramid_(solitaire)>);
[PySolFC: Pyramid](https://pysolfc.sourceforge.io/doc/rules/pyramid.html).

**What it takes.**

- E4: the position at row `r`, column `c` is covered by `(r+1, c)` and
  `(r+1, c+1)`. Those two ids are its `coveredBy` list, and its grab is
  `{ kind: "uncovered", coveredBy }`.
- P1: every pyramid position, the waste and the drawn card accept a card that
  totals 13 with their own top card, provided that card is uncovered. Both go
  to the discard. A King, pressed, goes alone (`autoMoveRoles: [DISCARD]`, and
  the discard accepts a lone King).
- The drawn card sits in a one-card hand pile, as in Calculation. A stock
  press moves the hand's card (if any) to the waste and draws the next into
  the hand, as one action.
- Layout (E3): row `r` sits at `r × 0.5` rows, with its first card at column
  `(6 − r) / 2`. Declare the rows top first, so the lower rows draw over the
  ones above. Consider the drop-target refinement under E4.
- `isWon` depends on the option: everything discarded, or (Relaxed) the
  pyramid empty. A second option sets one pass or three.

### 24. TriPeaks

**Relation:** new game in the Golf family. **Effort:** M.
**Extensions:** E1, E3, E4.

**Rules.** One deck. Twenty-eight cards make **three overlapping peaks**: a top
row of 3 cards, then 6, then 9, all face down and each row half-offset, over a
bottom row of **10 face-up** cards. One stock card starts the waste. Any
**uncovered** tableau card may go onto the waste if it is one rank higher or
lower, regardless of suit. **King and Ace are adjacent** in PySol and most
versions; Wikipedia does not say. A face-down card **turns up as soon as nothing
covers it**. When stuck, turn the stock one card at a time onto the waste, with
one pass. The game is won when all three peaks are cleared. PySol's scoring
rewards long streaks and cleared peaks, and is optional.

**References.**
[Wikipedia: Tri Peaks](<https://en.wikipedia.org/wiki/Tri_Peaks_(game)>);
[PySolFC: Three Peaks](https://pysolfc.sourceforge.io/doc/rules/threepeaks.html).

**What it takes.**

- Golf's machinery (one waste-foundation, a single press plays a card, `isWon`
  on an empty tableau), plus E1's wrapping `isAdjacentRank`.
- E4 `coveredBy` for availability. **Flip-on-uncover** goes in
  `applyMoveEffects`: after a card leaves, turn up every face-down card whose
  `coveredBy` piles are now all empty, and report them in `flippedCardIds` so
  undo turns them back down. This differs from `flipExposedTop`, which flips a
  pile's own top card, so it needs its own helper.
- Layout (E3): ten columns wide, with half-column offsets for the upper rows.

### 25. Beleaguered Castle (with Streets and Alleys, Citadel and Fortress)

**Relation:** new game, starting a Castle family. Streets and Alleys and
Citadel share its grid and are options. Fortress deals ten rows, so it is an
entry sharing the class. **Effort:** M for the first, then S each.
**Extensions:** E5.

**Rules.**

- **Beleaguered Castle:** the four Aces are placed in a column as foundations.
  The other 48 cards are dealt into **eight rows of six, overlapping
  sideways**, four rows on each side of the Aces. Foundations build up in suit.
  Rows build **down regardless of suit**. Only the exposed card at the outer end
  of a row moves, one at a time. An empty row takes any card. The game is won
  when every card is on a foundation.
- **Streets and Alleys:** the Aces are shuffled in, so the four left rows get
  seven cards each.
- **Citadel:** during the deal, any card that can go to a foundation goes
  there.
- **Fortress:** no Aces are placed. Ten rows, five on each side, build **up or
  down in suit**. One card moves at a time, and any single card fills a space.
  PySol calls it "a very hard game".

**References.**
[Wikipedia: Beleaguered Castle](https://en.wikipedia.org/wiki/Beleaguered_Castle);
[PySolFC: Beleaguered Castle](https://pysolfc.sourceforge.io/doc/rules/beleagueredcastle.html);
[PySolFC: Streets and Alleys](https://pysolfc.sourceforge.io/doc/rules/streetsandalleys.html);
[PySolFC: Citadel](https://pysolfc.sourceforge.io/doc/rules/citadel.html);
[PySolFC: Fortress](https://pysolfc.sourceforge.io/doc/rules/fortress.html).

**What it takes.**

- E5 is the whole cost. With it, the rules are a few lines: `suitFoundation`
  (Aces placed by the deal for Beleaguered Castle and Citadel), rows of
  `byEmptiness(anyCard, descendingAnySuit)`, and top-only. Fortress uses
  `any(ascendingSameSuit, descendingSameSuit)`.
- Layout: a wing whose rows can grow past a dozen cards needs about four card
  widths at a 55-unit gap. That makes a board about nine slots wide and four
  rows tall. It suits a landscape screen; cards on a phone held upright will
  be small.

### 26. Poker Squares

**Relation:** new solitaire-adjacent game. **Effort:** M.
**Extensions:** E6 (optional).

**Rules.** One deck. Draw cards one at a time and place each in any empty cell
of a **5 × 5 grid**. A placed card **never moves**. When all 25 are placed,
score each of the five rows and five columns as a poker hand.

| Hand            | American | English |
| --------------- | -------: | ------: |
| Royal flush     |      100 |      30 |
| Straight flush  |       75 |      30 |
| Four of a kind  |       50 |      16 |
| Full house      |       25 |      10 |
| Flush           |       20 |       5 |
| Straight        |       15 |      12 |
| Three of a kind |       10 |       6 |
| Two pair        |        5 |       3 |
| One pair        |        2 |       1 |

Wikipedia treats 200 (American) or 70 (English) as a winning score. **Poker
Shuffle** lets placed cards move until the grid is full.

**References.**
[Wikipedia: Poker squares](https://en.wikipedia.org/wiki/Poker_squares).

**What it takes.**

- Twenty-five cells with `capacity: 1`. Each accepts a card only from the
  hand pile (Calculation's), and has `grab: { kind: "none" }` once filled.
- A pure, well-tested **hand evaluator** in the game's directory. After each
  placement, update `state.score` and record the change as the move's
  `scoreDelta`, so undo takes it back exactly.
- `isWon`: the grid is full and the score reaches the chosen system's
  threshold. Options: the scoring system, and (later) Poker Shuffle.
- E6 would show each line's hand. The total alone is playable.

---

## Considered and set aside

- **Accordion.** A pile moves as a whole onto the pile to its left or three to
  its left, which needs a grab kind where pressing the visible top card lifts
  the whole pile. Every move also shifts each later pile one place left, which
  can mean dozens of transfers. Wikipedia estimates the odds of winning at
  about 1 in 100, which is little reward for the work.
  [Wikipedia](<https://en.wikipedia.org/wiki/Accordion_(solitaire)>).
- **Clock.** The deal decides the result; the player makes no decisions.
  [Wikipedia](https://en.wikipedia.org/wiki/Clock_Patience).
- **Three-deck games** (Triple Klondike, Sixty Thieves, Spiderwort). They are
  mechanically trivial (`copies: 3`), but twelve or more columns plus twelve
  foundations make the cards tiny on a phone. Revisit them if the board gains
  a wide-screen layout.
- **Joker games** (Joker Klondike, La belle Benedikte). The card atlases in
  `src/engine/render/assets/sprites` have no joker art, and `Rank` and `Suit`
  have no joker, so they need new art and a core enum change.
- **Two-player games** (Spite and Malice, Russian Bank, Double Solitaire). They
  need an opponent and turns, while `PlayableGame` models a single player.
  That is a major rework and out of scope.
  [Spite and Malice](https://en.wikipedia.org/wiki/Spite_and_Malice),
  [Russian Bank](https://en.wikipedia.org/wiki/Russian_Bank).

These are worth a later pass and fit the patterns above, but are not written
up here: Three Blind Mice (Scorpion on ten columns), Double Montana (Paganini),
Chessboard (Fortress with a chosen base rank), Westcliff and Agnes (Klondike
relatives), and Canister and Martha (one-deck Forty Thieves relatives).

---

## Suggested order

1. **Batch the variant options:** Saratoga, Moosehide, Wasp and Scorpion II,
   Indian and Number Ten, and Addiction. Each is a table row, a choice and a
   rules entry, and together they add eight named games to the browser.
2. **Popular new games that need nothing new:** Golf, Aces Up, Bisley, and
   Calculation with Sir Tommy. Golf also sets up the single-press-plays
   pattern for the rest of its family.
3. **E1, E3 and E4, then TriPeaks and Pyramid.** After Klondike, Spider and
   FreeCell, these are the most-played solitaires, and the extensions are
   small. P1 lands with Pyramid, and Nestor and Monte Carlo follow cheaply.
4. **E2, then Canfield and Penguin.** Black Hole, All in a Row, Grandfather's
   Clock and Putt Putt only need E1, which is already in place by this step.
5. **The rest as appetite allows:** the entries that share a class (Challenge
   FreeCell, Lucas, Mrs. Mop, the Moons), Flower Garden and Bristol, La Belle
   Lucie's family, E5 for the Castle family, and Poker Squares. E6 and E7
   (status readout, Vegas) are polish that several games would share.

New families for `FAMILIES` in `game_profile_data.ts`, if these land:

- **Golf family:** Golf, Black Hole, All in a Row, TriPeaks.
- **Pairing games:** Pyramid, Nestor, Monte Carlo.
- **Fan family:** La Belle Lucie, Trefoil, The Fan, Shamrocks, Bristol.
- **Castle family:** Beleaguered Castle, Streets and Alleys, Citadel,
  Fortress.
- **Canfield family:** Canfield, Storehouse, Superior Canfield, Rainbow.

Bisley, Aces Up, Calculation, Grandfather's Clock, Flower Garden and Poker
Squares fit "More games".
