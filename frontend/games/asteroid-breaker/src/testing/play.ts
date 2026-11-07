import type { Provider } from "@angular/core";
import type { GameService } from "../app/play/game.service";
import { GAME_RANDOM, GAME_WAVES } from "../app/tokens";
import type { Rock } from "../rules/rocks/rocks";
import { STILL, type Steer } from "../rules/ship/ship";
import { distanceSquared } from "../rules/torus";
import { type WaveData, type WaveEntry, wavesOf } from "../rules/waves/waves";
import type { FieldView } from "../view/field/frame";

/** How long a frame of the board takes, at 60 a second. */
export const FRAME_MS = 1000 / 60;

/** The most frames a spec plays for something to happen: a minute's at 60 a second. */
const PLAY_LIMIT_FRAMES = 3600;

/** Returns a wave of one small stone, which a shot clears, and nothing else to come. */
function pebbleOf(id: string, name: string): WaveData {
  return {
    id,
    name,
    rocks: [{ kind: "stone", size: "small", count: 1 }],
    drops: 0,
    strays: 0,
  };
}

/** The waves the shell's specs play: small, each set up to come to one thing soon. */
export const SPEC_WAVES: readonly WaveEntry[] = wavesOf([
  {
    id: "specs",
    name: "Specs",
    drops: 0,
    waves: [
      pebbleOf("pebble", "Pebble"),
      // A crystal, which lets a Shield go as it breaks into two stones.
      {
        id: "gift",
        name: "Gift",
        rocks: [{ kind: "crystal", size: "medium", count: 1 }],
        drops: 1,
        pickups: ["shield"],
        strays: 0,
      },
      pebbleOf("last", "Last"),
    ],
  },
]);

/**
 * A wave of one small stone and two strays, for a spec that brings them
 * home: the stone stays, as nothing fires at it, so the wave stays in play
 * until the strays come.
 */
export const STRAY_WAVES: readonly WaveEntry[] = wavesOf([
  {
    id: "strays",
    name: "Strays",
    drops: 0,
    waves: [{ ...pebbleOf("stray", "Stray"), strays: 2 }],
  },
]);

/**
 * A wave of a crystal, which lets an Extra ship go as it breaks, and a
 * stray, for a spec of a stray brought home that flies the ship gained.
 */
export const GAINED_WAVES: readonly WaveEntry[] = wavesOf([
  {
    id: "gained",
    name: "Gained",
    drops: 1,
    waves: [
      {
        id: "gained",
        name: "Gained",
        rocks: [{ kind: "crystal", size: "medium", count: 1 }],
        drops: 1,
        pickups: ["ship"],
        strays: 1,
      },
    ],
  },
]);

/** Returns a wave of small stones in a cluster, near enough to each other that the ship breaks them in a chain. */
function clusterOf(id: string, name: string, count: number): WaveData {
  return {
    id,
    name,
    rocks: [{ kind: "stone", size: "small", count }],
    formation: "cluster",
    drops: 0,
    strays: 0,
  };
}

/** The waves the specs of the chain's multiplier play, by {@link CHAIN_WAVE}. */
export const CHAIN_WAVES: readonly WaveEntry[] = wavesOf([
  {
    id: "chains",
    name: "Chains",
    drops: 0,
    waves: [
      clusterOf("long", "Long", 12),
      {
        id: "blasts",
        name: "Blasts",
        rocks: [{ kind: "volatile", size: "large", count: 6 }],
        formation: "cluster",
        drops: 0,
        strays: 0,
      },
    ],
  },
]);

/**
 * Each of the chain's waves' numbers: the long one's stones outlast a
 * chain, and the blasts one's volatiles set each other off, so the wave is
 * cleared while the chain scores twice.
 */
export const CHAIN_WAVE = { long: 1, blasts: 2 } as const;

/**
 * Two sectors, of a wave and of two, a small stone apiece, for a spec of the
 * sectors a run reaches and starts at.
 */
export const SECTOR_WAVES: readonly WaveEntry[] = wavesOf([
  { id: "near", name: "Near", drops: 0, waves: [pebbleOf("near-1", "Near")] },
  {
    id: "far",
    name: "Far",
    drops: 0,
    waves: [pebbleOf("far-1", "Far"), pebbleOf("far-2", "Farther")],
  },
]);

/** Each of the specs' waves' numbers, by what it is set up for. */
export const SPEC_WAVE = { pebble: 1, gift: 2, last: 3 } as const;

