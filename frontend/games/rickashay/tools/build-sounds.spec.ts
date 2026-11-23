import { readFileSync } from "node:fs";
import { join } from "node:path";
import { recordingPrinter } from "@fz/dev/script";
import { type Sound, renderSoundSprite } from "@fz/dev/sounds";
import spritemap from "../src/scene/sounds/sounds.json";
import { SOUNDS } from "../src/view/effects/sounds";
import { RECIPES, SPRITE_FOLDER, SPRITE_PATH, run } from "./build-sounds.mjs";

/** The sprite the recipes render, rendered once for every case. */
const RENDERED = renderSoundSprite(RECIPES);

/** Returns a file of the sprite as it is checked in. */
function spriteFile(name: "sounds.wav" | "sounds.json"): Buffer {
  return readFileSync(join(SPRITE_FOLDER, name));
}

/** Describes a sprite written by a run: the names of its sounds and the folder it went to. */
interface Written {
  readonly names: readonly string[];
  readonly folder: string;
}

/**
 * Returns the code the script exits with for a command line, the sprites it
 * would have written, kept from the disk, and the lines it printed.
 */
async function ran(args: readonly string[]) {
  const printer = recordingPrinter();
  const written: Written[] = [];
  const code = await run(args, {
    write: (sounds: readonly Sound[], folder: string) => {
      written.push({ names: sounds.map(({ name }) => name), folder });
      return Promise.resolve(RENDERED);
    },
    ...printer,
  });
  return { code, written, out: printer.out, err: printer.err };
}

describe("the sounds", () => {
  it("are each made by a recipe of the view's name, in its order", () => {
    expect(RECIPES.map(({ name }) => name)).toEqual(SOUNDS);
  });

  it("loop none, as nothing is held to hum", () => {
    expect(
      Object.values(spritemap.spritemap).filter(({ loop }) => loop),
    ).toEqual([]);
  });

  it("are what tools/build-sounds.mjs writes now, to the byte", () => {
    expect({
      wav: RENDERED.wav.equals(spriteFile("sounds.wav")),
      json: RENDERED.json,
    }).toEqual({ wav: true, json: spriteFile("sounds.json").toString("utf8") });
  });
});

describe("run", () => {
  it("writes every recipe into the sprite's folder", async () => {
    const { code, written } = await ran([]);

    expect({ code, written }).toEqual({
      code: 0,
      written: [{ names: SOUNDS, folder: SPRITE_FOLDER }],
    });
  });

  it("says what it wrote: how many sounds, how long and how large", async () => {
    const { out } = await ran([]);

    expect(out).toEqual([
      `Wrote 25 sounds to ${SPRITE_PATH}/: 12.82 s, ${String(spriteFile("sounds.wav").length)} bytes.`,
    ]);
  });

  it("prints the usage asked for and exits with 0, writing nothing", async () => {
    const { code, written, out } = await ran(["--help"]);

    expect({
      code,
      written: written.length,
      usage: out.join("\n").startsWith("Usage: yarn build:sounds"),
    }).toEqual({ code: 0, written: 0, usage: true });
  });

  it("prints what is wrong with a command line, a blank line and the usage as an error, and exits with 2, writing nothing", async () => {
    const { code, written, err } = await ran(["--only", "strike"]);

    expect({
      code,
      written: written.length,
      err: /^Unknown option '--only'[^]*\n\nUsage:/.test(err.join("\n")),
    }).toEqual({ code: 2, written: 0, err: true });
  });
});
