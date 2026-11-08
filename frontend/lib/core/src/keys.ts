/** Holds whether Ctrl, Alt and Meta were held as a key was pressed, as a `KeyboardEvent` says. */
export interface ShortcutModifiers {
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly metaKey: boolean;
}

/**
 * Returns whether a key was pressed with Ctrl, Alt or Meta held, as the
 * browser's and the system's shortcuts are, which a game leaves to them
 * unless it takes one as its own.
 */
export function isShortcut(press: ShortcutModifiers): boolean {
  return press.ctrlKey || press.altKey || press.metaKey;
}
