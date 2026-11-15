import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordingPrinter } from "@fz/dev/script";
import { spritemapOf, takeNames } from "@fz/dev/sounds";
import { loudness, osc, wav } from "@fz/dev/synth";
import shipped from "../src/scene/sounds/sprite.json";
import recorded from "../src/scene/sounds/sprite_lengths.json";
import { SOUNDS, SOUND_NAMES } from "../src/view/effects/sounds";
import {
  BED_FAMILY,
  type Encode,
  FAMILIES,
  LEVELS,
  type Recipe,
  SPRITE_FOLDER,
  SPRITE_LAYOUT,
  readCommandLine,
  renderTake,
  run,
  warningsOf,
} from "./build-sounds.mjs";

/** Each take's length in the shipped sprite, in samples, by its name. */
const LENGTHS: Readonly<Record<string, number>> = recorded.takes;

/** Returns the first 16 hex digits of the SHA-256 of a file's bytes. */
function digestOf(file: Buffer): string {
  return createHash("sha256").update(file).digest("hex").slice(0, 16);
}

/** Returns the recipes of the sprite's sounds, every family's but the beds', by name, as the sprite holds them. */
function spriteRecipes(): Recipe[] {
  return Object.entries(FAMILIES)
    .filter(([family]) => family !== BED_FAMILY)
    .flatMap(([, recipes]) => recipes)
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
}

/** Returns the names of a recipe's takes. */
function takesOf(recipe: Recipe): string[] {
  return takeNames(recipe.name, recipe.takes ?? 1);
}

/** Returns the recipe of a sound by its name, from whichever family has it. */
function recipeNamed(name: string): Recipe {
  const recipe = Object.values(FAMILIES)
    .flat()
    .find((one) => one.name === name);
  if (recipe === undefined) throw new Error(`No recipe is named "${name}".`);
  return recipe;
}

describe("the shipped sprite", () => {
  it("holds every take of every sound but the beds, by name, as the sprite orders them", () => {
    expect(Object.keys(shipped.spritemap)).toEqual(
      spriteRecipes().flatMap(takesOf),
    );
  });

  it("loops the takes of the sounds the recipes loop, and no others", () => {
    expect(
      Object.entries(shipped.spritemap)
        .filter(([, { loop }]) => loop)
        .map(([take]) => take),
    ).toEqual(
      spriteRecipes()
        .filter(({ loop }) => loop)
        .flatMap(takesOf),
    );
  });

  it("records the length of each take of its map, at the sprite's rate", () => {
    expect({
      sampleRate: recorded.sampleRate,
      takes: Object.keys(LENGTHS),
    }).toEqual({
      sampleRate: SPRITE_LAYOUT.sampleRate,
      takes: Object.keys(shipped.spritemap),
    });
  });

  it("lays each take where the build's packer lays out its recorded length, to the byte", () => {
    const spritemap = spritemapOf(
      spriteRecipes().map((recipe) => ({
        name: recipe.name,
        lengths: takesOf(recipe).map((take) => LENGTHS[take] ?? Number.NaN),
        loop: recipe.loop ?? false,
      })),
      SPRITE_LAYOUT,
    );

    expect(`${JSON.stringify({ spritemap }, null, 2)}\n`).toBe(
      readFileSync(join(SPRITE_FOLDER, "sprite.json"), "utf8"),
    );
  });

  it("is encoded for every browser, and each bed beside it", async () => {
    const [sounds, beds] = await Promise.all([
      readdir(SPRITE_FOLDER),
      readdir(join(SPRITE_FOLDER, "beds")),
    ]);

    expect({
      sprite: ["sprite.m4a", "sprite.ogg"].every((file) =>
        sounds.includes(file),
      ),
      beds: beds.sort(),
    }).toEqual({
      sprite: true,
      beds: (FAMILIES[BED_FAMILY] ?? [])
        .flatMap(takesOf)
        .flatMap((bed) => [`${bed}.m4a`, `${bed}.ogg`])
        .sort(),
    });
  });
});

describe("the view's mix", () => {
  it("names every sound of the sprite, at its recipe's family, level and takes", () => {
    const recipes = Object.entries(FAMILIES)
      .filter(([family]) => family !== BED_FAMILY)
      .flatMap(([family, ofFamily]) =>
        ofFamily.map((recipe) => ({ family, recipe })),
      );

    expect(
      SOUND_NAMES.map((name) => {
        const { family, level, takes } = SOUNDS[name];
        return { name, family, level, takes };
      }),
    ).toEqual(
      recipes.map(({ family, recipe }) => ({
        name: recipe.name,
        family,
        level: recipe.level,
        takes: recipe.takes ?? 1,
      })),
    );
  });
});

