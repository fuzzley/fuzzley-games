# Work log: candidate games 10 to 26

This log tracks the build of items 10 to 26 from
[`candidate-games.md`](candidate-games.md), so the work can be picked up again
from here. Update it with every commit.

## Goal

Add every game in Parts B and C of the survey, with the shared extensions they
need:

10. **Bisley**, a new game.
11. **Aces Up**, a new game.
12. **Golf**, a new game, with **Putt Putt** as an option.
13. **Calculation**, a new game, with **Sir Tommy** as an option.
14. **Flower Garden**, a new game, after E3.
15. **Bristol**, a new game, with **Belvedere** as an option.
16. **Nestor**, a new game, with P1.
17. **Monte Carlo**, a new game, with **Thirteens** as an option.
18. **La Belle Lucie**, a new game, with **The Fan** and **Shamrocks** as
    options and **Trefoil** as an entry sharing the class.
19. **Canfield**, a new game, with **Storehouse**, **Superior Canfield** and
    **Rainbow** as options, after E1 and E2.
20. **Penguin**, a new game.
21. **Black Hole**, a new game, and **All in a Row**, an entry sharing it.
22. **Grandfather's Clock**, a new game.
23. **Pyramid**, a new game, after E4.
24. **TriPeaks**, a new game.
25. **Beleaguered Castle**, a new game, with **Streets and Alleys** and
    **Citadel** as options and **Fortress** as an entry sharing the class,
    after E5.
26. **Poker Squares**, a new solitaire-adjacent game.

## Decisions

- **Branch:** `candidate-games-10-26`, off `main` at `0a0c719`. Not pushed: a
  push to `main` deploys.
- One commit per item at least, each passing `yarn lint`, `yarn tsc` and
  `yarn test`, so any commit is a checkpoint to come back to. A new entry
  cannot pass `yarn test` without its screenshot and thumbnails (the game
  browser spec checks they exist), so each entry's commit carries them.
- Screenshots as before: the Chrome DevTools MCP in an isolated browser
  context, so no saved game is restored, at 1440 × 810 at 2×, on the dev
  server on port 9000. Re-encoded losslessly with sharp at compression level
  9, then `yarn build:thumbs`.
- The extensions land with their first user rather than all up front, so
  every commit adds something playable: E1 with Golf, E3 with Flower Garden,
  P1 with Nestor, E2 with Canfield, E4 with Pyramid, E5 with the Castle
  family.

## Plan

- [x] 0. Commit this log.
- [x] 1. Bisley.
- [x] 2. Aces Up.
- [x] 3. E1, then Golf and Putt Putt.
- [x] 4. Calculation and Sir Tommy.
- [ ] 5. E3, then Flower Garden.
- [ ] 6. Bristol and Belvedere.
- [ ] 7. P1, then Nestor.
- [ ] 8. Monte Carlo and Thirteens.
- [ ] 9. La Belle Lucie, The Fan, Shamrocks and Trefoil.
- [ ] 10. E2, then Canfield, Storehouse, Superior Canfield and Rainbow.
- [ ] 11. Penguin.
- [ ] 12. Black Hole and All in a Row.
- [ ] 13. Grandfather's Clock.
- [ ] 14. E4, then Pyramid.
- [ ] 15. TriPeaks.
- [ ] 16. E5, then Beleaguered Castle, Streets and Alleys, Citadel and
      Fortress.
- [ ] 17. Poker Squares.
- [ ] 18. The README, the survey's status, the skill, `yarn verify` and
      coverage.

## Progress

### 2026-10-03

