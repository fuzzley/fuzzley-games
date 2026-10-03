# Plan: half-size card atlas wherever cards are drawn at layout scale ≤ 1 (option 5)

## Context

`docs/mobile-performance-options.md` option 5. Each deck's atlas takes about 65 MB of GPU
memory: two pages, 4032×3732 and 1792×622, of 440×614 frames at `CARD_ART_SCALE = 2`. A
phone draws a card about 100 device pixels wide (layout scale ≈ 0.48 in portrait, ≈ 0.72 in
landscape). The GPU therefore holds about 16× the pixels it shows. Without mipmaps (WebGL1,
non-power-of-two pages), shrinking the art more than 2× also skips texels, so pips and
indices look grainy.

**Decided:** use the half-size set whenever the board's layout scale is ≤ 1, so its cards
are never drawn larger than the art. That covers phones in both orientations and most
1080p desktops at pixel ratio 1. Retina screens and large windows keep the full set.

**Expected outcome:**

- 1× atlas memory: one page, ≈ 3420×1260 ≈ 17 MB, against 65 MB today.
- A smaller download.
- Phone cards that look the same or crisper.
- No change to the layout maths.

## Approach

### 1. Atlas build: produce 1× and 2× from one raster (`tools/build-card-atlas.mjs`)

- Rasterize and cut at 2× exactly as today. Then derive the 1× frames by resizing each
  finished frame (stamped cards and placeholders) to 220×307 with
  `sharp().resize(w, h, { fit: "fill" })`. sharp resizes with premultiplied alpha. Use the
  default lanczos3 kernel; switch to `mitchell` only if screenshots show ringing.
  Downsampling instead of re-rasterizing keeps the framing and the stamped edge identical
  in both sets, and needs no retuning of the cutter's pixel constants.
- Run `assertEdgesAreStamped` on the 1× frames too. Its corner allowance
  (`EDGE_CORNER_PX`) is in texels, so scale it by density.
- `packPages(frames, frameW, frameH)` takes the frame size instead of reading the
  `FRAME_W`/`FRAME_H` globals. It also balances each page's grid with
  `columns = ceil(n / ceil(n / maxColumns))`:
  - 2× output stays byte-identical (9×6, then 4×1).
  - 1× packs 15×4 at 3420×1260, instead of 17×4 at 3876×1260.
- Output goes to `atlas/<deck>/<n>x/card_assets-<i>.png` plus
  `atlas/<deck>/<n>x/card_assets_atlas.json`. Delete the old flat files with `git rm` in
  the same commit.
- Replace `ART_SCALE` with `ART_SCALES = [2, 1]`, where the first entry is the raster
  density. Update the comment that says it mirrors the TypeScript side.

### 2. View state stays in design units; the Phaser adapter owns texel density

This removes the doc's main con: the layout maths never needed to know texel density, only
the sprite scale did.

- `src/engine/render/layout/card_metrics.ts`:
  - Replace `CARD_ART_SCALE` with `type CardArtScale = 1 | 2`.
  - Add `cardArtScaleFor(layoutScale): CardArtScale`, which returns `layoutScale <= 1 ? 1 : 2`.
- `src/engine/render/view/table_view_state.ts`: `CardView.scale` and
  `PileBackgroundView.scale` become the layout scale (design units → device pixels), like
  `HighlightView.scale`. Update their docs.
- `src/engine/tableau/view/table_view_builder.ts`: drop `spriteScale` and the
  `CARD_ART_SCALE` import, and emit `this.scale`.
- `src/engine/render/phaser/phaser_sprites.ts`: add `readonly cardArtScale: CardArtScale`.
- `src/engine/render/phaser/phaser_table_renderer.ts`: cards, shadows and placeholders call
  `setScale(view.scale / this.sprites.cardArtScale)`.

### 3. An atlas is a deck at one density (`src/engine/render/phaser/card_deck_atlas.ts`)

- Add `interface CardAtlas { deckId; artScale }`.
- Key manifests as `Record<CardDeckId, Record<CardArtScale, AtlasManifest>>`, with six
  explicit JSON imports so a missing density fails to compile.
