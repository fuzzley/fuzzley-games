import { Injectable, signal } from "@angular/core";

/** Says what changed to a screen reader, through the page's `<fz-announcer>`. */
@Injectable({ providedIn: "root" })
export class AnnouncerService {
  private readonly messageState = signal("");

  /** What the live region says now. */
  readonly message = this.messageState.asReadonly();

  /**
   * Says something in the live region. The same words twice in a row would
   * change nothing a screen reader notices, so a repeat gains a trailing
   * no-break space.
   */
  say(text: string): void {
    this.messageState.update((said) =>
      said === text ? `${text}\u00a0` : text,
    );
  }

  /** Empties the live region, such as when a new game begins. */
  clear(): void {
    this.messageState.set("");
  }
}
