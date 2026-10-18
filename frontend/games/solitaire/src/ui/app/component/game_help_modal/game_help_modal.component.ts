import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  ChangeDetectorRef,
  computed,
  effect,
  inject,
  linkedSignal,
  signal,
  untracked,
} from "@angular/core";
import { GameDocumentationService } from "../../service/game_documentation.service";
import { GameCatalogService } from "../../service/game_catalog.service";
import { ModalDialogComponent } from "../modal_dialog/modal_dialog.component";
import { itemAt } from "@/engine/core/common/item_at";

/** Names a tab of the documentation modal. */
export type DocTab = "overview" | "rules" | "variants";

/** Names how far the summary tab's screenshot has got. */
type ImageStatus = "loading" | "loaded" | "failed";

/** Describes a documented rule option, resolved against the catalog. */
interface VariantCard {
  readonly optionId: string;
  readonly label: string;
  readonly description?: string;
  readonly choices: readonly { value: number; label: string; effect: string }[];
}

/** Shows the rules of the game on the table in a tabbed dialog. */
@Component({
  selector: "app-game-help-modal",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalDialogComponent],
  templateUrl: "./game_help_modal.component.html",
  styleUrl: "./game_help_modal.component.scss",
})
export class GameHelpModalComponent {
  protected readonly docService = inject(GameDocumentationService);
  private readonly catalog = inject(GameCatalogService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly changeDetector = inject(ChangeDetectorRef);

  /** The tab the player last chose. */
  private readonly selectedTab = signal<DocTab>("overview");

  /** Active documentation entry, or undefined if missing. */
  protected readonly doc = computed(() => this.docService.activeGameDoc());

  /** The catalog entry of the game whose rules are shown. */
  private readonly shownEntry = computed(() =>
    this.catalog.games.find(
      (entry) => entry.id === this.docService.shownGameId(),
    ),
  );

  /** Display title for the modal. */
  protected readonly modalTitle = computed(
    () => this.doc()?.title ?? this.shownEntry()?.name ?? "",
  );

  /** The tabs this game's documentation actually has content for. */
  protected readonly availableTabs = computed<readonly DocTab[]>(() => {
    const doc = this.doc();
    const tabs: DocTab[] = ["overview", "rules"];
    if (doc && doc.settingsAndVariants.length > 0) {
      tabs.push("variants");
    }
    return tabs;
  });

  /** Active tab, clamped to one this game actually offers. */
  protected readonly activeTab = computed<DocTab>(() => {
    const tab = this.selectedTab();
    return this.availableTabs().includes(tab) ? tab : "overview";
  });

  /** The variants tab's content, joined to the catalog. */
  protected readonly variantCards = computed<readonly VariantCard[]>(() => {
    const doc = this.doc();
    if (!doc) return [];

    const options = this.shownEntry()?.options ?? [];
    return doc.settingsAndVariants.flatMap((optionDoc): VariantCard[] => {
      const spec = options.find((option) => option.id === optionDoc.optionId);
      if (!spec) return [];

      return [
        {
          optionId: optionDoc.optionId,
          label: spec.label,
          description: spec.description,
          choices: optionDoc.choicesExplanation.map((choice) => ({
            value: choice.value,
            label:
              spec.choices.find((c) => c.value === choice.value)?.label ??
              String(choice.value),
            effect: choice.effect,
          })),
        },
      ];
    });
  });

  /** The address of the summary tab's screenshot, if the game has one. */
  private readonly screenshotUrl = computed(() => this.doc()?.screenshot?.url);

  /**
   * How far the screenshot has got, starting over whenever its address does.
   *
   * It follows the address rather than the dialog opening because the dialog
   * keeps its `<img>` while closed: a new game's screenshot can finish loading
   * before the dialog opens, and the element never fires `load` again.
   */
  protected readonly heroImageStatus = linkedSignal<
    string | undefined,
    ImageStatus
  >({
    source: this.screenshotUrl,
    computation: () => "loading",
  });

  constructor() {
    // Opening the modal shows the summary tab, and gives a screenshot that
    // failed another try.
    effect(() => {
      if (this.docService.isOpen()) {
        this.selectedTab.set("overview");
        if (untracked(this.heroImageStatus) === "failed") {
          this.heroImageStatus.set("loading");
        }
      }
    });
  }

  /** Switches the active tab view in the documentation modal. */
  protected selectTab(tab: DocTab): void {
    this.selectedTab.set(tab);
  }

  /** Marks the hero screenshot image as successfully loaded. */
  protected onImageLoad(): void {
    this.heroImageStatus.set("loaded");
  }

  /** Marks the hero screenshot image as failed to load. */
  protected onImageError(): void {
    this.heroImageStatus.set("failed");
  }

  /** Moves between tabs with the left and right arrow keys. */
  protected onTabKeydown(event: KeyboardEvent, currentTab: DocTab): void {
    const tabs = this.availableTabs();
    const currentIndex = tabs.indexOf(currentTab);
    if (currentIndex === -1) return;

    const step =
      event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (step === 0) return;

    event.preventDefault();
    const nextTab = itemAt(
      tabs,
      (currentIndex + step + tabs.length) % tabs.length,
    );
    this.selectTab(nextTab);

    // Focus the new tab once it has re-rendered with a tabindex of 0.
    this.changeDetector.markForCheck();
    afterNextRender(
      () => {
        this.host.nativeElement
          .querySelector<HTMLElement>(`[data-tab="${nextTab}"]`)
          ?.focus();
      },
      { injector: this.injector },
    );
  }
}