describe("a take rendered", () => {
  // Each take, its sound, its number from 0, and the first 16 hex digits of
  // the SHA-256 of the WAV the uplift's kit wrote of it, which the user heard.
  it.each([
    ["tally-tick", "tally-tick", 0, "fcdb275527d4cd84"],
    ["shot-rapid-3", "shot-rapid", 2, "a11b30bac3cec652"],
    ["spark-1", "spark", 0, "8a933c714e7cfbe2"],
    ["ui-move", "ui-move", 0, "29050741adb669de"],
    ["shot-gun-2", "shot-gun", 1, "1ecf7e14261f7bc7"],
  ])(
    "renders %s as the kit did, at its recorded length, at its level under the ceiling",
    (takeName, name, take, kitDigest) => {
      const recipe = recipeNamed(name);

      const [first] = renderTake(recipe, take);

      const x = first ?? new Float64Array();
      expect({
        digest: digestOf(wav(x)),
        length: x.length,
        level: loudness(x).rms50,
        underCeiling: loudness(x).peak <= -1 + 1e-9,
        warnings: warningsOf(takeName, recipe, x),
      }).toEqual({
        digest: kitDigest,
        length: LENGTHS[takeName],
        level: expect.closeTo(LEVELS[recipe.level], 0) as unknown,
        underCeiling: true,
        warnings: [],
      });
    },
  );
});

describe("readCommandLine", () => {
  it("reads the families and the sounds asked for, none for every one", () => {
    expect([
      readCommandLine([]),
      readCommandLine(["--family", "rocks", "--only", "shot-gun"]),
    ]).toEqual([
      { families: [], only: [] },
      { families: ["rocks"], only: ["shot-gun"] },
    ]);
  });

  it("refuses a family or a sound that has no recipes, and says how to ask for help", () => {
    expect([
      readCommandLine(["--family", "boulders"]),
      readCommandLine(["--only", "shot-laser"]),
      readCommandLine(["--help"]),
    ]).toEqual([
      {
        code: 2,
        message: expect.stringContaining(
          '--family names no family: "boulders".',
        ) as unknown,
      },
      {
        code: 2,
        message: expect.stringContaining(
          '--only names no sound: "shot-laser".',
        ) as unknown,
      },
      {
        code: 0,
        message: expect.stringContaining("Usage: yarn build:sounds") as unknown,
      },
    ]);
  });
});

/** A short tone, once. */
const TONE: Recipe = {
  name: "tone",
  about: "A tone a spec builds.",
  level: "small",
  make: () => osc("sine", 1000, 0.05),
};

/** Two short tones, a take each. */
const TWICE: Recipe = {
  name: "twice",
  about: "Two tones a spec builds.",
  takes: 2,
  level: "tick",
  make: (take) => osc("sine", 2000 + 500 * take, 0.03),
};

/** A hum of whole cycles, which loops unbroken. */
const DRONE: Recipe = {
  name: "drone",
  about: "A loop a spec builds.",
  level: "small",
  loop: true,
  make: () => osc("sine", 600, 0.05),
};

/** A bed of a hum in both ears, of whole cycles, so it loops unbroken. */
const HUM: Recipe = {
  name: "hum",
  about: "A bed a spec builds.",
  level: "bed",
  loop: true,
  make: () => [osc("sine", 500, 0.1), osc("sine", 500, 0.1)],
};

/** Families of a spec's own: a bed and three sounds of the sprite, one looped. */
const SPEC_FAMILIES = { [BED_FAMILY]: [HUM], tones: [TWICE, TONE, DRONE] };

