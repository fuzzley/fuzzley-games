/**
 * Lets the microtask queue drain.
 *
 * The lifecycle actions are `async` because they may have to wait on a
 * confirmation. Even when they do not — a fresh game has nothing to lose, so
 * nothing is asked — the work still lands one turn of the microtask queue
 * after the click that started it. A spec that clicks a button and asserts
 * immediately would read the state from before that turn.
 *
 * Several iterations rather than one, because a chain of awaits inside the
 * action queues a continuation per link and one `await` here only drains the
 * first.
 */
export async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}
