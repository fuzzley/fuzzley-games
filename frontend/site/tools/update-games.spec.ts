import type { PinnedBuild } from "./games.mjs";
import {
  commitMessage,
  latestBuild,
  parseSkipList,
  planUpdate,
} from "./update-games.mjs";

const pinned: PinnedBuild = {
  repo: "fuzzley/fSolitaire",
  commit: "549c93afb5d1592257262ceb42ed2e91dcb165d6",
  asset: "solitaire-549c93a.tar.gz",
  sha256: "a".repeat(64),
};

const newer = {
  repo: "fuzzley/fSolitaire",
  commit: "6d4d5d8b8a1f0c2e3d4f5a6b7c8d9e0f1a2b3c4d",
  asset: "solitaire-6d4d5d8.tar.gz",
  sha256: "b".repeat(64),
  built: "2026-10-17T12:00:00Z",
};

const AN_HOUR_LATER = Date.parse(newer.built) + 60 * 60 * 1000;

function respond(status: number, body?: unknown): typeof fetch {
  return () => Promise.resolve(new Response(JSON.stringify(body), { status }));
}

describe("parseSkipList", () => {
  it("takes one archive a line, ignoring blank lines and spaces", () => {
    expect(parseSkipList(" a.tar.gz\n\nb.tar.gz \n")).toEqual(
      new Set(["a.tar.gz", "b.tar.gz"]),
    );
  });
});

describe("latestBuild", () => {
  it("reads a release's latest.json, with the repository it came from", async () => {
    const { repo, ...body } = newer;

    await expect(latestBuild(newer.repo, respond(200, body))).resolves.toEqual(
      newer,
    );
  });

  it("finds no build on a release without latest.json", async () => {
    await expect(latestBuild(newer.repo, respond(404))).resolves.toBeNull();
  });

  it("fails on any other error", async () => {
    await expect(latestBuild(newer.repo, respond(500))).rejects.toThrow(
      "HTTP 500",
    );
  });

  it("refuses a latest.json with a malformed field", async () => {
    const body = { ...newer, sha256: "not a hash" };

    await expect(latestBuild(newer.repo, respond(200, body))).rejects.toThrow(
      '"sha256" is missing or malformed',
    );
  });

  it("refuses a latest.json that doesn't say when it was built", async () => {
    const { built, ...body } = newer;

    await expect(latestBuild(newer.repo, respond(200, body))).rejects.toThrow(
      '"built" is missing',
    );
  });
});

describe("planUpdate", () => {
  it("moves a pin to a newer build", () => {
    expect(planUpdate(pinned, newer, new Set(), AN_HOUR_LATER)).toEqual({
      move: {
        repo: newer.repo,
        commit: newer.commit,
        asset: newer.asset,
        sha256: newer.sha256,
      },
    });
  });

  it("leaves a pin on the newest build", () => {
    const latest = { ...pinned, built: newer.built };

    expect(planUpdate(pinned, latest, new Set(), AN_HOUR_LATER)).toEqual({
      stay: "up to date (solitaire-549c93a.tar.gz)",
    });
  });

  it("leaves a pin whose game has no build yet", () => {
    expect(planUpdate(pinned, null, new Set(), AN_HOUR_LATER)).toEqual({
      stay: "fuzzley/fSolitaire has no latest.json yet",
    });
  });

  it("skips a build whose update already failed", () => {
    const skip = new Set([newer.asset]);

    expect(planUpdate(pinned, newer, skip, AN_HOUR_LATER)).toEqual({
      stay: "skipping solitaire-6d4d5d8.tar.gz, whose update already failed",
    });
  });

  it("waits for a build under two minutes old to settle", () => {
    const aMinuteLater = Date.parse(newer.built) + 60 * 1000;

    expect(planUpdate(pinned, newer, new Set(), aMinuteLater)).toEqual({
      stay: "solitaire-6d4d5d8.tar.gz is under two minutes old; next run",
    });
  });
});

describe("commitMessage", () => {
  const { built, ...to } = newer;

  it("names the game and the commit when one pin moves", () => {
    expect(commitMessage([{ slug: "solitaire", from: pinned, to }])).toBe(
      [
        "chore(games): update solitaire to fuzzley/fSolitaire@6d4d5d8",
        "",
        "- solitaire: solitaire-6d4d5d8.tar.gz, https://github.com/fuzzley/fSolitaire/compare/549c93a...6d4d5d8",
        "",
        "Pinned by .github/workflows/update-games.yml after the site built.",
      ].join("\n"),
    );
  });

  it("names every game when several pins move", () => {
    const changes = [
      { slug: "solitaire", from: pinned, to },
      { slug: "minesweeper", from: pinned, to },
    ];

    expect(commitMessage(changes).split("\n")[0]).toBe(
      "chore(games): update solitaire, minesweeper",
    );
  });
});