- The page glob becomes `atlas/*/*/card_assets-*.png`, keyed by `<deck>/<n>x/<file>`.
- Texture key: `cards:<deck>@<n>x`.
- `residentCardDecks` becomes `residentCardAtlases`, and `loadCardDeck` becomes
  `loadCardAtlas`.
- Add the pure function `chooseCardAtlas(deckId, wanted, resident)`. It returns a resident
  atlas of that deck at least as dense as `wanted`, otherwise `{ deckId, artScale: wanted }`.
  The board's boot and the loader share this rule.

### 4. Loader: choose density per board, upgrade on resize (`board_deck_loader.ts`)

- `current` and `awaiting` become `CardAtlas`. Expose `atlas` (deck plus density) and keep
  `deckId`.
- `DeckLoaderHost` gains two methods:
  - `wantedArtScale()`: the density the board's current size calls for.
  - `artScaleChanged()`: redraws what was drawn at the old density.
- `use(deckId)`: the target comes from `chooseCardAtlas`, so a deck change loads at the
  density wanted now. The existing loading/drawn/unavailable reporting and the "later
  choice wins" check carry over, comparing whole atlases instead of deck ids.
- New `refit()`, called on resize. It re-targets the wanted deck (the one loading, else the
  one drawn).
  - It loads only when that deck's density is below `wantedArtScale()`, and does nothing if
    the target is already current or awaited.
  - It reports **no** deck status, because the deck itself has not changed. A failed
    upgrade stays on 1×.
  - It never switches down a density on resize. That avoids reload churn; the next deck
    change or board picks the cheaper density.
- `apply()` repoints sprites as today. If the density changed, it calls
  `host.artScaleChanged()` before releasing the old texture. Releasing now covers every
  resident atlas other than the current one, including the same deck at the other density.

### 5. Board scene and shadow (`board_scene.ts`, `phaser_card_factory.ts`)

- `BoardScene.wantedArtScale()` returns
  `cardArtScaleFor(measureTable(this.options.layout, this.viewport).scale)`. That is the
  same measurement the view builder uses. The scaler sizes the canvas before the first
  board mounts, so it is valid in `preload`.
- `bootDeck()` becomes `bootAtlas()`. It uses `chooseCardAtlas` against what is resident
  and otherwise falls back to any resident atlas as today. `preload` loads the wanted atlas
  only when nothing is resident.
- The existing `scale.on("resize")` handler also calls `deckLoader.refit()`.
- `artScaleChanged()` rebakes the shadow and refits each shadow sprite.
- `cardArtScale` returns `deckLoader.atlas.artScale`.
- `PhaserCardFactory`:
  - Takes an `artScale: () => CardArtScale` getter.
  - `CARD_SHADOW_PADDING` becomes design units ({16, 24}) times the density, giving
    32/48 texels at 2× as today.
  - `bakeCardShadow` calls `DynamicTexture.setSize` when the card's size changed, so
    existing sprites keep their texture object.
  - New `fitCardShadow(sprite)` re-applies the texture, so the sprite's size follows the
    frame, and the display origin at the current padding. `createCardShadow` uses it.
  - The shadow filter's reach is in UV space, so it scales with the texture.

### 6. Docs and skills

- `docs/mobile-performance-options.md`:
  - Mark 5 **Done**, with the measured memory and download figures, as was done for 4.
  - Update "Where things stand" and "Suggested order".
- `.agents/skills/vite-bundle-optimization/SKILL.md`:
  - Describe the new output layout and the two densities.
  - Replace the "keep `ART_SCALE` equal to `CARD_ART_SCALE`" rule with the new invariant,
    which a spec enforces (below).
- `.agents/skills/phaser-canvas-performance/SKILL.md`: the page count per density.
- Run `yarn skills:check`.

## Working log

- First, copy this plan to `docs/half-res-atlas-plan.md` and add a **Progress log** section.
- After each step, append to the log what was done, the commit hash, any deviation from the
  plan and what is next, so the work can be picked up from the doc alone.
