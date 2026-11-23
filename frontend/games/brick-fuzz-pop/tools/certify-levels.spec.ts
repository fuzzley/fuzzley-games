import { DANGER_ROW } from "@fz/brick-wall/rules/wall";
import {
  type CertifyApi,
  type CertifyFiles,
  certifyLevels,
  loadCertifyApi,
} from "@fz/dev/certify";
import { recordingPrinter } from "@fz/dev/script";
import { LEVELS, parseLevel } from "../src/rules/levels/levels";
import { CERTIFY_API } from "../src/testing/certify_api";
import { type CertifiedShot, replayLine } from "../src/testing/solver";
import { CERTIFY_GAME } from "./certify-levels.mjs";

/** Returns the game's files in memory, none to begin with, for a spec to read back. */
function memoryFiles(): CertifyFiles & { held: Map<string, string> } {
  const held = new Map<string, string>();
  return {
    held,
    read: (path) => Promise.resolve(held.get(path) ?? null),
    write: (path, text) => {
      held.set(path, text);
      return Promise.resolve();
    },
  };
}

describe("CERTIFY_GAME", () => {
  it("keeps the certificates and the pars where the specs read them, and has the pool load the game's API", () => {
    expect(CERTIFY_GAME).toEqual({
      root: expect.stringMatching(/\/brick-fuzz-pop$/) as unknown,
      api: "src/testing/certify_api.ts",
      certificates: "src/rules/levels/certificates",
      par: "src/rules/levels/par.json",
    });
  });

  it("hands the pool the game's API, of the pool's type, as each of its threads loads it through Vite", async () => {
    const api: CertifyApi = CERTIFY_API;

    const loaded = await loadCertifyApi(CERTIFY_GAME);

    expect({ levels: loaded.levels.length, depths: loaded.depths }).toEqual({
      levels: api.levels.length,
      depths: api.depths,
    });
  });

  it("certifies a level on a thread loading the solver through Vite, its line clearing the level with a row to spare", async () => {
    const files = memoryFiles();
    const [entry] = LEVELS;

    await certifyLevels(["--level", "1", "--depth", "22"], CERTIFY_GAME, {
      files,
      queue: () => Promise.resolve(() => undefined),
      ...recordingPrinter(),
    });

    const kept = JSON.parse(
      files.held.get(`${CERTIFY_GAME.certificates}/warm-up.json`) ?? "{}",
    ) as Record<string, Record<string, CertifiedShot[]>>;
    const line = kept[entry!.data.id]?.["22"] ?? [];
    const played = replayLine(parseLevel(entry!.data), 22, line);
    expect({
      cleared: played.cleared,
      margin: played.leastRow > DANGER_ROW,
    }).toEqual({
      cleared: true,
      margin: true,
    });
  }, 30_000);
});
