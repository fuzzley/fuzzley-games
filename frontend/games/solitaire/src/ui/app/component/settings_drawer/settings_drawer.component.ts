import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from "@angular/core";
import { GameCatalogService } from "../../service/game_catalog.service";
import { GameLifecycleService } from "../../service/game_lifecycle.service";
import { ThemeKey, ThemeService } from "../../service/theme.service";
import { GameDocumentationService } from "../../service/game_documentation.service";
import {
  CardBackStyle,
  PresentationSettingsService,
} from "../../service/presentation_settings.service";
import { DebugPanelComponent } from "../debug_panel/debug_panel.component";
import { OptionGroupComponent } from "../option_group/option_group.component";
import { ModalDialogComponent } from "../modal_dialog/modal_dialog.component";
import { RadioGroupDirective } from "../../directive/radio_group.directive";

/** One card back a player can choose, and how to preview it. */
interface CardBackDesign {
  readonly style: CardBackStyle;
  readonly label: string;
  readonly patternClass: string;
}

/** One table felt swatch, resolved for rendering. */
interface ThemeSwatch {
  readonly key: ThemeKey;
  readonly name: string;
  readonly color: string;
  readonly selected: boolean;
}

/**
 * Controls the settings side drawer.
 * Exposes the rules the running game offers, card back designs, table felt
 * themes, and quick access to the game's documentation.
 */
@Component({
  selector: "app-settings-drawer",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DebugPanelComponent,
    OptionGroupComponent,
    ModalDialogComponent,
    RadioGroupDirective,
  ],
  templateUrl: "./settings_drawer.component.html",
  styleUrl: "./settings_drawer.component.scss",
})
export class SettingsDrawerComponent {
  protected readonly catalog = inject(GameCatalogService);
  private readonly lifecycle = inject(GameLifecycleService);
  protected readonly themeService = inject(ThemeService);
  protected readonly presentation = inject(PresentationSettingsService);
  private readonly docService = inject(GameDocumentationService);

  /** Exposes build mode configuration to conditional UI rendering. */
  protected readonly isDevMode = import.meta.env.DEV;

  /** Title of the game currently active. */
  protected readonly activeGameTitle = computed(
    () => this.docService.activeGameDoc()?.title ?? "Solitaire",
  );

  /** The card backs on offer. Static, so a plain array rather than a signal. */
  protected readonly cardBackDesigns: readonly CardBackDesign[] = [
    {
      style: "card-back-blue",
      label: "Classic Blue",
      patternClass: "blue-pattern",
    },
    {
      style: "card-back-red",
      label: "Royal Red",
      patternClass: "red-pattern",
    },
  ];

  /**
   * The felt swatches, resolved once per change rather than by indexing into
   * the theme table from the template — which ran on every change detection
   * pass and put the lookup somewhere it could not be checked.
   */
  protected readonly themeSwatches = computed<readonly ThemeSwatch[]>(() => {
    const selected = this.themeService.selectedTheme();
    return this.themeService.themeKeys.map((key) => ({
      key,
      name: this.themeService.themes[key].name,
      color: this.themeService.themes[key].color,
      selected: key === selected,
    }));
  });

  /** The name of the felt currently on the table. */
  protected readonly selectedThemeName = computed(
    () => this.themeService.themes[this.themeService.selectedTheme()].name,
  );

  /** Whether the side settings drawer is visible. */
  readonly open = input<boolean>(false);

  /** Emitted when the user asks to close the settings drawer. Named `closed`
   * rather than `close` so it cannot be confused with the native DOM event. */
  readonly closed = output();

  protected openRules(): void {
    this.closed.emit();
    this.docService.openHelp();
  }

  /**
   * Plays the current game by a different rule, dealt afresh after the prompt
   * that changing one raises.
   */
  protected chooseRule(optionId: string, value: number): void {
    void this.lifecycle.setRuleOption(optionId, value);
  }
}
