import { describe, it, expect } from "vitest";
import { gunzip, gzip } from "@/engine/core/common/gzip";

/** A kilobyte of repetitive text, which compresses well. */
const TEXT = new TextEncoder().encode("solitaire ".repeat(100));

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
