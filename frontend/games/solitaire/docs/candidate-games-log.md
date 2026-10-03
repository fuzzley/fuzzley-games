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

- [ ] 0. Commit this log.
- [ ] 1. Saratoga.
- [ ] 2. E7, then Vegas scoring.
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

- Step 0: wrote this log.

## Picking it back up

```sh
git switch candidate-games-1-9
git log --oneline main..
yarn verify
```
