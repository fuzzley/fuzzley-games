import { PICKUP_IDS, pickup } from "./catalog/pickups";
import { ROCK_CAP, STRAYS_FROM } from "./tuning";
import {
  ENDLESS,
  SECTORS,
  type SectorData,
  WAVES,
  type Wave,
  type WaveData,
  isEndless,
  opensEndless,
  parseWave,
  waveEntryOf,
  wavesOf,
} from "./waves";

/** What every id is written in. */
const KEBAB = /^[a-z]+(-[a-z]+)*$/;

/** The sector of a spec's waves, whose chance of a pickup is 0.05. */
const SECTOR: SectorData = { id: "spec", name: "Spec", drops: 0.05, waves: [] };

/** Returns a wave of two large stones parsed from data changed as given, as the game's sixth. */
function parsed(changes: Partial<WaveData> = {}, number = 6): Wave {
  return parseWave({
    number,
    sector: SECTOR,
    data: {
      id: "spec",
      name: "Spec",
      rocks: [{ kind: "stone", size: "large", count: 2 }],
      ...changes,
    },
  });
}

describe("parseWave", () => {
  it("lays out the rocks it lists, by kind, size and count", () => {
    const wave = parsed({
      rocks: [
        { kind: "boulder", size: "boulder", count: 1 },
        { kind: "ice", size: "medium", count: 3 },
      ],
    });

    expect(wave.rocks).toEqual([
      { kind: "boulder", size: "boulder", count: 1 },
      { kind: "ice", size: "medium", count: 3 },
    ]);
  });

  it("lays out as many rocks as a field holds", () => {
    const rocks = [{ kind: "stone", size: "small", count: ROCK_CAP }];

    expect(parsed({ rocks }).rocks).toEqual(rocks);
  });

  it("scatters its rocks, or lays them out as it says", () => {
    expect([
      parsed().formation,
      parsed({ formation: "ring" }).formation,
    ]).toEqual(["scatter", "ring"]);
  });

  it("plays at its rocks' own pace, or its own", () => {
    expect([parsed().pace, parsed({ pace: 1.2 }).pace]).toEqual([1, 1.2]);
  });

  it("breaks its boulders into stones, or the kind it says", () => {
    expect([parsed().waveKind, parsed({ waveKind: "iron" }).waveKind]).toEqual([
      "stone",
      "iron",
    ]);
  });

  it("takes its sector's chance of a pickup, or its own", () => {
    expect([parsed().drops, parsed({ drops: 0.2 }).drops]).toEqual([0.05, 0.2]);
  });

  it("lets every pickup come whose wave has come", () => {
    expect(parsed().pool).toEqual(
      PICKUP_IDS.filter((id) => pickup(id).from <= 6),
    );
  });

  it("lets the pickups it names come instead, or none", () => {
    expect([
      parsed({ pickups: ["nova", "slow"] }).pool,
      parsed({ pickups: [] }).pool,
    ]).toEqual([["nova", "slow"], []]);
  });

  it.each([
    ["no stray before the wave strays first come", STRAYS_FROM - 1, 0],
    ["one from it", STRAYS_FROM, 1],
  ])("sends %s", (_, number, strays) => {
    expect(parsed({}, number).strays).toBe(strays);
  });

  it("sends the strays it says, none among them", () => {
    expect([
      parsed({ strays: 3 }).strays,
      parsed({ strays: 0 }).strays,
    ]).toEqual([3, 0]);
  });

  it("sends no comets, or one every time it says, in milliseconds", () => {
    expect([
      parsed().cometEvery,
      parsed({ comets: { every: [9, 12] } }).cometEvery,
    ]).toEqual([null, { least: 9000, most: 12_000 }]);
  });

  it("sends comets as often every time, from a range of one time", () => {
    expect(parsed({ comets: { every: [10, 10] } }).cometEvery).toEqual({
      least: 10_000,
      most: 10_000,
    });
  });

  it.each<[string, Partial<WaveData>, string]>([
    [
      "rocks of a kind that doesn't exist",
      { rocks: [{ kind: "rubber", size: "large", count: 1 }] },
      `its rocks name "rubber", which is no rock`,
    ],
    [
      "rocks of a size that doesn't exist",
      { rocks: [{ kind: "stone", size: "tiny", count: 1 }] },
      `its stone rocks are "tiny", which is no size`,
    ],
    [
      "rocks of a size their kind doesn't come in",
      { rocks: [{ kind: "volatile", size: "small", count: 1 }] },
      "its volatile rocks are small, which a volatile rock doesn't come",
    ],
    [
      "a count that isn't whole",
      { rocks: [{ kind: "stone", size: "large", count: 1.5 }] },
      "it lays 1.5 large stone, which is no count",
    ],
    [
      "a count of none",
      { rocks: [{ kind: "stone", size: "large", count: 0 }] },
      "it lays 0 large stone, which is no count",
    ],
    ["no rocks", { rocks: [] }, "it lays no rocks"],
    [
      "more rocks than a field holds",
      { rocks: [{ kind: "stone", size: "small", count: ROCK_CAP + 1 }] },
      `it lays ${String(ROCK_CAP + 1)} rocks, more than a field holds, ${String(ROCK_CAP)}`,
    ],
    [
      "a formation that doesn't exist",
      { formation: "spiral" },
      `its formation, "spiral", is no formation`,
    ],
    [
      "boulders breaking into a kind that doesn't exist",
      { waveKind: "rubber" },
      `its boulders break into "rubber", which is no large rock`,
    ],
    [
      "boulders breaking into a kind that doesn't come large",
      { waveKind: "boulder" },
      `its boulders break into "boulder", which is no large rock`,
    ],
    ["a pace too slow", { pace: 0.7 }, "its pace, 0.7, is outside 0.8 to 1.4"],
    ["a pace too fast", { pace: 1.5 }, "its pace, 1.5, is outside 0.8 to 1.4"],
    [
      "a chance below none",
      { drops: -0.1 },
      "its chance of a pickup, -0.1, is no chance",
    ],
    [
      "a chance that isn't one",
      { drops: 1.5 },
      "its chance of a pickup, 1.5, is no chance",
    ],
    [
      "a pickup that doesn't exist",
      { pickups: ["rocket"] },
      `its pickups name "rocket", which is no pickup`,
    ],
    [
      "strays that aren't whole",
      { strays: 1.5 },
      "it sends 1.5 strays, which is no count",
    ],
    [
      "strays below none",
      { strays: -1 },
      "it sends -1 strays, which is no count",
    ],
    [
      "comets' time that runs backward",
      { comets: { every: [12, 9] } },
      "its comets come every [12, 9] s, which is no range",
    ],
    [
      "comets' time of one number",
      { comets: { every: [12] } },
      "its comets come every [12] s, which is no range",
    ],
    [
      "comets' time of three numbers",
      { comets: { every: [9, 10, 12] } },
      "its comets come every [9, 10, 12] s, which is no range",
    ],
    [
      "comets that come at once",
      { comets: { every: [0, 2] } },
      "its comets come every [0, 2] s, which is no range",
    ],
    [
      "comets' time of no numbers",
      { comets: { every: [] } },
      "its comets come every [] s, which is no range",
    ],
    [
      "more rocks than a field holds, all told",
      {
        rocks: [
          { kind: "stone", size: "small", count: ROCK_CAP },
          { kind: "ice", size: "small", count: 1 },
        ],
      },
      `it lays ${String(ROCK_CAP + 1)} rocks, more than a field holds, ${String(ROCK_CAP)}`,
    ],
  ])("names %s", (_, changes, problem) => {
    expect(() => parsed(changes)).toThrow(`Wave "spec": ${problem}.`);
  });

  it.each<[string, Partial<WaveData>]>([
    ["the slowest pace", { pace: 0.8 }],
    ["the fastest pace", { pace: 1.4 }],
    ["no chance of a pickup", { drops: 0 }],
    ["a pickup from every rock", { drops: 1 }],
  ])("parses a wave of %s", (_, changes) => {
    expect(() => parsed(changes)).not.toThrow();
  });

  it("names a key no wave has, as a typo would leave", () => {
    const typo = { pase: 1.3 };

    const parse = (): Wave => parsed({ name: "Spec", ...typo });

    expect(parse).toThrow(`Wave "spec": it has a "pase", which no wave has.`);
  });

  it("names a key no rocks have", () => {
    const typo = { cuont: 2 };

    const parse = (): Wave =>
      parsed({ rocks: [{ kind: "stone", size: "large", count: 1, ...typo }] });

    expect(parse).toThrow(
      `Wave "spec": its rocks have a "cuont", which no rocks have.`,
    );
  });

  it("names a key no comets have", () => {
    const typo = { evry: [9, 12] };

    const parse = (): Wave => parsed({ comets: { every: [9, 12], ...typo } });

    expect(parse).toThrow(
      `Wave "spec": its comets have a "evry", which no comets have.`,
    );
  });
});

