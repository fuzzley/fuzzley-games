---
name: asteroid-breaker-content
description: What adding to Asteroid Breaker takes — a wave, a sector, a formation, a rock kind or trait, a pickup or its effect, a weapon, or a change to Endless — the files to write, the catalogs and typed records the compiler holds complete, what the saved game must keep, and the specs and the autopilot's report that check each. Triggers on: asteroid breaker wave, new wave, wave design, sector, Endless, endlessWave, formation, ring, wall, cluster, scatter, rock kind, rock trait, pickup, power-up, effect, weapon, ROCK_KINDS, PICKUPS, WEAPONS, TRAIT_RULES, EFFECT_RULES, FORMATIONS, LAYOUTS, pace, drops, strays, comets, report:waves, frontend/games/asteroid-breaker waves.
---

# Adding to Asteroid Breaker

This skill walks through what each addition to the game takes. The layers
and the rest of the code are in the workspace's `AGENTS.md`, and how its
specs run in the `asteroid-breaker-testing` skill. Paths are relative to
`frontend/games/asteroid-breaker/`.

## How the Game Holds What It Plays

- **Three catalogs,** in `src/rules/catalog/`, list everything the waves
  can hold: `ROCK_KINDS` (`rocks.ts`), `PICKUPS` (`pickups.ts`) and
  `WEAPONS` (`weapons.ts`), the plain gun and those a pickup arms the ship
  with. Each is a readonly object written `as const`, so its ids are a
  type; the rocks and the pickups are in How to play's order, which shows
  every rock kind and pickup, its name, its sentence and its picture, with
  no change of its own.
- **Records keyed by those ids** make the compiler ask for what a new entry
  needs: a rock's art (`ROCK_ART`, `src/view/art/rock_art.ts`) and its ink in
  each set of inks (`src/view/colors/inks.ts`), a trait's rule (`TRAIT_RULES`,
  `src/rules/rocks/rocks.ts`), a pickup's symbol (`SYMBOLS`,
  `src/view/art/symbols.ts`), an effect's rule (`EFFECT_RULES`) and its
  record in play (`Effects`, made by `createEffects()`,
  `src/rules/rocks/pickups.ts`), a formation's layout (`LAYOUTS`,
  `src/rules/field/spawn.ts`), and a size's radius and speed
  (`src/rules/tuning.ts`) and its sounds (`src/view/effects/effects.ts`).
  The rest is made from the ids, a pickup's frame and a lasting effect's
  tag among them, so a new id that compiles has everything drawn and
  played.
- **The waves** are JSON, a file for each sector in `src/rules/waves/`,
  listed in order in `src/rules/waves/waves.ts` (`SECTORS`) and numbered
  from 1 across the sectors (`WAVES`), ten to a sector, each sector ending
  with a boulder. Past the last, `waveEntryOf()` gives Endless's waves,
  which `src/rules/waves/endless.ts` makes as they are played;
  `waveToPlay()` makes any wave ready to play.
- **The checks** that hold it whole:

  | Check              | Where                               | What it holds                                                                                                                                                          |
  | ------------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | The compiler       | everywhere                          | Every rock kind has its art and ink, every trait its rule, every pickup its symbol, every effect its rule and its record, every formation its layout                   |
  | The catalog spec   | `src/rules/catalog/catalog.spec.ts` | Every entry's name and sentence, the hits, points and traits, every kind laid by a wave, every pickup first able to come at the wave its `from` names, and none before |
  | The waves spec     | `src/rules/waves/waves.spec.ts`     | Every wave parses, its id and name its own, every sector of ten ending with its boulder, every name from the file read                                                 |
  | The spawn spec     | `src/rules/field/spawn.spec.ts`     | Every wave laid out fairly, in every formation, on the narrowest and the widest fields, either way up, at every speed                                                  |
  | The Endless spec   | `src/rules/waves/endless.spec.ts`   | Endless's waves keep to their budget, their share of iron, their crystal and the cap, climb as written, and are the same for the same seed                             |
  | The autopilot spec | `src/rules/waves/autopilot.spec.ts` | Every wave at every speed, on the narrowest and widest fields, cleared within four minutes; Endless's 31 to 60 too, with nothing able to take the ship                 |
  | The contrast spec  | `src/view/colors/contrast.spec.ts`  | Every rock's ink, every pickup and the pilots against the field, in every palette                                                                                      |

## A Wave

Its block in a sector's file, its keys those of `WaveData`
(`src/rules/waves/waves.ts`), any other refused:

- `id`, kebab-case, for good: the saved game takes a run's wave up by it,
  so it never changes once shipped. `name`, what the player sees.
- `rocks`: each kind, size and count, written for a field of 40 by 40 and
  grown with the field's area (`src/rules/field/fill.ts`), up to the cap.