- Commit the log update with each step.
- When option 5 is marked done, retire the plan doc in the docs commit, as was done for
  option 4.

## Commits

On the branch `half-res-atlas`. Commit after each step below, and more often
within step 3 if it grows.

1. Atlas tool builds both densities into `<n>x/`, and `card_deck_atlas.ts` reads the new
   paths. Behaviour is unchanged because the 2× set is still always chosen. Verify that git
   reports the 2× pages as 100% renames.
2. View state carries the layout scale and the renderer divides by `cardArtScale`, which is
   still always 2. This is a pure refactor.
3. Choose density per board: loader, boot, `refit` on resize, shadow rebake.
4. Docs and skills.

## Tests (keep `yarn test:coverage` above the floor; raise it if figures rise)

- **`card_metrics`:** `cardArtScaleFor` at 0.48, at 1 and at 1.01.
- **`card_deck_atlas.spec.ts`:**
  - Every deck is built at both densities.
  - Every deck and density names the same frames.
  - **Every manifest's frame width is `CARD_RENDER_WIDTH_PX × artScale`.** This is the
    tool/TypeScript drift guard that replaces the comment rule.
  - Texture keys are unique.
  - Pages resolve to their own deck and density.
  - `residentCardAtlases`.
  - Each `chooseCardAtlas` case.
- **`table_view_builder.spec.ts`:** the three `CARD_ART_SCALE` assertions now expect
  `metrics.scale`.
- **`phaser_table_renderer.spec.ts`:** card, shadow and placeholder sprite scales at both
  densities.
- **`phaser_card_factory.spec.ts`:**
  - The shadow texture is 252×355 with padding 16/24 at 1×, and 504×710 at 2×.
  - A rebake at a new density resizes the same texture.
  - A refitted shadow anchors at the new padding.
- **`board_scene.spec.ts`:** drive the viewport through `MockScaleManager` width, height and
  display scale.
  - Preloads 1× at scale ≤ 1 and 2× above it.
  - A resize past 1 loads 2×, repoints the sprites, rebakes the shadow, releases 1× and
    reports no deck status.
  - Shrinking again keeps 2×.
  - A deck change on a small board loads that deck at 1×.
  - A new board finding 2× resident boots on it without a load.
  - A deck change during an upgrade means the later choice wins, and the stale atlas is
    released.
  - A failed upgrade stays on 1×.
- **Test support (`test/support/phaser_mocks.ts`):**
  - Mock sprite size follows the density in the texture key; today it is a fixed 440×614.
  - `BOOT_TEXTURE_KEY` becomes `cards:indexed@1x`, because the mock viewport falls back to
    the design size at ratio 1, which is scale 1.

## Verification

1. **Atlas:** `yarn build:atlas` succeeds. The 2× pages are byte-identical to today's (git
   shows renames). Each deck's `1x/` holds one page of about 3420×1260.
2. **Full pipeline:** `yarn verify` (lint, including `skills:check`, then tsc, build and
   tests), and `yarn test:coverage`.
3. **Browser checks**, with Chrome DevTools MCP and the probe from the doc. Start Vite with
   `node node_modules/vite/bin/vite.js` if `.bin/vite` is missing, and kill any stale
   `node … vite.js` on port 9000 first.
   - **Phone:** 390×844 at ratio 3 with a 4× CPU slowdown, on Klondike and Spider.
     - The resident key is `cards:indexed@1x`.
     - Summed `game.textures` source sizes come to about 17 MB, against 65 MB.
     - The network panel fetches only the 1× page.
     - Idle and drag frame times and draw counts are no worse than the table (0.52 ms and
       2 draws for Klondike; 1.03 ms for Spider).
   - **Screenshots:** compare the same saved game at phone size on `main` and on the branch
     (localStorage persists on `localhost:9000`). Check pip and index legibility and the
     shadow halo.
   - **Desktop:** 1920×1080 at ratio 1 gives 1× on Spider. At ratio 2 it gives 2×.
     - Growing a small window past scale 1 upgrades with no blank frame.
     - `textures.exists('cards:indexed@1x')` is false afterwards.
   - **Deck switch on the phone:** only the new deck's 1× set loads.
   - **Context loss:** run `WEBGL_lose_context` `loseContext()`, then `restoreContext()`.
     The shadow is rebaked at the 1× size.
   - **Ten game switches:** no atlas reload while the density stays the same.

