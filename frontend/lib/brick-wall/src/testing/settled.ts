/** Describes what settles as Angular's `whenStable()` says: a fixture, or the app. */
export interface Stabilizing {
  whenStable(): Promise<unknown>;
}

/**
 * Waits for a wall game's debug menu, where it is offered, the
 * certificates it loads, or a line it starts playing, and then the page,
 * to settle. A menu loaded on demand is a pending task, which
 * `whenStable()` waits for, but neither of the others is, so `whenStable()`
 * alone returns first; a file a spec hands in resolves before the next
 * macrotask, but a game's own, a dynamic import, may take longer.
 */
export async function loadsSettled(stabilizing: Stabilizing): Promise<void> {
  await stabilizing.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  await stabilizing.whenStable();
}
