---
name: asteroid-breaker-content
description: What adding to Asteroid Breaker takes — a wave, a sector, a formation, a rock kind or trait, a pickup, an effect or a weapon, or a change to Endless — the records to fill and the specs and the report to run. Triggers on: asteroid breaker wave, new wave, sector, Endless, formation, rock kind, pickup, weapon, ROCK_KINDS, PICKUPS, WEAPONS, TRAIT_RULES, report:waves.
---

# Adding to Asteroid Breaker

What each addition to the game takes. How its specs run is in the
`asteroid-breaker-testing` skill. Paths are relative to
`frontend/games/asteroid-breaker/`.

## How the Game Holds What It Plays

- **Three catalogs,** in `src/rules/catalog/`, list everything the waves
  can hold: `ROCK_KINDS` (`rocks.ts`), `PICKUPS` (`pickups.ts`) and
  `WEAPONS` (`weapons.ts`). Each is written `as const`, so its ids are a
  type.
- **Records keyed by those ids make the compiler ask for what a new entry
  needs:** its art, its ink, its sounds and its rules. Add the entry, run
  `yarn typecheck`, and fill each record it names. The sections below say
  where each is, and what the compiler can't ask for.
- **The rest is made from the ids,** a pickup's frame and tag and an
  effect's record in play among them. How to play shows every rock kind
  and pickup, in the catalogs' order, with no change of its own.
- **The waves are JSON,** a file for each sector in `src/rules/waves/`,
  listed in order in `SECTORS` (`src/rules/waves/waves.ts`) and numbered
  from 1 across the sectors (`WAVES`). Past the last, `waveEntryOf()` gives
  Endless's waves, which `src/rules/waves/endless.ts` makes as they are
  played.
- **These checks hold it whole:**
  - the compiler: every id has its records;
  - `src/rules/catalog/catalog.spec.ts`: every entry's name and sentence,
    the hits, points and traits, every kind laid by a wave, and every
    pickup first able to come at the wave its `from` names;
  - `src/rules/waves/waves.spec.ts`: every wave parses, its id and name
    its own, in three sectors of ten, a boulder in no wave but each
    sector's last, its own set piece;
  - `src/rules/field/every_layout/`: every wave laid out fairly, in every
    formation, on the narrowest and the widest fields, at every speed;
  - `src/rules/waves/endless.spec.ts`: Endless's waves keep to their
    budget, their share of iron, their crystal and the cap, climb as
    written, and are the same for the same seed;
  - `src/rules/waves/every_wave/` and
    `src/rules/waves/every_endless_wave/`: the autopilot clears every wave
    at every speed within four minutes, and Endless's 31 to 60 with
    nothing able to take the ship;
  - `src/view/colors/contrast.spec.ts`: every rock's ink, at its darkest
    and brightest face too, at 3:1 against the field in every palette.

## A Wave

A block in its sector's file, its keys those of `WaveData`
(`src/rules/waves/waves.ts`), each with its default there. `parseWave()`
refuses any other key, and says what is wrong with a value.

- **Its `id` is for good.** The saved game takes a run's wave up by it, so
  it never changes once shipped.
- **Its counts are written for a field of 40 by 40,** `ROCK_CAP` rocks at
  most. `fillFor()` (`src/rules/field/fill.ts`) grows its rocks, strays and
  burrs with the field's area.
- **Its `pace` never falls within its sector,** which the waves spec
  holds.
- **It takes the place of a wave.** A sector holds ten, and only its last
  holds a boulder, the sector's set piece. A wave's number is its place
  across the sectors, and what goes by number moves with it: the wave each
  pickup first comes in (`from`), a stray in every wave from the third,
  and the screenshots' run on wave 9, Crowd
  (`tools/capture-screenshots.mjs`). Whatever a wave's `strays` says, it
  also throws one stray at once to a pilot with no one in tow, so
  `strays: 0` is not a wave without one.

Then:

