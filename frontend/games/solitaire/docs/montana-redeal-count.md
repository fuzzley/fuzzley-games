# Montana: showing the redeals left

Montana allows two redeals per game. `MontanaGame` keeps count, but nothing on
screen shows how many are left. A player learns the limit only from the rules
page, or by pressing a marker that has quietly stopped working. This file lists
the ways we could show the count, and what each one costs, so we can pick one
together.

**Status:** built. We chose options 1 and 2a, and made Klondike's empty stock
inactive as well. The pips sit inside the ring rather than under the arrow, so
they stay readable on a phone. The rest of this file is the review as it stood
when we chose.

## Where things stand

**The game already knows the number.**

- `MontanaGame.redealsRemaining` and `canRedeal` in
  `src/games/montana/montana_game.ts` are correct and tested. A snapshot saves
  the count, and undo gives a spent redeal back. `MAX_REDEALS` is 2.
- Nothing outside the tests reads either of them. The only place a player can
  find the limit is the rules page in
  `src/ui/app/provider/game_documentation_data.ts`, which says "Two redeals per
  game".

**The marker gives the wrong signal.**

- The marker is an empty placeholder in column 13, row 0
  (`src/games/montana/montana_zones.ts`). It is drawn with
  `RECYCLING_STOCK_PLACEHOLDER`, the recycle arrow Klondike uses for a stock
  that comes round as often as you like.
- After the last redeal it still looks pressable. The zone sets
  `emptyIsActionable` once, and `src/engine/tableau/view/table_view_builder.ts`
  reads it in `buildBackgrounds` and `buildBackgroundHoverHighlight`. So the
  pointer cursor and the hover border stay.
- Pressing it then does nothing, with no message. `montanaGestures` ignores the
  `false` that `redeal()` returns.

So there are two problems. The count is hidden, and nothing marks the moment it
runs out.

### Constraints that shape the options

1. **A placeholder's artwork cannot change during a game.**
   - `PileBackgroundSpec.frame` is read once, when
     `BoardScene.createPileBackgroundSprites` makes the sprite.
   - `PileBackgroundView` is what the renderer applies each frame. It carries
     position, scale, depth and cursor, but no frame.
   - Whether the slot listens for presses is also decided once, at creation.
2. **Nothing draws text on the canvas.**
   - The code uses no Phaser `Text` or `BitmapText` anywhere.
   - All board art comes from the card atlas, which `tools/build-card-atlas.mjs`
     rasterises from SVG.
   - The placeholders are four 220×307 cells in
     `src/engine/render/assets/sprites/card/card_placeholders.svg`. All three
     decks share them, and the atlases are committed as PNGs at 1x and 2x.
3. **The shell sees a game only through `PlayableGame`.**
   - Its `state` carries score, moves and undo depth
     (`src/engine/tableau/game_state.ts`).
   - Its only events are `game-won` and `game-reset`.
   - `src/ui` may not import a game, except from `provider/`.
4. **Montana's board is wide, so its cards are small.**
   - On a compact screen its fourteen columns are 3,214 design units across.
   - On a 390 px-wide phone held upright, a card is about 27 CSS px wide and the
     marker's ring about 19 px across.
   - In a 1440 × 900 desktop window, a card is about 90 px wide.
5. **Montana never scores.** Only Klondike and Double Klondike change the score,
   so Montana's SCORE card always reads 0.
6. **A screen reader only sees the canvas as one image.**
   `game_canvas.component.html` gives the canvas `role="img"`, so nothing drawn
   on it is announced. Only something in the page around the canvas (the DOM)
   can reach a screen reader.
7. **There is spare room next to the marker.** The marker sits in row 0 of a
   fourteenth column, and rows 1–3 of that column are empty.

## At a glance

S, M and L are rough relative sizes.

| #   | Option                               | Where the count shows          | Effort | Main drawback                                                  |
| --- | ------------------------------------ | ------------------------------ | ------ | -------------------------------------------------------------- |
| 1   | The marker looks inactive when spent | Nowhere; only signals "none"   | S      | Says nothing until the count runs out                          |
| 2   | The count drawn into the marker      | On the marker                  | S–M    | Small on phones; one frame per count; not announced            |
| 3   | A readout in the header              | Header, beside score and moves | S–M    | Away from the marker                                           |
| 4   | A text label next to the marker      | On the board, under the marker | M      | The canvas's first text; small on phones                       |
| 5   | A message after each press           | A short pop-up message         | M      | Arrives after the decision                                     |
| 6   | Face-down cards as redeal tokens     | On the marker, as a stack      | M–L    | The tokens would have to be treated as cards in the game logic |

Options 1, 2 and 3 work together, and the recommendation below combines them.

## The options

### 1. Make the marker look inactive when no redeal is left

**What the player sees:** once `canRedeal` is false, the marker loses its
pointer cursor and hover border. Optionally, its artwork also changes to
`CLOSED_STOCK_PLACEHOLDER`. That is the plain outline already used for a stock
that deals only once, so the recycle arrow goes away.

**What changes:**

