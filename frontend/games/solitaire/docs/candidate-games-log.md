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
- [ ] 3. Moosehide.
- [ ] 4. Wasp and Scorpion II.
- [ ] 5. Challenge and Super Challenge FreeCell.
- [ ] 6. Indian and Number Ten.
- [ ] 7. Lucas.
- [ ] 8. Mrs. Mop.
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
- Step 2: E7 and Vegas scoring.
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

## Picking it back up

```sh
git switch candidate-games-1-9
git log --oneline main..
yarn verify
```
