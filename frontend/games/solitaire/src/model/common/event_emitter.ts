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
   */
  public on<K extends keyof EventMap>(
    event: K,
    listener: Listener<EventMap[K]>,
  ): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    const list = this.listeners[event];
    if (list) {
      list.push(listener);
    }
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
    if (!this.listeners[event]) return;
    for (const listener of this.listeners[event]) {
      listener(data);
    }
  }
}
