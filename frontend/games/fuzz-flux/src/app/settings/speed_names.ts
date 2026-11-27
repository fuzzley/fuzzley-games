import type { Speed } from "../../view/timeline/pace";

/** Each speed's name, as Settings offers it and a bug report lists it. */
export const SPEED_NAMES: Readonly<Record<Speed, string>> = {
  normal: "Normal",
  fast: "Fast",
};
