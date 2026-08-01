import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
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

  @ViewChild("dialogElement")
  private readonly dialogRef?: ElementRef<HTMLElement>;
  @ViewChild("closeBtn")
  private readonly closeBtnRef?: ElementRef<HTMLButtonElement>;

  /** User's explicitly requested tab. */
  readonly selectedTab = signal<DocTab>("overview");

  /** Active documentation entry, or undefined if missing. */
  readonly doc = computed(() => this.docService.activeGameDoc());

  /** Display title for the modal. */
  readonly modalTitle = computed(
    () => this.doc()?.title ?? this.catalog.selectedEntry?.name ?? "Klondike",
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

  private previousActiveElement: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const open = this.docService.isOpen();
      if (open) {
        this.selectedTab.set("overview");
        this.heroImageLoaded.set(false);
        this.previousActiveElement = document.activeElement as HTMLElement;
        document.body.style.overflow = "hidden";
        setTimeout(() => {
          this.closeBtnRef?.nativeElement.focus();
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
    });
  }

  /** Switches the active tab view in the documentation modal. */
  selectTab(tab: DocTab): void {
    this.selectedTab.set(tab);
  }

  /** Marks the hero screenshot image as successfully loaded. */
  onImageLoad(): void {
    this.heroImageLoaded.set(true);
  }

  /** Marks the hero screenshot image as failed to load. */
  onImageError(): void {
    this.heroImageLoaded.set(false);
  }

  /** Closes the modal when pressing the Escape key. */
  @HostListener("document:keydown.escape", ["$event"])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.docService.isOpen()) {
      event.preventDefault();
      this.docService.closeHelp();
    }
  }

  /** Traps Tab focus navigation inside the modal dialog. */
  @HostListener("document:keydown.tab", ["$event"])
  onTabKey(event: KeyboardEvent): void {
    if (!this.docService.isOpen() || !this.dialogRef) return;

    const dialog = this.dialogRef.nativeElement;
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (event.shiftKey) {
      if (
        document.activeElement === first ||
        !dialog.contains(document.activeElement)
      ) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (
        document.activeElement === last ||
        !dialog.contains(document.activeElement)
      ) {
        event.preventDefault();
        first.focus();
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
      this.selectTab(tabs[nextIndex]);
    }
  }

  /** Handles backdrop clicks to close modal. */
  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains("modal-backdrop")) {
      this.docService.closeHelp();
    }
  }
}