1. `yarn vitest run --project pure --project sim src/rules/waves/waves.spec.ts src/rules/catalog/catalog.spec.ts src/rules/field/every_layout/ tools/capture-screenshots.spec.ts`.
2. `yarn vitest run --project sim src/rules/waves/every_wave/ src/rules/waves/every_endless_wave/`,
   which plays it from its number as the seed.
3. `yarn report:waves`, then with `--seeds 12`, and each again with
   `--field wide` and `--field tall`. Read these:
   - its middle time, which should sit between its neighbours', rising
     through its sector;
   - its tail, the time from its last few rocks to its clearing, which
     should sit with its neighbours' on the same field. The last few lean
     toward the ship, which keeps every tail short (`LAST_FEW`,
     `LAST_FEW_LEAN` and `LAST_FEW_NEAR` in `src/rules/tuning.ts`);
   - the crew it knocks loose in the most costly of twelve seeds, which
     should keep to one at Relaxed and two at Normal or Fast, few of them
     floating home;
   - `clung`, for a wave that sends burrs: those that clung to the pod, of
     those sent.

   A wave whose hits end the run on one seed in many is luck. On many, it
   is a wave to redraw.

## A Sector

A file in `src/rules/waves/`, `{ id, name, drops, waves }`, added to
`SECTORS` in its place: ten waves, the last holding its set piece, a
boulder kind of its own in `ROCK_KINDS`. Its id is kept for good, in the
records' bests and the sectors reached. The Sectors dialog lists it with no
change of its own. The card over its first wave says what is new there, a
sentence or two under its id in `SECTOR_NEWS`
(`src/app/play/sector_card.ts`), whose spec holds every sector, Endless
among them, to having its words.

A sector more takes more than that, as these hold the game to thirty waves
in three sectors:

- `src/rules/waves/waves.spec.ts` holds the game to thirty waves and three
  sectors, and names each sector's set piece.
- Endless begins past the last wave (`ENDLESS_FROM`), but some of its
  numbers are waves of the game, `COMETS_CLOSED_AT` (60) and
  `TWO_STRAYS_FROM` (50) in `src/rules/waves/endless.ts`, and
  `src/rules/waves/endless.spec.ts` writes its waves by number, from 31.
- Endless's chance of a pickup is Storm's (`ENDLESS` in
  `src/rules/waves/waves.ts`), not the last sector's.
- "All 30 waves cleared!" is written on the result card
  (`src/app/result/`), and what the announcer says of it in
  `src/rules/run/describe.ts`.

## Endless

`src/rules/waves/endless.ts` makes each wave from the run's seed and its
number, so a saved game makes its wave again from the two. Its climbs, its
comets, its boulders, its strays and the rocks its budget buys (`BUYS`) are
numbers at its top. It sends no burrs. A change there is checked by
`src/rules/waves/endless.spec.ts`, then `yarn report:waves --endless` on
each field, which fails only on a play that didn't clear in time with
nothing able to take the ship: Endless is held to being fair, not to what
it costs.

## A Formation

An entry in `FORMATIONS` (`src/rules/waves/waves.ts`) and its layout in
`LAYOUTS` (`src/rules/field/spawn.ts`), which lays the rocks about the
waiting ship by the field's draws and keeps each fair (`keepClear()`), or
flies them all fairly at one speed (`flyFairly()`). The specs in
`src/rules/field/every_layout/` lay every wave out in it on every field.
Endless draws from every formation for a wave of `GATHERED_MOST` rocks or
fewer and no boulders, and only from `SPREAD_FORMATIONS` for the rest
(`src/rules/waves/endless.ts`).

## A Rock Kind or a Trait

