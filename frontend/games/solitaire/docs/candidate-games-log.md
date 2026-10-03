# Work log: candidate games 1 to 9

This log tracks the build of items 1 to 9 from
[`candidate-games.md`](candidate-games.md), so the work can be picked up again
from here. Update it with every commit.

## Goal

Add every game in Part A of the survey:

1. **Saratoga**, a variant option on Klondike.
2. **Vegas scoring**, a rule option on Klondike, with E7 (scores below zero).
3. **Moosehide**, a variant option on Yukon.
4. **Wasp** and **Scorpion II**, variant options on Scorpion.
5. **Challenge FreeCell**, a new entry on FreeCell's grid and class, with
   **Super Challenge FreeCell** as its Kings-only option.
6. **Indian** and **Number Ten**, variant options on Forty Thieves.
7. **Lucas**, a new entry sharing `FortyThievesGame`.
8. **Mrs. Mop**, a new entry sharing Simple Simon's game.
9. **Addiction**, an option on Montana, and **Blue Moon** and **Red Moon**,
   new entries sharing `MontanaGame`.

## Decisions

- **Branch:** `candidate-games-1-9`, off `main` at `7671079`. Not pushed: a
  push to `main` deploys.
- One commit per item at least, each passing `yarn lint`, `yarn tsc` and
  `yarn test`, so any commit is a checkpoint to come back to.

## Plan

- [x] 0. Commit this log.
- [x] 1. Saratoga.
- [x] 2. E7, then Vegas scoring.
- [x] 3. Moosehide.
- [x] 4. Wasp and Scorpion II.
- [x] 5. Challenge and Super Challenge FreeCell.
- [x] 6. Indian and Number Ten.
- [x] 7. Lucas.
- [x] 8. Mrs. Mop.
- [ ] 9. Addiction, Blue Moon and Red Moon.
- [ ] 10. Screenshots and thumbnails for the new entries, the README, the
      survey's status, and `yarn verify`.

## Progress

### 2026-10-03

- Step 0 (`07330ef`): wrote this log.
- Step 1 (`a950cf0`): Saratoga.
  - `KlondikeVariant.SARATOGA` (3) in `klondike_rules.ts`: Kings into spaces,
    alternating colours, and `dealsFaceUp: true`, which the deal and the
    column's face rule already read.
  - **Departure from the survey:** it grabs a `run` of `isOrderedPair`, not
    `any-face-up`. Klondike's lax grab is harmless only because its face-up
    cards always form a run; with every card dealt face up it would lift
    unordered piles, as Yukon does.
  - A "Saratoga" choice in `KLONDIKE_VARIANT`, its rules-page entry, a named
    variant in the Klondike profile (Easy), and the README line.
  - Tests in `klondike_variants.spec.ts`: the face-up deal, the buried stock,
    the build, Kings-only spaces, and that a broken pile will not lift.
- Step 2 (`348e641`): E7 and Vegas scoring.
  - E7: `TableGame.undo` no longer clamps at zero; it subtracts the recorded
    `scoreDelta`, which already holds whatever floor the game applied.
  - `ScoringPolicy` in `scoring_policy.ts` is now an interface with two
    classes. `StandardScoringPolicy` is the old class, renamed.
    `VegasScoringPolicy` starts at −52, pays 5 for a card to a foundation and
    charges 5 for one taken back, with no flip bonus and no recycle penalty.
  - The policy also owns the floor (`clampScore`), the opening score
    (`initialScore`) and the pass limit (`maxRecycles`: unlimited for
    standard; 0 recycles in Draw 1 and 2 in Draw 3 for Vegas). The pass limit
    lives with the scoring because Vegas chooses both together.
  - `KlondikeFamilyGame` sets the opening score in `dealBoard`, clamps
    through the policy, refuses a recycle once none are left, and exposes
    `recyclesRemaining`. The empty stock counts as spent once the recycles
    are gone, so it shows the closed outline and drops its pointer.
  - **Beyond the survey:** a Vegas stock in Draw 3 shows a pip per recycle
    left, reusing Montana's two-pip artwork. `recyclePipsPlaceholder` and
    `PIP_COUNTS` in `src/games/common/zone_presets.ts` now name that artwork
    for both games, and Montana's `REDEAL_MARKER_PLACEHOLDERS` is gone.
    `MAX_REDEALS` moved to `montana_rules.ts` so the zones can read it.
  - A "Scoring: Standard / Vegas" option (`scoring`) on the Klondike entry,
    built by `klondikeScoringPolicy`, with its rules-page entry. It is not a
    named variant: the survey calls it a rule option, not a different game.
  - The atlas check that Montana's spec ran now lives in
    `test/games/common/zone_presets.spec.ts` and covers every pip
    placeholder. New `vegas_scoring.spec.ts`; Vegas cases in
    `scoring_policy.spec.ts`.
  - The `add-solitaire-game` skill names the pip helper.