describe("the waves", () => {
  const named = WAVES.map((entry) => [entry.data.name, entry] as const);

  it.each(named)("parse %s", (_, entry) => {
    expect(() => parseWave(entry)).not.toThrow();
  });

  it("each have an id of their own, in kebab-case", () => {
    const ids = WAVES.map((entry) => entry.data.id);

    expect({
      unique: new Set(ids).size === ids.length,
      kebab: ids.filter((id) => !KEBAB.test(id)),
    }).toEqual({ unique: true, kebab: [] });
  });

  it("each have a name of their own", () => {
    const names = WAVES.map((entry) => entry.data.name);

    expect(new Set(names).size).toBe(names.length);
  });

  const sectors = SECTORS.map((sector) => [sector.name, sector] as const);

  it.each(sectors)("never slow the pace within %s", (_, sector) => {
    const paces = sector.waves.map((wave) => wave.pace ?? 1);

    expect(paces).toEqual([...paces].sort((a, b) => a - b));
  });

  it.each(sectors)(
    "hold %s whole: ten waves, a boulder in the last alone, the sector's test",
    (_, sector) => {
      const boulders = sector.waves.map((wave) =>
        wave.rocks.some((rocks) => rocks.kind === "boulder"),
      );

      expect(boulders).toEqual([...Array<boolean>(9).fill(false), true]);
    },
  );

  it("are thirty, in three sectors", () => {
    expect({ waves: WAVES.length, sectors: SECTORS.length }).toEqual({
      waves: 30,
      sectors: 3,
    });
  });

  it("number every wave in the order played, from 1", () => {
    expect(WAVES.map((entry) => entry.number)).toEqual(
      WAVES.map((_, i) => i + 1),
    );
  });
});

