import {
  Injectable,
  InjectionToken,
  type Signal,
  type WritableSignal,
  computed,
  inject,
  signal,
} from "@angular/core";

/**
 * The `open` input of each `<fz-dialog>` in the page, which only
 * `<fz-dialog>` adds to, once its input is set, and takes back as it goes.
 */
export const DIALOG_OPEN_STATES = new InjectionToken<
  WritableSignal<readonly Signal<boolean>[]>
>("DIALOG_OPEN_STATES", {
  providedIn: "root",
  factory: () => signal([]),
});

/** Says whether any `<fz-dialog>` in the page is open. */
@Injectable({ providedIn: "root" })
export class DialogService {
  private readonly openStates = inject(DIALOG_OPEN_STATES);

  /**
   * Whether a `<fz-dialog>` in the page is open, as its host's `open` input
   * says, so an app needn't list its dialogs to know one covers the page.
   */
  readonly anyOpen = computed(() => this.openStates().some((open) => open()));
}
