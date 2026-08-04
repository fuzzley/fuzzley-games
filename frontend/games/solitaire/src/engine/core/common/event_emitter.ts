/** Signature of a listener callback function. */
type Listener<T> = (data: T) => void;

/**
 * A type-safe Event Emitter that allows subscribing to and publishing events.
 *
 * @template EventMap Interface defining event names as keys and payload types as values.
 */
export class EventEmitter<EventMap extends Record<string, unknown>> {
  private listeners: { [K in keyof EventMap]?: Listener<EventMap[K]>[] } = {};

  /**
   * Subscribes a listener to a specific event.
   *
   * @param event The name of the event to listen for.
   * @param listener The callback function to invoke when the event is emitted.
   * @returns Unsubscribes the listener. Handing back a disposer means a caller
   *   that subscribes an inline closure can still let go of it, without having
   *   to keep a reference around to pass to {@link off}. A caller that already
   *   holds its listener can keep using `off` and ignore this.
   */
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

  /**
   * Unsubscribes a listener from a specific event.
   *
   * @param event The name of the event to unsubscribe from.
   * @param listener The callback function to remove.
   */
  public off<K extends keyof EventMap>(
    event: K,
    listener: Listener<EventMap[K]>,
  ): void {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((l) => l !== listener);
  }

  /**
   * Emits an event, notifying all subscribed listeners with the provided data payload.
   *
   * @param event The name of the event to emit.
   * @param data The payload data associated with the event.
   */
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
