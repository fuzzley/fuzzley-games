import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  effect,
  inject,
  signal,
} from "@angular/core";
import { GameDocumentationService } from "../../service/game_documentation.service";

/** The tabbed views available in the game documentation modal. */
export type DocTab = "overview" | "rules" | "variants";

/**
 * Accessible modal dialog component displaying in-game rules, summaries,
 * movement instructions, variant descriptions, Wikipedia links, and screenshot galleries.
 */
@Component({
  selector: "app-game-help-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: "./game_help_modal.component.html",
  styleUrl: "./game_help_modal.component.css",
})
export class GameHelpModalComponent {
  protected readonly docService = inject(GameDocumentationService);

  /** Currently selected documentation tab. */
  readonly activeTab = signal<DocTab>("overview");

  constructor() {
    effect(() => {
      const doc = this.docService.activeGameDoc();
      const isOpen = this.docService.isOpen();

      if (!isOpen) {
        this.activeTab.set("overview");
      } else if (
        this.activeTab() === "variants" &&
        doc.settingsAndVariants.length === 0
      ) {
        this.activeTab.set("overview");
      }
    });
  }

  /** Set of image URLs that have finished loading. */
  readonly loadedImages = signal<Set<string>>(new Set());

  /** Switches the active tab view in the documentation modal. */
  selectTab(tab: DocTab): void {
    this.activeTab.set(tab);
  }

  /** Marks an image URL as successfully loaded. */
  onImageLoad(url: string): void {
    this.loadedImages.update((set) => {
      const updated = new Set(set);
      updated.add(url);
      return updated;
    });
  }

  /** Checks whether an image URL has finished loading. */
  isImageLoaded(url: string): boolean {
    return this.loadedImages().has(url);
  }

  /** Closes the modal when pressing the Escape key. */
  @HostListener("document:keydown.escape")
  onEscapeKey(): void {
    if (this.docService.isOpen()) {
      this.docService.closeHelp();
    }
  }

  /** Handles backdrop clicks to close modal. */
  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains("modal-backdrop")) {
      this.docService.closeHelp();
    }
  }
}
