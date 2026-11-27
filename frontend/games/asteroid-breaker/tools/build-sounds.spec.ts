import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { recordingPrinter } from "@fz/dev/script";
import {
  type RunProgram,
  fakeFfmpeg,
  missingFfmpeg,
  spritemapOf,
  takeNames,
} from "@fz/dev/sounds";
import { loudness, osc, wav } from "@fz/dev/synth";
import shipped from "../src/scene/sounds/sprite.json";
import recorded from "../src/scene/sounds/sprite_lengths.json";
import { SOUNDS, SOUND_NAMES } from "../src/view/effects/sounds";
import {
  BED_FAMILY,
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
import { PLAYS } from "./sound-lab/plays";

/** Each take's length in the shipped sprite, in samples, by its name. */
const LENGTHS: Readonly<Record<string, number>> = recorded.takes;

/**
 * Each sound of the sprite and the first 16 hex digits of the SHA-256 of the
 * kit's WAVs of its takes, one after another, which the user heard. The
 * beds lie outside the sprite, and would take about 24 s more to render,
 * so no spec renders them.
 */
const KIT_SOUNDS: Readonly<Record<string, string>> = {
  "blast-volatile": "0159206eaff51bb4",
  "blast-volatile-small": "b83e00901c001bde",
  "break-boulder": "854633e34b882a63",
  "break-cluster": "232d39eca051afa3",
  "break-crystal-large": "ba4608797f848976",
  "break-crystal-medium": "634b7a2df5c91dfd",
  "break-ice-large": "9eb76531a6082d21",
  "break-ice-medium": "880e312fe810d6c3",
  "break-ice-small": "cb63f98dbb017ed1",
  "break-iron-large": "bd6c5c65d23b8c0e",
  "break-iron-medium": "e848f8c2a3597742",
  "break-iron-small": "9bd62de1de9b3786",
  "break-lodestone-large": "0b887bb1f803c228",
  "break-lodestone-medium": "0dc54aaf8d3b0d31",
  "break-lodestone-small": "9575fa031c1bc2ab",
  "break-stone-large": "e73ae9633cdb6a7e",
  "break-stone-medium": "66cc3ef959b09224",
  "break-stone-small": "4250117b02f1abfc",
  "burr-cling": "78c426f52deb4b20",
  "burr-pop": "56b101d4c84ee5fc",
  "burr-shed": "59eaf0a265ea2cae",
  "chain-ping": "2f546ef8c4851785",
  "chain-x2": "7ae96e878f4b7822",
  "chain-x3": "294e3c3af658a087",
  "chain-x4": "34314db7a05b1c3b",
  "comet-pass": "9abd0996167e7298",
  "comet-smash": "9d39f9ade38e03a1",
  "comet-warning": "9131d7d8ac34eadb",
  "crew-caught": "6ab5c8e71464c441",
  "crew-home": "30c6007c56d2d7e6",
  "crew-loose": "43b4d71493f381e1",
  dash: "88a91d48ce7dbf13",
  "dash-ready": "d4b564105c83b9cb",
  "effect-end": "9d8cf176293c8ddd",
  "fuse-volatile": "75d2c6d126be1a0f",
  "guard-end": "a6cb3a8cbda2e84f",
  "hit-boulder": "cd7afd4fbd2b3988",
  "hit-iron": "c561aed81fcdb6d4",
  "hit-stone": "fa3580b2835af55a",
  "level-up": "286852422951deaf",
  "lodestone-hum": "e7f67c925b5a6da2",
  "near-miss": "32b4ea9c930e51e1",
  "new-best": "9ccb4ee965ddf4f6",
  pause: "0ac52e4edc5c21c7",
  "pickup-drop": "8e89c7c09643929f",
  "pickup-fade": "88732b4db5199d30",
  "pickup-lance": "bfb56e6557b05f19",
  "pickup-magnet": "d38fbe063edfe182",
  "pickup-rapid": "3ba3ead16ae9a1a7",
  "pickup-shield": "79acabe51ed28931",
  "pickup-slow": "4697a8c70750b7ae",
  "pickup-spread": "87d03861db3de048",
  "pod-hit": "ca2c55dd9df9bde1",
  "pod-lost": "20c6bb91ef331e60",
  resume: "6afce8ec16b7ef35",
  "run-end": "973c8ff45804c59c",
  "run-start": "7ae6821b896706d9",
  "sector-clear": "e7abdfaedafe7795",
  "shield-break": "39d81ece955e2567",
  "shield-up": "c65e2c03a4b772ea",
  "shot-gun": "41101e83699bb3c1",
  "shot-lance": "aa1e6547d923518a",
  "shot-rapid": "1e5b696cb01e0396",
  "shot-spread": "69d470fd9319424b",
  "shot-tail": "7d1b2bd826982ffd",
  "slow-off": "9f47ac153c41c9a4",
  "slow-on": "e257618cc090532c",
  spark: "19a1cd6ed327cfb4",
  "static-down": "5ee1a702415927b8",
  "static-full": "a980786509dbb75a",
  "stray-appear": "d07badb7121b3d6a",
  "stray-catch": "35cb5a8356c0b78c",
  "tally-tick": "fcdb275527d4cd84",
  thrust: "9510ea0130239d8a",
  "thrust-start": "29dc7671331838bf",
  "thrust-stop": "22c6843dba59a5c5",
  "tow-twang": "166897240236762f",
  "ui-back": "c3b90b79d3aa7beb",
  "ui-move": "29050741adb669de",
  "ui-select": "894cd412769e08cd",
  "voice-aww": "e86e068ab5615068",
  "voice-cheer": "27ad16600d3f7c1c",
  "voice-eep": "c81878855eb54822",
  "voice-hum": "fd09fbed7b96b829",
  "voice-ooh": "abda9a0779bc3bf0",
  "voice-ouch": "1b33c56ad143711d",
  "voice-whee": "a0fcb9adaa83b02e",
  "voice-yay": "a93508b29e35f055",
  "wave-clear": "b8f77ec7f657823b",
  "wave-start": "8880988a68d828c2",
  "zap-arc": "63d59e398b79b35e",
  "zap-dash": "8ef23b885d108fd5",
};

/** Returns the first 16 hex digits of the SHA-256 of files' bytes, one after another. */
function digestOf(...files: readonly Buffer[]): string {
  const digest = createHash("sha256");
  for (const file of files) digest.update(file);
  return digest.digest("hex").slice(0, 16);
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

describe("the sound lab's words", () => {
  it("say what plays each sound as its recipe does", () => {
    expect(PLAYS).toEqual(
      Object.fromEntries(
        spriteRecipes().map(({ name, plays = [] }) => [name, plays.join("; ")]),
      ),
    );
  });
});

describe("a take rendered", () => {
  // Each take, its sound and its number from 0.
  it.each([
    ["tally-tick", "tally-tick", 0],
    ["shot-rapid-3", "shot-rapid", 2],
    ["spark-1", "spark", 0],
    ["ui-move", "ui-move", 0],
    ["shot-gun-2", "shot-gun", 1],
  ])(
    "renders %s at its level under the ceiling, with nothing to warn of",
    (takeName, name, take) => {
      const recipe = recipeNamed(name);

      const [first] = renderTake(recipe, take);

      const x = first ?? new Float64Array();
      expect({
        level: loudness(x).rms50,
        underCeiling: loudness(x).peak <= -1 + 1e-9,
        warnings: warningsOf(takeName, recipe, x),
      }).toEqual({
        level: expect.closeTo(LEVELS[recipe.level], 0) as unknown,
        underCeiling: true,
        warnings: [],
      });
    },
  );
});

describe("every sound of the sprite", () => {
  it("is one the kit wrote, and the kit wrote no other", () => {
    expect(spriteRecipes().map(({ name }) => name)).toEqual(
      Object.keys(KIT_SOUNDS).sort(),
    );
  });

  it.each(spriteRecipes().map((recipe) => [recipe.name, recipe] as const))(
    "renders %s's takes as the kit did, each at its recorded length",
    (name, recipe) => {
      const takes = takesOf(recipe).map(
        (_, take) => renderTake(recipe, take)[0] ?? new Float64Array(),
      );

      expect({
        digest: digestOf(...takes.map((x) => wav(x))),
        lengths: takes.map((x) => x.length),
      }).toEqual({
        digest: KIT_SOUNDS[name],
        lengths: takesOf(recipe).map((take) => LENGTHS[take]),
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

  /** Runs the build over the spec's families, into its folders, with an ffmpeg that runs or none, as where it isn't on the path. */
  async function build(
    args: readonly string[],
    runFfmpeg: RunProgram,
  ): Promise<{ code: number; out: readonly string[] }> {
    const printer = recordingPrinter();
    const code = await run(args, {
      ...printer,
      families: SPEC_FAMILIES,
      wavFolder,
      spriteFolder,
      runFfmpeg,
    });
    return { code, out: printer.out };
  }

  it("renders every take and packs the sprite of all but the beds, leaving the game's sounds as they are without ffmpeg", async () => {
    const { code, out } = await build([], missingFfmpeg);

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
    const { code } = await build([], fakeFfmpeg);

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
      sprite: expect.stringContaining(
        ` -i ${join(wavFolder, "sprite.wav")} `,
      ) as unknown,
      bed: expect.stringContaining(
        ` -i ${join(wavFolder, "beds", "hum.wav")} `,
      ) as unknown,
      map: await readFile(join(wavFolder, "sprite.json"), "utf8"),
    });
  });

  it("changes none of the game's sounds where an encode fails", async () => {
    const failing: RunProgram = (program, args) =>
      args.some((arg) => arg.endsWith("hum.wav"))
        ? Promise.reject(new Error("This ffmpeg has no Vorbis."))
        : fakeFfmpeg(program, args);

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
    const { code, out } = await build(["--only", "tone"], fakeFfmpeg);

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
    const { code } = await build(["--family", "boulders"], fakeFfmpeg);

    expect({ code, wavs: await readdir(wavFolder) }).toEqual({
      code: 2,
      wavs: [],
    });
  });
});