describe("the sectors", () => {
  it("each have an id of their own, in kebab-case, and a name of their own", () => {
    const ids = SECTORS.map((sector) => sector.id);
    const names = SECTORS.map((sector) => sector.name);

    expect({
      ids: new Set(ids).size === ids.length,
      names: new Set(names).size === names.length,
      kebab: ids.filter((id) => !KEBAB.test(id)),
    }).toEqual({ ids: true, names: true, kebab: [] });
  });
});

describe("wavesOf", () => {
  /** Returns a sector of waves of a large stone each, named by their ids. */
  function sectorOf(id: string, waveIds: readonly string[]): SectorData {
    return {
      id,
      name: id,
      drops: 0,
      waves: waveIds.map((waveId) => ({
        id: waveId,
        name: waveId,
        rocks: [{ kind: "stone", size: "large", count: 1 }],
      })),
    };
  }

  it("numbers the waves of every sector in order, from 1, each with its sector", () => {
    const sectors = [sectorOf("first", ["a", "b"]), sectorOf("second", ["c"])];

    const waves = wavesOf(sectors);

    expect(
      waves.map(({ number, sector, data }) => [number, sector.id, data.id]),
    ).toEqual([
      [1, "first", "a"],
      [2, "first", "b"],
      [3, "second", "c"],
    ]);
  });
});

describe("waveEntryOf", () => {
  it("finds a wave by its number", () => {
    expect(waveEntryOf(WAVES, 2)).toBe(WAVES[1]);
  });

  it("gives one of Endless's past the last, numbered on and named Endless", () => {
    const entry = waveEntryOf(WAVES, WAVES.length + 2);

    expect({
      number: entry.number,
      sector: entry.sector,
      name: entry.data.name,
      endless: isEndless(entry),
    }).toEqual({
      number: WAVES.length + 2,
      sector: ENDLESS,
      name: "Endless",
      endless: true,
    });
  });

  it.each([0, -1])("throws for wave %d", (wave) => {
    expect(() => waveEntryOf(WAVES, wave)).toThrow(RangeError);
  });
});

describe("isEndless", () => {
  it("tells a sector's wave from Endless's", () => {
    expect([
      isEndless(waveEntryOf(WAVES, WAVES.length)),
      isEndless(waveEntryOf(WAVES, WAVES.length + 1)),
    ]).toEqual([false, true]);
  });
});

describe("opensEndless", () => {
  it.each([
    ["a sector's last but the last sector's", 10, false],
    ["the last sector's last", WAVES.length, true],
    ["Endless's first", WAVES.length + 1, false],
  ])(
    "says whether clearing %s takes a run into Endless",
    (_, number, opens) => {
      const cleared = waveEntryOf(WAVES, number);
      const next = waveEntryOf(WAVES, number + 1);

      expect(opensEndless(cleared, next)).toBe(opens);
    },
  );
});
