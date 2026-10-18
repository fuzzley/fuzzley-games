import { describe, it, expect } from "vitest";
import {
  decodeBase64Url,
  encodeBase64Url,
} from "@/engine/core/common/base64url";

/** Every byte value, which exercises all 64 characters of the alphabet. */
const EVERY_BYTE = Uint8Array.from({ length: 256 }, (_, byte) => byte);

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
