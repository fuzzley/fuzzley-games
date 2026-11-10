# Work log: Brick Fuzz Pop, art stream

The art stream's log of [`implementation-plan.md`](../implementation-plan.md):
what each of its packages built, where it went other than planned and why,
what the checks reported, each review comment and what became of it, and
the numbers worth keeping.

## Part 1

### L4: `@fz/phaser/color` inks

**2026-11-10.**

- **Built.**
  - `frontend/lib/phaser/src/color/inks.ts`: `ModeInks`, a set of inks for
    each mode, `{ light, dark }`, each a `readonly number[]`; `TILE_INKS`,
    Brick Breaker's eight `LIGHT_INKS` and `DARK_INKS`; and `FUZZBALL_INKS`,
    Asteroid Breaker's eight `LIGHT_PILOT_INKS` and `DARK_PILOT_INKS`, as
    numbers. Both are exported from `@fz/phaser/color`.
  - Brick Breaker's `src/view/colors/inks.ts` and its spec are gone.
    `bricksPalette()` takes `TILE_INKS[mode]`; its spec holds the tints to
    the inks of each mode and, from the old `inks.spec.ts`, to `TINTS` in
    number.
  - Asteroid Breaker's `inks.ts` keeps only the rocks' inks. `beltPalette()`
    takes `FUZZBALL_INKS[mode]` for the pilots, and `pilotInk()` hands the
    shell `cssHex()` of it; the private `pilotInks()` is gone. Its palette
    spec holds the pilots to `PILOT_COLORS` in number, and `pilotInk()` to
    six-digit CSS hex (the teal pilot, `#0f8378`, has a leading zero).
  - Docs: `lib/phaser/AGENTS.md`'s `src/color/`, both games' `AGENTS.md`,
    `frontend/AGENTS.md`'s line on where a canvas game keeps its colors,
    and the `phaser-core` and `fuzzley-ui` skills.
- **Choices the plan didn't make.**
  - **`FUZZBALL_INKS` are numbers, not CSS hex.** Asteroid Breaker wrote its
    pilots' inks in CSS hex for its shell. In the library both sets share
    one type, the numbers Phaser takes, and the one place a shell needs
    CSS, `pilotInk()`, writes it with `cssHex()`. The strings it gives are
    the same as before.
  - **`ModeInks` keys on `"light"` and `"dark"`, not `ColorMode`,** since a
    pure entry imports nothing from `@fz/style`. `TILE_INKS[mode]` takes a
    `ColorMode` all the same.
  - **The pilots' CIE76 spec moved to the library.** "27 or more apart" is a
    property of the inks themselves, so `inks.spec.ts` beside them holds it
    for `FUZZBALL_INKS`, with the eyes (`FUZZBALL.ink`) at 3:1 against each
    ink, which `FUZZBALL_INKS`'s doc comment claims. `TILE_INKS` isn't held
    to it: its light inks' nearest pair is 26.2 apart, and a tile is told
    apart by its shape and marks first, as its doc comment says.
  - **Each game's contrast spec is untouched,** as the plan asks: Brick
    Breaker's holds the tints against its `panel`, Asteroid Breaker's the
    pilots against its field, a stray's bubble and the bar, and the eyes
    against each pilot.
- **Checks.**
  - `@fz/phaser`: lint and typecheck clean; 51 files, 648 tests (from 50
    and 626); coverage 99.17% of statements, 95.74% of branches, 99.72% of
    functions and 99.55% of lines, the floor held, `src/color/` at 100%.
  - Brick Breaker: lint and typecheck clean; `test`, `sim` included, 59
    files and 2022 tests in 16 s.
  - Asteroid Breaker: lint and typecheck clean; `test`, `sim` included, 98
    files and 5242 tests in 47 s.
  - The root's `yarn lint` passes.
- **The mutation pass.** Ten changes, each killed: a light tile ink made
  another's; a dark tile ink dropped; a light fuzzball ink moved near
  another (CIE76); a dark fuzzball ink too dark for the eyes; a ninth light
  fuzzball ink; Brick Breaker's tints always the light ones; Asteroid
  Breaker's pilots always the dark ones; `pilotInk()` ignoring the mode,
  never refusing, or dropping the leading zero. A light tile ink made too
  light for 3:1 passes the library's specs, as it should, since the library
  knows no field, and fails 9 of Brick Breaker's contrast specs.
- **Numbers.** Brick Breaker's `src/view/colors/` is 33 lines shorter
  (`inks.ts`'s 32 and one of `palette.ts`), Asteroid Breaker's 40 (35 of
  `inks.ts` and 5 of `palette.ts`); the library's `inks.ts` is 74.
- **The review:**
  1. `FUZZBALL_INKS`'s doc comment, `lib/phaser/AGENTS.md` and the
     `phaser-core` skill called them the inks of fuzzballs "that aren't the
     player's", which is Brick Fuzz Pop's friends only: Asteroid Breaker
     draws the pilot at the controls in one too. Fixed: they are the inks
     that tell fuzzballs apart where several show at once, in all three.
  2. `inks.ts`'s header said only a canvas draws them, though Asteroid
     Breaker's shell draws its pilots in the DOM. Fixed: it says they are
     the numbers Phaser takes, and a shell writes one with `cssHex()`.
  3. "Each is a mid-tone" held for the light inks only. Fixed: the light
     ones are mid-tones, dark enough for a light field and light enough for
     the eyes.
  4. The eyes' cases were named by an index over both modes. Fixed: each
     is named by its mode and its place, 1 to 8.
  5. The `fuzzley-ui` skill still said both games' inks were their own.
     Fixed: the bricks and the pilots take `@fz/phaser/color`'s, and
     Asteroid Breaker's rocks keep their own.
  6. Three paragraphs of prose wrapped badly (`frontend/AGENTS.md`, Brick
     Breaker's `AGENTS.md`, the `phaser-core` skill). Rewrapped.
