import { isCount, unknownKey } from "@fz/core/json";
import {
  PICKUP_IDS,
  type PickupId,
  isPickupId,
  pickup,
} from "./catalog/pickups";
import {
  type RockKindId,
  type RockSize,
  isRockKindId,
  isRockSize,
  rockKind,
} from "./catalog/rocks";
import { ROCK_CAP, STRAYS_FROM, type Span } from "./tuning";
import innerBelt from "./waves/inner-belt.json";
import ironReach from "./waves/iron-reach.json";
import storm from "./waves/storm.json";

/** Every way a wave's rocks are laid out as it starts. */
export const FORMATIONS = ["scatter", "ring", "wall", "cluster"] as const;

/** Names how a wave's rocks are laid out as it starts. */
export type Formation = (typeof FORMATIONS)[number];

/** Describes rocks of one kind and size a wave lays out, as its sector's file holds them. */
export interface RocksData {
  readonly kind: string;
  readonly size: string;
  readonly count: number;
}

/** Describes how often a wave's comets come, as its sector's file holds it. */
export interface CometsData {
  /** The seconds from one comet to the next, drawn from the least to the most, a list of the two. */
  readonly every: readonly number[];
}

/**
 * Describes a wave as its sector's file holds it, its names text until
 * {@link parseWave} checks them.
 */
export interface WaveData {
  /** Names it for good: its records are kept by it, so it never changes. */
  readonly id: string;
  /** Names it to the player. */
  readonly name: string;
  /** Its rocks, by kind, size and count, for a field of 40 by 40. */
  readonly rocks: readonly RocksData[];
  /** How its rocks are laid out, one of {@link FORMATIONS}; scattered by default. */
  readonly formation?: string;
  /** The rocks' speed against their own, 1 by default. */
  readonly pace?: number;
  /** The kind of rock it names, which its boulders break into; stone by default. */
  readonly waveKind?: string;
  /** The chance a broken rock lets a pickup go; else its sector's. */
  readonly drops?: number;
  /** The pickups that can come; else every one whose wave has come. */
  readonly pickups?: readonly string[];
  /** How many strays cross it; one from wave 3 by default. */
  readonly strays?: number;
  /** How often comets come; none come by default. */
  readonly comets?: CometsData;
}

/** Describes a sector of waves, as its file holds it. */
export interface SectorData {
  readonly id: string;
  readonly name: string;
  /** The chance a broken rock lets a pickup go, in a wave that doesn't say. */
  readonly drops: number;
  readonly waves: readonly WaveData[];
}

/** Describes a wave of the game: its data, its sector, and its number. */
export interface WaveEntry {
  /** Its place in the game, from 1. */
  readonly number: number;
  readonly sector: SectorData;
  readonly data: WaveData;
}

/** Describes rocks of one kind and size a wave lays out. */
export interface WaveRocks {
  readonly kind: RockKindId;
  readonly size: RockSize;
  /** How many, for a field of 40 by 40. */
  readonly count: number;
}

/** Describes a wave, ready to play. */
export interface Wave {
  readonly rocks: readonly WaveRocks[];
  readonly formation: Formation;
  /** The rocks' speed against their own. */
  readonly pace: number;
  /** The kind of rock it names, which its boulders break into. */
  readonly waveKind: RockKindId;
  /** The chance a broken rock lets a pickup go. */
  readonly drops: number;
  /** The pickups that can come. */
  readonly pool: readonly PickupId[];
  /** How many strays cross it, for a field of 40 by 40. */
  readonly strays: number;
  /** The time from one comet to the next, in milliseconds, or null for a wave without comets. */
  readonly cometEvery: Span | null;
}

/** Every sector, in the order they are played. */
export const SECTORS: readonly SectorData[] = [innerBelt, ironReach, storm];

/** Returns the waves of sectors, in the order played, numbered from 1. */
export function wavesOf(sectors: readonly SectorData[]): WaveEntry[] {
  return sectors
    .flatMap((sector) => sector.waves.map((data) => ({ sector, data })))
    .map((entry, i) => ({ ...entry, number: i + 1 }));
}

/** Every wave, in the order they are played. */
export const WAVES: readonly WaveEntry[] = wavesOf(SECTORS);

/**
 * Returns a wave by its number, from 1; past the last, the last again,
 * numbered on.
 *
 * @throws {RangeError} For a number below 1, or a game of no waves.
 */
export function waveEntryOf(
  waves: readonly WaveEntry[],
  wave: number,
): WaveEntry {
  const last = waves.length;
  const entry = waves[Math.min(wave, last) - 1];
  if (!entry) throw new RangeError(`No wave ${String(wave)}.`);
  return wave > last ? { ...entry, number: wave } : entry;
}

/** The slowest and the fastest a wave's pace may be. */
const PACE: Span = { least: 0.8, most: 1.4 };

/** The keys a wave's data may have, so one a typo misspells isn't left unread. */
const WAVE_KEYS: Readonly<Record<keyof WaveData, true>> = {
  id: true,
  name: true,
  rocks: true,
  formation: true,
  pace: true,
  waveKind: true,
  drops: true,
  pickups: true,
  strays: true,
  comets: true,
};