- Step 3 (`923336c`): Moosehide.
  - `YukonVariant.MOOSEHIDE` (3) with `descendingDifferentSuit` in
    `OCCUPIED_COLUMN_RULES`. Yukon grabs `any-face-up`, so no run adjacency
    needed to change.
  - A choice in `YUKON_VARIANT`, the rules page, a named variant (Easy), the
    README line, and a "Moosehide column" block in `yukon_game.spec.ts`.
  - `game_search.spec.ts` lists Yukon's variants from the real catalog, so
    it gained Moosehide too.
- Step 4 (`1c5c325`): Wasp and Scorpion II.
  - `ScorpionVariant` and a `VARIANT_RULES` table in `scorpion_rules.ts`
    pairing each variant's empty-column rule with how many columns it buries
    cards in: Scorpion (Kings, 4), Wasp (any card, 4), Scorpion II (Kings, 3).
  - `dealScorpionLayout` takes the hidden-column count instead of reading
    the old `HIDDEN_COLUMN_COUNT` constant, which is gone.
    `scorpionZoneSpecs(variant)` is built per variant, and `ScorpionGame`
    takes a `variant` option.
  - A "Variant" option on the Scorpion entry, its rules-page entry, named
    variants (Wasp Easy, Scorpion II Medium), the README line, and Wasp and
    Scorpion II blocks in `scorpion_game.spec.ts`.
- Step 5 (`ca4ee10`): Challenge and Super Challenge FreeCell.
  - `FreeCellVariant.CHALLENGE` and `SUPER_CHALLENGE` in `freecell_rules.ts`.
    The table gained `buriesAcesAndTwos`. Super Challenge pairs Kings-only
    spaces with `kingsOnlySupermoveLimit` and alternating colours.
  - `pullCards` in the new `src/games/common/pull_cards.ts` takes cards out of
    a deck in the order the deal would reach them. `dealFreeCellLayout` puts
    the Aces and Twos back on top, so the usual round-robin deals them first,
    one per column. It goes in `common` now because Lucas (step 7) is its
    second user.
  - A "Challenge FreeCell" entry (`challengefreecell`) on `FREECELL_LAYOUT`
    with an "Empty Columns: Any Card / Kings Only" option, `stocklessGestures`,
    a rules page (no Wikipedia article exists), a FreeCell-family profile
    (Hard) with "Super Challenge FreeCell" as a named variant, and the README.
  - Screenshot: `public/docs/screenshots/challengefreecell/overview.png`,
    captured with the Chrome DevTools MCP in an isolated browser context (so
    no saved game is restored) at 1440 × 810 at 2×, on the dev server already
    running on port 9000. Re-encoded losslessly with sharp at compression
    level 9, then `yarn build:thumbs`, which rewrote no other game's images.
  - Tests: `challenge_freecell.spec.ts` and `pull_cards.spec.ts`.
