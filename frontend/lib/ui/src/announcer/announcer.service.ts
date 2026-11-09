import {
  Injectable,
  InjectionToken,
  type WritableSignal,
  inject,
  signal,
} from "@angular/core";

/** What `AnnouncerService` knows of the page's live regions. */
export interface AnnouncerRegionState {
  /** Whether a live region has rendered, to say what changes. */
  placed: boolean;

  /**
   * Whether the words now were said before any live region had rendered,
   * and no region has said them yet.
   */
  readonly early: WritableSignal<boolean>;
}

/**
 * What `AnnouncerService` knows of the page's live regions, which only
 * `<fz-announcer>` notes, as it renders and as it says the early words.
 */
export const ANNOUNCER_REGION_STATE = new InjectionToken<AnnouncerRegionState>(
  "ANNOUNCER_REGION_STATE",
  {
    providedIn: "root",
    factory: () => ({ placed: false, early: signal(false) }),
  },
);

/** Says what changed to a screen reader, through the page's `<fz-announcer>`. */
@Injectable({ providedIn: "root" })
export class AnnouncerService {
  private readonly regionState = inject(ANNOUNCER_REGION_STATE);
  private readonly messageState = signal("");

  /** What the live region says now. */
  readonly message = this.messageState.asReadonly();

  /**
   * Says something in the live region. The same words twice in a row would
   * change nothing a screen reader notices, so a repeat gains a trailing
   * no-break space.
   */
  say(text: string): void {
    this.regionState.early.set(!this.regionState.placed);
    this.messageState.update((said) =>
      said === text ? `${text}\u00a0` : text,
    );
  }

  /** Empties the live region, such as when a new game begins. */
  clear(): void {
    this.regionState.early.set(false);
    this.messageState.set("");
  }
}