/** The keys a wave's rocks may have. */
const ROCKS_KEYS: Readonly<Record<keyof RocksData, true>> = {
  kind: true,
  size: true,
  count: true,
};

/** The keys a wave's comets may have. */
const COMETS_KEYS: Readonly<Record<keyof CometsData, true>> = { every: true };

/**
 * Returns a wave ready to play from its entry, or throws an error that
 * names what is wrong with its data.
 */
export function parseWave({ number, sector, data }: WaveEntry): Wave {
  const extra = unknownKey(data, WAVE_KEYS);
  if (extra !== null) {
    throw wrong(data, `it has a "${extra}", which no wave has`);
  }
  const rocks = data.rocks.map((each) => rocksOf(data, each));
  const count = rocks.reduce((sum, each) => sum + each.count, 0);
  if (count === 0) throw wrong(data, "it lays no rocks");
  if (count > ROCK_CAP) {
    throw wrong(
      data,
      `it lays ${String(count)} rocks, more than a field holds, ${String(ROCK_CAP)}`,
    );
  }
  const pace = data.pace ?? 1;
  if (pace < PACE.least || pace > PACE.most) {
    throw wrong(
      data,
      `its pace, ${String(pace)}, is outside ${String(PACE.least)} to ${String(PACE.most)}`,
    );
  }
  const drops = data.drops ?? sector.drops;
  if (drops < 0 || drops > 1) {
    throw wrong(data, `its chance of a pickup, ${String(drops)}, is no chance`);
  }
  const strays = data.strays ?? (number >= STRAYS_FROM ? 1 : 0);
  if (!isCount(strays)) {
    throw wrong(data, `it sends ${String(strays)} strays, which is no count`);
  }
  return {
    rocks,
    formation: formationOf(data),
    pace,
    waveKind: waveKindOf(data),
    drops,
    pool: poolOf(data, number),
    strays,
    cometEvery: cometsOf(data),
  };
}

/** Returns an error that names what is wrong with a wave's data. */
function wrong(data: WaveData, problem: string): Error {
  return new Error(`Wave "${data.id}": ${problem}.`);
}

/** Returns rocks of one kind and size a wave lists, checked. */
function rocksOf(data: WaveData, rocks: RocksData): WaveRocks {
  const extra = unknownKey(rocks, ROCKS_KEYS);
  if (extra !== null) {
    throw wrong(data, `its rocks have a "${extra}", which no rocks have`);
  }
  const { kind, size, count } = rocks;
  if (!isRockKindId(kind)) {
    throw wrong(data, `its rocks name "${kind}", which is no rock`);
  }
  if (!isRockSize(size)) {
    throw wrong(data, `its ${kind} rocks are "${size}", which is no size`);
  }
  if (rockKind(kind).hits[size] === undefined) {
    throw wrong(
      data,
      `its ${kind} rocks are ${size}, which a ${kind} rock doesn't come`,
    );
  }
  if (!isCount(count) || count === 0) {
    throw wrong(
      data,
      `it lays ${String(count)} ${size} ${kind}, which is no count`,
    );
  }
  return { kind, size, count };
}

/** Returns how a wave's rocks are laid out, checked. */
function formationOf(data: WaveData): Formation {
  const formation = data.formation ?? "scatter";
  if (!isFormation(formation)) {
    throw wrong(data, `its formation, "${formation}", is no formation`);
  }
  return formation;
}

/** Returns whether a name is one of {@link FORMATIONS}. */
function isFormation(name: string): name is Formation {
  return FORMATIONS.some((formation) => formation === name);
}

/** Returns the kind of rock a wave names, which its boulders break into, checked: one that comes large. */
function waveKindOf(data: WaveData): RockKindId {
  const kind = data.waveKind ?? "stone";
  if (!isRockKindId(kind) || rockKind(kind).hits.large === undefined) {
    throw wrong(
      data,
      `its boulders break into "${kind}", which is no large rock`,
    );
  }
  return kind;
}

/** Returns the pickups that can come in a wave: its own, or those whose wave has come. */
function poolOf(data: WaveData, number: number): PickupId[] {
  if (!data.pickups) {
    return PICKUP_IDS.filter((id) => pickup(id).from <= number);
  }
  return data.pickups.map((id) => {
    if (!isPickupId(id)) {
      throw wrong(data, `its pickups name "${id}", which is no pickup`);
    }
    return id;
  });
}

/** Returns the time from one of a wave's comets to the next, in milliseconds, checked, or null for none. */
function cometsOf(data: WaveData): Span | null {
  if (!data.comets) return null;
  const extra = unknownKey(data.comets, COMETS_KEYS);
  if (extra !== null) {
    throw wrong(data, `its comets have a "${extra}", which no comets have`);
  }
  const [least, most, ...rest] = data.comets.every;
  if (
    least === undefined ||
    most === undefined ||
    rest.length > 0 ||
    least <= 0 ||
    most < least
  ) {
    throw wrong(
      data,
      `its comets come every [${data.comets.every.join(", ")}] s, which is no range`,
    );
  }
  return { least: least * 1000, most: most * 1000 };
}