- Step 0 (`06db3ff`): wrote this log.
- Step 1 (`c888bad`): Bisley.
  - `src/games/bisley`: the Ace foundations (`foundation-0` to `-3`) and
    the King foundations (`king-foundation-0` to `-3`) both play the
    `FOUNDATION` role, so `winsWhenAllCardsIn` covers the two kinds. Each
    closes over a suit in `ALL_SUITS` order, which is the order the deal lays
    the Aces in. An emptied Ace foundation takes only its own Ace back, so its
    pairing with the King foundation cannot drift.
  - Columns build up or down in suit (`any(ascendingSameSuit,
descendingSameSuit)`), top-only, and never refill. The deal pulls the
    Aces with `pullCards`, then deals the rest in rows: 3 to each of the
    first four columns, 4 to each of the other nine (Wikipedia's 13
    columns, not PySol's 12).
  - Board: 13 × 2, Aces at columns 0–3 and Kings at 9–12 of the top row,
    `designHeightPx` 1300 as Baker's Dozen.
  - A "Bisley" entry (`bisley`), `stocklessGestures`, a rules page, a
    profile in "More games" (Easy), the README, the screenshot and
    thumbnails.
  - Tests: `test/games/bisley/bisley_game.spec.ts`.
- Step 2 (`55e63c6`): Aces Up.
  - `src/games/aces_up`: stock, four columns and a discard in one row
    (6 × 1, `designHeightPx` 1050 for a thirteen-card column).
    `DISCARD_PILE_ID` joined `src/games/common/pile_ids.ts`, since Nestor,
    Monte Carlo and Pyramid discard too.
  - The discard's rule is the game: a column's top card while another
    column's top card is the same suit and higher, counting the Ace as 14
    (`acesHighValue`). An empty column takes a single card, or under the
    `emptyColumns` option (`AcesUpSpaces`) only an Ace.
  - The stock deals a row with `dealRowFromStock` as one action, pressed
    through `dealOnStockPress`. A double press tries the discard, then a
    space. `isWon` is overridden: the stock is empty and only Aces are left.
  - An "Aces Up" entry (`acesup`), a rules page, a profile in "More games"
    (Hard), the README, the screenshot and thumbnails.
  - Tooling: provider edits are scripted by a registration helper kept in the
    session scratchpad, not the repository; it only inserts text at fixed
    markers, so the diffs read as hand edits.
  - Tests: `test/games/aces_up/aces_up_game.spec.ts`.
- Step 3 (`673ffb1`): E1, then Golf and Putt Putt.
  - E1: `rankAboveWrapping` and `rankBelowWrapping` in
    `src/engine/core/card/playing_card.ts`. In `src/engine/tableau/rules.ts`:
    the wrapping adjacencies `isSameSuitRunWrapping` (Penguin),
    `isOrderedPairWrapping` (Canfield) and `isAnySuitRunWrapping` (Rainbow),
    with their builds `descending…Wrapping`; `isAdjacentRank(wraps)` for the
    Golf family; and the foundations `ascendingSameSuitWrapping` and
    `ascendingAnySuit`. All landed now, with tests, so later steps only use
    them.
  - `src/games/golf`: stock and foundation along the top, seven columns of
    five beneath (7 × 2, `designHeightPx` 1020). The foundation is also the
    waste: the stock turns onto it with `drawToWaste`. Columns have
    `accept: null`; the foundation has `grab: none`.
  - `GolfVariant`: Golf (nothing on a King), Queens on Kings (a house rule
    the survey lists), and Putt Putt (wraps). One "Variant" option rather
    than the survey's two, since Putt Putt makes the Kings rule moot.
  - A single press plays a column card (`autoMoveCard`) or turns the stock,
    as PySol does; `autoMoveFrom: []` so a double press does nothing more.
    Checked in the browser with synthetic mouse events on the canvas (pointer
    events do not reach Phaser; `mousedown` on the canvas and `mouseup` on
    `window` do).
  - Golf scoring (strokes, lower is better) is left out: it needs E6 or a
    header label change, and the game is playable without it.
  - A new "Golf family" in `FAMILIES`. A "Golf" entry (`golf`), a rules
    page, a profile (Hard, Putt Putt Medium) with "Putt Putt" as a named
    variant, the README, the screenshot and thumbnails.
  - Tests: `test/games/golf/golf_game.spec.ts`, and E1 cases in
    `rules.spec.ts` and `playing_card.spec.ts`.
- Step 4: Calculation and Sir Tommy.
  - `src/games/calculation`: stock, hand and four foundations along the
    top, a waste pile under each foundation (6 × 2, `designHeightPx` 1400
    for a thirteen-card waste pile). `HAND_PILE_ID` joined
    `src/games/common/pile_ids.ts` (Pyramid and Poker Squares use one too).
  - The hand is a one-card pile with `accept: null`; the stock draws into
    it only while it is empty (`canDraw`), which enforces "place each card
    before turning the next". Waste piles take a single card only from the
    hand (`WASTE_RULE`), so a parked card can leave only for a foundation.
  - `calculationFoundationRule(step)`: starts on rank `step`, then each card
    is `step` ranks higher, wrapping, in any suit; `capacity: 13` closes it
    at its King. Foundations have `grab: none`. The deal takes the first
    Ace, Two, Three and Four the deal reaches (`pullCards` with a predicate
    that removes each rank from a set as it is found).
  - `CalculationVariant`: Sir Tommy deals no foundation and builds each
    from an Ace with `ascendingAnySuit`. A "Variant" option, and Sir Tommy
    (alias Old Patience) as a named variant.
  - A "Calculation" entry (`calculation`, alias Broken Intervals), a rules
    page, a profile in "More games" (Medium), the README, the screenshot and
    thumbnails.
  - Screenshot note: a game left in progress in the `shots` browser context
    raises the "switch games?" confirmation on navigation; open each new
    entry in a fresh isolated context instead.
  - Tests: `test/games/calculation/calculation_game.spec.ts`.

## Next

Step 5: E3 (absolute, percentage-placed skeleton slots in
`game_canvas.component.html`/`.scss`, with a spec rendering a fractional
layout), then Flower Garden. The registration helper the earlier steps used
lived in the session scratchpad; it inserts each provider edit at a fixed
marker (before "Every game the application can put on the table", at the end
of `GESTURES`, of the documentation registry and of the profiles, and before
"## Development" in the README) and is quick to rewrite.

## Picking it back up

```sh
git switch candidate-games-10-26
git log --oneline main..
yarn verify
```

Then carry on from the first unchecked step in the plan.
