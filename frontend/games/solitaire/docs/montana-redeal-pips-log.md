# Work log: Montana's redeal pips

This log tracks the build of options 1 and 2a from
[`montana-redeal-count.md`](montana-redeal-count.md), so the work can be picked
up again from here. Update it with every commit.

## Goal

- **Option 1.** A stock or marker that cannot do anything looks inactive: no
  pointer cursor, no hover border, and the plain closed outline instead of the
  recycle arrow.
- **Option 2a.** Montana's redeal marker shows one pip per redeal: filled for
  each one left, hollow for each one spent.
- Klondike's empty stock (and Double Klondike's, which shares the class) looks
  inactive once the waste is empty too, because a recycle would do nothing.

## Decisions

- **Branch:** `montana-redeal-pips`, off `main` at `691f3a1`. Not pushed: a push
  to `main` deploys.
- **When the marker is inactive** — no redeals left, or nothing to gather — it
  shows `CLOSED_STOCK_PLACEHOLDER`, the outline that already marks a stock that
  deals only once. There is no pip artwork for zero.
- **Klondike** switches its empty stock to the same closed outline while the
  waste is also empty. Its recycles are unlimited, so it needs no pips.
- **Engine hook:** `TableView` gains two per-pile questions that `TableGame`
  answers from the zone by default and a game can override:
  - which artwork the placeholder shows now;
  - whether pressing the empty slot does something now.

  Whether a pile has a placeholder at all, and whether it listens for presses,
  stays fixed when the board is built.

## Plan

- [x] 1. Commit the options doc and this log.
- [x] 2. Engine: let a game choose a placeholder's artwork and whether its
      empty slot is pressable, frame by frame.
- [x] 3. Art: add the pip placeholders and rebuild the atlases.
- [ ] 4. Montana: draw the pips, and make the marker inactive when it cannot
      redeal. Update the rules page.
- [ ] 5. Klondike family: make the empty stock inactive when the waste is empty.
- [ ] 6. Retake Montana's screenshot and thumbnails, update the skills and the
      options doc, and run `yarn verify`.

## Progress

### 2026-10-03

- Step 1 (`67d0b94`): wrote this log and committed it with the options doc.
- Step 2 (`e3894c4`): the engine hook.
  - `TableView` and `TableGame` gained `pileBackgroundKey(pile)` and
    `isEmptySlotActionable(pile)`. By default they read the zone's
    `backgroundKey` and `emptyIsActionable`, and a game overrides them.
  - `PileBackgroundView` gained `frame`. `PhaserTableRenderer.applyBackground`
    swaps the sprite's frame when it changes, then resets the origin to the
    top-left, as it does for cards.
  - The builder's cursor and hover border ask `isEmptySlotActionable`.
  - `pileBackgrounds` draws the first frame from `pileBackgroundKey`, and still
    reads `actionable` (whether the sprite listens for presses at all) from the
    zone.
  - Tests: the mock sprite's `setFrame` now moves the origin to the frame's
    anchor, as Phaser does. `StockOverrideTableGame` in
    `test/support/fake_table/game.ts` lets a spec set the stock's artwork and
    whether it is pressable.
- Step 3: the pip artwork.
  - Two new frames in `card_placeholders.svg`, which is now six cells wide:
    `card-placeholder-full-border-reset-2-of-2` and
    `card-placeholder-full-border-reset-1-of-2`. Each is the reset placeholder
    with two pips of radius 18 inside the ring: filled for a redeal left,
    stroked (width 7, inside the same edge) for one spent.
  - Inside the ring rather than under the arrow, which the options doc sketched.
    A test render at phone and desktop sizes showed pips under the arrow had
    to be too small to read on a phone.
  - `yarn build:atlas` rebuilt all three decks with no new pages. Each 1x page
    kept its size (+3 KB); each 2x second page grew from 1792 to 2688 px wide
    (+10 KB).

## Picking it back up

```sh
git switch montana-redeal-pips
git log --oneline main..
yarn verify
```

Then continue with the first unchecked step above.
