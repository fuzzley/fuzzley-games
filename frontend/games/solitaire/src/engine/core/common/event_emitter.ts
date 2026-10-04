/** Receives the payload of an event. */
type Listener<T> = (data: T) => void;

/**
 * Subscribes to a value or an event, returning a function that stops following
 * it.
 *
 * The one subscription idiom across the engine: a plain callback rather than an
 * observable, because the engine may not depend on RxJS.
 */
export type Subscribe<T> = (listener: (value: T) => void) => () => void;

/**
 * Lets listeners subscribe to the typed events a subclass emits.
 *
 * @template EventMap Maps each event name to the type of its payload.
 */
export class EventEmitter<EventMap extends Record<string, unknown>> {
  private listeners: { [K in keyof EventMap]?: Listener<EventMap[K]>[] } = {};

  /** Subscribes a listener and returns a function that unsubscribes it. */
  public on<K extends keyof EventMap>(
    event: K,
    listener: Listener<EventMap[K]>,
  ): () => void {
    let list = this.listeners[event];
    if (!list) {
      list = [];
      this.listeners[event] = list;
    }
    list.push(listener);
    return () => this.off(event, listener);
  }

  /** Unsubscribes a listener from an event. */
  public off<K extends keyof EventMap>(
    event: K,
    listener: Listener<EventMap[K]>,
  ): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((l) => l !== listener);
  }

  /** Emits an event to every listener subscribed to it. */
  protected emit<K extends keyof EventMap>(event: K, data: EventMap[K]): void {
    const listeners = this.listeners[event];
    if (!listeners) return;
    // Iterate a snapshot so a listener that subscribes or unsubscribes during
    // dispatch does not change who is notified for this emit.
    for (const listener of [...listeners]) {
      listener(data);
    }
  }
}