- `TableView` gains a per-pile question, such as `isPileActionable(pileId)`.
  `TableGame` answers it as the code does today: the zone has
  `emptyIsActionable` set and the pile is empty. A game can override the answer,
  and Montana returns `canRedeal` for the marker.
- The two places in `table_view_builder.ts` that read the zone directly call
  this instead.
- The press listener stays registered, so nothing changes in the Phaser layer.
- Changing the artwork needs the per-frame placeholder hook from option 2.

**Pros**

- It is small, and it stops the marker looking pressable when it isn't.
- Klondike benefits too. Its empty stock keeps a pointer cursor even when the
  waste is also empty, so a recycle would do nothing.
- Changing the artwork needs no new art, since the closed outline already
  exists.

**Cons**

- It shows only when none are left, not how many. A player still runs out by
  surprise.
- The marker looks the same whether no redeals are left or there is nothing to
  gather. Either way pressing it does nothing, so this is probably right.

**Effort:** S. I would do this whichever other option we choose.

### 2. Draw the count into the marker's artwork

**What the player sees:** the marker shows how many redeals are left. There are
two ways to draw that:

- **2a. Pips.** Two dots under the arrow: one filled dot per redeal left and one
  hollow dot per redeal spent. The player sees the total as well as what is
  left.
- **2b. A numeral** inside the ring: 2, then 1.

With either one, the marker changes to the closed outline at zero (option 1).

```
  2a. pips          2b. numeral        none left
 +---------+       +---------+       +---------+
 |   .-.   |       |   .-.   |       |         |
 |  ( ↻ )  |       |  ( 2 )  |       |         |
 |   '-'   |       |   '-'   |       |         |
 |  ● ●    |       |         |       |         |
 +---------+       +---------+       +---------+
```

**What changes:**

- **Art:**
  - Add frames to `card_placeholders.svg`, such as `card-placeholder-redeal-2`
    and `card-placeholder-redeal-1`. With pips we would also need a
    `card-placeholder-redeal-0` to keep the arrow showing at zero.
  - Add the new names to `PLACEHOLDERS.names` in `tools/build-card-atlas.mjs`.
  - Run `yarn build:atlas`, which rewrites every committed atlas PNG (three decks
    at two densities).
- **Engine:** let a placeholder's frame change while the board is up.
  - `PileBackgroundView` gains a `frame`.
  - The builder asks the game for the frame through a `TableView` method such as
    `backgroundKeyFor(pileId)`, which defaults to `zone.backgroundKey`.
  - `PhaserTableRenderer.applyBackground` calls `setFrame` when the frame
    changes, as `syncAppearance` already does for cards.
- **Game:** Montana picks the frame from `redealsRemaining` and `canRedeal`.
- **Docs:** the marker's artwork changes, so retake the Montana screenshot and
  run `yarn build:thumbs`.

**Pros**

- The count sits on the control the player presses, where the decision is made.
- No text rendering and no fonts. It scales with the board and looks the same in
  every deck, because the decks share the placeholders.
- The recycle arrow stops suggesting that redeals are unlimited.
- The frame hook works for any game. Vegas passes and La Belle Lucie's redeals,
  from `docs/candidate-games.md`, could use it with their own art.

**Cons**

- **Small on a phone.** The ring is about 19 CSS px across, drawn white at 50 %
  opacity. A numeral would be about 12 px tall and faint. Pips stay readable at
  that size better than a numeral does.
- **One frame per count.** That suits a count of two or three, but not an
  open-ended number such as Golf's strokes.
- **Not announced to screen readers.** Neither is the rest of the board.
- **Pips take learning.** A player has to work out what they mean once. The
  rules page can explain them.
- **Every committed atlas PNG is regenerated.** The packer adds pages as needed,
  and each 2x atlas already uses two. After rebuilding, we should check whether
  the new cells pushed any atlas onto a third page, which would mean one more
  texture to load.

**Effort:** S–M.

### 3. A readout in the header

This is extension E6 in `docs/candidate-games.md`.

**What the player sees:** a card reading `REDEALS 2`, styled like SCORE, TIME
and MOVES. It appears only in a game that supplies one. It can go in one of two
places:

- **3a.** As a fourth card.
- **3b.** In place of SCORE, in a game that never scores. The header keeps three
  cards, which matters on phones.

**What changes:**

- `PlayableGame` gains an optional list of readouts, each a label and a value.
  The game announces them whenever they change, as `state` does for the score.
- `MontanaGame` updates its `Redeals` readout after a redeal, an undo, a restore
  and a new deal.
- `GameMetricsService` passes the readouts to the header.
- `header_bar.component.html` shows one card per readout, with `role="status"`
  so screen readers announce changes.
- 3b also needs to know which games score. That could be a flag on the catalog
  entry, or a readout that replaces the score.

**Pros**

- Plain text, readable at any board size, including on phones.
- It is the only option here that a screen reader announces ("Redeals 1").
- Players already look to the header for score and moves.
- It handles any number. It is also the E6 extension that Vegas, Golf and Poker
  Squares need, so the work gets reused.
- No change to the art or the renderer.

**Cons**

