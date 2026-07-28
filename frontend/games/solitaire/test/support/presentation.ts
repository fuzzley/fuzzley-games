import { TablePresentation } from "@/engine/render/presentation";

/**
 * A {@link TablePresentation} a test can drive directly.
 *
 * The real one is an Angular service backed by rxjs and localStorage; none of
 * that is what a board test is about, so this is the same two values with a
 * setter that notifies.
 */
export class TestPresentation implements TablePresentation {
  private readonly listeners: ((color: string) => void)[] = [];

  constructor(
    private cardBack = "card-back-blue",
    private backgroundColor = "#0f4d0e",
  ) {}

  /** @inheritDoc */
  cardBackKey(): string {
    return this.cardBack;
  }

  /** @inheritDoc */
  readonly onBackgroundColor = (listener: (color: string) => void) => {
    this.listeners.push(listener);
    listener(this.backgroundColor);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) this.listeners.splice(index, 1);
    };
  };

  /** Changes the card back the board should draw. */
  setCardBackKey(key: string): void {
    this.cardBack = key;
  }

  /** Changes the table colour, notifying whoever is following it. */
  setBackgroundColor(color: string): void {
    this.backgroundColor = color;
    for (const listener of [...this.listeners]) {
      listener(color);
    }
  }

  /** How many followers are currently subscribed, for leak checks. */
  get listenerCount(): number {
    return this.listeners.length;
  }
}
