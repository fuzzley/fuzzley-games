import type { Provider } from "@angular/core";
import { FRAME_MS, playUntil } from "@fz/core/testing";
import { GAME_RANDOM } from "@fz/game-ui/random";
import { browserKey } from "@fz/phaser/testing";
import type { GameService } from "../app/play/game.service";
import { GAME_WAVES } from "../app/tokens";
import type { RockSize } from "../rules/catalog/rocks";
import type { Rock } from "../rules/rocks/rocks";
import { restoreGame } from "../rules/run/saved_game";
import { STILL, type Steer } from "../rules/ship/ship";
import { distanceSquared } from "../rules/torus";
import { type WaveData, type WaveEntry, wavesOf } from "../rules/waves/waves";
import { type BoardSetting, MARGIN_CSS_PX } from "../view/field/field_metrics";
import type { FieldView } from "../view/field/frame";

/** How the board lays the field out on a roomy screen with no touch, the ship flown by the keys. */
export const ROOMY: BoardSetting = {
  marginCss: MARGIN_CSS_PX.roomy,
  deck: false,
  stickOnRight: false,
  fireByItself: false,
};

/** Space as a browser sends it, with the key code Phaser's capture reads. */
export const SPACE = browserKey("Space", " ");

/**
 * Returns a wave of one stone, medium unless it says, which a few shots
 * clear, and nothing else to come: enough rock that a run of a crew of three
 * can end on it, as each hit that knocks one loose breaks a rock a size
 * down.
 */
function pebbleOf(
  id: string,
  name: string,
  size: RockSize = "medium",
): WaveData {
  return {
    id,
    name,
    rocks: [{ kind: "stone", size, count: 1 }],
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
      // A crystal, which lets a Shield go as it breaks into two stones, and
      // they let none go, so a run rammed into them can end.
      {
        id: "gift",
        name: "Gift",
        rocks: [{ kind: "crystal", size: "large", count: 1 }],
        drops: 0,
        pickups: ["shield"],
        strays: 0,
      },
      pebbleOf("last", "Last"),
    ],
  },
]);

/**
 * A wave of one large stone and two strays, for a spec that brings them
 * home: the stone stays, as nothing fires at it, so the wave stays in play
 * until the strays come, and holds enough rock that a run with a stray
 * caught can end on it.
 */
export const STRAY_WAVES: readonly WaveEntry[] = wavesOf([
  {
    id: "strays",
    name: "Strays",
    drops: 0,
    waves: [{ ...pebbleOf("stray", "Stray", "large"), strays: 2 }],
  },
]);

/**
 * A wave of one large stone and one stray, for a spec that brings it home
 * and plays on with no other to come, enough rock that a run with it caught
 * can end on it.
 */
export const ONE_STRAY_WAVES: readonly WaveEntry[] = wavesOf([
  {
    id: "stray",
    name: "Stray",
    drops: 0,
    waves: [{ ...pebbleOf("stray", "Stray", "large"), strays: 1 }],
  },
]);

/**
 * Two sectors, of a wave and of two, a stone apiece, for a spec of the
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

/**
 * Returns the providers that hand `GameService` the specs' waves, or those
 * given, and {@link SPEC_RANDOM}.
 */
export function provideSpecWaves(
  waves: readonly WaveEntry[] = SPEC_WAVES,
): Provider[] {
  return [
    { provide: GAME_WAVES, useValue: waves },
    { provide: GAME_RANDOM, useValue: SPEC_RANDOM },
  ];
}

/**
 * Returns the steering that turns the ship toward the nearest rock and
 * fires, or none with no ship or no rock.
 */
export function shoot(game: GameService): Readonly<Steer> {
  const rock = nearestRock(game.frame().field);
  return rock ? { ...STILL, aim: { x: rock.x, y: rock.y }, fire: true } : STILL;
}

/**
 * Returns the steering that flies the ship into the nearest rock, or none
 * with no ship or no rock.
 */
export function ram(game: GameService): Readonly<Steer> {
  const rock = nearestRock(game.frame().field);
  return rock ? { ...STILL, aim: { x: rock.x, y: rock.y }, thrust: 1 } : STILL;
}

/**
 * Returns the steering that flies the ship to the pickup floating, else
 * shoots at the nearest rock.
 */
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

/**
 * Returns the whole rock nearest the ship, across the field's edges, or
 * null with no ship or no rock.
 */
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

/** Flies the ship into a rock until a hit costs it one of its crew, knocked loose. */
export function loseShip(game: GameService): void {
  const ships = game.ships();
  playUntil(game, ram, () => game.ships() < ships);
}

/** Flies the ship into rocks, a hit knocking each in tow loose and the last ending the run. */
export function endRun(game: GameService): void {
  playUntil(game, ram, game.ended);
}

/** Flies the ship to the wave in play's strays until it has brought as many home as asked. */
export function bringStraysHome(game: GameService, count: number): void {
  playUntil(game, toStray, () => game.run().strays >= count);
}

/**
 * Takes the run in play over the specs' waves, or those given, up again as
 * storage would keep it with the pilot's static on its field at a level,
 * the run's as its wave started left as it was: paused, under the id its
 * next run takes.
 */
export function takeUpCharged(
  game: GameService,
  level: number,
  waves: readonly WaveEntry[] = SPEC_WAVES,
): void {
  const saved = game.saved();
  if (!saved?.field) throw new Error("The run keeps no wave in play.");
  const charged = { ...saved, field: { ...saved.field, charge: level } };
  const taken = restoreGame(charged, waves, game.run().id + 1);
  if (!taken) throw new Error("The run kept with static can't be taken up.");
  game.takeUp(taken);
}

/** Shoots at the wave in play's rocks until it is cleared. */
export function playToClear(game: GameService): void {
  playUntil(game, shoot, () => game.outcome() === "cleared");
}

/** Starts the wave in play, then pauses it, for the Paused card. */
export function pauseIn(game: GameService): void {
  game.tick(FRAME_MS, shoot(game));
  game.pause();
}

/** Clears the wave in play, until the Cleared card shows. */
export function clearIn(game: GameService): void {
  playToClear(game);
  playUntil(game, () => STILL, game.clearedOpen);
}

/** Clears the wave in play, then goes on to the next once its card shows. */
export function clearToNext(game: GameService): void {
  clearIn(game);
  game.nextWave();
}

/**
 * Goes on from the Cleared card by a press, as a flight key or a press on
 * the field does, then plays a frame of the next wave with it held, firing
 * at its nearest rock.
 */
export function pressOn(game: GameService): void {
  game.command("go");
  game.tick(FRAME_MS, shoot(game));
}

/** Ends the run, and puts its result away, for the Ended card. */
export function endIn(game: GameService): void {
  endRun(game);
  playUntil(game, () => STILL, game.resultOpen);
  game.closeResult();
}