## Progress log

Newest entry last. Each entry says what was done, the commit, any deviation
from the plan above, and what comes next.

- **Step 0 — plan committed.** Branch `half-res-atlas` created from `main`
  (`1fa823f`). Next: step 1, the atlas tool.
- **Step 1 — atlas tool builds both densities.** `tools/build-card-atlas.mjs`
  now writes `atlas/<deck>/2x/` (byte-identical to the old flat files; git
  records renames) and `atlas/<deck>/1x/` (one 3420×1260 page per deck).
  `card_deck_atlas.ts` and its spec read from `2x/`; the page glob is now
  `atlas/*/*/card_assets-*.png`, keyed by `<deck>/<density>/<file>`. NOTICE
  lists the pages at both densities.
  - **Finding:** the 1× page is about 1.6 MB as a PNG against 1.9 MB for the
    2× pages, so the download saving is small. Filtered downsampling creates
    in-between colours that PNG compresses poorly. Lanczos2 or cubic would save
    about 200 KB more per deck; lanczos3 (sharp's default, kept) is the
    crispest, and a 3× zoom of card corners showed no ringing with any of them.
    GPU memory (65 → 17 MB) and decode time (4× fewer pixels) are the real
    gains.
  - Next: step 2, view state in design units.
- **Step 2 — view state in design units.** (Step 1 landed as `1034d12`.)
  `CardView.scale` and `PileBackgroundView.scale` now carry the layout scale;
  `PhaserTableRenderer` divides by the new `PhaserSprites.cardArtScale`.
  `CARD_ART_SCALE` is gone, replaced by `type CardArtScale = 1 | 2` in
  `card_metrics.ts`. `BoardScene.cardArtScale` returns a fixed 2 until step 3.
  - Deviation: the builder spec's "draws 2x artwork texel for texel" test
    moved to `phaser_table_renderer.spec.ts` (with a 1× twin), since the
    builder no longer knows about texels.
  - Next: step 3, choosing the density per board.
- **Step 3 — choose the density per board.** (Step 2 landed as `916a0c4`.)
  - `card_deck_atlas.ts` now names an atlas as deck × density (`CardAtlas`,
    texture key `cards:<deck>@<n>x`). It adds `residentCardAtlases`,
    `chooseCardAtlas`, `loadCardAtlas` and `cardAtlasSource`, with six manifest
    imports.
  - `card_metrics.ts` gains `CARD_ART_SCALES` and `cardArtScaleFor`.
  - `BoardDeckLoader`:
    - Boots on and loads at the density `host.wantedArtScale()` asks for.
    - `refit()`, called on every resize, moves to 2× when the board outgrows
      1× and never moves back.
    - Calls `host.artScaleChanged()` when the density changes.
    - Reports "drawn" only when the deck itself changed.
  - `BoardScene` measures the wanted density with `measureTable`, the same way
    the view does.
  - `PhaserCardFactory` keeps the shadow padding in design units, resizes its
    texture in place on a rebake, and refits shadow sprites with
    `fitCardShadow`.
  - **Pre-existing race fixed:** when two loads finished in one Phaser batch
    (the player picks deck B, then deck C, before B arrives), B's stale
    completion released every atlas but the current one, C included. C then
    reported "unavailable". The release now spares the atlas on its way. The
    test "draws the latest deck when two loads finish together" covers it; a
    mutation check showed three specs fail without the fix.
  - Deviation: `DynamicTexture.setSize` rounds odd sizes up to even (the 1×
    shadow is 252×356), and Phaser leaves a same-size texture alone, so the
    factory calls it unconditionally.
  - Coverage holds at 97.4 / 90.8 / 98.0 / 98.8 (floor 95 / 88 / 96 / 96).
  - Next: browser verification, then step 4 (docs and skills).