describe("run", () => {
  let wavFolder = "";
  let spriteFolder = "";

  beforeEach(async () => {
    wavFolder = await mkdtemp(join(tmpdir(), "build-sounds-wav-"));
    spriteFolder = await mkdtemp(join(tmpdir(), "build-sounds-sprite-"));
  });

  afterEach(async () => {
    await rm(wavFolder, { recursive: true, force: true });
    await rm(spriteFolder, { recursive: true, force: true });
  });

  /** Encodes a WAV as a file of each format that says what it was handed. */
  async function fakeEncode(
    from: string,
    to: string,
    quality: number,
    rate: string,
  ): Promise<void> {
    const said = `${from} ${String(quality)} ${rate}`;
    await writeFile(`${to}.ogg`, said);
    await writeFile(`${to}.m4a`, said);
  }

  /** Runs the build over the spec's families, into its folders, with an encoder or none, as where ffmpeg isn't on the path. */
  async function build(
    args: readonly string[],
    encoder: Encode | null,
  ): Promise<{ code: number; out: readonly string[] }> {
    const printer = recordingPrinter();
    const code = await run(args, {
      ...printer,
      families: SPEC_FAMILIES,
      wavFolder,
      spriteFolder,
      findEncoder: () => Promise.resolve(encoder),
    });
    return { code, out: printer.out };
  }

  it("renders every take and packs the sprite of all but the beds, leaving the game's sounds as they are without ffmpeg", async () => {
    const { code, out } = await build([], null);

    const sprite = JSON.parse(
      await readFile(join(wavFolder, "sprite.json"), "utf8"),
    ) as { spritemap: Record<string, { loop: boolean }> };
    const spriteWav = await readFile(join(wavFolder, "sprite.wav"));
    expect({
      code,
      out,
      wavs: {
        beds: await readdir(join(wavFolder, "beds")),
        tones: (await readdir(join(wavFolder, "tones"))).sort(),
      },
      takes: Object.keys(sprite.spritemap),
      loops: Object.entries(sprite.spritemap)
        .filter(([, { loop }]) => loop)
        .map(([take]) => take),
      lengths: await readFile(join(wavFolder, "sprite_lengths.json"), "utf8"),
      spriteWav: { bytes: spriteWav.length, digest: digestOf(spriteWav) },
      game: await readdir(spriteFolder),
    }).toEqual({
      code: 0,
      out: [
        "beds: 1 takes of 1 sounds",
        "tones: 4 takes of 3 sounds",
        expect.stringMatching(
          /^The sprite: 4 takes, 0\.3 s, in .+sprite\.wav\.$/,
        ) as unknown,
        expect.stringContaining("ffmpeg isn't on the path") as unknown,
      ],
      wavs: {
        beds: ["hum.wav"],
        tones: ["drone.wav", "tone.wav", "twice-1.wav", "twice-2.wav"],
      },
      takes: ["drone", "tone", "twice-1", "twice-2"],
      loops: ["drone"],
      lengths: `${JSON.stringify({ sampleRate: 44100, takes: { drone: 2205, tone: 2205, "twice-1": 1323, "twice-2": 1323 } }, null, 2)}\n`,
      // The takes and a gap after each, the last's too, as the kit's encoder
      // was handed them, each take as its WAV holds it: the bytes the build
      // wrote when it rendered every take of the game as the kit did.
      spriteWav: {
        bytes: 44 + 2 * (7056 + 4 * 2646),
        digest: "70cc4c69b55ee898",
      },
      game: [],
    });
  });

  it("encodes the sprite and each bed into the game's sounds with ffmpeg, the map and the lengths beside them", async () => {
    const { code } = await build([], fakeEncode);

    expect({
      code,
      game: (await readdir(spriteFolder)).sort(),
      beds: (await readdir(join(spriteFolder, "beds"))).sort(),
      sprite: await readFile(join(spriteFolder, "sprite.ogg"), "utf8"),
      bed: await readFile(join(spriteFolder, "beds", "hum.m4a"), "utf8"),
      map: await readFile(join(spriteFolder, "sprite.json"), "utf8"),
    }).toEqual({
      code: 0,
      game: [
        "beds",
        "sprite.json",
        "sprite.m4a",
        "sprite.ogg",
        "sprite_lengths.json",
      ],
      beds: ["hum.m4a", "hum.ogg"],
      sprite: `${join(wavFolder, "sprite.wav")} 5 96k`,
      bed: `${join(wavFolder, "beds", "hum.wav")} 4 128k`,
      map: await readFile(join(wavFolder, "sprite.json"), "utf8"),
    });
  });

  it("changes none of the game's sounds where an encode fails", async () => {
    const failing: Encode = (from, to, quality, rate) =>
      from.endsWith("hum.wav")
        ? Promise.reject(new Error("This ffmpeg has no Vorbis."))
        : fakeEncode(from, to, quality, rate);

    const failed = await build([], failing).then(
      () => "",
      (error: unknown) => String(error),
    );

    expect({ failed, game: await readdir(spriteFolder) }).toEqual({
      failed: "Error: This ffmpeg has no Vorbis.",
      game: [],
    });
  });

  it("renders only the families or the sounds asked for, and packs nothing", async () => {
    const { code, out } = await build(["--only", "tone"], fakeEncode);

    expect({
      code,
      out,
      wavs: await readdir(wavFolder),
      game: await readdir(spriteFolder),
    }).toEqual({
      code: 0,
      out: [
        "tones: 1 takes of 1 sounds",
        "Packed nothing: the sprite holds every sound, so build them all.",
      ],
      wavs: ["tones"],
      game: [],
    });
  });

  it("builds nothing for a command line it can't read", async () => {
    const { code } = await build(["--family", "boulders"], fakeEncode);

    expect({ code, wavs: await readdir(wavFolder) }).toEqual({
      code: 2,
      wavs: [],
    });
  });
});