- **It is away from the marker.** The player has to connect a number in the
  header with an arrow on the board. The label helps; an icon matching the
  marker would help more.
- **The header is already full on phones.** Below the `phone` breakpoint the
  labels are hidden and the cards become one strip of bare numbers. A fourth
  bare number would mean nothing to the player, so on phones it needs an icon,
  or 3b.
- **It changes `PlayableGame`,** the interface every game and the shell share.
  The new field is optional, so no other game has to change.

**Effort:** S–M.

### 4. A text label next to the marker

**What the player sees:** "2 left" printed on the table under the marker, in
the empty cell at column 13, row 1.

**What changes:**

- A new kind of element in the view. `TableViewState` gains `labels`, each with
  text, position, scale and depth, and the builder asks the game for them.
- `PhaserTableRenderer` keeps a set of Phaser `Text` objects and reuses them.
- We would also have to:
  - choose a font that has loaded before Phaser draws it,
  - draw at the device's pixel ratio so the text stays sharp,
  - pick a colour that reads on every table colour a player can choose.

**Pros**

- Readable text next to the control, and it can show any value.
- The cell is already empty, so the board layout does not change.
- It could be reused for other counts on the board, such as Golf's strokes or
  Poker Squares' line scores.

**Cons**

- **It would be the canvas's first text.** That brings font loading, sharpness
  and contrast problems the codebase has not had to solve yet.
- **It is small on a phone.** Text that scales with the board would be about
  8–10 px there. Text that does not scale can spill out of its cell.
- **Not announced to screen readers.**
- **Other games may have no free cell** for a label.

**Effort:** M.

### 5. A message after each press

**What the player sees:** a short message that appears for a moment, such as
"Redealt: 1 left", or "No redeals left" when pressing does nothing. It would be
a badge like the deck-loading one in `game_canvas.component.html`.

**What changes:**

- The game needs a way to tell the shell something happened. Today
  `PlayableGame` sends only `game-won` and `game-reset`, so it would need a
  general notice event.
- The shell needs the message component itself, with `role="status"`.

**Pros**

- It explains a press that otherwise does nothing.
- It is readable on a phone, and screen readers announce it.

**Cons**

- **It arrives after the decision.** A player deciding whether to spend a
  redeal needs the count before pressing.
- **It adds a new way to message the player,** used by one message.
- Once option 1 makes the spent marker look inactive, the "No redeals left"
  message matters less.

**Effort:** M. Worth doing only on top of another option.

### 6. Face-down cards as redeal tokens

**What the player sees:** the marker holds one face-down card per redeal left,
fanned so the player can count them. A redeal sends one away, and undo brings it
back with the usual animation.

Montana plays without its four Aces, so two of them could be the tokens. They
would show the card back the player has chosen.

**Pros**

- It reuses drawing the board already does: card backs, shadows and the moving
  card animation.
- Players know the look from stock piles, and spending a token animates with no
  extra work.

**Cons**

- **The tokens would be cards to the game.** They would need card ids, and
  they would appear in snapshots, the card registry and the deck definition.
- **It breaks Montana's "every card face up" promise.** Montana's profile sets
  `allCardsVisible: true`, and `test/ui/app/provider/game_profile.spec.ts`
  checks that against a deal. Players would also take face-down cards for hidden
  cards from the deck.
- **Presses arrive differently.** A press on a token lands on a card, so it
  would go through `onCardPress` instead of `onPilePress`.
- **A spent token needs a pile to go to.** A card that is in no pile stays drawn
  wherever it last was.
- **The redeal code must skip the tokens,** in both `redealArrangement` and
  `gatherable`.

**Effort:** M–L. Not recommended: it twists the card model to display a
counter.

## Considered and set aside

- **A tooltip on the marker.** Touch screens have no hover. A tooltip also needs
  an element in the page to attach to, and the marker is drawn inside the
  canvas. Placing one over the canvas would be more work than option 3.
- **Confirming each redeal** with a dialog such as "Use 1 of your 2 redeals?",
  through `ConfirmationService`. It shows the count at the moment of decision.
  But it adds a dialog to every redeal, and undo can already take a redeal back.
- **Leaving it to the rules page.** It already says "Two redeals per game". The
  problem is that nothing on the table does.

## Recommendation

1. **Option 1, whatever else we choose.** It is small, and it stops the marker
   claiming it can still redeal.
2. **Option 2a: pips on the marker.** The count sits on the control at the
   moment of decision. Its frame hook also lets option 1 swap to the closed
   outline.
3. **Option 3 when the next game needs a counter.** The header readout is the
   only way to reach screen readers, and E6 builds it for Vegas, Golf and Poker
   Squares anyway. If we want it now for Montana alone, choose 3b, so the header
   gets no wider.

## Questions to settle in review

- Pips or a numeral (2a or 2b)? Pips are easier to read on a phone. A numeral
  needs no explanation.
- At zero, should the marker show two hollow pips under the arrow, or the closed
  outline?
- Should the header readout come now, as 3b, or wait for E6?
- Should Klondike's stock also look inactive (option 1) when the stock and waste
  are both empty? Once the hook exists, it costs one override.
