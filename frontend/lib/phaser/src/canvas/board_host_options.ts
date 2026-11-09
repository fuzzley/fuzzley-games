import type { HostOptions } from "../host";

/**
 * Returns the options a game's board shows its scene with: the game's title,
 * the keys heard only on the board's element, the mouse and fingers, the
 * browser's menu kept shut, nothing from a gamepad, and the page showing
 * through until the scene draws, so nothing flashes.
 */
export function boardHostOptions(
  title: string,
  keyboardTarget: HTMLElement,
): HostOptions {
  return {
    title,
    background: "transparent",
    config: {
      banner: false,
      autoFocus: false,
      disableContextMenu: true,
      render: {
        antialias: true,
        roundPixels: false,
        powerPreference: "low-power",
      },
      input: {
        keyboard: { target: keyboardTarget },
        mouse: true,
        touch: true,
        gamepad: false,
      },
      fps: { smoothStep: true },
    },
  };
}