- Step 6 (`5e0c898`): Indian and Number Ten.
  - Two rows in Forty Thieves' `VARIANT_RULES`: `INDIAN` (5: any other suit,
    top-only, 1 buried, 3 per column) and `NUMBER_TEN` (6: alternating
    colours, `isOrderedPair` runs, 2 buried, 4 per column). The deal and the
    face rule already read these fields; nothing else changed in the game.
  - Choices in `FORTY_THIEVES_VARIANT`, rules-page entries, named variants
    (both Medium), the README line, and Indian and Number Ten blocks in
    `forty_thieves_game.spec.ts`.
- Step 7 (`0f2199a`): Lucas.
  - `FortyThievesVariant.LUCAS` (7): same-suit runs, 13 columns of 3, and a
    new `acesStartOnFoundations` field (false for every other row).
  - `dealFortyThievesLayout` now takes the foundations. For Lucas it pulls
    the Aces with `pullCards` and lays one on each foundation, leaving 96:
    39 for the columns and 57 for the stock.
  - `LUCAS_LAYOUT`, a "Lucas" entry (`lucas`) with `fortyThievesGestures`,
    a rules page, a Forty Thieves-family profile (Medium), the README, and
    the screenshot and thumbnails, captured as in step 5. Limited's rules page
    no longer calls it the widest board in the family.
  - Tests: a Lucas block in `forty_thieves_game.spec.ts`.
- Step 8 (`ff1ee39`): Mrs. Mop.
  - `SimpleSimonVariant` (`SIMPLE_SIMON`, `MRS_MOP`) with a `VARIANT_BOARDS`
    table in `simple_simon_rules.ts`: the deck count and the cards per column.
    The column count and foundation count are derived from it, so they cannot
    disagree. The module constants `TABLEAU_COUNT`, `FOUNDATION_COUNT`,
    `FOUNDATION_COLUMN_OFFSET` and `CARDS_PER_COLUMN` are gone.
  - `simpleSimonZoneSpecs(variant)`, `dealSimpleSimonLayout(deck, tableaus,
cardsPerColumn)`, and `SimpleSimonGame` takes a `variant`, defaulting its
    `cardIds` to that variant's deck.
  - `MRS_MOP_LAYOUT`: 13 wide, `designHeightPx` 1800, which seats a
    23-card column and on a 16:9 screen costs almost no card size.
  - A "Mrs. Mop" entry (`mrsmop`), `stocklessGestures`, a rules page, a
    Spider-family profile (Medium), the README, and the screenshot.
  - Tests: a Mrs. Mop block in `simple_simon_game.spec.ts`.
  - Tooling note: a very long Bash heredoc script failed to parse in this
    environment; writing whole files with the Write tool worked instead.
- Step 9, part 1: Addiction.
  - Three-pip artwork: cells 6 to 8 of `card_placeholders.svg`
    (`…-reset-3-of-3`, `-2-of-3`, `-1-of-3`), three pips of radius 16, 44
    apart, in the same row as the two-pip set. Named in
    `tools/build-card-atlas.mjs`; `yarn build:atlas` rebuilt all three decks
    with no new pages (each 1x page 3420 → 3648 px wide, +12 KB; each 2x
    second page 2688 → 4032 px wide, +13 KB).
  - `PIP_COUNTS` is now `[2, 3]`, so the shared atlas check in
    `zone_presets.spec.ts` covers the new frames.
  - `MAX_REDEALS` became `DEFAULT_MAX_REDEALS` with a `MaxRedeals` type
    (`2 | 3`). `MontanaGame` takes a `maxRedeals` option and
    `montanaZoneSpecs(maxRedeals)` starts the marker on the right artwork.
  - A "Redeals: 2 / 3" option (`redeals`) on the Montana entry, its rules-page
    entry, "Addiction" as a named variant (Medium), and the README.
  - Checked in the browser: with `redeals: 3` stored, the marker draws three
    filled pips.
  - Tests: an Addiction block in `montana_game.spec.ts`.

## Picking it back up

```sh
git switch candidate-games-1-9
git log --oneline main..
yarn verify
```
