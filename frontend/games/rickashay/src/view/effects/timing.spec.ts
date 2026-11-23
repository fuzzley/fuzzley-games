import { RADIUS } from "@fz/brick-wall/rules/field";
import { JUMP_MS } from "@fz/brick-wall/view/timing";
import {
  DIP,
  DIP_MS,
  KICK_MS,
  PORTAL_MS,
  RAMP_FLASH_MS,
  SLIDE_MS,
  SPARK_MS,
  STREAK,
  SWING_MS,
} from "./timing";

describe("the flourishes' timings", () => {
  it.each([
    ["a ramp's flash", RAMP_FLASH_MS],
    ["a spark", SPARK_MS],
    ["a hatch's dip", DIP_MS],
    ["the hatches' swing", SWING_MS],
    ["a portal's draw", PORTAL_MS],
    ["a bolt's slide", SLIDE_MS],
    ["a spring's kick", KICK_MS],
  ])("keeps %s brisker than the wall's jump", (_, ms) => {
    expect(ms).toBeLessThan(JUMP_MS);
  });

  it("dips a hatch's bar by less than the fuzzball's radius, so it stays under the fuzzball it holds up", () => {
    expect(DIP).toBeLessThan(RADIUS);
  });

  it("draws the dash's streak longer than the fuzzball", () => {
    expect(STREAK).toBeGreaterThan(2 * RADIUS);
  });
});
