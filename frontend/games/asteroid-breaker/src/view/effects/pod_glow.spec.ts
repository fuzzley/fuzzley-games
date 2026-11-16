import { ART_PALETTE } from "../../testing/art_frames";
import { mixTone } from "../colors/tones";
import {
  POD_FLASH,
  type PodFlash,
  podFlashAt,
  podFlashTone,
  zapShare,
} from "./pod_glow";
import { POD_FLASH_MS, ZAP_HOLD_MS, ZAP_MS } from "./timing";

/** Returns a record the pod's flash is written into. */
function flash(): PodFlash {
  return { radius: 0, alpha: 0, glow: 0 };
}

describe("podFlashAt", () => {
  it("shows no flash before it starts or once it is over", () => {
    expect([
      podFlashAt(-1, flash()),
      podFlashAt(POD_FLASH_MS, flash()),
    ]).toEqual([null, null]);
  });

  it("starts its disc at the kit's size, as opaque as the kit's, its glow whole", () => {
    expect(podFlashAt(0, flash())).toEqual({
      radius: POD_FLASH.from,
      alpha: POD_FLASH.alpha,
      glow: 1,
    });
  });

  it("grows its disc evenly, fading it faster than its glow", () => {
    const halfway = podFlashAt(POD_FLASH_MS / 2, flash());

    expect(halfway).toEqual({
      radius: POD_FLASH.from + POD_FLASH.grows / 2,
      alpha: POD_FLASH.alpha * (1 / 2) ** POD_FLASH.fade,
      glow: 1 / 2,
    });
  });

  it("writes the flash into the record it is given", () => {
    const into = flash();

    expect(podFlashAt(0, into)).toBe(into);
  });
});

describe("podFlashTone", () => {
  it.each([
    ["dark", 0.9],
    ["light", 0.62],
  ] as const)("lifts the accent toward white on a %s field", (mode, share) => {
    expect(podFlashTone({ ...ART_PALETTE, mode })).toBe(
      mixTone(ART_PALETTE.accent, 0xffffff, share),
    );
  });
});

describe("zapShare", () => {
  it("shows nothing before the pod zaps or once the zap is over", () => {
    expect([zapShare(-1), zapShare(ZAP_MS)]).toEqual([0, 0]);
  });

  it("is whole while the field holds still", () => {
    expect([zapShare(0), zapShare(ZAP_HOLD_MS)]).toEqual([1, 1]);
  });

  it("dies away once the field moves on, a quarter left halfway", () => {
    expect(zapShare((ZAP_HOLD_MS + ZAP_MS) / 2)).toBe(1 / 4);
  });
});
