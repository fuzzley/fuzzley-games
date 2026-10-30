import { Injectable, signal } from "@angular/core";

/** Says what changed to a screen reader, through the page's `<fz-announcer>`. */
@Injectable({ providedIn: "root" })
export class AnnouncerService {
  private readonly messageState = signal("");
  private readonly earlyState = signal(false);

  /** Whether a live region has been in the page, to say what changes. */
  private regionPlaced = false;

  /** What the live region says now. */
  readonly message = this.messageState.asReadonly();

  /**
   * Whether the words now were said before any live region was in the page,
   * so a region waits a moment before it says them: a screen reader
   * announces a region's changes, not one that arrives with its words.
   */
  readonly early = this.earlyState.asReadonly();

  /**
   * Says something in the live region. The same words twice in a row would
   * change nothing a screen reader notices, so a repeat gains a trailing
   * no-break space.
   */
  say(text: string): void {
    this.earlyState.set(!this.regionPlaced);
    this.messageState.update((said) =>
      said === text ? `${text}\u00a0` : text,
    );
  }

  /** Empties the live region, such as when a new game begins. */
  clear(): void {
    this.earlyState.set(false);
    this.messageState.set("");
  }

  /** Notes that a live region is in the page; only `<fz-announcer>` calls it, once it has rendered. */
  notePlaced(): void {
    this.regionPlaced = true;
  }

  /** Notes that a region has said the early words, so no region waits for them again; only `<fz-announcer>` calls it. */
  noteEarlyWordsSaid(): void {
    this.earlyState.set(false);
  }
}
