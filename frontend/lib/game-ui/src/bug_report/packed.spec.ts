import { CompressionStream, DecompressionStream } from "node:stream/web";
import {
  decodeBase64Url,
  encodeBase64Url,
  gunzip,
  gzip,
  packState,
  unpackState,
} from "./packed";

/** Every byte value, which exercises all 64 characters of the alphabet. */
const EVERY_BYTE = Uint8Array.from({ length: 256 }, (_, byte) => byte);

/** A kilobyte of repetitive text, which compresses well. */
const TEXT = new TextEncoder().encode("solitaire ".repeat(100));

/** A state as a game might report it. */
const STATE = {
  level: "rocket",
  score: 950,
  lives: 2,
  ball: { x: 120, y: 340 },
};

/**
 * A report's whole game-state field, as GitHub shows it, holding
 * {@link STATE} packed once and kept, so a change to the format that would
 * break the reports already filed fails here.
 */
const FILED = [
  "Level 9 · Score 950 · 2 lives · ball in play",
  "",
  "```",
  "bb1.H4sIAAAAAAAAAwXBQQqAIBBA0bv89SzMatHcpmQW4YCgIYV4994buHVzlFpStgehpVINPfYg-N2toVG4Tnd08KJLDMKHrluY8web-4sVQQAAAA",
  "```",
].join("\n");

/** Returns a report's game-state field around a packed state. */
function field(packed: string): string {
  return ["Level 9 · Score 950", "", "```", packed, "```"].join("\n");
}

// jsdom has no compression streams, so Node's stand in.
beforeAll(() => {
  vi.stubGlobal("CompressionStream", CompressionStream);
  vi.stubGlobal("DecompressionStream", DecompressionStream);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe("base64url", () => {
  it("decodes what it encodes", () => {
    const decoded = decodeBase64Url(encodeBase64Url(EVERY_BYTE));

    expect(decoded).toEqual(EVERY_BYTE);
  });

  it("encodes with only characters safe in a URL, and no padding", () => {
    expect(encodeBase64Url(EVERY_BYTE)).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("decodes padded text too", () => {
    expect(decodeBase64Url("_w==")).toEqual(Uint8Array.of(255));
  });

  it("rejects text that is not base64url", () => {
    expect(() => decodeBase64Url("a")).toThrow(/not base64url/);
  });
});

describe("gzip", () => {
  it("gunzips what it gzips", async () => {
    const unpacked = await gunzip(await gzip(TEXT));

    expect(unpacked).toEqual(TEXT);
  });

  it("makes repetitive bytes smaller", async () => {
    const packed = await gzip(TEXT);

    expect(packed.byteLength).toBeLessThan(TEXT.byteLength / 10);
  });

  it("gives up on output past the limit", async () => {
    const packed = await gzip(TEXT);

    expect(await gunzip(packed, 100)).toBeNull();
  });

  it("rejects bytes that are not gzip", async () => {
    await expect(gunzip(TEXT)).rejects.toThrow(/not gzip/);
  });
});

describe("packState", () => {
  it("packs a state under its tag, in characters safe in a URL", async () => {
    expect(await packState("bb1", STATE)).toMatch(/^bb1\.[A-Za-z0-9_-]+$/);
  });

  it("packs a state smaller than its JSON", async () => {
    const big = { bricks: Array.from({ length: 200 }, () => "iron") };

    const packed = await packState("bb1", big);

    expect(packed.length).toBeLessThan(JSON.stringify(big).length / 10);
  });

  it("refuses a version with a leading zero, which has another spelling", async () => {
    await expect(packState("bb01", STATE)).rejects.toThrow(
      "A tag is two lowercase letters and a version, such as bb1: bb01",
    );
  });

  it("refuses a tag that isn't two letters and a version", async () => {
    await expect(packState("brick1", STATE)).rejects.toThrow(
      "A tag is two lowercase letters and a version, such as bb1: brick1",
    );
  });
});

describe("unpackState", () => {
  it("unpacks what it packs", async () => {
    const packed = await packState("sn1", STATE);

    expect(await unpackState("sn1", packed)).toEqual(STATE);
  });

  it("finds the state in a report's whole field", async () => {
    const packed = await packState("sn1", STATE);

    expect(await unpackState("sn1", field(packed))).toEqual(STATE);
  });

  it("reads a state an earlier build packed", async () => {
    expect(await unpackState("bb1", FILED)).toEqual(STATE);
  });

  it("finds its own state beside another game's", async () => {
    const theirs = await packState("ms1", { mines: 10 });
    const ours = await packState("sn1", STATE);

    expect(await unpackState("sn1", `${theirs}\n${ours}`)).toEqual(STATE);
  });

  it("says so when the text holds no state", async () => {
    await expect(unpackState("sn1", "It froze on level 3.")).rejects.toThrow(
      "There is no game state in that text.",
    );
  });

  it("passes over a word that only looks like a tag", async () => {
    await expect(unpackState("sn1", "See ab1.txt for more.")).rejects.toThrow(
      "There is no game state in that text.",
    );
  });

  it("passes over a word that only looks like its own tag", async () => {
    await expect(unpackState("sn1", "See sn1.txt for more.")).rejects.toThrow(
      "There is no game state in that text.",
    );
  });

  it("finds its state after a word that looks like its tag", async () => {
    const packed = await packState("sn1", STATE);

    expect(await unpackState("sn1", `See sn1.txt.\n${packed}`)).toEqual(STATE);
  });

  it("passes over its tag inside a longer word", async () => {
    const packed = await packState("sn1", STATE);

    await expect(unpackState("sn1", `x${packed}`)).rejects.toThrow(
      "There is no game state in that text.",
    );
  });

  it("says so when the state is another game's", async () => {
    const packed = await packState("ms1", STATE);

    await expect(unpackState("sn1", field(packed))).rejects.toThrow(
      "The game state is from another game.",
    );
  });

  it("says so when the state is from a newer build", async () => {
    const packed = await packState("bb2", STATE);

    await expect(unpackState("bb1", field(packed))).rejects.toThrow(
      "The game state is from a newer build.",
    );
  });

  it("says so when the state is from an older build", async () => {
    const packed = await packState("bb1", STATE);

    await expect(unpackState("bb2", field(packed))).rejects.toThrow(
      "The game state is from an older build.",
    );
  });

  it("says so when the state isn't base64url", async () => {
    await expect(unpackState("sn1", "sn1.H4sIa")).rejects.toThrow(
      "The game state is corrupt.",
    );
  });

  it("says so when the state isn't gzip", async () => {
    await expect(unpackState("sn1", "sn1.H4sIAAAAAAAA")).rejects.toThrow(
      "The game state is corrupt.",
    );
  });

  it("says so when the state isn't JSON", async () => {
    const notJson = encodeBase64Url(
      await gzip(new TextEncoder().encode("{level")),
    );

    await expect(unpackState("sn1", `sn1.${notJson}`)).rejects.toThrow(
      "The game state is corrupt.",
    );
  });

  it("gives up on a state that unpacks past the limit", async () => {
    const packed = await packState("sn1", STATE);

    await expect(unpackState("sn1", packed, 10)).rejects.toThrow(
      "The game state unpacks to over 10 bytes.",
    );
  });

  it("refuses a tag that isn't two letters and a version", async () => {
    await expect(unpackState("Sn1", "Sn1.AAAA")).rejects.toThrow(
      "A tag is two lowercase letters and a version, such as bb1: Sn1",
    );
  });
});
