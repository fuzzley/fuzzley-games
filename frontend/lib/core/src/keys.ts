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

/** Describes a thing keys steer: how many held steer it, and when one was last pressed. */
interface Hold {
  count: number;
  /** When it was last pressed, as a count of presses, so the later of two wins. */
  pressedAt: number;
}

/**
 * Holds the keys a game steers by while they are held, by `event.code`,
 * each as the thing it steers (a `Key`), so two held for one thing hold it
 * until both are let go, and a key held repeats nothing.
 */
export class HeldKeys<Key extends string> {
  /** The thing each key held steers, by `event.code`. */
  private readonly held = new Map<string, Hold>();
  /** Each thing a key has steered since the last let-go, made once, so reading makes nothing. */
  private readonly holds = new Map<Key, Hold>();
  private presses = 0;

  /** Starts with no key held, given the thing each key steers, or null for one that steers nothing. */
  constructor(private readonly keyOf: (code: string) => Key | null) {}

  /**
   * Takes a key pressed, by `event.code`, and returns whether it holds it
   * now and didn't before: not for a key that steers nothing, nor for one
   * held already, as a key held repeats.
   */
  press(code: string): boolean {
    const key = this.keyOf(code);
    if (key === null || this.held.has(code)) return false;
    const hold = this.holdOf(key);
    hold.count += 1;
    hold.pressedAt = ++this.presses;
    this.held.set(code, hold);
    return true;
  }

  /** Takes a key let go, by `event.code`, which changes nothing unless it was held. */
  release(code: string): void {
    const hold = this.held.get(code);
    if (!hold) return;
    this.held.delete(code);
    hold.count -= 1;
  }

  /** Returns whether a key held steers a thing. */
  isHeld(key: Key): boolean {
    return this.lastPressOf(key) > 0;
  }

  /**
   * Returns the way the keys held steer along an axis: -1 for `negative`
   * and 1 for `positive`, the one pressed last while both are held, or 0
   * while neither is.
   */
  axis(negative: Key, positive: Key): -1 | 0 | 1 {
    const back = this.lastPressOf(negative);
    const on = this.lastPressOf(positive);
    if (back === 0 && on === 0) return 0;
    return back > on ? -1 : 1;
  }

  /** Forgets every key held, as the player looks away, whose release may never come. */
  letGo(): void {
    this.held.clear();
    this.holds.clear();
  }

  /** Returns the record of a thing a key steers, made as a key first steers it. */
  private holdOf(key: Key): Hold {
    let hold = this.holds.get(key);
    if (!hold) {
      hold = { count: 0, pressedAt: 0 };
      this.holds.set(key, hold);
    }
    return hold;
  }

  /**
   * Returns when a key for a thing was last pressed, as a count of presses,
   * while a key held steers it, or 0 while none does.
   */
  private lastPressOf(key: Key): number {
    const hold = this.holds.get(key);
    return hold !== undefined && hold.count > 0 ? hold.pressedAt : 0;
  }
}
