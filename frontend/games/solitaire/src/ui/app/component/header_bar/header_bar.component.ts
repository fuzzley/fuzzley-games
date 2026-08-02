import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  output,
  signal,
  viewChild,
} from "@angular/core";
import { GameMetricsService } from "../../service/game_metrics.service";
import { GameLifecycleService } from "../../service/game_lifecycle.service";
import { GameDocumentationService } from "../../service/game_documentation.service";
import { GameCatalogService } from "../../service/game_catalog.service";
import { ViewportService } from "../../service/viewport.service";

/**
 * The top header bar.
 *
 * Renders which game is on the table, what it currently reads (score, elapsed
 * time, moves) and the actions that act on it: undo, restart, deal a new game,
 * open the rules, open settings.
 *
 * On a narrow screen the last of those do not fit — five hit targets at the
 * platform minimum leave the metrics less room than their own content needs —
 * so restart and the rules move into an overflow menu rather than one of them
 * being dropped. They move rather than being duplicated and hidden: see
 * {@link ViewportService}.
 */
@Component({
  selector: "app-header-bar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  // Escape dismisses the overflow menu from anywhere in the header, which is
  // everywhere focus can be while it is open. On the host rather than on the
  // dropdown itself because a key handler belongs on something focusable, and
  // the panel is a box holding buttons rather than a control of its own.
  host: { "(keydown.escape)": "closeMenu()" },
  templateUrl: "./header_bar.component.html",
  styleUrl: "./header_bar.component.scss",
})
export class HeaderBarComponent {
  protected readonly metrics = inject(GameMetricsService);
  protected readonly lifecycle = inject(GameLifecycleService);
  protected readonly docService = inject(GameDocumentationService);
  protected readonly viewport = inject(ViewportService);

  private readonly catalog = inject(GameCatalogService);

  /**
   * The button the overflow menu hangs from, so that dismissing the menu can
   * put focus back where it was opened from rather than dropping it on the
   * document.
   */
  private readonly menuToggle =
    viewChild<ElementRef<HTMLButtonElement>>("menuToggle");

  /** The first action inside the overflow menu, while there is one. */
  private readonly firstMenuItem =
    viewChild<ElementRef<HTMLButtonElement>>("firstMenuItem");

  /** Emitted when the user requests to open the settings panel. */
  readonly openSettings = output();

  /** The name of the game on the table. */
  protected readonly gameName = computed(() => this.catalog.selectedEntry.name);

  private readonly menuOpen = signal(false);

  /** Whether the overflow menu is showing. */
  protected readonly isMenuOpen = this.menuOpen.asReadonly();

  constructor() {
    // A window widened while the menu is open takes the menu with it — the
    // actions inside it are back in the bar, and a dropdown left hanging under
    // a button that is no longer there is a menu with nothing in it.
    effect(() => {
      if (!this.viewport.isCompact()) {
        this.menuOpen.set(false);
      }
    });

    // Focus follows the menu in.
    //
    // The panel is rendered after the header rather than inside the button it
    // hangs from, so tabbing out of that button would walk past the settings
    // gear before reaching the menu it had just opened. This keeps the two
    // together for the keyboard, and a pointer user never sees it: focus moved
    // by script does not draw the focus-visible ring.
    effect(() => {
      this.firstMenuItem()?.nativeElement.focus();
    });
  }

  /** Opens the overflow menu if it is closed, and closes it if it is not. */
  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  /**
   * Dismisses the overflow menu and returns focus to the button that opened
   * it. The keyboard has to land somewhere, and the alternative is the document
   * body — which for anyone tabbing means starting again from the top.
   *
   * A no-op when there is no menu open, so that Escape pressed anywhere in the
   * header does not pull focus onto a button the player was not using.
   */
  protected closeMenu(): void {
    if (!this.menuOpen()) return;

    this.menuOpen.set(false);
    this.menuToggle()?.nativeElement.focus();
  }

  /**
   * Deals the same game again, or asks first if there is one to lose.
   *
   * The lifecycle actions are async because they may have to wait on that
   * prompt. Discarding the promise is deliberate — the answer is acted on
   * inside the service, and there is nothing here left to do with it — but it
   * is discarded explicitly rather than by a template calling an async method
   * and dropping what it returns where no lint rule can see it.
   */
  protected restart(): void {
    this.closeMenu();
    void this.lifecycle.restartGame();
  }

  /** Deals a new game, or asks first if there is one to lose. */
  protected newGame(): void {
    void this.lifecycle.startNewGame();
  }

  /** Opens the rules for the game on the table. */
  protected openHelp(): void {
    this.closeMenu();
    this.docService.openHelp();
  }
}
