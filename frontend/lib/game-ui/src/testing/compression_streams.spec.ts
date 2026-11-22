import { describe, expect, it, vi } from "vitest";
import { gunzip, gzip } from "../bug_report/packed";
import { installCompressionStreams } from "./compression_streams";

const JSDOMS = {
  compression: globalThis.CompressionStream,
  pixelRatio: globalThis.devicePixelRatio,
};

describe("installCompressionStreams", () => {
  describe("in a describe that calls it", () => {
    installCompressionStreams();

    it("gzips and gunzips through the globals", async () => {
      const bytes = new TextEncoder().encode("ball in play");

      expect(await gunzip(await gzip(bytes))).toEqual(bytes);
    });

    it("stubs them again for each test", () => {
      vi.stubGlobal("devicePixelRatio", 3);

      expect(globalThis.CompressionStream).not.toBe(JSDOMS.compression);
    });

    it("puts back a global the last test stubbed", () => {
      expect(globalThis.devicePixelRatio).toBe(JSDOMS.pixelRatio);
    });
  });

  it("leaves the page's globals as they were outside it", () => {
    expect(globalThis.CompressionStream).toBe(JSDOMS.compression);
  });
});
