import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { download, removeUnpinned } from "./fetch-games.mjs";
import type { GameBuild } from "./games.mjs";

/** Returns a fetch that answers with each status in turn, counting calls. */
function answering(...statuses: number[]): typeof fetch & { calls: number } {
  const fake = Object.assign(
    () => {
      const status = statuses[Math.min(fake.calls++, statuses.length - 1)];
      return Promise.resolve(new Response("archive", { status }));
    },
    { calls: 0 },
  );
  return fake;
}

describe("download", () => {
  it("tries a 404 again, since a new release's files can lag", async () => {
    const fetchFile = answering(404, 200);

    const data = await download("https://example.test/a.tar.gz", {
      fetchFile,
      delays: [0, 0],
    });

    expect(data.toString()).toBe("archive");
  });

  it("gives up at once on an error that asking again won't change", async () => {
    const fetchFile = answering(403, 200);

    await expect(
      download("https://example.test/a.tar.gz", { fetchFile, delays: [0] }),
    ).rejects.toThrow("HTTP 403");
  });

  it("gives up once it has run out of retries", async () => {
    const fetchFile = answering(503);

    await expect(
      download("https://example.test/a.tar.gz", { fetchFile, delays: [0, 0] }),
    ).rejects.toThrow("HTTP 503");
    expect(fetchFile.calls).toBe(3);
  });
});

describe("removeUnpinned", () => {
  let playDir: string;
  const pin: GameBuild = {
    repo: "fuzzley/fSolitaire",
    commit: "0".repeat(40),
    asset: "solitaire-0000000.tar.gz",
    sha256: "0".repeat(64),
  };

  beforeEach(() => {
    playDir = mkdtempSync(path.join(tmpdir(), "play-"));
    mkdirSync(path.join(playDir, "solitaire"));
    mkdirSync(path.join(playDir, "hearts"));
  });

  afterEach(() => {
    rmSync(playDir, { recursive: true, force: true });
  });

  it("deletes the folders of games no longer pinned, and forgets them", () => {
    const installed = { solitaire: pin.sha256, hearts: "f".repeat(64) };

    removeUnpinned(playDir, { solitaire: pin }, installed);

    expect(existsSync(path.join(playDir, "hearts"))).toBe(false);
    expect(existsSync(path.join(playDir, "solitaire"))).toBe(true);
    expect(installed).toEqual({ solitaire: pin.sha256 });
  });
});
