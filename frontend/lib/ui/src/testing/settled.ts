/** Describes what settles as Angular's `whenStable()` says: a fixture, or the app. */
export interface Stabilizing {
  whenStable(): Promise<unknown>;
}

/**
 * Waits for the page to settle, then for what it loads that no pending task
 * holds, and for the page to settle again: a debug menu loaded on demand,
 * say, and then the files it loads itself.
 *
 * A load on demand is a pending task, which `whenStable()` waits for, but a
 * load the page starts once it is there need not be, so `whenStable()`
 * alone returns first. A file a spec hands in resolves before the next
 * macrotask, which this waits out, but a dynamic import may take longer.
 */
export async function loadsSettled(stabilizing: Stabilizing): Promise<void> {
  await stabilizing.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  await stabilizing.whenStable();
}