- `formation`: `scatter` (the default), `ring`, `wall` or `cluster`.
- `pace`, the rocks' speed against their own, rising through a sector;
  `drops`, the chance a broken rock lets a pickup go, if not its sector's;
  `pickups`, the pool, if not every pickup whose wave has come; `strays`,
  if not one from wave 3; `comets`, `{ "every": [least, most] }` in
  seconds, for a wave that has them; `waveKind`, the rock its boulders
  break into, if not stone.

A sector holds ten waves, its last a boulder alone, so a new wave takes
the place of one. Its number is its place across the sectors, and the
waves each pickup first comes in go by number. The screenshots keep a run
on wave 9, Crowd (`tools/capture-screenshots.mjs`).

Then:

1. `yarn vitest run src/rules/waves/waves.spec.ts src/rules/catalog/catalog.spec.ts src/rules/field/spawn.spec.ts`.
2. `yarn vitest run src/rules/waves/autopilot.spec.ts`, which plays it from its
   number as the seed.
3. `yarn report:waves`, then with `--seeds 12`, and each again with
   `--field wide` and `--field tall`: its middle time should sit between
   its neighbours', rising through its sector, and the ships it costs in
   the most costly of twelve seeds should keep to one at Relaxed and two at
   Normal or Fast. A wave that costs every ship on one seed in many is
   luck; on many, it is a wave to redraw.

## A Sector

A file in `src/rules/waves/`, `{ id, name, drops, waves }`, its ten waves
ending with a boulder, added to `SECTORS` in its place. Its id is kept for
good in the records' bests and the sectors reached, and the Sectors dialog
lists it with no change of its own. But a sector more takes more than
that, as these places hold the game to thirty waves in three sectors:

- `src/rules/waves/waves.spec.ts` holds the game to thirty waves and three
  sectors.
- Endless begins past the last wave (`ENDLESS_FROM`), but some of its
  numbers are waves of the game, `COMETS_CLOSED_AT` (60) and
  `TWO_STRAYS_FROM` (50) in `src/rules/waves/endless.ts`, and
  `src/rules/waves/endless.spec.ts` writes its waves by number, from 31.
- Endless's chance of a pickup is Storm's (`ENDLESS` in
  `src/rules/waves/waves.ts`), not the last sector's.
- "Cleared all thirty" is written in `src/rules/run/describe.ts` and the
  result card (`src/app/result/`).

## Endless

`src/rules/waves/endless.ts` makes each wave from the run's seed and its number,
so a saved game makes its wave again from the two. Its climbs, its comets,
its boulders, its strays and its buys are numbers at its top, each with
what it does. A change there is checked by `endless.spec.ts`, then
`yarn report:waves --endless` on each field, which fails only on a play
that didn't clear in time with nothing able to take the ship: Endless is
held to being fair, not to what it costs.

## A Formation

An entry in `FORMATIONS` (`src/rules/waves/waves.ts`) and its layout in
`LAYOUTS` (`src/rules/field/spawn.ts`), which lays the rocks about the waiting
ship by the field's draws and keeps each fair (`keepClear()`), or flies
them all fairly at one speed (`flyFairly()`). The spawn spec lays every wave
out in it on every field. Endless draws from every formation for a wave
of `GATHERED_MOST` rocks or fewer and no boulders, and only from
`SPREAD_FORMATIONS` for the rest (`src/rules/waves/endless.ts`).

## A Rock Kind or a Trait

- **A kind:** an entry in `ROCK_KINDS`: its name and sentence, its hits and
  points at each size it comes in, what it breaks into (`splits`), its speed and
  its traits. Then its art in `ROCK_ART` and its ink in both sets of inks,
  checked at 3:1 against the field by the contrast spec; and a wave that lays
  it, which the catalog spec asks for.
- **A trait:** a case of `RockTrait` (`src/rules/catalog/rocks.ts`) and its
  rule in `TRAIT_RULES` (`src/rules/rocks/rocks.ts`), what it does at each
  moment it cares for: as a hit holds the rock, as it breaks, at each step,
  or as its blast goes off. What a trait leaves on a rock between steps,
  such as a blast's fuse, is kept by the saved game (`KEPT_OF_ROCK`,
  `src/rules/run/saved_game.ts`), whose round trip must reach it.

## A Pickup or an Effect

- **A pickup:** an entry in `PICKUPS`: its name and sentence, its weight in
  the pool, the wave it joins from, and its effect. Then its symbol in
  `SYMBOLS` (`src/view/art/symbols.ts`); its frame, and its tag in the row at
  the field's bottom left where its effect lasts, are made from it. The
  catalog spec holds every pickup to coming first at its `from`.
- **An effect:** a case of `PickupEffect` (`src/rules/catalog/pickups.ts`),
  its rule in `EFFECT_RULES`, what it does as it starts and, where it
  lasts, as it ends, and its record in `Effects` and `createEffects()`
  (`src/rules/rocks/pickups.ts`). The saved game keeps no effect in play, as it
  keeps no pickup or shot.
- **A weapon:** an entry in `WEAPONS`: the shots a pull fires and the angle
  between them, the time between pulls, how many may be in flight and how
  many rocks a shot breaks; a `weapon` effect arms the ship with it for its
  time.