/** Where the specs' runs take their seeds from: always the same. */
export const SPEC_RANDOM = (): number => 0.5;

/** Returns the providers that hand `GameService` the specs' waves, or those given, and {@link SPEC_RANDOM}. */
export function provideSpecWaves(
  waves: readonly WaveEntry[] = SPEC_WAVES,
): Provider[] {
  return [
    { provide: GAME_WAVES, useValue: waves },
    { provide: GAME_RANDOM, useValue: SPEC_RANDOM },
  ];
}

/** Returns the steering that turns the ship toward the nearest rock and fires, or none with no ship or no rock. */
export function shoot(game: GameService): Readonly<Steer> {
  const rock = nearestRock(game.frame().field);
  return rock ? { ...STILL, aim: { x: rock.x, y: rock.y }, fire: true } : STILL;
}

/** Returns the steering that flies the ship into the nearest rock, or none with no ship or no rock. */
export function ram(game: GameService): Readonly<Steer> {
  const rock = nearestRock(game.frame().field);
  return rock ? { ...STILL, aim: { x: rock.x, y: rock.y }, thrust: 1 } : STILL;
}

/** Returns the steering that flies the ship to the pickup floating, else shoots at the nearest rock. */
export function toPickup(game: GameService): Readonly<Steer> {
  const floating = game.frame().field.pickups.find((each) => each.live);
  if (!floating) return shoot(game);
  return { ...STILL, aim: { x: floating.x, y: floating.y }, thrust: 1 };
}

/**
 * Returns the steering that flies the ship to the stray adrift, firing at
 * nothing; with none adrift yet, it turns the ship where it is, which starts
 * the wave.
 */
export function toStray(game: GameService): Readonly<Steer> {
  const { adrift } = game.frame().field.strays;
  return adrift.live
    ? { ...STILL, aim: { x: adrift.x, y: adrift.y }, thrust: 1 }
    : { ...STILL, turn: 1 };
}

/** Returns the whole rock nearest the ship, across the field's edges, or null with no ship or no rock. */
function nearestRock(field: FieldView): Readonly<Rock> | null {
  const { ship, torus } = field;
  if (!ship) return null;
  let nearest: Readonly<Rock> | null = null;
  let nearestApart = Infinity;
  for (const rock of field.rocks) {
    if (!rock.live) continue;
    const apart = distanceSquared(torus, ship.x, ship.y, rock.x, rock.y);
    if (apart < nearestApart) {
      nearest = rock;
      nearestApart = apart;
    }
  }
  return nearest;
}

/**
 * Ticks the game a frame at a time, steered as a rule says, until something
 * comes to pass, failing past a minute's frames.
 */
export function playUntil(
  game: GameService,
  steer: (game: GameService) => Readonly<Steer>,
  done: () => boolean,
): void {
  for (let frame = 0; !done(); frame++) {
    if (frame > PLAY_LIMIT_FRAMES) throw new Error("It never came to pass.");
    game.tick(FRAME_MS, steer(game));
  }
}

/** Ticks the game a frame at a time for a while, steered the same way throughout. */
export function playFor(
  game: GameService,
  ms: number,
  steer: Readonly<Steer>,
): void {
  for (let played = 0; played < ms; played += FRAME_MS) {
    game.tick(FRAME_MS, steer);
  }
}

/** Flies the ship in play, or the next once it comes, into a rock until it is lost. */
export function loseShip(game: GameService): void {
  const ships = game.ships();
  playUntil(game, ram, () => game.ships() < ships);
}

/** Flies every ship the run has into a rock, until the run ends. */
export function endRun(game: GameService): void {
  playUntil(game, ram, game.ended);
}

/** Flies the ship to the wave in play's strays until as many as asked wait at home. */
export function bringStraysHome(game: GameService, count: number): void {
  playUntil(game, toStray, () => game.crew().home.length >= count);
}

/** Shoots at the wave in play's rocks until a chain makes a break score more than once. */
export function chainUp(game: GameService): void {
  playUntil(game, shoot, () => game.chain() > 1);
}

/** Shoots at the wave in play's rocks until it is cleared. */
export function playToClear(game: GameService): void {
  playUntil(game, shoot, () => game.outcome() === "cleared");
}

/** Clears the wave in play, then goes on to the next once its card shows. */
export function clearToNext(game: GameService): void {
  playToClear(game);
  playUntil(game, () => STILL, game.clearedOpen);
  game.nextWave();
}