- **A kind is an entry in `ROCK_KINDS`,** its name and sentence written as
  the `player-text` skill's catalog lines are. The compiler then asks for:
  - how it is cut and marked at each size it comes in, in `KIND_CUTS`
    (`src/view/art/rocks/rock_shape.ts`);
  - how it comes apart, in `BREAK_STYLES` (`src/view/art/breaks.ts`);
  - its ink in both sets of inks (`src/view/colors/inks.ts`), which the
    contrast spec checks at 3:1 against the field;
  - its break's sound at each size, in `BREAK_SOUNDS`, and its held hit's,
    in `HIT_SOUNDS` (`src/view/effects/sounds.ts`), each a name in
    `SOUNDS`.
- **It needs a wave that lays it,** which the catalog spec asks for.
  Endless lays only the kinds its budget buys, a crystal and its boulders.
- **A kind of boulder takes a sheet of the atlas's room,** so a set piece
  is drawn in two outlines (`SET_PIECE_OUTLINES` in
  `src/view/art/rock_art.ts`). Add a new kind of boulder there: the
  compiler doesn't ask. The atlas packs to 4096 pixels square, and
  `src/view/art/rock_art.spec.ts` fails a kind that won't fit.
- **A trait is a case of `RockTrait`** (`src/rules/catalog/rocks.ts`) and
  its rule in `TRAIT_RULES` (`src/rules/rocks/rocks.ts`), at the moments
  `TraitRule` names there. One another part reads, as the pickups read
  `gives` and the sparks `sheds`, has an empty rule. A held rule may lay a
  rock (`addRock()`), as `chips` does, or hit the rocks round it through
  `hitWithin()`, as `vents` does, whose last argument spares what it
  names.
- **An event a trait logs of its own is a case of `RockEventKind`**
  (`src/rules/field/events.ts`). The compiler asks for its sound
  (`EVENT_SOUNDS`, or a case of `soundOf()` for one heard as another's),
  its effect (`EVENT_EFFECTS`, `src/view/effects/effects.ts`), and its row
  in the scene's spec's `EVERY_EVENT`. The sounds' spec
  (`src/view/effects/sounds.spec.ts`) lists its events by hand: add a
  rock's to `rockEventsOf()` and any other to `EVENTS`. Nothing fails for
  one left out, unless its sound is new.
- **What a trait leaves on a rock between steps is kept by the saved
  game,** such as a blast's fuse: its key in `KEPT_OF_ROCK`
  (`src/rules/field/kept_field.ts`), the check its kept value must pass in
  `ROCK_CHECKS`, which the compiler asks for, and its round trip in
  `src/rules/field/kept_field.spec.ts`.

## A Pickup, an Effect or a Weapon

- **A pickup is an entry in `PICKUPS`:** its name and sentence, written as
  the `player-text` skill's catalog lines are, its weight in the pool, the
  wave it joins from and its effect. The compiler asks for its symbol in
  `SYMBOLS` (`src/view/art/symbols.ts`) and its catch's sound in
  `CATCH_SOUNDS` (`src/view/effects/sounds.ts`). The catalog spec holds the
  pickups to the order they join the pool in, and each to first coming at
  its `from`.
- **An effect is a case of `PickupEffect`**
  (`src/rules/catalog/pickups.ts`) and its rule in `EFFECT_RULES`
  (`src/rules/rocks/pickups.ts`): what it does as it starts and as it ends,
  reaching only what of the field the pickups act on (`PickupField`). The
  compiler asks for its group's rim on its pickups' orbs, in `ORB_RIMS`
  (`src/view/art/things.ts`), and its sounds as it starts and as its time
  runs out, or none, in `START_SOUNDS` and `END_SOUNDS`
  (`src/view/effects/sounds.ts`). The saved game keeps no effect in play,
  as it keeps no pickup or shot.
- **A weapon is an entry in `WEAPONS`,** which a `weapon` effect arms the
  ship with for its time. The compiler asks for its shot's sound in
  `SHOT_SOUNDS` (`src/view/effects/sounds.ts`) and its shot's art in
  `SHOTS` (`src/view/art/energy.ts`). The catalog spec asks for a pickup
  that hands it to the ship.
