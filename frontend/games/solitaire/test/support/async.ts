/**
 * Lets the microtask queue drain, so an async action a click started has
 * finished before a spec asserts.
 *
 * Several turns, because each await in a chain queues its own continuation.
 */
export async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}
