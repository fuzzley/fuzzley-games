import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from "@angular/core";
import { GameDocumentationService } from "../../service/game_documentation.service";
import { GameCatalogService } from "../../service/game_catalog.service";

/** The tabbed views available in the game documentation modal. */
export type DocTab = "overview" | "rules" | "variants";

/**
 * Accessible modal dialog component displaying in-game rules, summaries,
 * movement instructions, variant descriptions, Wikipedia links, and hero screenshots.
 */
@Component({
  selector: "app-game-help-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./game_help_modal.component.html",
  styleUrl: "./game_help_modal.component.css",
})
export class GameHelpModalComponent {
  protected readonly docService = inject(GameDocumentationService);
  protected readonly catalog = inject(GameCatalogService);

  private readonly dialogRef =
    viewChild<ElementRef<HTMLElement>>("dialogElement");
  private readonly closeBtnRef =
    viewChild<ElementRef<HTMLButtonElement>>("closeBtn");

  /** User's explicitly requested tab. */
  readonly selectedTab = signal<DocTab>("overview");

  /** Active documentation entry, or undefined if missing. */
  readonly doc = computed(() => this.docService.activeGameDoc());

  /** Display title for the modal. */
  readonly modalTitle = computed(
    () => this.doc()?.title ?? this.catalog.selectedEntry.name,
  );

  /** Active tab, clamped to 'overview' if variants tab has no options. */
  readonly activeTab = computed<DocTab>(() => {
    const tab = this.selectedTab();
    const doc = this.doc();
    if (tab === "variants" && (!doc || doc.settingsAndVariants.length === 0)) {
      return "overview";
    }
    return tab;
  });

  /** Whether the hero screenshot image loaded successfully. */
  readonly heroImageLoaded = signal<boolean>(false);

  /** Whether the hero screenshot image failed to load. */
  readonly heroImageFailed = signal<boolean>(false);

  private previousActiveElement: HTMLElement | null = null;

  constructor() {
    effect((onCleanup) => {
      const open = this.docService.isOpen();
      if (open) {
        this.selectedTab.set("overview");
        this.heroImageLoaded.set(false);
        this.heroImageFailed.set(false);
        this.previousActiveElement = document.activeElement as HTMLElement;
        document.body.style.overflow = "hidden";

        setTimeout(() => {
          this.closeBtnRef()?.nativeElement.focus();
        }, 0);
      } else {
        document.body.style.overflow = "";
        if (
          this.previousActiveElement &&
          typeof this.previousActiveElement.focus === "function"
        ) {
          this.previousActiveElement.focus();
          this.previousActiveElement = null;
        }
      }

      onCleanup(() => {
        document.body.style.overflow = "";
      });
    });
  }

  /** Switches the active tab view in the documentation modal. */
  selectTab(tab: DocTab): void {
    this.selectedTab.set(tab);
  }

  /** Marks the hero screenshot image as successfully loaded. */
  onImageLoad(): void {
    this.heroImageLoaded.set(true);
    this.heroImageFailed.set(false);
  }

  /** Marks the hero screenshot image as failed to load. */
  onImageError(): void {
    this.heroImageFailed.set(true);
    this.heroImageLoaded.set(false);
  }

  /** Handles keyboard shortcuts (Escape and Tab focus trapping) inside modal. */
  @HostListener("document:keydown", ["$event"])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.docService.isOpen()) return;

    if (event.key === "Escape") {
      event.preventDefault();
      this.docService.closeHelp();
      return;
    }

    if (event.key === "Tab") {
      const dialogEl = this.dialogRef()?.nativeElement;
      if (!dialogEl) return;

      const focusables = Array.from(
        dialogEl.querySelectorAll<HTMLElement>(
          "button, a[href], input, select, textarea, [tabindex]",
        ),
      ).filter((el) => el.tabIndex !== -1 && !el.hasAttribute("disabled"));

      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey) {
        if (
          document.activeElement === first ||
          !dialogEl.contains(document.activeElement)
        ) {
          event.preventDefault();
          last.focus();
        }
      } else {
        if (
          document.activeElement === last ||
          !dialogEl.contains(document.activeElement)
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    }
  }

  /** Keyboard Left/Right arrow navigation between tabs. */
  onTabKeydown(event: KeyboardEvent, currentTab: DocTab): void {
    const doc = this.doc();
    const tabs: DocTab[] = ["overview", "rules"];
    if (doc && doc.settingsAndVariants.length > 0) {
      tabs.push("variants");
    }

    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex === -1) return;

    let nextIndex = -1;
    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    }

    if (nextIndex !== -1) {
      event.preventDefault();
      const nextTab = tabs[nextIndex];
      this.selectTab(nextTab);

      const dialogEl = this.dialogRef()?.nativeElement;
      if (dialogEl) {
        setTimeout(() => {
          const targetBtn = dialogEl.querySelector<HTMLElement>(
            `[data-tab="${nextTab}"]`,
          );
          targetBtn?.focus();
        }, 0);
      }
    }
  }

  /** Handles backdrop clicks to close modal. */
  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains("modal-backdrop")) {
      this.docService.closeHelp();
    }
  }
}
